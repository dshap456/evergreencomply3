'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Button } from '@kit/ui/button';
import { Trans } from '@kit/ui/trans';
import { toast } from '@kit/ui/sonner';

import { inviteToCourseAction } from '../_lib/server/course-invitation-actions';

const InviteSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

interface InviteToCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    course_id: string;
    course_title: string;
    available_seats: number;
  };
  accountId: string;
  onSuccess: () => void;
}

export function InviteToCourseDialog({
  open,
  onOpenChange,
  course,
  accountId,
  onSuccess,
}: InviteToCourseDialogProps) {
  const [isPending, startTransition] = useTransition();
  
  const form = useForm<z.infer<typeof InviteSchema>>({
    resolver: zodResolver(InviteSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (data: z.infer<typeof InviteSchema>) => {
    startTransition(async () => {
      try {
        const result = await inviteToCourseAction({
          email: data.email,
          courseId: course.course_id,
          accountId: accountId,
        });

        if (result.success) {
          toast.success('Invitation sent successfully');
          form.reset();
          onOpenChange(false);
          onSuccess();
        }
      } catch (error) {
        console.error('Invitation error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="courses:inviteToCourse" />
          </DialogTitle>
          <DialogDescription>
            <Trans 
              i18nKey="courses:inviteToCourseDescription" 
              values={{ 
                courseName: course.course_title,
                availableSeats: course.available_seats 
              }} 
            />
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="common:email" />
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="team.member@company.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                <Trans i18nKey="common:cancel" />
              </Button>
              <Button type="submit" disabled={isPending}>
                <Trans i18nKey="courses:sendInvitation" />
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}