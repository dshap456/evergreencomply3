'use client';

import { useState, useTransition } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';

import { ModuleEditor } from './module-editor';
import { LessonEditor } from './lesson-editor';
import { CourseSettings } from './course-settings';
import { updateCourseAction } from '../_lib/server/course-actions';
import { createModuleAction } from '../_lib/server/module-actions';
import { CourseStatus } from '../_lib/types/data-contracts';

interface Course {
  id: string;
  title: string;
  description: string;
  slug?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

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
}

interface CourseEditorClientProps {
  course: Course;
  modules: Module[];
  onBack: () => void;
}

export function CourseEditorClient({ course: initialCourse, modules: initialModules, onBack }: CourseEditorClientProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [courseData, setCourseData] = useState(initialCourse);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'es'>('en');
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [newModule, setNewModule] = useState({ title: '', description: '', language: 'en' as 'en' | 'es' });

  // If editing a specific lesson
  if (selectedLesson && selectedModule) {
    return (
      <LessonEditor
        lesson={selectedLesson}
        module={selectedModule}
        onBack={() => setSelectedLesson(null)}
        onSave={(updatedLesson) => {
          const updatedModules = modules.map(module => 
            module.id === selectedModule.id 
              ? {
                  ...module,
                  lessons: module.lessons.map(lesson =>
                    lesson.id === updatedLesson.id ? updatedLesson : lesson
                  )
                }
              : module
          );
          setModules(updatedModules);
          setSelectedLesson(null);
          setIsDirty(true);
        }}
      />
    );
  }

  // If editing a specific module
  if (selectedModule) {
    return (
      <ModuleEditor
        module={selectedModule}
        onBack={() => setSelectedModule(null)}
        onSave={(updatedModule) => {
          setModules(prev => prev.map(m => m.id === updatedModule.id ? updatedModule : m));
          setSelectedModule(null);
          setIsDirty(true);
        }}
        onEditLesson={(lesson) => setSelectedLesson(lesson)}
      />
    );
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateCourseAction({
          id: courseData.id,
          title: courseData.title,
          description: courseData.description,
          slug: courseData.slug,
          status: courseData.is_published ? CourseStatus.PUBLISHED : CourseStatus.DRAFT,
        });
        
        toast.success('Course saved successfully');
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to save course:', error);
        toast.error('Failed to save course');
      }
    });
  };

  const handlePublish = () => {
    startTransition(async () => {
      try {
        await updateCourseAction({
          id: courseData.id,
          title: courseData.title,
          description: courseData.description,
          slug: courseData.slug,
          status: CourseStatus.PUBLISHED,
        });
        
        setCourseData(prev => ({ ...prev, is_published: true }));
        toast.success('Course published successfully');
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to publish course:', error);
        toast.error('Failed to publish course');
      }
    });
  };

  const handleAddModule = () => {
    startTransition(async () => {
      try {
        const orderIndex = modules.filter(m => m.language === newModule.language).length + 1;
        
        const result = await createModuleAction({
          course_id: courseData.id,
          title: newModule.title,
          description: newModule.description,
          order_index: orderIndex,
          language: newModule.language,
        });
        
        if (result.module) {
          setModules([...modules, { ...result.module, lessons: [] }]);
          setIsAddModuleOpen(false);
          setNewModule({ title: '', description: '', language: 'en' });
          toast.success('Module created successfully');
        }
      } catch (error) {
        console.error('Failed to create module:', error);
        toast.error('Failed to create module');
      }
    });
  };

  const lessonCount = modules.reduce((acc, module) => acc + module.lessons.length, 0);
  
  // Filter modules by selected language
  const englishModules = modules.filter(m => m.language === 'en');
  const spanishModules = modules.filter(m => m.language === 'es');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            ← Back to Courses
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{courseData.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">
                {courseData.is_published ? 'Published' : 'Draft'}
              </Badge>
              {isDirty && (
                <Badge variant="outline" className="text-orange-600">
                  Unsaved Changes
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Preview</Button>
          <Button onClick={handleSave} disabled={!isDirty || isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
          {!courseData.is_published && (
            <Button 
              onClick={handlePublish} 
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Publishing...
                </>
              ) : (
                'Publish Course'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Main Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Basic Info</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="english-content">English Content</TabsTrigger>
          <TabsTrigger value="spanish-content">Spanish Content</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={courseData.title}
                    onChange={(e) => {
                      setCourseData(prev => ({ ...prev, title: e.target.value }));
                      setIsDirty(true);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={courseData.is_published ? 'published' : 'draft'}
                    onValueChange={(value) => {
                      setCourseData(prev => ({ ...prev, is_published: value === 'published' }));
                      setIsDirty(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={courseData.description || ''}
                  onChange={(e) => {
                    setCourseData(prev => ({ ...prev, description: e.target.value }));
                    setIsDirty(true);
                  }}
                  className="min-h-[100px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  URL Slug 
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (e.g., dot-hazmat-general)
                  </span>
                </label>
                <Input
                  value={courseData.slug || ''}
                  onChange={(e) => {
                    setCourseData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }));
                    setIsDirty(true);
                  }}
                  placeholder="course-url-slug"
                  className="font-mono"
                />
                <p className="text-sm text-muted-foreground">
                  Course URL will be: /courses/{courseData.slug || 'course-url-slug'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Course Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Lessons</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lessonCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Modules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{modules.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {courseData.is_published ? 'Live' : 'Draft'}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="english-content" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">English Course Content</h3>
            <Button onClick={() => {
              setNewModule(prev => ({ ...prev, language: 'en' }));
              setIsAddModuleOpen(true);
            }}>+ Add Module</Button>
          </div>

          {/* English Modules List */}
          <div className="space-y-4">
            {englishModules.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No English content yet. Click "Add Module" to get started.
                </CardContent>
              </Card>
            ) : (
              englishModules.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedModule(module)}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">⋮</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {module.lessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-3">
                          <span className="text-sm">
                            {lesson.content_type === 'video' && ''}
                            {lesson.content_type === 'text' && ''}
                            {lesson.content_type === 'quiz' && ''}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{lesson.title}</p>
                            <p className="text-xs text-muted-foreground">{lesson.description}</p>
                          </div>
                          {lesson.is_final_quiz && (
                            <Badge variant="secondary" className="text-xs">Final</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedModule(module);
                              setSelectedLesson(lesson);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )))}
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <CourseSettings 
            course={courseData}
            onChange={(updatedCourse) => {
              setCourseData(updatedCourse);
              setIsDirty(true);
            }}
          />
        </TabsContent>

        <TabsContent value="spanish-content" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Spanish Course Content</h3>
            <Button onClick={() => {
              setNewModule(prev => ({ ...prev, language: 'es' }));
              setIsAddModuleOpen(true);
            }}>+ Add Module</Button>
          </div>

          {/* Spanish Modules List */}
          <div className="space-y-4">
            {spanishModules.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No Spanish content yet. Click "Add Module" to get started.
                </CardContent>
              </Card>
            ) : (
              spanishModules.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{module.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedModule(module)}
                      >
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm">⋮</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {module.lessons.map((lesson) => (
                      <div key={lesson.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-3">
                          <span className="text-sm">
                            {lesson.content_type === 'video' && ''}
                            {lesson.content_type === 'text' && ''}
                            {lesson.content_type === 'quiz' && ''}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{lesson.title}</p>
                            <p className="text-xs text-muted-foreground">{lesson.description}</p>
                          </div>
                          {lesson.is_final_quiz && (
                            <Badge variant="secondary" className="text-xs">Final</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setSelectedModule(module);
                              setSelectedLesson(lesson);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Module Dialog */}
      <Dialog open={isAddModuleOpen} onOpenChange={setIsAddModuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Module ({newModule.language === 'en' ? 'English' : 'Spanish'})</DialogTitle>
            <DialogDescription>
              Create a new module for the {newModule.language === 'en' ? 'English' : 'Spanish'} version of the course.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Module Title</label>
              <Input
                value={newModule.title}
                onChange={(e) => setNewModule(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Introduction to Course"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea
                value={newModule.description}
                onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the module content"
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModuleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddModule} disabled={!newModule.title || isPending}>
              {isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                'Create Module'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}