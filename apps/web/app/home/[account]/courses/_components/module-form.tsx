'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import { Spinner } from '@kit/ui/spinner';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';
import { toast } from '@kit/ui/sonner';

import { createModuleAction } from '../_lib/server/server-actions';

const ModuleFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  order_index: z.coerce.number().int().min(0),
});

type ModuleFormData = z.infer<typeof ModuleFormSchema>;

interface ModuleFormProps {
  account: string;
  courseId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ModuleForm({ account, courseId, onSuccess, onCancel }: ModuleFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<ModuleFormData>({
    resolver: zodResolver(ModuleFormSchema),
    defaultValues: {
      title: '',
      description: '',
      order_index: 0,
    },
  });

  const onSubmit = (data: ModuleFormData) => {
    startTransition(async () => {
      try {
        const result = await createModuleAction({
          account,
          courseId,
          ...data,
        });

        if (result.success) {
          toast.success('Module created successfully');
          onSuccess?.();
        } else {
          toast.error(result.error || 'Failed to create module');
        }
      } catch (error) {
        console.error('Error creating module:', error);
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Module</CardTitle>
        <CardDescription>
          Add a new module to organize your course content into logical sections.
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
                  <FormLabel>Module Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter module title..." 
                      {...field} 
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Give your module a clear, descriptive title
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what this module covers..." 
                      {...field} 
                      disabled={isPending}
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>
                    Help students understand what they'll learn in this module
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order_index"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module Order</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      {...field} 
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Order of this module in the course (0 = first)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                disabled={isPending}
                onClick={onCancel || (() => router.back())}
              >
                Cancel
              </Button>
              
              <Button type="submit" disabled={isPending}>
                {isPending && <Spinner className="mr-2 h-4 w-4" />}
                Create Module
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}