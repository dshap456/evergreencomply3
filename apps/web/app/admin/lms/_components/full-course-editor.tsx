'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { Badge } from '@kit/ui/badge';
import { Spinner } from '@kit/ui/spinner';
import { Plus, Edit, Trash2, Video, FileText, HelpCircle, Save, CheckCircle } from 'lucide-react';
import { VideoUpload } from './video-upload';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@kit/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { Checkbox } from '@kit/ui/checkbox';
import { toast } from '@kit/ui/sonner';
import { SimpleQuizBuilder } from './simple-quiz-builder';

interface FullCourseEditorProps {
  course: any;
  onBack: () => void;
  onSave?: (course: any) => void;
}

interface Module {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  content_type: 'video' | 'text' | 'quiz' | 'asset';
  video_url?: string;
  asset_url?: string;
  content?: string;
  order_index: number;
  is_final_quiz: boolean;
  passing_score: number;
}


export function FullCourseEditor({ course, onBack, onSave }: FullCourseEditorProps) {
  const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [lessonVideoMetadata, setLessonVideoMetadata] = useState<{[key: string]: any}>({});

  // Debug logging
  console.log('🎯 FullCourseEditor: Course data received:', {
    id: course?.id,
    title: course?.title,
    status: course?.status,
    is_published: course?.is_published,
    shouldShowPublishButton: (!course?.is_published && course?.status !== 'published')
  });

  // Load course structure
  useEffect(() => {
    async function loadCourseStructure() {
      try {
        const response = await fetch(`/api/admin/courses/${course.id}/lessons`);
        const result = await response.json();
        
        if (response.ok) {
          setModules(result.modules || []);
        } else {
          toast.error('Failed to load course structure');
        }
      } catch (error) {
        console.error('Error loading course structure:', error);
        toast.error('Error loading course structure');
      } finally {
        setLoading(false);
      }
    }

    if (course?.id) {
      loadCourseStructure();
    }
  }, [course?.id]);

  const handleSaveCourse = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });

      if (response.ok) {
        toast.success('Course updated successfully');
        if (onSave) {
          onSave({ ...course, title, description });
        }
      } else {
        toast.error('Failed to update course');
      }
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error('Error saving course');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishCourse = async () => {
    setSaving(true);
    try {
      console.log('🔄 Publishing course...', {
        id: course.id,
        title: course.title,
        currentStatus: course.status
      });

      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          description, 
          status: 'published' 
        })
      });

      if (response.ok) {
        toast.success('Course published successfully');
        // Update the course status locally
        course.status = 'published';
        if (onSave) {
          onSave({ ...course, title, description, status: 'published' });
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to publish course:', errorData);
        toast.error('Failed to publish course');
      }
    } catch (error) {
      console.error('Error publishing course:', error);
      toast.error('Error publishing course');
    } finally {
      setSaving(false);
    }
  };

  const handleAddModule = async () => {
    try {
      const newModule = {
        type: 'module',
        title: 'New Module',
        description: '',
        order_index: modules.length
      };

      const response = await fetch(`/api/admin/courses/${course.id}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModule)
      });

      if (response.ok) {
        const result = await response.json();
        setModules([...modules, { ...result.module, lessons: [] }]);
        toast.success('Module added');
      } else {
        toast.error('Failed to add module');
      }
    } catch (error) {
      console.error('Error adding module:', error);
      toast.error('Error adding module');
    }
  };

  const handleAddLesson = async (moduleId: string) => {
    try {
      const moduleIndex = modules.findIndex(m => m.id === moduleId);
      const module = modules[moduleIndex];
      
      // Calculate the next order_index by finding the maximum existing order_index
      const maxOrderIndex = module.lessons.length > 0 
        ? Math.max(...module.lessons.map(l => l.order_index)) 
        : -1;
      
      const newLesson = {
        type: 'lesson',
        module_id: moduleId,
        title: 'New Lesson',
        description: '',
        content_type: 'video',
        order_index: maxOrderIndex + 1
      };

      const response = await fetch(`/api/admin/courses/${course.id}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLesson)
      });

      if (response.ok) {
        const result = await response.json();
        const updatedModules = [...modules];
        updatedModules[moduleIndex].lessons.push(result.lesson);
        setModules(updatedModules);
        toast.success('Lesson added');
      } else {
        const errorData = await response.json();
        console.error('Error adding lesson:', errorData);
        toast.error(`Failed to add lesson: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error adding lesson:', error);
      toast.error('Error adding lesson');
    }
  };

  const handleSaveLesson = async (lesson: Lesson) => {
    try {
      const response = await fetch(`/api/admin/lessons/${lesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lesson)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update lesson in modules state
        const updatedModules = modules.map(module => ({
          ...module,
          lessons: module.lessons.map(l => 
            l.id === lesson.id ? result.lesson : l
          )
        }));
        setModules(updatedModules);
        setEditingLesson(null);
        toast.success('Lesson updated');
      } else {
        toast.error('Failed to update lesson');
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error('Error saving lesson');
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const updatedModules = modules.map(module => ({
          ...module,
          lessons: module.lessons.filter(l => l.id !== lessonId)
        }));
        setModules(updatedModules);
        toast.success('Lesson deleted');
      } else {
        toast.error('Failed to delete lesson');
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast.error('Error deleting lesson');
    }
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
  };

  const handleSaveModule = async (moduleData: { title: string; description: string }) => {
    if (!editingModule) return;

    try {
      const response = await fetch(`/api/admin/modules/${editingModule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: moduleData.title,
          description: moduleData.description,
          order_index: editingModule.order_index
        })
      });

      if (response.ok) {
        const result = await response.json();
        const updatedModules = modules.map(m => 
          m.id === editingModule.id 
            ? { ...m, title: result.module.title, description: result.module.description }
            : m
        );
        setModules(updatedModules);
        setEditingModule(null);
        toast.success('Module updated');
      } else {
        toast.error('Failed to update module');
      }
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Error updating module');
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module and all its lessons?')) return;

    try {
      const response = await fetch(`/api/admin/modules/${moduleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const updatedModules = modules.filter(m => m.id !== moduleId);
        setModules(updatedModules);
        toast.success('Module deleted');
      } else {
        toast.error('Failed to delete module');
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Error deleting module');
    }
  };


  const loadVideoMetadata = async (lessonId: string) => {
    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}/video`);
      const result = await response.json();
      
      if (response.ok && result.metadata) {
        setLessonVideoMetadata(prev => ({
          ...prev,
          [lessonId]: result.metadata
        }));
      }
    } catch (error) {
      console.error('Error loading video metadata:', error);
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'quiz': return <HelpCircle className="h-4 w-4" />;
      case 'text': return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
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
          <Button onClick={handleSaveCourse} disabled={saving}>
            {saving ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Course
              </>
            )}
          </Button>
          {(!course?.is_published && course?.status !== 'published') && (
            <Button 
              onClick={handlePublishCourse} 
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Publishing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Publish Course
                </>
              )}
            </Button>
          )}
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
              <label className="block text-sm font-medium mb-2">Modules</label>
              <span className="text-lg font-semibold">{modules.length}</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Total Lessons</label>
              <span className="text-lg font-semibold">
                {modules.reduce((total, module) => total + module.lessons.length, 0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Structure */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Course Structure</CardTitle>
          <Button onClick={handleAddModule}>
            <Plus className="mr-2 h-4 w-4" />
            Add Module
          </Button>
        </CardHeader>
        <CardContent>
          {modules.length > 0 ? (
            <div className="space-y-6">
              {modules.map((module, moduleIndex) => (
                <div key={module.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">Module {moduleIndex + 1}: {module.title}</h3>
                      {module.description && (
                        <p className="text-gray-600 text-sm mt-1">{module.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditModule(module)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Module
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleAddLesson(module.id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Lesson
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteModule(module.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {module.lessons.length > 0 ? (
                    <div className="space-y-2">
                      {module.lessons.map((lesson, lessonIndex) => (
                        <div key={lesson.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded">
                          <div className="flex items-center gap-2">
                            {getContentTypeIcon(lesson.content_type)}
                            <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                              {lesson.content_type}
                            </span>
                          </div>
                          <span className="flex-1">
                            {lessonIndex + 1}. {lesson.title}
                          </span>
                          {lesson.is_final_quiz && (
                            <Badge variant="outline" className="text-xs">
                              Final Quiz
                            </Badge>
                          )}
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setEditingLesson(lesson);
                                if (lesson.content_type === 'video') {
                                  loadVideoMetadata(lesson.id);
                                }
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {lesson.content_type === 'quiz' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setEditingQuiz(lesson.id);
                                }}
                              >
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteLesson(lesson.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No lessons in this module
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No modules found for this course</p>
              <Button variant="outline" onClick={handleAddModule}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Module
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lesson Editor Dialog */}
      <Dialog open={!!editingLesson} onOpenChange={() => setEditingLesson(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Lesson</DialogTitle>
          </DialogHeader>
          {editingLesson && (
            <LessonEditorForm
              lesson={editingLesson}
              onSave={handleSaveLesson}
              onCancel={() => setEditingLesson(null)}
              videoMetadata={lessonVideoMetadata[editingLesson.id]}
              onVideoUploaded={(metadata) => {
                setLessonVideoMetadata(prev => ({
                  ...prev,
                  [editingLesson.id]: metadata
                }));
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Module Editor Dialog */}
      <Dialog open={!!editingModule} onOpenChange={() => setEditingModule(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
          </DialogHeader>
          {editingModule && (
            <ModuleEditorForm
              module={editingModule}
              onSave={handleSaveModule}
              onCancel={() => setEditingModule(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Quiz Editor Dialog */}
      <Dialog open={!!editingQuiz} onOpenChange={() => setEditingQuiz(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quiz Questions</DialogTitle>
          </DialogHeader>
          {editingQuiz && (() => {
            // Find the lesson to get the is_final_quiz flag
            const lesson = modules
              .flatMap(m => m.lessons)
              .find(l => l.id === editingQuiz);
            
            return (
              <SimpleQuizBuilder
                lessonId={editingQuiz}
                isFinalQuiz={lesson?.is_final_quiz || false}
                onClose={() => setEditingQuiz(null)}
              />
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Lesson Editor Component
function LessonEditorForm({ 
  lesson, 
  onSave, 
  onCancel,
  videoMetadata,
  onVideoUploaded
}: { 
  lesson: Lesson; 
  onSave: (lesson: Lesson) => void; 
  onCancel: () => void; 
  videoMetadata?: any;
  onVideoUploaded?: (metadata: any) => void;
}) {
  const [formData, setFormData] = useState(lesson);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description</label>
        <Textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Content Type</label>
        <Select 
          value={formData.content_type} 
          onValueChange={(value) => setFormData({ ...formData, content_type: value as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="quiz">Quiz</SelectItem>
            <SelectItem value="asset">Asset</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.content_type === 'video' && onVideoUploaded && (
        <VideoUpload
          lessonId={lesson.id}
          onVideoUploaded={onVideoUploaded}
          existingVideo={videoMetadata}
        />
      )}

      {formData.content_type === 'text' && (
        <div>
          <label className="block text-sm font-medium mb-2">Content</label>
          <Textarea
            value={formData.content || ''}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={5}
          />
        </div>
      )}

      {formData.content_type === 'asset' && (
        <div>
          <label className="block text-sm font-medium mb-2">Asset URL</label>
          <Input
            value={formData.asset_url || ''}
            onChange={(e) => setFormData({ ...formData, asset_url: e.target.value })}
            placeholder="https://example.com/document.pdf"
          />
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Checkbox
          id="final-quiz"
          checked={formData.is_final_quiz}
          onCheckedChange={(checked) => setFormData({ ...formData, is_final_quiz: !!checked })}
        />
        <label htmlFor="final-quiz" className="text-sm">Final Quiz</label>
      </div>

      {(formData.content_type === 'quiz' || formData.is_final_quiz) && (
        <div>
          <label className="block text-sm font-medium mb-2">Passing Score (%)</label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.passing_score}
            onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) || 80 })}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(formData)}>
          Save Lesson
        </Button>
      </div>
    </div>
  );
}


// Module Editor Component
function ModuleEditorForm({ 
  module, 
  onSave, 
  onCancel 
}: {
  module: Module;
  onSave: (moduleData: { title: string; description: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, description });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Module Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter module title"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Description (Optional)</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter module description"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Module
        </Button>
      </div>
    </form>
  );
}