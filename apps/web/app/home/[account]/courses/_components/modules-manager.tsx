'use client';

import { useState, useTransition } from 'react';

import { PlusIcon, ChevronDownIcon, ChevronRightIcon, BookIcon, VideoIcon, FileTextIcon, HelpCircleIcon, EditIcon } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@kit/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@kit/ui/dialog';
import { Trans } from '@kit/ui/trans';
import { Badge } from '@kit/ui/badge';

import { LessonForm } from './lesson-form';
import { ModuleForm } from './module-form';
import { QuizBuilder } from './quiz-builder';

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons?: Array<{
    id: string;
    title: string;
    description: string | null;
    content_type: string;
    order_index: number;
    is_final_quiz: boolean;
  }>;
}

interface Course {
  id: string;
  title: string;
  modules?: Module[];
}

interface ModulesManagerProps {
  course: Course;
  account: string;
}

export function ModulesManager({ course, account }: ModulesManagerProps) {
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [showModuleForm, setShowModuleForm] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [showQuizBuilder, setShowQuizBuilder] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  const toggleModule = (moduleId: string) => {
    const newOpenModules = new Set(openModules);
    if (newOpenModules.has(moduleId)) {
      newOpenModules.delete(moduleId);
    } else {
      newOpenModules.add(moduleId);
    }
    setOpenModules(newOpenModules);
  };

  const handleAddLesson = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setEditingLesson(null);
    setShowLessonForm(true);
  };

  const handleEditLesson = (lesson: any) => {
    setEditingLesson(lesson);
    setSelectedModuleId(lesson.module_id);
    setShowLessonForm(true);
  };

  const handleEditQuiz = (lessonId: string, existingQuestions: any[]) => {
    setSelectedLessonId(lessonId);
    setShowQuizBuilder(true);
  };

  const handleFormSuccess = () => {
    setShowModuleForm(false);
    setShowLessonForm(false);
    setShowQuizBuilder(false);
    setSelectedModuleId(null);
    setSelectedLessonId(null);
    setEditingLesson(null);
    // Refresh page to show new content
    window.location.reload();
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return <VideoIcon className="h-4 w-4" />;
      case 'text':
        return <FileTextIcon className="h-4 w-4" />;
      case 'quiz':
        return <HelpCircleIcon className="h-4 w-4" />;
      default:
        return <BookIcon className="h-4 w-4" />;
    }
  };

  const modules = course.modules || [];

  if (modules.length === 0) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="courses:modules.title" />
            </CardTitle>
            <CardDescription>
              <Trans i18nKey="courses:modules.description" />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BookIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                <Trans i18nKey="courses:modules.noModules" />
              </h3>
              <p className="text-muted-foreground mb-4">
                <Trans i18nKey="courses:modules.noModulesDescription" />
              </p>
              <Dialog open={showModuleForm} onOpenChange={setShowModuleForm}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    <Trans i18nKey="courses:modules.createModule" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Module</DialogTitle>
                  </DialogHeader>
                  <ModuleForm 
                    account={account} 
                    courseId={course.id}
                    onSuccess={handleFormSuccess}
                    onCancel={() => setShowModuleForm(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Lesson Form Dialog */}
        <Dialog open={showLessonForm} onOpenChange={setShowLessonForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Create Lesson'}</DialogTitle>
            </DialogHeader>
            {selectedModuleId && (
              <LessonForm
                account={account}
                moduleId={selectedModuleId}
                lesson={editingLesson}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowLessonForm(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Quiz Builder Dialog */}
        <Dialog open={showQuizBuilder} onOpenChange={setShowQuizBuilder}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Quiz Builder</DialogTitle>
            </DialogHeader>
            {selectedLessonId && (
              <QuizBuilder
                account={account}
                lessonId={selectedLessonId}
                onSuccess={handleFormSuccess}
                onCancel={() => setShowQuizBuilder(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            <Trans i18nKey="courses:modules.title" />
          </h2>
          <p className="text-muted-foreground">
            <Trans i18nKey="courses:modules.description" />
          </p>
        </div>
        <Dialog open={showModuleForm} onOpenChange={setShowModuleForm}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              <Trans i18nKey="courses:modules.createModule" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Module</DialogTitle>
            </DialogHeader>
            <ModuleForm 
              account={account} 
              courseId={course.id}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowModuleForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {modules.map((module) => (
          <Card key={module.id}>
            <Collapsible open={openModules.has(module.id)} onOpenChange={() => toggleModule(module.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {openModules.has(module.id) ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronRightIcon className="h-4 w-4" />
                      )}
                      <div>
                        <CardTitle className="text-left">{module.title}</CardTitle>
                        {module.description && (
                          <CardDescription className="text-left mt-1">
                            {module.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {module.lessons?.length || 0} lessons
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {module.lessons && module.lessons.length > 0 ? (
                    <div className="space-y-2">
                      {module.lessons
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((lesson) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center space-x-3">
                              {getContentTypeIcon(lesson.content_type)}
                              <div>
                                <div className="font-medium">{lesson.title}</div>
                                {lesson.description && (
                                  <div className="text-sm text-muted-foreground">
                                    {lesson.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {lesson.is_final_quiz && (
                                <Badge variant="outline">Final Quiz</Badge>
                              )}
                              <Badge variant="secondary">{lesson.content_type}</Badge>
                              
                              <div className="flex items-center space-x-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditLesson(lesson)}
                                >
                                  <EditIcon className="h-3 w-3" />
                                </Button>
                                
                                {lesson.content_type === 'quiz' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditQuiz(lesson.id, lesson.quiz_questions || [])}
                                  >
                                    <HelpCircleIcon className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <BookIcon className="mx-auto h-8 w-8 mb-2" />
                      <p><Trans i18nKey="courses:lessons.noLessons" /></p>
                      <p className="text-sm mt-1">
                        <Trans i18nKey="courses:lessons.noLessonsDescription" />
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-center mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAddLesson(module.id)}
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      <Trans i18nKey="courses:lessons.createLesson" />
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      {/* Lesson Form Dialog */}
      <Dialog open={showLessonForm} onOpenChange={setShowLessonForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Create Lesson'}</DialogTitle>
          </DialogHeader>
          {selectedModuleId && (
            <LessonForm
              account={account}
              moduleId={selectedModuleId}
              lesson={editingLesson}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowLessonForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Quiz Builder Dialog */}
      <Dialog open={showQuizBuilder} onOpenChange={setShowQuizBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quiz Builder</DialogTitle>
          </DialogHeader>
          {selectedLessonId && (
            <QuizBuilder
              account={account}
              lessonId={selectedLessonId}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowQuizBuilder(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}