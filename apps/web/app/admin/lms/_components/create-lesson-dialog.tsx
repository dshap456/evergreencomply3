'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
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
import { Textarea } from '@kit/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';

const CreateLessonSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
  content_type: z.enum(['video', 'text', 'quiz']),
  duration_minutes: z.number().min(1).optional(),
  is_final_quiz: z.boolean().default(false),
});

type CreateLessonForm = z.infer<typeof CreateLessonSchema>;

interface Lesson {
  id: string;
  title: string;
  description: string;
  content_type: 'video' | 'text' | 'quiz';
  order_index: number;
  is_final_quiz: boolean;
  duration_minutes?: number;
}

interface CreateLessonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLessonCreated: (lesson: Lesson) => void;
  nextOrderIndex: number;
}

const contentTypes = [
  {
    value: 'video',
    label: '📹 Video Lesson',
    description: 'Upload and stream video content'
  },
  {
    value: 'text',
    label: '📄 Text/Reading',
    description: 'Written content with rich text formatting'
  },
  {
    value: 'quiz',
    label: '📝 Quiz',
    description: 'Assessment with multiple choice and other question types'
  }
];

export function CreateLessonDialog({
  open,
  onOpenChange,
  onLessonCreated,
  nextOrderIndex,
}: CreateLessonDialogProps) {
  const form = useForm<CreateLessonForm>({
    resolver: zodResolver(CreateLessonSchema),
    defaultValues: {
      title: '',
      description: '',
      content_type: 'video',
      duration_minutes: undefined,
      is_final_quiz: false,
    },
  });

  const contentType = form.watch('content_type');

  const onSubmit = (data: CreateLessonForm) => {
    const newLesson: Lesson = {
      id: Math.random().toString(36).substr(2, 9),
      title: data.title,
      description: data.description || '',
      content_type: data.content_type,
      order_index: nextOrderIndex,
      is_final_quiz: data.is_final_quiz,
      duration_minutes: data.duration_minutes,
    };

    onLessonCreated(newLesson);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Lesson</DialogTitle>
          <DialogDescription>
            Add a new lesson to this module. Choose the content type that best fits your learning objectives.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lesson Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Introduction to Components" {...field} />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Briefly describe what students will learn in this lesson"
                        className="min-h-[80px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Content Type Selection */}
            <FormField
              control={form.control}
              name="content_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Type</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-1 gap-3">
                      {contentTypes.map((type) => (
                        <label
                          key={type.value}
                          className={`
                            flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors
                            ${field.value === type.value 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:bg-muted/50'
                            }
                          `}
                        >
                          <input
                            type="radio"
                            value={type.value}
                            checked={field.value === type.value}
                            onChange={field.onChange}
                            className="sr-only"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm text-muted-foreground">{type.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content Type Specific Fields */}
            {contentType === 'video' && (
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="e.g., 15"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Approximate time it takes to complete this video lesson
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {contentType === 'text' && (
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Reading Time (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="e.g., 10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormDescription>
                      Approximate time it takes to read and understand this content
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {contentType === 'quiz' && (
              <FormField
                control={form.control}
                name="is_final_quiz"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Final Quiz</FormLabel>
                      <FormDescription>
                        Mark this as the final quiz that must be passed to complete the course
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create Lesson
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}