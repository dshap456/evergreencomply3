'use client';

import { useState } from 'react';

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

import { ModuleEditor } from './module-editor';
import { LessonEditor } from './lesson-editor';
import { CourseSettings } from './course-settings';

interface Course {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  lessons_count: number;
  enrollments_count: number;
  completion_rate: number;
  created_at: string;
  updated_at: string;
  version: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  content_type: 'video' | 'text' | 'quiz';
  order_index: number;
  is_final_quiz: boolean;
}

interface CourseEditorProps {
  course: Course;
  onBack: () => void;
  onSave: (course: Course) => void;
}

const mockModules: Module[] = [
  {
    id: '1',
    title: 'Getting Started',
    description: 'Introduction to the fundamentals',
    order_index: 1,
    lessons: [
      {
        id: '1',
        title: 'Welcome to the Course',
        description: 'Course overview and objectives',
        content_type: 'video',
        order_index: 1,
        is_final_quiz: false
      },
      {
        id: '2',
        title: 'Setting Up Your Environment',
        description: 'Install necessary tools and software',
        content_type: 'text',
        order_index: 2,
        is_final_quiz: false
      }
    ]
  },
  {
    id: '2',
    title: 'Core Concepts',
    description: 'Learn the essential concepts',
    order_index: 2,
    lessons: [
      {
        id: '3',
        title: 'Understanding the Basics',
        description: 'Fundamental concepts explained',
        content_type: 'video',
        order_index: 1,
        is_final_quiz: false
      },
      {
        id: '4',
        title: 'Knowledge Check',
        description: 'Test your understanding',
        content_type: 'quiz',
        order_index: 2,
        is_final_quiz: false
      }
    ]
  }
];

export function CourseEditor({ course, onBack, onSave }: CourseEditorProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [modules, setModules] = useState<Module[]>(mockModules);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [courseData, setCourseData] = useState(course);
  const [isDirty, setIsDirty] = useState(false);

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
    onSave(courseData);
    setIsDirty(false);
  };

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
              <Badge variant="secondary">{courseData.status}</Badge>
              <span className="text-sm text-muted-foreground">v{courseData.version}</span>
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
          <Button onClick={handleSave} disabled={!isDirty}>
            Save Changes
          </Button>
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
                    value={courseData.status}
                    onValueChange={(value: 'draft' | 'published' | 'archived') => {
                      setCourseData(prev => ({ ...prev, status: value }));
                      setIsDirty(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={courseData.description}
                  onChange={(e) => {
                    setCourseData(prev => ({ ...prev, description: e.target.value }));
                    setIsDirty(true);
                  }}
                  className="min-h-[100px]"
                />
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
                <div className="text-2xl font-bold">{courseData.lessons_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Enrollments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{courseData.enrollments_count}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{courseData.completion_rate}%</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="english-content" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">English Course Content</h3>
            <Button>+ Add Module</Button>
          </div>

          {/* Modules List */}
          <div className="space-y-4">
            {modules.map((module) => (
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
                            {lesson.content_type === 'video' && '📹'}
                            {lesson.content_type === 'text' && '📄'}
                            {lesson.content_type === 'quiz' && '📝'}
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
            ))}
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
            <Button>+ Add Module</Button>
          </div>

          {/* Modules List */}
          <div className="space-y-4">
            {modules.map((module) => (
              <Card key={module.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{module.title} (Spanish)</CardTitle>
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
                            {lesson.content_type === 'video' && '📹'}
                            {lesson.content_type === 'text' && '📄'}
                            {lesson.content_type === 'quiz' && '📝'}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{lesson.title} (Spanish)</p>
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
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}