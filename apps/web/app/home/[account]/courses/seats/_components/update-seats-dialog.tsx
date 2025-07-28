'use client';

import { useTransition } from 'react';
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
  FormDescription,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Button } from '@kit/ui/button';
import { Trans } from '@kit/ui/trans';
import { toast } from '@kit/ui/sonner';

import { updateCourseSeatsAction } from '../_lib/server/course-seat-actions';

const UpdateSeatsSchema = z.object({
  totalSeats: z.number().min(1, 'Must have at least 1 seat'),
});

interface UpdateSeatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    course_id: string;
    course_title: string;
    total_seats: number;
    used_seats: number;
  };
  accountId: string;
  onSuccess: () => void;
}

export function UpdateSeatsDialog({
  open,
  onOpenChange,
  course,
  accountId,
  onSuccess,
}: UpdateSeatsDialogProps) {
  const [isPending, startTransition] = useTransition();
  
  const form = useForm<z.infer<typeof UpdateSeatsSchema>>({
    resolver: zodResolver(UpdateSeatsSchema),
    defaultValues: {
      totalSeats: course.total_seats,
    },
  });

  const onSubmit = (data: z.infer<typeof UpdateSeatsSchema>) => {
    if (data.totalSeats < course.used_seats) {
      toast.error(`Cannot set seats below current usage (${course.used_seats} seats in use)`);
      return;
    }

    startTransition(async () => {
      try {
        await updateCourseSeatsAction({
          courseId: course.course_id,
          accountId: accountId,
          totalSeats: data.totalSeats,
        });

        toast.success('Seats updated successfully');
        onOpenChange(false);
        onSuccess();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update seats');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="courses:updateSeats" />
          </DialogTitle>
          <DialogDescription>
            <Trans 
              i18nKey="courses:updateSeatsDescription" 
              values={{ courseName: course.course_title }} 
            />
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="totalSeats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="courses:totalSeats" />
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={course.used_seats}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    <Trans 
                      i18nKey="courses:currentUsage" 
                      values={{ used: course.used_seats, total: course.total_seats }} 
                    />
                  </FormDescription>
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
                <Trans i18nKey="common:update" />
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}