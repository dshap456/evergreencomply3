'use client';

import { useState, useImperativeHandle, forwardRef, useEffect } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';

interface QuizQuestion {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'open_ended';
  order_index: number;
  options: QuizOption[];
  correct_answer?: string;
  explanation?: string;
  points: number;
}

interface QuizOption {
  id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  passing_score: number;
  time_limit_minutes?: number;
  max_attempts: number;
  questions: QuizQuestion[];
}

interface QuizEditorProps {
  lessonId: string;
  isFinalQuiz: boolean;
  onQuizChange: () => void;
  existingQuizData?: Quiz | null;
}

export interface QuizEditorRef {
  getQuizData: () => Quiz;
}

export const QuizEditor = forwardRef<QuizEditorRef, QuizEditorProps>(function QuizEditor({ lessonId, isFinalQuiz, onQuizChange, existingQuizData }, ref) {
  const [quiz, setQuiz] = useState<Quiz>(existingQuizData || {
    id: 'mock-quiz-id',
    title: 'Lesson Quiz',
    description: 'Test your understanding of this lesson',
    passing_score: 80,
    time_limit_minutes: undefined,
    max_attempts: 3,
    questions: []
  });
  
  // Update quiz state when existingQuizData changes
  useEffect(() => {
    if (existingQuizData) {
      console.log('QuizEditor: Loading existing quiz data:', existingQuizData);
      setQuiz(existingQuizData);
    }
  }, [existingQuizData]);

  const [selectedQuestion, setSelectedQuestion] = useState<QuizQuestion | null>(null);

  useImperativeHandle(ref, () => ({
    getQuizData: () => quiz,
  }));

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: Math.random().toString(36).substr(2, 9),
      question_text: '',
      question_type: 'multiple_choice',
      order_index: quiz.questions.length + 1,
      options: [
        {
          id: Math.random().toString(36).substr(2, 9),
          option_text: '',
          is_correct: true,
          order_index: 1
        },
        {
          id: Math.random().toString(36).substr(2, 9),
          option_text: '',
          is_correct: false,
          order_index: 2
        }
      ],
      explanation: '',
      points: 1
    };
    
    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
    setSelectedQuestion(newQuestion);
    onQuizChange();
  };

  const updateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
    setQuiz(prev => {
      const updatedQuestions = prev.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      );
      
      // Update selectedQuestion if it's the one being modified
      if (selectedQuestion?.id === questionId) {
        const updatedQuestion = updatedQuestions.find(q => q.id === questionId);
        if (updatedQuestion) {
          setSelectedQuestion(updatedQuestion);
        }
      }
      
      return {
        ...prev,
        questions: updatedQuestions
      };
    });
    onQuizChange();
  };

  const deleteQuestion = (questionId: string) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion(null);
    }
    onQuizChange();
  };

  const addOption = (questionId: string) => {
    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) return;

    const newOption: QuizOption = {
      id: Math.random().toString(36).substr(2, 9),
      option_text: '',
      is_correct: false,
      order_index: question.options.length + 1
    };

    updateQuestion(questionId, {
      options: [...question.options, newOption]
    });
  };

  const updateOption = (questionId: string, optionId: string, updates: Partial<QuizOption>) => {
    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) return;

    const updatedOptions = question.options.map(option =>
      option.id === optionId ? { ...option, ...updates } : option
    );

    updateQuestion(questionId, { options: updatedOptions });
  };

  const deleteOption = (questionId: string, optionId: string) => {
    const question = quiz.questions.find(q => q.id === questionId);
    if (!question || question.options.length <= 2) return;

    const updatedOptions = question.options.filter(option => option.id !== optionId);
    updateQuestion(questionId, { options: updatedOptions });
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice': return '';
      case 'true_false': return '';
      case 'open_ended': return '';
      default: return '';
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'Multiple Choice';
      case 'true_false': return 'True/False';
      case 'open_ended': return 'Open Ended';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Quiz Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Quiz Settings
            {isFinalQuiz && (
              <Badge variant="secondary">Final Quiz</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quiz Title</label>
              <Input
                value={quiz.title}
                onChange={(e) => {
                  setQuiz(prev => ({ ...prev, title: e.target.value }));
                  onQuizChange();
                }}
                placeholder="Enter quiz title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Passing Score (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={quiz.passing_score}
                onChange={(e) => {
                  setQuiz(prev => ({ ...prev, passing_score: parseInt(e.target.value) || 80 }));
                  onQuizChange();
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={quiz.description}
              onChange={(e) => {
                setQuiz(prev => ({ ...prev, description: e.target.value }));
                onQuizChange();
              }}
              placeholder="Describe what this quiz covers"
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Limit (minutes)</label>
              <Input
                type="number"
                min="1"
                value={quiz.time_limit_minutes || ''}
                onChange={(e) => {
                  setQuiz(prev => ({ 
                    ...prev, 
                    time_limit_minutes: parseInt(e.target.value) || undefined 
                  }));
                  onQuizChange();
                }}
                placeholder="No time limit"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Maximum Attempts</label>
              <Select
                value={quiz.max_attempts.toString()}
                onValueChange={(value) => {
                  setQuiz(prev => ({ ...prev, max_attempts: parseInt(value) }));
                  onQuizChange();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 attempt</SelectItem>
                  <SelectItem value="2">2 attempts</SelectItem>
                  <SelectItem value="3">3 attempts</SelectItem>
                  <SelectItem value="5">5 attempts</SelectItem>
                  <SelectItem value="-1">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Questions ({quiz.questions.length})</CardTitle>
            <Button onClick={addQuestion}>
              + Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {quiz.questions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4"></div>
              <h3 className="text-lg font-medium mb-2">No questions yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first question to get started
              </p>
              <Button onClick={addQuestion}>
                Create First Question
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {quiz.questions.map((question, index) => (
                <div
                  key={question.id}
                  className={`
                    border rounded-lg p-4 cursor-pointer transition-colors
                    ${selectedQuestion?.id === question.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                    }
                  `}
                  onClick={() => setSelectedQuestion(question)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-muted rounded text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{getQuestionTypeIcon(question.question_type)}</span>
                          <Badge variant="outline" className="text-xs">
                            {getQuestionTypeLabel(question.question_type)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {question.points} {question.points === 1 ? 'point' : 'points'}
                          </span>
                        </div>
                        <p className="font-medium">
                          {question.question_text || 'Untitled Question'}
                        </p>
                        {question.question_type === 'multiple_choice' && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {question.options.length} options
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this question?')) {
                          deleteQuestion(question.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Question Editor */}
      {selectedQuestion && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Question {quiz.questions.findIndex(q => q.id === selectedQuestion.id) + 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Question Type</label>
                <Select
                  value={selectedQuestion.question_type}
                  onValueChange={(value: 'multiple_choice' | 'true_false' | 'open_ended') => {
                    updateQuestion(selectedQuestion.id, { question_type: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="true_false">True/False</SelectItem>
                    <SelectItem value="open_ended">✍️ Open Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Points</label>
                <Input
                  type="number"
                  min="1"
                  value={selectedQuestion.points}
                  onChange={(e) => {
                    updateQuestion(selectedQuestion.id, { 
                      points: parseInt(e.target.value) || 1 
                    });
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Question Text</label>
              <Textarea
                value={selectedQuestion.question_text}
                onChange={(e) => {
                  updateQuestion(selectedQuestion.id, { question_text: e.target.value });
                }}
                placeholder="Enter your question here"
                className="min-h-[100px]"
              />
            </div>

            {/* Options for Multiple Choice */}
            {selectedQuestion.question_type === 'multiple_choice' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Answer Options</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addOption(selectedQuestion.id)}
                  >
                    + Add Option
                  </Button>
                </div>
                <div className="space-y-3">
                  {selectedQuestion.options.map((option, optionIndex) => (
                    <div key={option.id} className="flex items-center gap-3 p-3 border rounded">
                      <Switch
                        checked={option.is_correct}
                        onCheckedChange={(checked) => {
                          // If setting this as correct, uncheck others
                          if (checked) {
                            const updatedOptions = selectedQuestion.options.map(opt => ({
                              ...opt,
                              is_correct: opt.id === option.id
                            }));
                            updateQuestion(selectedQuestion.id, { options: updatedOptions });
                          } else {
                            updateOption(selectedQuestion.id, option.id, { is_correct: false });
                          }
                        }}
                      />
                      <span className="text-sm font-medium w-6">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <Input
                        value={option.option_text}
                        onChange={(e) => {
                          updateOption(selectedQuestion.id, option.id, { 
                            option_text: e.target.value 
                          });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                        className="flex-1"
                      />
                      {selectedQuestion.options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteOption(selectedQuestion.id, option.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* True/False Options */}
            {selectedQuestion.question_type === 'true_false' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Correct Answer</label>
                <Select
                  value={selectedQuestion.correct_answer || 'true'}
                  onValueChange={(value) => {
                    updateQuestion(selectedQuestion.id, { correct_answer: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">True</SelectItem>
                    <SelectItem value="false">False</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Explanation */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Explanation (Optional)</label>
              <Textarea
                value={selectedQuestion.explanation || ''}
                onChange={(e) => {
                  updateQuestion(selectedQuestion.id, { explanation: e.target.value });
                }}
                placeholder="Provide an explanation for the correct answer"
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});