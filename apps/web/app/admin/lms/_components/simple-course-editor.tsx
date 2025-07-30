'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { Badge } from '@kit/ui/badge';
import { Spinner } from '@kit/ui/spinner';

interface SimpleCourseEditorProps {
  course: any;
  onBack: () => void;
  onSave?: (course: any) => void;
}

export function SimpleCourseEditor({ course, onBack, onSave }: SimpleCourseEditorProps) {
  const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [saving, setSaving] = useState(false);
  const [modules, setModules] = useState(course?.modules || []);

  console.log('SimpleCourseEditor: Rendering with course:', course);

  const handleSave = async () => {
    setSaving(true);
    try {
      // For now, just log the save action
      console.log('Saving course changes:', { title, description });
      
      // Simulate save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onSave) {
        onSave({ ...course, title, description });
      }
      
      console.log('Course saved successfully');
    } catch (error) {
      console.error('Error saving course:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edit Course</h1>
          <p className="text-gray-600">Course ID: {course?.id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>

      {/* Course Basic Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter course title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter course description"
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Badge variant={course?.status === 'published' ? 'default' : 'secondary'}>
                {course?.status || 'draft'}
              </Badge>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Lessons</label>
              <span className="text-lg font-semibold">{course?.lessons_count || 0}</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Enrollments</label>
              <span className="text-lg font-semibold">{course?.enrollments_count || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Course Structure</CardTitle>
        </CardHeader>
        <CardContent>
          {modules && modules.length > 0 ? (
            <div className="space-y-4">
              {modules.map((module: any, index: number) => (
                <div key={module.id || index} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Module {index + 1}: {module.title}</h3>
                  {module.description && (
                    <p className="text-gray-600 text-sm mb-3">{module.description}</p>
                  )}
                  
                  {module.lessons && module.lessons.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Lessons ({module.lessons.length}):</h4>
                      {module.lessons.map((lesson: any, lessonIndex: number) => (
                        <div key={lesson.id || lessonIndex} className="flex items-center gap-3 bg-gray-50 p-2 rounded">
                          <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                            {lesson.content_type || 'text'}
                          </span>
                          <span className="flex-1">{lesson.title}</span>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No lessons in this module</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No modules found for this course</p>
              <Button variant="outline">
                Add Module
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium mb-2">View Raw Course Data</summary>
            <pre className="bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(course, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}