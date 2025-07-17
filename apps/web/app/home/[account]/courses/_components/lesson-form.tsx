'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Upload, X, FileIcon, VideoIcon } from 'lucide-react';

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
import { Label } from '@kit/ui/label';
import { RadioGroup, RadioGroupItem } from '@kit/ui/radio-group';
import { Spinner } from '@kit/ui/spinner';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';
import { toast } from '@kit/ui/sonner';

import { createLessonAction, updateLessonAction } from '../_lib/server/server-actions';
import { useFileUpload } from '../_lib/client/file-upload';

const LessonFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  content_type: z.enum(['video', 'text', 'quiz', 'asset']),
  content: z.string().optional(),
  video_url: z.string().url().optional().or(z.literal('')),
  asset_url: z.string().url().optional().or(z.literal('')),
  order_index: z.coerce.number().int().min(0),
  is_final_quiz: z.boolean().default(false),
  passing_score: z.coerce.number().min(0).max(100).default(80),
});

type LessonFormData = z.infer<typeof LessonFormSchema>;

interface Lesson {
  id?: string;
  title: string;
  description: string | null;
  content_type: string;
  content: string | null;
  video_url: string | null;
  asset_url: string | null;
  order_index: number;
  is_final_quiz: boolean;
  passing_score: number;
}

