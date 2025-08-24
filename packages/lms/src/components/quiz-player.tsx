'use client';

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Progress } from '@kit/ui/progress';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { Badge } from '@kit/ui/badge';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

interface QuizPlayerProps {
  lessonId: string;
  title: string;
  isFinalQuiz?: boolean;
  languageCode?: 'en' | 'es';
  onComplete?: () => void;
  className?: string;
}

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'open_ended';
  order_index: number;
  options: QuizOption[];
  correct_answer?: string;
  explanation?: string;
}

interface QuizOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

interface QuizAttempt {
  id: string;
  score: number;
  max_score: number;
  passed: boolean;
  attempt_number: number;
  submitted_at: string;
}

export function QuizPlayer({
  lessonId,
  title,
  isFinalQuiz = false,
  languageCode = 'en',
  onComplete,
  className = ''
}: QuizPlayerProps) {
  const supabase = useSupabase();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [canRetake, setCanRetake] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Load quiz data
  const loadQuiz = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get quiz data
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select(`
          *,
          questions:quiz_questions(
            id,
            question_text,
            question_type,
            order_index,
            correct_answer,
            explanation,
            options:quiz_question_options(
              id,
              option_text,
              is_correct,
              order_index
            )
          )
        `)
        .eq('lesson_id', lessonId)
        .single();

      if (quizError) {
        throw new Error(`Failed to load quiz: ${quizError.message}`);
      }

      if (!quizData) {
        throw new Error('Quiz not found for this lesson');
      }

      setQuiz(quizData);

      // Process questions with language support
      const processedQuestions = await Promise.all(
        quizData.questions
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map(async (question: any) => {
            // Get translated content if available
            const { data: translation } = await supabase
              .from('quiz_content_translations')
              .select('question_text, explanation')
              .eq('quiz_question_id', question.id)
              .eq('language_code', languageCode)
              .single();

            // Get translated options
            const translatedOptions = await Promise.all(
              question.options.map(async (option: any) => {
                const { data: optionTranslation } = await supabase
                  .from('quiz_option_translations')
                  .select('option_text')
                  .eq('quiz_option_id', option.id)
                  .eq('language_code', languageCode)
                  .single();

                return {
                  ...option,
                  option_text: optionTranslation?.option_text || option.option_text
                };
              })
            );

            return {
              ...question,
              question_text: translation?.question_text || question.question_text,
              explanation: translation?.explanation || question.explanation,
              options: translatedOptions.sort((a, b) => a.order_index - b.order_index)
            };
          })
      );

      setQuestions(processedQuestions);

      // Load previous attempts
      const { data: attemptsData } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('attempt_number', { ascending: false });

      if (attemptsData) {
        setAttempts(attemptsData);
        
        // Always allow retakes unless they've passed
        const passedAttempt = attemptsData.find(attempt => attempt.passed);
        
        if (passedAttempt) {
          setCanRetake(false);
        }
      }

      // Set time limit if quiz has one
      if (quizData.time_limit_minutes) {
        setTimeRemaining(quizData.time_limit_minutes * 60);
      }

    } catch (err) {
      console.error('Error loading quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, [lessonId, languageCode, supabase]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || submitted) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          handleSubmitQuiz(); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, submitted]);

  // Handle answer selection
  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Navigate between questions
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  // Submit quiz
  const handleSubmitQuiz = useCallback(async () => {
    if (submitted) return;

    try {
      setSubmitted(true);

      // Calculate score
      let correctAnswers = 0;
      const detailedResults = questions.map(question => {
        const userAnswer = answers[question.id];
        const isCorrect = question.question_type === 'multiple_choice' 
          ? question.options.find(opt => opt.id === userAnswer)?.is_correct || false
          : userAnswer === question.correct_answer;
        
        if (isCorrect) correctAnswers++;

        return {
          questionId: question.id,
          userAnswer,
          correctAnswer: question.correct_answer,
          isCorrect,
          explanation: question.explanation
        };
      });

      const score = Math.round((correctAnswers / questions.length) * 100);
      const passed = score >= (quiz.passing_score || 80);

      // Save attempt to database
      const attemptNumber = (attempts[0]?.attempt_number || 0) + 1;
      
      const { data: attemptData, error: attemptError } = await supabase
        .from('quiz_attempts')
        .insert({
          lesson_id: lessonId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          score,
          total_points: questions.length,
          passed,
          attempt_number: attemptNumber,
          answers: answers
        })
        .select()
        .single();

      if (attemptError) {
        throw new Error(`Failed to save quiz attempt: ${attemptError.message}`);
      }

      // If this is a final quiz, update the final score in course_enrollments
      if (isFinalQuiz && passed) {
        const user = await supabase.auth.getUser();
        if (user.data.user) {
          // Get the course_id from the lesson
          const { data: lessonData } = await supabase
            .from('lessons')
            .select('module_id, course_modules!inner(course_id)')
            .eq('id', lessonId)
            .single();

          if (lessonData) {
            const courseId = lessonData.course_modules.course_id;
            
            // Update the final_score in course_enrollments
            await supabase
              .from('course_enrollments')
              .update({ final_score: score })
              .eq('user_id', user.data.user.id)
              .eq('course_id', courseId);
          }
        }
      }

      setResults({
        score,
        passed,
        correctAnswers,
        totalQuestions: questions.length,
        detailedResults,
        attemptNumber,
        canRetake: !passed // Always allow retake if not passed
      });

      // If passed, mark lesson as complete
      if (passed) {
        onComplete?.();
      }

    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit quiz');
      setSubmitted(false);
    }
  }, [answers, questions, quiz, attempts, timeRemaining, supabase, onComplete, submitted]);

  // Reset quiz for retake
  const handleRetake = () => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setSubmitted(false);
    setResults(null);
    if (quiz.time_limit_minutes) {
      setTimeRemaining(quiz.time_limit_minutes * 60);
    }
    loadQuiz(); // Reload to get updated attempts
  };

  // Load quiz on mount
  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show results screen
  if (submitted && results) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {isFinalQuiz && <Badge variant="secondary">Final Quiz</Badge>}
                {title} - Results
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Summary */}
            <div className="text-center p-6 bg-gray-50 rounded-lg">
              <div className={`text-4xl font-bold mb-2 ${results.passed ? 'text-green-600' : 'text-red-600'}`}>
                {results.score}%
              </div>
              <p className="text-lg mb-1">
                {results.correctAnswers} of {results.totalQuestions} correct
              </p>
              <p className={`font-medium ${results.passed ? 'text-green-600' : 'text-red-600'}`}>
                {results.passed ? '✅ Passed' : '❌ Failed'}
              </p>
              {!results.passed && (
                <p className="text-sm text-gray-600 mt-2">
                  You need {quiz.passing_score || 80}% to pass
                </p>
              )}
            </div>

            {/* Detailed Results */}
            <div className="space-y-4">
              <h4 className="font-medium">Question Review:</h4>
              {results.detailedResults.map((result: any, index: number) => (
                <Card key={result.questionId} className="border-l-4 border-l-gray-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium">Question {index + 1}</p>
                      <span className={`text-sm px-2 py-1 rounded ${
                        result.isCorrect 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {questions[index].question_text}
                    </p>
                    {result.explanation && (
                      <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        💡 {result.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              {results.canRetake && (
                <Button onClick={handleRetake} variant="outline">
                  Retake Quiz
                </Button>
              )}
              {results.passed && (
                <Button onClick={() => onComplete?.()} className="bg-green-600 hover:bg-green-700">
                  Continue Learning
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show quiz interface
  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;
  const allQuestionsAnswered = questions.every(q => answers[q.id]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isFinalQuiz && <Badge variant="secondary">Final Quiz</Badge>}
              {title}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {timeRemaining !== null && (
                <div className={`flex items-center gap-1 ${timeRemaining < 300 ? 'text-red-600' : ''}`}>
                  ⏱️ {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                </div>
              )}
              {attempts.length > 0 && (
                <div>Attempt {(attempts[0]?.attempt_number || 0) + 1}</div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
              <span>{Math.round(progressPercentage)}% complete</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Current Question */}
      {currentQuestion && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4">
                {currentQuestion.question_text}
              </h3>
              
              {/* Multiple Choice Options */}
              {currentQuestion.question_type === 'multiple_choice' && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAnswerChange(currentQuestion.id, option.id)}
                      className={`
                        w-full text-left p-4 rounded-lg border-2 transition-colors
                        ${answers[currentQuestion.id] === option.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-4 h-4 rounded-full border-2 flex items-center justify-center
                          ${answers[currentQuestion.id] === option.id
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                          }
                        `}>
                          {answers[currentQuestion.id] === option.id && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span>{option.option_text}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* True/False */}
              {currentQuestion.question_type === 'true_false' && (
                <div className="space-y-3">
                  {['true', 'false'].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleAnswerChange(currentQuestion.id, value)}
                      className={`
                        w-full text-left p-4 rounded-lg border-2 transition-colors
                        ${answers[currentQuestion.id] === value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-4 h-4 rounded-full border-2 flex items-center justify-center
                          ${answers[currentQuestion.id] === value
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                          }
                        `}>
                          {answers[currentQuestion.id] === value && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="capitalize">{value}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => goToQuestion(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0}
              >
                ← Previous
              </Button>

              <div className="flex gap-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToQuestion(index)}
                    className={`
                      w-8 h-8 rounded text-sm font-medium transition-colors
                      ${index === currentQuestionIndex
                        ? 'bg-blue-600 text-white'
                        : answers[questions[index].id]
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-300'
                      }
                    `}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {currentQuestionIndex === questions.length - 1 ? (
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={!allQuestionsAnswered}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Submit Quiz
                </Button>
              ) : (
                <Button
                  onClick={() => goToQuestion(currentQuestionIndex + 1)}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next →
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quiz Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• You need {quiz?.passing_score || 80}% to pass this quiz</p>
        <p>• You can retake this quiz until you pass</p>
        {isFinalQuiz && <p>• This is a final quiz - it must be completed to finish the course</p>}
        {timeRemaining !== null && <p>• Time limit: {quiz.time_limit_minutes} minutes</p>}
      </div>
    </div>
  );
}