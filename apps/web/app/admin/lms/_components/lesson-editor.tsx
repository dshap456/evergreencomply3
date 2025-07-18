'use client';

import { useState } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { Switch } from '@kit/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { VideoUpload } from '@kit/lms/components/video-upload';
import { QuizEditor } from './quiz-editor';
import { TextContentEditor } from './text-content-editor';

interface Lesson {
  id: string;
  title: string;
  description: string;
  content_type: 'video' | 'text' | 'quiz';
  order_index: number;
  is_final_quiz: boolean;
  duration_minutes?: number;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: Lesson[];
}

interface LessonEditorProps {
  lesson: Lesson;
  module: Module;
  onBack: () => void;
  onSave: (lesson: Lesson) => void;
}

export function LessonEditor({ lesson, module, onBack, onSave }: LessonEditorProps) {
  const [lessonData, setLessonData] = useState(lesson);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const handleSave = () => {
    onSave(lessonData);
    setIsDirty(false);
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '📹';
      case 'text': return '📄';
      case 'quiz': return '📝';
      default: return '📄';
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'video': return 'Video Lesson';
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
            ← Back to Module
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{getContentTypeIcon(lessonData.content_type)}</span>
              <h1 className="text-2xl font-bold">{lessonData.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{getContentTypeLabel(lessonData.content_type)}</Badge>
              <span className="text-sm text-muted-foreground">
                Module: {module.title}
              </span>
              {lessonData.is_final_quiz && (
                <Badge variant="outline" className="text-orange-600">
                  Final Quiz
                </Badge>
              )}
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
            Save Lesson
          </Button>
        </div>
      </div>

      {/* Lesson Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="translations">Translations</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Lesson Title</label>
                <Input
                  value={lessonData.title}
                  onChange={(e) => {
                    setLessonData(prev => ({ ...prev, title: e.target.value }));
                    setIsDirty(true);
                  }}
                  placeholder="Enter lesson title"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={lessonData.description}
                  onChange={(e) => {
                    setLessonData(prev => ({ ...prev, description: e.target.value }));
                    setIsDirty(true);
                  }}
                  placeholder="Describe what students will learn in this lesson"
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Order in Module</label>
                  <Input
                    type="number"
                    value={lessonData.order_index}
                    onChange={(e) => {
                      setLessonData(prev => ({ 
                        ...prev, 
                        order_index: parseInt(e.target.value) || 1 
                      }));
                      setIsDirty(true);
                    }}
                    min="1"
                  />
                </div>

                {(lessonData.content_type === 'video' || lessonData.content_type === 'text') && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {lessonData.content_type === 'video' ? 'Duration' : 'Reading Time'} (minutes)
                    </label>
                    <Input
                      type="number"
                      value={lessonData.duration_minutes || ''}
                      onChange={(e) => {
                        setLessonData(prev => ({ 
                          ...prev, 
                          duration_minutes: parseInt(e.target.value) || undefined 
                        }));
                        setIsDirty(true);
                      }}
                      min="1"
                      placeholder="e.g., 15"
                    />
                  </div>
                )}
              </div>

              {lessonData.content_type === 'quiz' && (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium">Final Quiz</label>
                    <p className="text-sm text-muted-foreground">
                      Mark this as the final quiz that must be passed to complete the course
                    </p>
                  </div>
                  <Switch
                    checked={lessonData.is_final_quiz}
                    onCheckedChange={(checked) => {
                      setLessonData(prev => ({ ...prev, is_final_quiz: checked }));
                      setIsDirty(true);
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          {lessonData.content_type === 'video' && (
            <Card>
              <CardHeader>
                <CardTitle>Video Content</CardTitle>
              </CardHeader>
              <CardContent>
                <VideoUpload
                  lessonId={lessonData.id}
                  courseId="mock-course-id" // This would come from context
                  accountId="mock-account-id" // This would come from context
                  languageCode="en"
                  onUploadComplete={(videoMetadataId) => {
                    console.log('Video uploaded:', videoMetadataId);
                    // Handle video upload completion
                  }}
                  onUploadError={(error) => {
                    console.error('Video upload failed:', error);
                    // Handle upload error
                  }}
                />
              </CardContent>
            </Card>
          )}

          {lessonData.content_type === 'text' && (
            <TextContentEditor
              lessonId={lessonData.id}
              onContentChange={() => setIsDirty(true)}
            />
          )}

          {lessonData.content_type === 'quiz' && (
            <QuizEditor
              lessonId={lessonData.id}
              isFinalQuiz={lessonData.is_final_quiz}
              onQuizChange={() => setIsDirty(true)}
            />
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lesson Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <label className="text-base font-medium">Published</label>
                  <p className="text-sm text-muted-foreground">
                    Make this lesson visible to students
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <label className="text-base font-medium">Allow Comments</label>
                  <p className="text-sm text-muted-foreground">
                    Let students ask questions and discuss this lesson
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <label className="text-base font-medium">Track Completion</label>
                  <p className="text-sm text-muted-foreground">
                    Require students to mark this lesson as complete
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              {lessonData.content_type === 'video' && (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium">Prevent Skipping</label>
                    <p className="text-sm text-muted-foreground">
                      Students must watch the entire video to proceed
                    </p>
                  </div>
                  <Switch />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="translations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Translations</CardTitle>
                <Button variant="outline" size="sm">
                  + Add Translation
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <span className="text-2xl">🇺🇸</span>
                  <div className="flex-1">
                    <h4 className="font-medium">English (Original)</h4>
                    <p className="text-sm text-muted-foreground">Primary language</p>
                  </div>
                  <Badge variant="secondary">Complete</Badge>
                </div>

                <div className="flex items-center gap-4 p-4 border rounded-lg border-dashed">
                  <span className="text-2xl">🇪🇸</span>
                  <div className="flex-1">
                    <h4 className="font-medium">Spanish</h4>
                    <p className="text-sm text-muted-foreground">Translation needed</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Translate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}