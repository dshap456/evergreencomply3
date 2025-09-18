'use client';

import { useState } from 'react';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Label } from '@kit/ui/label';
import { toast } from 'sonner';
import { Spinner } from '@kit/ui/spinner';
import { Badge } from '@kit/ui/badge';
import { updateCourseAction } from '../_lib/server/actions';

interface Course {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: number;
}

interface CourseManagementClientProps {
  initialCourses: Course[];
}

export function CourseManagementClient({ initialCourses }: CourseManagementClientProps) {
  const supabase = useSupabase();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [saving, setSaving] = useState<string | null>(null);

  const updateCourse = async (courseId: string, updates: any) => {
    setSaving(courseId);
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .select()
      .single();

    if (error) {
      toast.error(`Failed to update course: ${error.message}`);
      console.error('Update error:', error);
    } else if (data) {
      toast.success('Course updated successfully');
      // Update local state
      setCourses(courses.map(c => c.id === courseId ? data : c));

      // Verify the update by fetching again
      const { data: verifyData, error: verifyError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (verifyData && verifyData.slug !== updates.slug) {
        console.warn('Slug did not save! Expected:', updates.slug, 'Got:', verifyData.slug);
        toast.error('Slug update may have failed - check console');
      }
    }

    setSaving(null);
  };

  const handleSlugChange = (courseId: string, newSlug: string) => {
    updateCourse(courseId, { slug: newSlug });
  };

  const handleStatusChange = (courseId: string, newStatus: string) => {
    updateCourse(courseId, { status: newStatus });
  };

  const refreshCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('title');

    if (error) {
      toast.error('Failed to refresh courses');
    } else {
      setCourses(data || []);
      toast.success('Courses refreshed');
    }
  };

  const handleServerActionUpdate = async (courseId: string, updates: any) => {
    setSaving(courseId);
    const result = await updateCourseAction(courseId, updates);

    if (result.success) {
      toast.success('Course updated via server action');
      // Update local state
      setCourses(courses.map(c => c.id === courseId ? result.data : c));
    } else {
      toast.error(`Server action failed: ${result.error}`);
    }

    setSaving(null);
  };

  return (
    <>
      <div className="mb-4 p-4 bg-muted rounded-lg">
        <p className="text-sm">Debug: Click "Save" button or press Enter to update slug. Check console for details.</p>
      </div>
      <div className="space-y-4">
        {courses.map((course) => (
          <Card key={course.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{course.title}</span>
                <Badge variant={course.status === 'published' ? 'default' : 'secondary'}>
                  {course.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`slug-${course.id}`}>URL Slug</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`slug-${course.id}`}
                      defaultValue={course.slug}
                      placeholder="course-url-slug"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newSlug = (e.target as HTMLInputElement).value;
                          if (newSlug !== course.slug) {
                            handleSlugChange(course.id, newSlug);
                          }
                        }
                      }}
                      disabled={saving === course.id}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const input = document.getElementById(`slug-${course.id}`) as HTMLInputElement;
                        const newSlug = input?.value;
                        if (newSlug && newSlug !== course.slug) {
                          handleSlugChange(course.id, newSlug);
                        }
                      }}
                      disabled={saving === course.id}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const input = document.getElementById(`slug-${course.id}`) as HTMLInputElement;
                        const newSlug = input?.value;
                        if (newSlug && newSlug !== course.slug) {
                          handleServerActionUpdate(course.id, { slug: newSlug });
                        }
                      }}
                      disabled={saving === course.id}
                      title="Use server action (admin client)"
                    >
                      SA
                    </Button>
                    {saving === course.id && <Spinner className="h-4 w-4" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    /courses/{course.slug || 'slug-not-set'}
                  </p>
                </div>

                <div>
                  <Label>Status</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={course.status === 'published' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(course.id, 'published')}
                      disabled={saving === course.id}
                    >
                      Published
                    </Button>
                    <Button
                      size="sm"
                      variant={course.status === 'draft' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(course.id, 'draft')}
                      disabled={saving === course.id}
                    >
                      Draft
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                ID: {course.id} | Price: ${course.price || 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Button onClick={refreshCourses} variant="outline">
          Refresh Courses
        </Button>
      </div>
    </>
  );
}