interface LessonFormProps {
  account: string;
  moduleId: string;
  lesson?: Lesson;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function LessonForm({ account, moduleId, lesson, onSuccess, onCancel }: LessonFormProps) {
  const [isPending, startTransition] = useTransition();
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const router = useRouter();
  const { uploadFile } = useFileUpload();

  const form = useForm<LessonFormData>({
    resolver: zodResolver(LessonFormSchema),
    defaultValues: {
      title: lesson?.title || '',
      description: lesson?.description || '',
      content_type: (lesson?.content_type as any) || 'video',
      content: lesson?.content || '',
      video_url: lesson?.video_url || '',
      asset_url: lesson?.asset_url || '',
      order_index: lesson?.order_index || 0,
      is_final_quiz: lesson?.is_final_quiz || false,
      passing_score: lesson?.passing_score || 80,
    },
  });

  const contentType = form.watch('content_type');
  const isQuiz = contentType === 'quiz';

  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    setUploadingVideo(true);
    setUploadProgress(0);

    try {
      const videoUrl = await uploadFile(
        file, 
        `${account}/videos`,
        (progress) => setUploadProgress(progress)
      );
      
      form.setValue('video_url', videoUrl);
      toast.success('Video uploaded successfully');
    } catch (error) {
      console.error('Video upload error:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const handleAssetUpload = async (file: File) => {
    setUploadingAsset(true);
    setUploadProgress(0);

    try {
      const assetUrl = await uploadFile(
        file, 
        `${account}/assets`,
        (progress) => setUploadProgress(progress)
      );
      
      form.setValue('asset_url', assetUrl);
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Asset upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingAsset(false);
      setUploadProgress(0);
    }
  };

  const onSubmit = (data: LessonFormData) => {
    startTransition(async () => {
      try {
        let result;
        
        if (lesson?.id) {
          result = await updateLessonAction({
            account,
            lessonId: lesson.id,
            ...data,
          });
        } else {
          result = await createLessonAction({
            account,
            moduleId,
            ...data,
          });
        }

        if (result.success) {
          toast.success(lesson?.id ? 'Lesson updated successfully' : 'Lesson created successfully');
          onSuccess?.();
        } else {
          toast.error(result.error || 'Failed to save lesson');
        }
      } catch (error) {
        console.error('Error saving lesson:', error);
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {lesson?.id ? 'Edit Lesson' : 'Create New Lesson'}
        </CardTitle>
        <CardDescription>
          Add engaging content to your course module
        </CardDescription>
      </CardHeader>
      
      <CardContent>
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
                      <Input 
                        placeholder="Enter lesson title..." 
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe what students will learn..." 
                        {...field} 
                        disabled={isPending}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="order_index"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lesson Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        {...field} 
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Order of this lesson within the module (0 = first)
                    </FormDescription>
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
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-4"
                      disabled={isPending}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="video" id="video" />
                        <Label htmlFor="video" className="flex items-center space-x-2 cursor-pointer">
                          <VideoIcon className="h-4 w-4" />
                          <span>Video</span>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="text" id="text" />
                        <Label htmlFor="text" className="cursor-pointer">Text Content</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="quiz" id="quiz" />
                        <Label htmlFor="quiz" className="cursor-pointer">Quiz</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="asset" id="asset" />
                        <Label htmlFor="asset" className="flex items-center space-x-2 cursor-pointer">
                          <FileIcon className="h-4 w-4" />
                          <span>File/PDF</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content-specific fields */}
            {contentType === 'video' && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="video_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          {field.value ? (
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-2">
                                <VideoIcon className="h-4 w-4" />
                                <span className="text-sm">Video uploaded</span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => field.onChange('')}
                                disabled={isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                              <div className="text-center">
                                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground mb-2">
                                  Click to upload a video file
                                </p>
                                <input
                                  type="file"
                                  accept="video/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleVideoUpload(file);
                                  }}
                                  className="hidden"
                                  id="video-upload"
                                  disabled={isPending || uploadingVideo}
                                />
                                <Label htmlFor="video-upload" className="cursor-pointer">
                                  <Button type="button" variant="outline" disabled={uploadingVideo}>
                                    {uploadingVideo ? (
                                      <>
                                        <Spinner className="mr-2 h-4 w-4" />
                                        Uploading... {uploadProgress}%
                                      </>
                                    ) : (
                                      'Choose Video File'
                                    )}
                                  </Button>
                                </Label>
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {contentType === 'text' && (
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Text Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your lesson content here..." 
                        {...field} 
                        disabled={isPending}
                        rows={8}
                      />
                    </FormControl>
                    <FormDescription>
                      Rich text editor coming soon - for now use plain text
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {contentType === 'asset' && (
              <FormField
                control={form.control}
                name="asset_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>File/PDF</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {field.value ? (
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-2">
                              <FileIcon className="h-4 w-4" />
                              <span className="text-sm">File uploaded</span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => field.onChange('')}
                              disabled={isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                            <div className="text-center">
                              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground mb-2">
                                Upload PDF, documents, or other files
                              </p>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleAssetUpload(file);
                                }}
                                className="hidden"
                                id="asset-upload"
                                disabled={isPending || uploadingAsset}
                              />
                              <Label htmlFor="asset-upload" className="cursor-pointer">
                                <Button type="button" variant="outline" disabled={uploadingAsset}>
                                  {uploadingAsset ? (
                                    <>
                                      <Spinner className="mr-2 h-4 w-4" />
                                      Uploading... {uploadProgress}%
                                    </>
                                  ) : (
                                    'Choose File'
                                  )}
                                </Button>
                              </Label>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Quiz Settings */}
            {isQuiz && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium">Quiz Settings</h3>
                
                <FormField
                  control={form.control}
                  name="is_final_quiz"
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
                        <FormLabel>Final Quiz</FormLabel>
                        <FormDescription>
                          Mark this as the final quiz for the course (used for completion tracking)
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
                      <FormLabel>Passing Score (%)</FormLabel>
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
                        Minimum score required to pass this quiz (default: 80%)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="text-sm text-muted-foreground p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                  <p className="font-medium">Note:</p>
                  <p>Quiz questions will be added after creating the lesson. Students must achieve the passing score to continue with sequential completion.</p>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                disabled={isPending}
                onClick={onCancel || (() => router.back())}
              >
                Cancel
              </Button>
              
              <Button type="submit" disabled={isPending || uploadingVideo || uploadingAsset}>
                {isPending && <Spinner className="mr-2 h-4 w-4" />}
                {lesson?.id ? 'Update Lesson' : 'Create Lesson'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}