'use client';

import { useTransition } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Checkbox } from '@kit/ui/checkbox';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Spinner } from '@kit/ui/spinner';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';
import { toast } from '@kit/ui/sonner';

import { updateCourseAction } from '../_lib/server/server-actions';

const CourseSettingsSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().min(0),
  status: z.enum(['draft', 'published', 'archived']),
  sequential_completion: z.boolean(),
  passing_score: z.coerce.number().min(0).max(100),
});

type CourseSettingsFormData = z.infer<typeof CourseSettingsSchema>;

interface Course {
  id: string;
  title: string;
  description: string | null;
  sku: string | null;
  price: number;
  status: 'draft' | 'published' | 'archived';
  sequential_completion: boolean;
  passing_score: number;
}

interface CourseSettingsFormProps {
  course: Course;
  account: string;
}

export function CourseSettingsForm({ course, account }: CourseSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CourseSettingsFormData>({
    resolver: zodResolver(CourseSettingsSchema),
    defaultValues: {
      title: course.title,
      description: course.description || '',
      sku: course.sku || '',
      price: course.price,
      status: course.status,
      sequential_completion: course.sequential_completion,
      passing_score: course.passing_score,
    },
  });

  const onSubmit = (data: CourseSettingsFormData) => {
    startTransition(async () => {
      try {
        const result = await updateCourseAction({
          account,
          courseId: course.id,
          ...data,
        });

        if (result.success) {
          toast.success('Course updated successfully');
        } else {
          toast.error(result.error || 'Failed to update course');
        }
      } catch (error) {
        console.error('Error updating course:', error);
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="courses:settings.general" />
          </CardTitle>
          <CardDescription>
            <Trans i18nKey="courses:settings.description" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="courses:fields.title" />
                    </FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="courses:fields.description" />
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} disabled={isPending} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Trans i18nKey="courses:fields.sku" />
                      </FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Trans i18nKey="courses:fields.price" />
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01"
                          {...field} 
                          disabled={isPending} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Trans i18nKey="courses:settings.fields.status" />
                      </FormLabel>
                      <Select
                        disabled={isPending}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        <Trans i18nKey="courses:settings.fields.statusDescription" />
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sequential_completion"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          <Trans i18nKey="courses:settings.fields.sequential_completion" />
                        </FormLabel>
                        <FormDescription>
                          <Trans i18nKey="courses:settings.fields.sequential_completionDescription" />
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="passing_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <Trans i18nKey="courses:settings.fields.passing_score" />
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100"
                          {...field} 
                          disabled={isPending} 
                        />
                      </FormControl>
                      <FormDescription>
                        <Trans i18nKey="courses:settings.fields.passing_scoreDescription" />
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Spinner className="mr-2 h-4 w-4" />}
                  <Trans i18nKey="common:save" />
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}