'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { AdminGuard } from '@kit/admin/components/admin-guard';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Label } from '@kit/ui/label';
import { toast } from '@kit/ui/sonner';
import { Spinner } from '@kit/ui/spinner';
import { Badge } from '@kit/ui/badge';

function AdminCoursesPage() {
  const supabase = useSupabase();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('title');

    if (error) {
      toast.error('Failed to load courses');
      console.error(error);
    } else {
      setCourses(data || []);
    }
    setLoading(false);
  };

  const updateCourse = async (courseId: string, updates: any) => {
    setSaving(courseId);
    
    const { data, error } = await supabase
      .from('courses')
      .update(updates)
      .eq('id', courseId)
      .select()
      .single();

    if (error) {
      toast.error('Failed to update course');
      console.error(error);
    } else {
      toast.success('Course updated successfully');
      // Update local state
      setCourses(courses.map(c => c.id === courseId ? data : c));
    }
    
    setSaving(null);
  };

  const handleSlugChange = (courseId: string, newSlug: string) => {
    updateCourse(courseId, { slug: newSlug });
  };

  const handleStatusChange = (courseId: string, newStatus: string) => {
    updateCourse(courseId, { status: newStatus });
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Course Management" />
        <PageBody>
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader 
        title="Course Management" 
        description="Manage course slugs and publishing status"
      />
      
      <PageBody>
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
                        onBlur={(e) => {
                          if (e.target.value !== course.slug) {
                            handleSlugChange(course.id, e.target.value);
                          }
                        }}
                        disabled={saving === course.id}
                      />
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
          <Button onClick={loadCourses} variant="outline">
            Refresh Courses
          </Button>
        </div>
      </PageBody>
    </>
  );
}

export default AdminGuard(AdminCoursesPage);