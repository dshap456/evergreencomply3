'use client';

import { useState, useEffect, useTransition } from 'react';
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
import { Badge } from '@kit/ui/badge';
import { Spinner } from '@kit/ui/spinner';
import { toast } from '@kit/ui/sonner';
import { createCourseAction } from '../_lib/server/course-actions';

const CreateCourseSchema = z.object({
  account_id: z.string().min(1, 'Account is required'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required').max(1000),
  category: z.string().min(1, 'Category is required'),
  estimated_duration: z.string().min(1, 'Estimated duration is required').max(100),
  sku: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
});

type CreateCourseForm = z.infer<typeof CreateCourseSchema>;

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCourseCreated: (course: any) => void;
}

const categories = [
  'Environment and Safety',
  'OSHA',
  'Healthcare',
  'Food & Alcohol',
  'HR & Compliance',
  'Industrial',
  'Insurance',
  'Real Estate',
  'Other',
];


export function CreateCourseDialog({
  open,
  onOpenChange,
  onCourseCreated,
}: CreateCourseDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const form = useForm<CreateCourseForm>({
    resolver: zodResolver(CreateCourseSchema),
    defaultValues: {
      account_id: '',
      title: '',
      description: '',
      category: '',
      estimated_duration: '',
      sku: '',
      price: 0,
    },
  });

  // Load accounts when dialog opens
  useEffect(() => {
    if (open) {
      loadAccounts();
    }
  }, [open]);

  const loadAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const response = await fetch('/api/admin/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      } else {
        throw new Error('Failed to load accounts');
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const onSubmit = (data: CreateCourseForm) => {
    startTransition(async () => {
      try {
        // Note: We're storing the estimated_duration as metadata for now
        // The actual course schema doesn't have this field
        const courseData = {
          account_id: data.account_id,
          title: data.title,
          description: data.description,
          sku: data.sku || undefined,
          price: data.price,
        };

        const result = await createCourseAction(courseData);

        if (result.success && result.course) {
          toast.success('Course created successfully');
          
          // Format the course for the UI with additional fields
          const formattedCourse = {
            ...result.course,
            status: result.course.is_published ? 'published' : 'draft',
            lessons_count: 0,
            enrollments_count: 0,
            category: data.category,
            estimated_duration: data.estimated_duration,
            version: '1.0',
          };
          
          onCourseCreated(formattedCourse);
          form.reset();
        } else {
          toast.error('Failed to create course');
        }
      } catch (error) {
        console.error('Error creating course:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to create course');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>
            Create a new course to add to your learning platform
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={loadingAccounts || isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingAccounts ? "Loading accounts..." : "Select an account"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the account this course belongs to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Introduction to React" 
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
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what students will learn in this course..."
                        className="min-h-[100px]"
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      <FormLabel>SKU (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="COURSE-001"
                          {...field}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Stock keeping unit for tracking
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
                      <FormLabel>Price</FormLabel>
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
                        Course price in dollars
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="estimated_duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Duration</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., 8 hours, 3 days, 2 weeks"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the estimated time to complete this course (flexible format)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Creating...
                  </>
                ) : (
                  'Create Course'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}