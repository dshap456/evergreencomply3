'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Label } from '@kit/ui/label';
import { toast } from 'sonner';
import { Spinner } from '@kit/ui/spinner';
import { Badge } from '@kit/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function CourseSlugManagerPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [slugInputs, setSlugInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/diagnose-and-fix-courses');
      const data = await res.json();
      
      if (data.diagnosis?.currentCourses) {
        setCourses(data.diagnosis.currentCourses);
        // Initialize slug inputs
        const inputs: Record<string, string> = {};
        data.diagnosis.currentCourses.forEach((course: any) => {
          inputs[course.id] = course.slug || '';
        });
        setSlugInputs(inputs);
      }
    } catch (error) {
      toast.error('Failed to load courses');
      console.error(error);
    }
    setLoading(false);
  };

  const updateSlug = async (courseId: string, newSlug: string) => {
    setUpdating(courseId);
    
    try {
      // Use the direct update endpoint
      const res = await fetch('/api/direct-course-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          slug: newSlug
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.updateApplied) {
        toast.success('Slug updated successfully!');
        // Update local state
        setCourses(courses.map(c => 
          c.id === courseId ? { ...c, slug: newSlug } : c
        ));
      } else if (data.hint?.includes('protected')) {
        // If blocked by trigger, show specific message
        toast.error('This slug is protected. Use the "Fix Cart Slugs" button to apply cart-compatible slugs.');
      } else {
        toast.error('Failed to update slug: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      toast.error('Failed to update slug');
      console.error(error);
    }
    
    setUpdating(null);
  };

  const isProtectedSlug = (title: string, slug: string) => {
    const protectedMappings = [
      { titlePattern: /DOT HAZMAT.*General/i, slug: 'dot-hazmat-general' },
      { titlePattern: /DOT HAZMAT - 3/, slug: 'dot-hazmat' },
      { titlePattern: /Advanced.*HAZMAT/i, slug: 'advanced-hazmat' },
      { titlePattern: /EPA.*RCRA/i, slug: 'epa-rcra' }
    ];
    
    return protectedMappings.some(mapping => 
      mapping.titlePattern.test(title) && mapping.slug === slug
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Course Slug Manager</h1>
        
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Direct Database Updates</p>
              <p>This tool bypasses all UI restrictions and updates slugs directly in the database.</p>
              <p className="mt-1">Protected slugs (for cart functionality): dot-hazmat-general, dot-hazmat, advanced-hazmat, epa-rcra</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {courses.map((course) => {
            const isProtected = isProtectedSlug(course.title, course.slug);
            const currentInput = slugInputs[course.id] || '';
            const hasChanged = currentInput !== course.slug;
            
            return (
              <Card key={course.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{course.title}</span>
                    <div className="flex items-center gap-2">
                      {isProtected && (
                        <Badge variant="secondary" className="text-xs">
                          Protected
                        </Badge>
                      )}
                      <Badge variant={course.status === 'published' ? 'default' : 'outline'}>
                        {course.status}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label>Current Slug</Label>
                      <p className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {course.slug || '(no slug)'}
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor={`slug-${course.id}`}>New Slug</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`slug-${course.id}`}
                          value={currentInput}
                          onChange={(e) => setSlugInputs({
                            ...slugInputs,
                            [course.id]: e.target.value
                          })}
                          placeholder="enter-new-slug"
                          className="font-mono"
                          disabled={updating === course.id}
                        />
                        <Button
                          onClick={() => updateSlug(course.id, currentInput)}
                          disabled={!hasChanged || updating === course.id || !currentInput}
                          variant={hasChanged ? 'default' : 'outline'}
                        >
                          {updating === course.id ? (
                            <Spinner className="h-4 w-4" />
                          ) : (
                            'Update'
                          )}
                        </Button>
                        {hasChanged && (
                          <Button
                            variant="ghost"
                            onClick={() => setSlugInputs({
                              ...slugInputs,
                              [course.id]: course.slug || ''
                            })}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                      {isProtected && hasChanged && (
                        <p className="text-xs text-amber-600 mt-1">
                          Warning: This is a protected slug. Changing it may break the cart.
                        </p>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      ID: {course.id}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex gap-4">
          <Button onClick={loadCourses} variant="outline">
            Refresh Courses
          </Button>
          <Button 
            onClick={() => window.location.href = '/fix-courses'} 
            variant="secondary"
          >
            Fix Cart Slugs
          </Button>
        </div>
      </div>
    </div>
  );
}