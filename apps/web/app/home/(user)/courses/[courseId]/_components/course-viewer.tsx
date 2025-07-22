'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Progress } from '@kit/ui/progress';
import { Separator } from '@kit/ui/separator';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';

import type { LearnerCourseDetails, CourseModule, CourseLesson } from '../_lib/server/learner-course-details.loader';
import { loadLearnerCourseDetails } from '../_lib/server/learner-course-details.loader';

interface CourseViewerProps {
  courseId: string;
}

export function CourseViewer({ courseId }: CourseViewerProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Course Content */}
      <div className="lg:col-span-2">
        <Suspense fallback={<CourseContentSkeleton />}>
          <CourseContent courseId={courseId} />
        </Suspense>
      </div>

      {/* Course Navigation */}
      <div className="lg:col-span-1">
        <Suspense fallback={<CourseSidebarSkeleton />}>
          <CourseSidebar courseId={courseId} />
        </Suspense>
      </div>
    </div>
  );
}

async function CourseContent({ courseId }: { courseId: string }) {
  const course = await loadLearnerCourseDetails(courseId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <CourseOverview course={course} />
      </CardContent>
    </Card>
  );
}

function CourseOverview({ course }: { course: LearnerCourseDetails }) {

  const totalLessons = course.modules.reduce((acc, module) => acc + module.lessons.length, 0);
  const completedLessons = course.modules.reduce((acc, module) => 
    acc + module.lessons.filter(lesson => lesson.completed).length, 0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{course.title}</h2>
        <p className="text-muted-foreground">{course.description}</p>
      </div>

      {/* Progress Overview */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Overall Progress</span>
            <span>{course.progress_percentage}%</span>
          </div>
          <Progress value={course.progress_percentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium">Lessons</div>
            <div className="text-muted-foreground">
              {completedLessons}/{totalLessons} completed
            </div>
          </div>
          <div>
            <div className="font-medium">Status</div>
            <div className="text-muted-foreground">
              {course.completed_at ? 'Completed' : 'In Progress'}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Getting Started */}
      <div className="text-center py-8">
        <div className="text-4xl mb-4">🎓</div>
        <h3 className="text-lg font-medium mb-2">Ready to learn?</h3>
        <p className="text-muted-foreground mb-4">
          Select a lesson from the course outline to get started.
        </p>
        <Button asChild>
          <Link href={`#lesson-${getFirstIncompleteLesson(course)}`}>
            {course.progress_percentage > 0 ? 'Continue Learning' : 'Start Course'}
          </Link>
        </Button>
      </div>
    </div>
  );
}

async function CourseSidebar({ courseId }: { courseId: string }) {
  const course = await loadLearnerCourseDetails(courseId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Outline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {course.modules.map((module) => (
          <ModuleSection 
            key={module.id} 
            module={module} 
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ModuleSection({ module }: { module: CourseModule }) {
  const completedLessons = module.lessons.filter(lesson => lesson.completed).length;
  const totalLessons = module.lessons.length;
  const isModuleCompleted = completedLessons === totalLessons;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{module.title}</h4>
        <Badge variant={isModuleCompleted ? 'default' : 'secondary'}>
          {completedLessons}/{totalLessons}
        </Badge>
      </div>
      
      {module.description && (
        <p className="text-xs text-muted-foreground">{module.description}</p>
      )}
      
      <div className="space-y-1 ml-4">
        {module.lessons.map((lesson) => (
          <LessonItem 
            key={lesson.id} 
            lesson={lesson}
          />
        ))}
      </div>
    </div>
  );
}

function LessonItem({ lesson }: { lesson: CourseLesson }) {
  const getContentIcon = () => {
    switch (lesson.content_type) {
      case 'video': return '🎥';
      case 'text': return '📝';
      case 'quiz': return '❓';
      case 'asset': return '📎';
      default: return '📄';
    }
  };

  return (
    <div 
      className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
      id={`lesson-${lesson.id}`}
    >
      <div className="text-xs">{getContentIcon()}</div>
      <div className="flex-1">
        <div className="text-sm font-medium">{lesson.title}</div>
        {lesson.time_spent > 0 && (
          <div className="text-xs text-muted-foreground">
            {Math.floor(lesson.time_spent / 60)}min spent
          </div>
        )}
      </div>
      {lesson.completed && (
        <div className="text-green-600 text-xs">✓</div>
      )}
      {lesson.is_final_quiz && (
        <Badge variant="outline" className="text-xs">Final</Badge>
      )}
    </div>
  );
}

function getFirstIncompleteLesson(course: LearnerCourseDetails): string {
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      if (!lesson.completed) {
        return lesson.id;
      }
    }
  }
  return course.modules[0]?.lessons[0]?.id || '';
}

function CourseContentSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-muted rounded animate-pulse w-32" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function CourseSidebarSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-muted rounded animate-pulse w-32" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}