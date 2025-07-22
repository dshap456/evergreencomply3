'use client';

import { useState } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Progress } from '@kit/ui/progress';
import { Trans } from '@kit/ui/trans';
import { CheckCircle, Lock, Play, Download, FileText, ChevronRight } from 'lucide-react';

import type { CourseModule, CourseLesson } from '../_lib/server/learner-course-details.loader';

interface LessonNavigationProps {
  modules: CourseModule[];
  currentLessonId: string | null;
  onLessonSelect: (lessonId: string) => void;
}

export function LessonNavigation({ 
  modules, 
  currentLessonId, 
  onLessonSelect 
}: LessonNavigationProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Calculate if a lesson is unlocked based on sequential completion
  const isLessonUnlocked = (targetLessonId: string): boolean => {
    let allPreviousCompleted = true;
    
    for (const module of modules) {
      const sortedLessons = [...module.lessons].sort((a, b) => a.order_index - b.order_index);
      
      for (const lesson of sortedLessons) {
        if (lesson.id === targetLessonId) {
          return allPreviousCompleted;
        }
        
        if (!lesson.completed) {
          allPreviousCompleted = false;
        }
      }
    }
    
    return false;
  };

  // Get the next available lesson (first uncompleted, unlocked lesson)
  const getNextAvailableLesson = (): CourseLesson | null => {
    for (const module of modules) {
      const sortedLessons = [...module.lessons].sort((a, b) => a.order_index - b.order_index);
      
      for (const lesson of sortedLessons) {
        if (!lesson.completed && isLessonUnlocked(lesson.id)) {
          return lesson;
        }
      }
    }
    return null;
  };

  const toggleModuleExpansion = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const handleLessonClick = (lesson: CourseLesson) => {
    if (isLessonUnlocked(lesson.id)) {
      onLessonSelect(lesson.id);
    }
  };

  const nextLesson = getNextAvailableLesson();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans i18nKey="courses:learner.courseNavigation" />
        </CardTitle>
        
        {/* Quick Start Next Lesson */}
        {nextLesson && (
          <div className="mt-4">
            <Button 
              onClick={() => onLessonSelect(nextLesson.id)}
              className="w-full"
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Continue: {nextLesson.title}
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {modules.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              <Trans i18nKey="courses:learner.noModulesAvailable" />
            </p>
          </div>
        ) : (
          modules
            .sort((a, b) => a.order_index - b.order_index)
            .map((module) => (
              <ModuleSection
                key={module.id}
                module={module}
                isExpanded={expandedModules.has(module.id)}
                onToggleExpanded={() => toggleModuleExpansion(module.id)}
                currentLessonId={currentLessonId}
                onLessonClick={handleLessonClick}
                isLessonUnlocked={isLessonUnlocked}
              />
            ))
        )}
      </CardContent>
    </Card>
  );
}

interface ModuleSectionProps {
  module: CourseModule;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  currentLessonId: string | null;
  onLessonClick: (lesson: CourseLesson) => void;
  isLessonUnlocked: (lessonId: string) => boolean;
}

function ModuleSection({
  module,
  isExpanded,
  onToggleExpanded,
  currentLessonId,
  onLessonClick,
  isLessonUnlocked,
}: ModuleSectionProps) {
  const completedLessons = module.lessons.filter(l => l.completed).length;
  const totalLessons = module.lessons.length;
  const moduleProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  const isModuleComplete = completedLessons === totalLessons;

  return (
    <div className="space-y-2">
      {/* Module Header */}
      <div 
        className="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-muted/50 transition-colors"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center gap-3 flex-1">
          <ChevronRight 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
          />
          <div className="flex-1">
            <h4 className="font-medium text-sm">
              Module {module.order_index + 1}: {module.title}
            </h4>
            {module.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {module.description}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {completedLessons}/{totalLessons}
          </Badge>
          {isModuleComplete && (
            <CheckCircle className="w-4 h-4 text-green-600" />
          )}
        </div>
      </div>

      {/* Module Progress */}
      <div className="px-3">
        <div className="flex justify-between text-xs mb-1">
          <span>Progress</span>
          <span>{Math.round(moduleProgress)}%</span>
        </div>
        <Progress value={moduleProgress} className="h-1" />
      </div>

      {/* Lessons List */}
      {isExpanded && (
        <div className="space-y-1 ml-6">
          {module.lessons
            .sort((a, b) => a.order_index - b.order_index)
            .map((lesson) => (
              <LessonItem
                key={lesson.id}
                lesson={lesson}
                isUnlocked={isLessonUnlocked(lesson.id)}
                isCurrent={lesson.id === currentLessonId}
                onClick={() => onLessonClick(lesson)}
              />
            ))}
        </div>
      )}
    </div>
  );
}

interface LessonItemProps {
  lesson: CourseLesson;
  isUnlocked: boolean;
  isCurrent: boolean;
  onClick: () => void;
}

function LessonItem({ lesson, isUnlocked, isCurrent, onClick }: LessonItemProps) {
  const getContentIcon = () => {
    switch (lesson.content_type) {
      case 'video':
        return <Play className="w-3 h-3" />;
      case 'quiz':
        return <FileText className="w-3 h-3" />;
      case 'asset':
        return <Download className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
    }
  };

  const getStatusIcon = () => {
    if (lesson.completed) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    if (!isUnlocked) {
      return <Lock className="w-4 h-4 text-muted-foreground" />;
    }
    return <div className="w-4 h-4 border-2 border-muted-foreground rounded-full" />;
  };

  return (
    <div
      className={`
        flex items-center gap-2 p-2 rounded text-sm cursor-pointer transition-colors
        ${isCurrent ? 'bg-blue-100 border border-blue-200' : 'hover:bg-muted/30'}
        ${!isUnlocked ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={isUnlocked ? onClick : undefined}
    >
      {getStatusIcon()}
      
      <div className="flex items-center gap-1 text-muted-foreground">
        {getContentIcon()}
      </div>
      
      <span className={`flex-1 ${lesson.completed ? 'line-through text-muted-foreground' : ''}`}>
        {lesson.order_index + 1}. {lesson.title}
      </span>
      
      <Badge variant="outline" className="text-xs">
        {lesson.content_type}
      </Badge>
    </div>
  );
}