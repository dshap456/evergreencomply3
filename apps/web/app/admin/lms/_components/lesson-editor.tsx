'use client';

import { useState, useTransition, useRef, useEffect } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { Switch } from '@kit/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { toast } from '@kit/ui/sonner';
import { Spinner } from '@kit/ui/spinner';

import { VideoUpload } from '@kit/lms/components/video-upload';
import { QuizEditor, QuizEditorRef } from './quiz-editor';
import { TextContentEditor } from './text-content-editor';
import { VideoContentDisplay } from './video-content-display';
import { updateLessonAction, saveQuizDataAction, testQuizSaveAction, loadQuizDataAction } from '../_lib/server/lesson-actions';

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

interface Module {
  id: string;
  title: string;
  description: string;
  order_index: number;
  language: 'en' | 'es';
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
  const [isPending, startTransition] = useTransition();
  const quizEditorRef = useRef<QuizEditorRef>(null);
  const [existingQuizData, setExistingQuizData] = useState<any>(null);
  const [loadingQuizData, setLoadingQuizData] = useState(false);
  
  // Load existing quiz data if this is a quiz lesson
  useEffect(() => {
    if (lessonData.content_type === 'quiz') {
      console.log('🔄 LessonEditor: Loading existing quiz data for lesson:', lessonData.id);
      setLoadingQuizData(true);
      
      loadQuizDataAction({ lessonId: lessonData.id })
        .then((result) => {
          if (result.success && result.questions && result.questions.length > 0) {
            // Transform database questions back to quiz editor format
            const transformedQuestions = result.questions.map((q: any) => ({
              id: q.id || Math.random().toString(36).substr(2, 9),
              question_text: q.question,
              question_type: q.question_type,
              order_index: q.order_index,
              options: Array.isArray(q.options) ? q.options.map((optText: string, idx: number) => ({
                id: Math.random().toString(36).substr(2, 9),
                option_text: optText,
                is_correct: optText === q.correct_answer,
                order_index: idx + 1
              })) : [],
              correct_answer: q.correct_answer,
              explanation: q.explanation || '',
              points: q.points || 1
            }));
            
            const quizData = {
              id: 'loaded-quiz-id',
              title: 'Lesson Quiz',
              description: 'Test your understanding of this lesson',
              passing_score: 80,
              time_limit_minutes: undefined,
              max_attempts: 3,
              questions: transformedQuestions
            };
            
            console.log('✅ LessonEditor: Loaded and transformed quiz data:', quizData);
            setExistingQuizData(quizData);
          } else {
            console.log('ℹ️ LessonEditor: No existing quiz data found');
          }
        })
        .catch((error) => {
          console.error('❌ LessonEditor: Failed to load quiz data:', error);
        })
        .finally(() => {
          setLoadingQuizData(false);
        });
    }
  }, [lessonData.id, lessonData.content_type]);

  const handleSave = () => {
    startTransition(async () => {
      try {
        console.log('🔄 LessonEditor: Saving lesson with video data...', {
          id: lessonData.id,
          title: lessonData.title,
          content_type: lessonData.content_type,
          video_url: lessonData.video_url ? 'present' : 'missing'
        });

        // First, update the basic lesson data
        const updateData = {
          id: lessonData.id,
          title: lessonData.title,
          description: lessonData.description || undefined,
          content_type: lessonData.content_type,
          order_index: lessonData.order_index,
          is_final_quiz: lessonData.is_final_quiz,
          language: lessonData.language,
          video_url: lessonData.video_url || undefined,
        };
        
        console.log('🔍 LessonEditor: Update data being sent:', updateData);
        
        await updateLessonAction(updateData);

        // If this is a quiz lesson, save the quiz data
        if (lessonData.content_type === 'quiz' && quizEditorRef.current) {
          console.log('🔄 LessonEditor: Saving quiz data...');
          const quizData = quizEditorRef.current.getQuizData();
          
          console.log('📊 LessonEditor: Raw quiz data from editor:', quizData);
          
          // Only try to save if there are actually questions
          if (quizData.questions.length > 0) {
            console.log('📊 LessonEditor: Quiz data structure for server:', {
              lessonId: lessonData.id,
              quizData: {
                ...quizData,
                questions: quizData.questions.map(q => ({
                  id: q.id,
                  question_text: q.question_text,
                  question_type: q.question_type,
                  options: q.options,
                  points: q.points,
                  order_index: q.order_index
                }))
              }
            });
            
            try {
              await saveQuizDataAction({
                lessonId: lessonData.id,
                quizData,
              });
              
              console.log('✅ LessonEditor: Quiz data saved successfully');
            } catch (quizError) {
              console.error('❌ LessonEditor: Quiz save failed:', quizError);
              throw new Error(`Failed to save quiz data: ${quizError instanceof Error ? quizError.message : 'Unknown error'}`);
            }
          } else {
            console.log('ℹ️ LessonEditor: No quiz questions to save, skipping quiz data save');
          }
        }
        
        toast.success('Lesson saved successfully');
        onSave(lessonData);
        setIsDirty(false);
      } catch (error) {
        console.error('Failed to save lesson:', error);
        toast.error('Failed to save lesson');
      }
    });
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
          <Button onClick={handleSave} disabled={!isDirty || isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Saving...
              </>
            ) : (
              'Save Lesson'
            )}
          </Button>
        </div>
      </div>

      {/* Lesson Editor Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
              <CardContent className="space-y-4">
                <VideoContentDisplay lessonId={lessonData.id} languageCode="en" />
                <VideoUpload
                  lessonId={lessonData.id}
                  courseId="f47ac10b-58cc-4372-a567-0e02b2c3d485" // TODO: Get actual course ID from context
                  accountId="c01c1f21-619e-4df0-9c0b-c8a3f296a2b7" // TODO: Get actual account ID from context
                  languageCode={lessonData.language}
                  onUploadComplete={(videoMetadataId) => {
                    console.log('Video uploaded, metadata ID:', videoMetadataId);
                    // Mark the lesson as dirty so the save button is enabled
                    setIsDirty(true);
                    // Note: The VideoUpload component already updates the lesson's video_url
                    // We don't need to update it here
                  }}
                  onUploadError={(error) => {
                    console.error('Video upload failed:', error);
                    toast.error(`Video upload failed: ${error}`);
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
            <div>
              {loadingQuizData && (
                <div className="text-center py-4">
                  <span className="text-sm text-muted-foreground">Loading quiz data...</span>
                </div>
              )}
              <QuizEditor
                ref={quizEditorRef}
                lessonId={lessonData.id}
                isFinalQuiz={lessonData.is_final_quiz}
                onQuizChange={() => setIsDirty(true)}
                existingQuizData={existingQuizData}
              />
            </div>
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
                  <label className="text-base font-medium">Track Completion</label>
                  <p className="text-sm text-muted-foreground">
                    Require students to mark this lesson as complete
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}