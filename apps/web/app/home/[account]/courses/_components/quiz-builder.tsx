'use client';

import { useState, useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Plus, X, CheckCircle, Circle } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { Spinner } from '@kit/ui/spinner';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';
import { toast } from '@kit/ui/sonner';

import { createQuizQuestionsAction, updateQuizQuestionsAction } from '../_lib/server/server-actions';

const QuestionSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1, 'Question is required'),
  question_type: z.string().default('multiple_choice'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options required'),
  correct_answer: z.string().min(1, 'Correct answer is required'),
  points: z.coerce.number().min(1, 'Points must be at least 1').default(1),
  order_index: z.coerce.number().int().min(0).default(0),
});

const QuizBuilderSchema = z.object({
  questions: z.array(QuestionSchema).min(1, 'At least one question is required'),
});

type QuizBuilderFormData = z.infer<typeof QuizBuilderSchema>;
type Question = z.infer<typeof QuestionSchema>;

interface QuizQuestion {
  id: string;
  question: string;
  question_type: string;
  options: any;
  correct_answer: string;
  points: number;
  order_index: number;
}

interface QuizBuilderProps {
  account: string;
  lessonId: string;
  existingQuestions?: QuizQuestion[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function QuizBuilder({ account, lessonId, existingQuestions = [], onSuccess, onCancel }: QuizBuilderProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<QuizBuilderFormData>({
    resolver: zodResolver(QuizBuilderSchema),
    defaultValues: {
      questions: existingQuestions.length > 0 
        ? existingQuestions.map(q => ({
            id: q.id,
            question: q.question,
            question_type: q.question_type,
            options: Array.isArray(q.options) ? q.options : [],
            correct_answer: q.correct_answer,
            points: q.points,
            order_index: q.order_index,
          }))
        : [{
            question: '',
            question_type: 'multiple_choice',
            options: ['', ''],
            correct_answer: '',
            points: 1,
            order_index: 0,
          }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'questions',
  });

  const addQuestion = () => {
    append({
      question: '',
      question_type: 'multiple_choice',
      options: ['', ''],
      correct_answer: '',
      points: 1,
      order_index: fields.length,
    });
  };

  const addOption = (questionIndex: number) => {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`);
    form.setValue(`questions.${questionIndex}.options`, [...currentOptions, '']);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const currentOptions = form.getValues(`questions.${questionIndex}.options`);
    if (currentOptions.length > 2) {
      const newOptions = currentOptions.filter((_, index) => index !== optionIndex);
      form.setValue(`questions.${questionIndex}.options`, newOptions);
    }
  };

  const onSubmit = (data: QuizBuilderFormData) => {
    startTransition(async () => {
      try {
        let result;
        
        if (existingQuestions.length > 0) {
          result = await updateQuizQuestionsAction({
            account,
            lessonId,
            questions: data.questions,
          });
        } else {
          result = await createQuizQuestionsAction({
            account,
            lessonId,
            questions: data.questions,
          });
        }

        if (result.success) {
          toast.success('Quiz questions saved successfully');
          onSuccess?.();
        } else {
          toast.error(result.error || 'Failed to save quiz questions');
        }
      } catch (error) {
        console.error('Error saving quiz questions:', error);
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quiz Builder</CardTitle>
        <CardDescription>
          Create engaging quiz questions to test your students' knowledge. Students must achieve the passing score set in the lesson to continue.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-6">
              {fields.map((field, questionIndex) => (
                <Card key={field.id} className="relative">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        Question {questionIndex + 1}
                      </CardTitle>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => remove(questionIndex)}
                          disabled={isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name={`questions.${questionIndex}.question`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question Text</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your question here..."
                              {...field}
                              disabled={isPending}
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`questions.${questionIndex}.points`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Points</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                disabled={isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`questions.${questionIndex}.order_index`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Order</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                disabled={isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Answer Options */}
                    <div className="space-y-3">
                      <FormLabel>Answer Options</FormLabel>
                      
                      <FormField
                        control={form.control}
                        name={`questions.${questionIndex}.options`}
                        render={() => (
                          <FormItem>
                            <div className="space-y-2">
                              {form.watch(`questions.${questionIndex}.options`).map((_, optionIndex) => (
                                <div key={optionIndex} className="flex items-center space-x-2">
                                  <FormField
                                    control={form.control}
                                    name={`questions.${questionIndex}.correct_answer`}
                                    render={({ field: correctField }) => (
                                      <RadioGroup
                                        value={correctField.value}
                                        onValueChange={correctField.onChange}
                                        disabled={isPending}
                                      >
                                        <div className="flex items-center">
                                          <RadioGroupItem
                                            value={form.watch(`questions.${questionIndex}.options.${optionIndex}`)}
                                            id={`q${questionIndex}-option${optionIndex}`}
                                          />
                                        </div>
                                      </RadioGroup>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name={`questions.${questionIndex}.options.${optionIndex}`}
                                    render={({ field }) => (
                                      <FormItem className="flex-1">
                                        <FormControl>
                                          <Input
                                            placeholder={`Option ${optionIndex + 1}`}
                                            {...field}
                                            disabled={isPending}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  
                                  {form.watch(`questions.${questionIndex}.options`).length > 2 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeOption(questionIndex, optionIndex)}
                                      disabled={isPending}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addOption(questionIndex)}
                                disabled={isPending}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Option
                              </Button>
                              
                              <p className="text-xs text-muted-foreground">
                                Select the correct answer by clicking the radio button
                              </p>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Correct Answer Display */}
                    <div className="p-3 bg-muted/50 rounded border">
                      <p className="text-sm font-medium mb-1">Correct Answer:</p>
                      <p className="text-sm text-muted-foreground">
                        {form.watch(`questions.${questionIndex}.correct_answer`) || 'No correct answer selected'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
                disabled={isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>

              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                
                <Button type="submit" disabled={isPending}>
                  {isPending && <Spinner className="mr-2 h-4 w-4" />}
                  {existingQuestions.length > 0 ? 'Update Quiz' : 'Create Quiz'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}