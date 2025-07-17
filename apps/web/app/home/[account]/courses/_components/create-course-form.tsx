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

import { createCourseAction } from '../_lib/server/server-actions';

const CreateCourseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
});

type CreateCourseFormData = z.infer<typeof CreateCourseSchema>;

interface CreateCourseFormProps {
  account: string;
}

export function CreateCourseForm({ account }: CreateCourseFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<CreateCourseFormData>({
    resolver: zodResolver(CreateCourseSchema),
    defaultValues: {
      title: '',
      description: '',
      sku: '',
      price: 0,
    },
  });

  const onSubmit = (data: CreateCourseFormData) => {
    startTransition(async () => {
      try {
        const result = await createCourseAction({
          account,
          ...data,
        });

        if (result.success && result.data) {
          toast.success('Course created successfully');
          router.push(`/home/${account}/courses/${result.data.id}`);
        } else {
          toast.error(result.error || 'Failed to create course');
        }
      } catch (error) {
        console.error('Error creating course:', error);
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans i18nKey="courses:createCourse" />
        </CardTitle>
        <CardDescription>
          <Trans i18nKey="courses:createCourseDescription" />
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
                    <Input 
                      placeholder="Enter course title..." 
                      {...field} 
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    <Trans i18nKey="courses:fields.titleDescription" />
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
                  <FormLabel>
                    <Trans i18nKey="courses:fields.description" />
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter course description..." 
                      {...field} 
                      disabled={isPending}
                      rows={4}
                    />
                  </FormControl>
                  <FormDescription>
                    <Trans i18nKey="courses:fields.descriptionDescription" />
                  </FormDescription>
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
                      <Input 
                        placeholder="COURSE-001" 
                        {...field} 
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      <Trans i18nKey="courses:fields.skuDescription" />
                    </FormDescription>
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
                        placeholder="0.00" 
                        {...field} 
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      <Trans i18nKey="courses:fields.priceDescription" />
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                disabled={isPending}
                onClick={() => router.back()}
              >
                <Trans i18nKey="common:cancel" />
              </Button>
              
              <Button type="submit" disabled={isPending}>
                {isPending && <Spinner className="mr-2 h-4 w-4" />}
                <Trans i18nKey="courses:createCourse" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}