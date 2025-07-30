'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { Badge } from '@kit/ui/badge';
import { Switch } from '@kit/ui/switch';
import { Trash2, Plus } from 'lucide-react';
import { toast } from '@kit/ui/sonner';

interface QuizQuestion {
  id?: string;
  lesson_id: string;
  question: string;
  question_type: 'multiple_choice';
  options: string[]; // Array of answer options
  correct_answer: string; // The correct answer text
  explanation?: string;
  order_index: number;
}

interface SimpleQuizBuilderProps {
  lessonId: string;
  isFinalQuiz?: boolean;
  onClose: () => void;
}

export function SimpleQuizBuilder({ lessonId, isFinalQuiz = false, onClose }: SimpleQuizBuilderProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing questions
  useEffect(() => {
    loadQuestions();
  }, [lessonId]);

  const loadQuestions = async () => {
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}/quiz-questions`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      } else {
        console.error('Failed to load questions');
      }
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      lesson_id: lessonId,
      question: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''], // Start with 4 empty options
      correct_answer: '',
      explanation: '',
      order_index: questions.length + 1,
    };
    
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], ...updates };
    setQuestions(updatedQuestions);
  };

  const deleteQuestion = (index: number) => {
    if (confirm('Are you sure you want to delete this question?')) {
      const updatedQuestions = questions.filter((_, i) => i !== index);
      // Update order_index for remaining questions
      updatedQuestions.forEach((q, i) => {
        q.order_index = i + 1;
      });
      setQuestions(updatedQuestions);
    }
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(updatedQuestions);
  };

  const setCorrectAnswer = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].correct_answer = updatedQuestions[questionIndex].options[optionIndex];
    setQuestions(updatedQuestions);
  };

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options.push('');
    setQuestions(updatedQuestions);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    if (updatedQuestions[questionIndex].options.length > 2) {
      updatedQuestions[questionIndex].options.splice(optionIndex, 1);
      // If the removed option was the correct answer, clear it
      if (updatedQuestions[questionIndex].correct_answer === updatedQuestions[questionIndex].options[optionIndex]) {
        updatedQuestions[questionIndex].correct_answer = '';
      }
      setQuestions(updatedQuestions);
    }
  };

  const saveQuestions = async () => {
    setSaving(true);
    try {
      // Validate questions
      const validQuestions = questions.filter(q => 
        q.question.trim() && 
        q.options.some(opt => opt.trim()) && 
        q.correct_answer.trim()
      );

      if (validQuestions.length === 0) {
        toast.error('Please add at least one complete question');
        return;
      }

      const response = await fetch(`/api/admin/lessons/${lessonId}/quiz-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: validQuestions }),
      });

      if (response.ok) {
        toast.success('Quiz questions saved successfully');
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save questions');
      }
    } catch (error) {
      console.error('Error saving questions:', error);
      toast.error('Error saving questions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading questions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Quiz Builder
                {isFinalQuiz && <Badge variant="secondary">Final Quiz</Badge>}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create multiple choice questions for this lesson
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={saveQuestions} disabled={saving}>
                {saving ? 'Saving...' : 'Save Questions'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4"></div>
              <h3 className="text-lg font-medium mb-2">No questions yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first question to get started
              </p>
              <Button onClick={addQuestion}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Question
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((question, questionIndex) => (
                <Card key={questionIndex} className="border-2">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Question {questionIndex + 1}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteQuestion(questionIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Question Text */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Question</label>
                      <Textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(questionIndex, { question: e.target.value })}
                        placeholder="Enter your question here..."
                        className="min-h-[80px]"
                      />
                    </div>

                    {/* Answer Options */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium">Answer Options</label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(questionIndex)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add Option
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-3">
                            <Switch
                              checked={question.correct_answer === option && option.trim() !== ''}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setCorrectAnswer(questionIndex, optionIndex);
                                }
                              }}
                              disabled={option.trim() === ''}
                            />
                            <span className="text-sm font-medium w-6">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <Input
                              value={option}
                              onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                              className="flex-1"
                            />
                            {question.options.length > 2 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeOption(questionIndex, optionIndex)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      {question.correct_answer === '' && (
                        <p className="text-sm text-red-600 mt-2">
                          Please select the correct answer
                        </p>
                      )}
                    </div>

                    {/* Explanation */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Explanation (Optional)
                      </label>
                      <Textarea
                        value={question.explanation || ''}
                        onChange={(e) => updateQuestion(questionIndex, { explanation: e.target.value })}
                        placeholder="Explain why this is the correct answer..."
                        className="min-h-[60px]"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button onClick={addQuestion} className="w-full" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Another Question
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}