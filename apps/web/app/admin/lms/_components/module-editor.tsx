'use client';

import { useState } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { toast } from '@kit/ui/sonner';
import { Spinner } from '@kit/ui/spinner';

import { CreateLessonDialog } from './create-lesson-dialog';
import { updateModuleAction, updateLessonOrderAction } from '../_lib/server/module-actions';

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
  language: 'en' | 'es';
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  content_type: 'video' | 'text' | 'quiz';
  order_index: number;
  is_final_quiz: boolean;
  language: 'en' | 'es';
  video_url?: string;
}

interface ModuleEditorProps {
  module: Module;
  onBack: () => void;
  onSave: (module: Module) => void;
  onEditLesson: (lesson: Lesson) => void;
}

export function ModuleEditor({ module, onBack, onSave, onEditLesson }: ModuleEditorProps) {
  const [moduleData, setModuleData] = useState(module);
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    console.log('handleSave called');
    setIsSaving(true);
    
    try {
      console.log('Starting save operation...');
      console.log('Module data:', {
        id: moduleData.id,
        title: moduleData.title,
        description: moduleData.description,
        order_index: moduleData.order_index,
        lessonCount: moduleData.lessons.length
      });
      
      // Save module metadata
      console.log('Calling updateModuleAction...');
      const moduleResult = await updateModuleAction({
        id: moduleData.id,
        title: moduleData.title,
        description: moduleData.description || '',
        order_index: moduleData.order_index,
      });
      console.log('Module update result:', moduleResult);
      
      // Save lesson order if there are lessons
      if (moduleData.lessons.length > 0) {
        console.log('Calling updateLessonOrderAction with lessons:', moduleData.lessons.map(l => ({id: l.id, order: l.order_index})));
        const lessonResult = await updateLessonOrderAction({
          moduleId: moduleData.id,
          lessons: moduleData.lessons.map(lesson => ({
            id: lesson.id,
            order_index: lesson.order_index,
          })),
        });
        console.log('Lesson order update result:', lessonResult);
      }
      
      toast.success('Module and lesson order saved successfully');
      onSave(moduleData);
      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save module - Full error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error message:', errorMessage);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      // Show more specific error message to user
      if (errorMessage.includes('do not belong to this module')) {
        toast.error('Some lessons do not belong to this module. Please refresh and try again.');
      } else if (errorMessage.includes('Unauthorized')) {
        toast.error('You are not authorized to perform this action.');
      } else {
        toast.error(`Failed to save module: ${errorMessage}`);
      }
      
      // Call debug endpoint for diagnostics
      try {
        const debugResponse = await fetch('/api/debug-module-save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            moduleId: moduleData.id,
            lessons: moduleData.lessons.map(lesson => ({
              id: lesson.id,
              order_index: lesson.order_index,
            })),
            moduleData: {
              title: moduleData.title,
              description: moduleData.description,
              order_index: moduleData.order_index,
            }
          })
        });
        const debugData = await debugResponse.json();
        console.error('Debug info:', debugData);
      } catch (debugError) {
        console.error('Debug endpoint failed:', debugError);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleLessonCreated = (newLesson: Lesson) => {
    const updatedModule = {
      ...moduleData,
      lessons: [...moduleData.lessons, newLesson].sort((a, b) => a.order_index - b.order_index)
    };
    setModuleData(updatedModule);
    setIsDirty(true);
    setShowCreateLesson(false);
  };

  const handleLessonDelete = (lessonId: string) => {
    const updatedModule = {
      ...moduleData,
      lessons: moduleData.lessons.filter(lesson => lesson.id !== lessonId)
    };
    setModuleData(updatedModule);
    setIsDirty(true);
  };

  const moveLesson = (lessonId: string, direction: 'up' | 'down') => {
    const lessons = [...moduleData.lessons];
    const currentIndex = lessons.findIndex(l => l.id === lessonId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= lessons.length) return;

    // Swap lessons
    [lessons[currentIndex], lessons[newIndex]] = [lessons[newIndex], lessons[currentIndex]];
    
    // Update order indices (0-based to match database)
    lessons.forEach((lesson, index) => {
      lesson.order_index = index;
    });

    setModuleData({
      ...moduleData,
      lessons
    });
    setIsDirty(true);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '';
      case 'text': return '';
      case 'quiz': return '';
      default: return '';
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video';
      case 'text': return 'Text/Reading';
      case 'quiz': return 'Quiz';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            ← Back to Course
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Module</h1>
            {isDirty && (
              <Badge variant="outline" className="text-orange-600 mt-1">
                Unsaved Changes
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Preview</Button>
          <Button onClick={handleSave} disabled={!isDirty || isSaving}>
            {isSaving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              'Save Module'
            )}
          </Button>
        </div>
      </div>

      {/* Module Information */}
      <Card>
        <CardHeader>
          <CardTitle>Module Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Module Title</label>
            <Input
              value={moduleData.title}
              onChange={(e) => {
                setModuleData(prev => ({ ...prev, title: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="Enter module title"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={moduleData.description}
              onChange={(e) => {
                setModuleData(prev => ({ ...prev, description: e.target.value }));
                setIsDirty(true);
              }}
              placeholder="Describe what this module covers"
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lessons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lessons ({moduleData.lessons.length})</CardTitle>
            <Button onClick={() => setShowCreateLesson(true)}>
              + Add Lesson
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {moduleData.lessons.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4"></div>
              <h3 className="text-lg font-medium mb-2">No lessons yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first lesson to get started with this module
              </p>
              <Button onClick={() => setShowCreateLesson(true)}>
                Create First Lesson
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {moduleData.lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50"
                >
                  {/* Drag Handle */}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveLesson(lesson.id, 'up')}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveLesson(lesson.id, 'down')}
                      disabled={index === moduleData.lessons.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      ↓
                    </Button>
                  </div>

                  {/* Order Number (display as 1-based for user) */}
                  <div className="flex items-center justify-center w-8 h-8 bg-muted rounded text-sm font-medium">
                    {lesson.order_index + 1}
                  </div>

                  {/* Content Type Icon */}
                  <div className="text-2xl">
                    {getContentTypeIcon(lesson.content_type)}
                  </div>

                  {/* Lesson Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{lesson.title}</h4>
                      {lesson.is_final_quiz && (
                        <Badge variant="secondary" className="text-xs">
                          Final Quiz
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{getContentTypeLabel(lesson.content_type)}</span>
                    </div>
                    {lesson.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {lesson.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditLesson(lesson)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this lesson?')) {
                          handleLessonDelete(lesson.id);
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Lesson Dialog */}
      <CreateLessonDialog
        open={showCreateLesson}
        onOpenChange={setShowCreateLesson}
        onLessonCreated={handleLessonCreated}
        nextOrderIndex={moduleData.lessons.length + 1}
        moduleId={moduleData.id}
        language={moduleData.language}
      />
    </div>
  );
}