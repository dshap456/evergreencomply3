'use client';

import { useState, useEffect, useTransition } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Progress } from '@kit/ui/progress';
import { Trans } from '@kit/ui/trans';
import { toast } from '@kit/ui/sonner';
import { CheckCircle, BookOpen } from 'lucide-react';

import type { LearnerCourseDetails, CourseLesson } from '../_lib/server/learner-course-details.loader';
import { LessonViewer } from './lesson-viewer';
import { LessonNavigation } from './lesson-navigation';
import { updateLessonProgressAction, completeLessonAction } from '../_lib/server/lesson-progress-actions';

interface CourseLearningInterfaceProps {
  course: LearnerCourseDetails;
}

export function CourseLearningInterface({ course }: CourseLearningInterfaceProps) {
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Get the current lesson object
  const currentLesson = getCurrentLesson(course, currentLessonId);

  // Restore last accessed lesson or get first available lesson on component mount
  // This fixes the issue where refreshing the page would reset to the first incomplete lesson
  // Now it remembers where the user was and restores their position
  useEffect(() => {
    if (!currentLessonId) {
      // First, try to find the most recently accessed lesson that isn't completed
      const lastAccessedLesson = getLastAccessedLesson(course);
      
      if (lastAccessedLesson) {
        setCurrentLessonId(lastAccessedLesson.id);
      } else {
        // Fall back to first incomplete lesson if no recently accessed lesson
        const firstAvailableLesson = getFirstAvailableLesson(course);
        if (firstAvailableLesson) {
          setCurrentLessonId(firstAvailableLesson.id);
        }
      }
    }
  }, [currentLessonId, course]);

  // Check if a lesson is unlocked based on sequential completion
  const isLessonUnlocked = (lessonId: string): boolean => {
    let allPreviousCompleted = true;
    
    for (const module of course.modules) {
      const sortedLessons = [...module.lessons].sort((a, b) => a.order_index - b.order_index);
      
      for (const lesson of sortedLessons) {
        if (lesson.id === lessonId) {
          return allPreviousCompleted;
        }
        
        if (!lesson.completed) {
          allPreviousCompleted = false;
        }
      }
    }
    
    return false;
  };

  // Handle real-time progress updates
  const handleProgressUpdate = (lessonId: string, progress: number) => {
    startTransition(async () => {
      try {
        await updateLessonProgressAction({
          lessonId,
          courseId: course.id,
          progress,
        });
      } catch (error) {
        console.error('Failed to update progress:', error);
        // Don't show toast for progress updates to avoid spam
      }
    });
  };

  // Handle lesson completion
  const handleLessonComplete = (lessonId: string, progress: number) => {
    startTransition(async () => {
      try {
        const result = await completeLessonAction({
          lessonId,
          courseId: course.id,
          finalProgress: progress,
        });

        if (result.success) {
          toast.success('Lesson completed! 🎉');
          
          // Auto-advance to next available lesson
          setTimeout(() => {
            const nextLesson = getNextAvailableLesson(course, lessonId);
            if (nextLesson) {
              setCurrentLessonId(nextLesson.id);
              toast.success(`Next lesson unlocked: ${nextLesson.title}`);
            } else {
              // Check if course is complete
              if (isAllLessonsComplete(course)) {
                toast.success('Congratulations! Course completed! 🏆');
              }
            }
          }, 1000);
        }
      } catch (error) {
        console.error('Failed to complete lesson:', error);
        toast.error('Failed to complete lesson. Please try again.');
      }
    });
  };

  const isCompleted = !!course.completed_at;
  const hasStarted = course.progress_percentage > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content Area */}
      <div className="lg:col-span-2 space-y-6">
        {/* Course Overview Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div>
                <CardTitle className="text-2xl">{course.title}</CardTitle>
                {course.description && (
                  <p className="text-muted-foreground mt-2">
                    {course.description}
                  </p>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                {isCompleted ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    <Trans i18nKey="courses:learner.completed" />
                  </Badge>
                ) : hasStarted ? (
                  <Badge className="bg-blue-100 text-blue-800">
                    <Trans i18nKey="courses:learner.inProgress" />
                  </Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800">
                    <Trans i18nKey="courses:learner.notStarted" />
                  </Badge>
                )}
                
                {course.final_score && (
                  <Badge className="bg-green-100 text-green-800">
                    Final Score: {course.final_score}%
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {/* Overall Progress */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                <Trans i18nKey="courses:learner.progress" />
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{course.progress_percentage}%</span>
                </div>
                <Progress value={course.progress_percentage} className="h-3" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-lg font-semibold">
                    {course.modules.reduce((acc, module) => acc + module.lessons.filter(l => l.completed).length, 0)}
                  </div>
                  <div className="text-muted-foreground">Lessons Completed</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded">
                  <div className="text-lg font-semibold">
                    {course.modules.reduce((acc, module) => acc + module.lessons.length, 0)}
                  </div>
                  <div className="text-muted-foreground">Total Lessons</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Lesson Viewer */}
        {currentLesson ? (
          <LessonViewer
            lesson={currentLesson}
            isUnlocked={isLessonUnlocked(currentLesson.id)}
            onLessonComplete={handleLessonComplete}
            onProgressUpdate={handleProgressUpdate}
          />
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Ready to Start Learning?</h3>
              <p className="text-muted-foreground">
                Select a lesson from the course navigation to begin your learning journey.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation Sidebar */}
      <div className="lg:col-span-1">
        <LessonNavigation
          modules={course.modules}
          currentLessonId={currentLessonId}
          onLessonSelect={(lessonId) => {
            setCurrentLessonId(lessonId);
            // Update last_accessed when user selects a lesson
            if (lessonId) {
              handleProgressUpdate(lessonId, 0);
            }
          }}
        />
      </div>
    </div>
  );
}

// Helper functions
function getCurrentLesson(course: LearnerCourseDetails, lessonId: string | null): CourseLesson | null {
  if (!lessonId) return null;
  
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      if (lesson.id === lessonId) {
        return lesson;
      }
    }
  }
  return null;
}

function getFirstAvailableLesson(course: LearnerCourseDetails): CourseLesson | null {
  for (const module of course.modules) {
    const sortedLessons = [...module.lessons].sort((a, b) => a.order_index - b.order_index);
    
    for (const lesson of sortedLessons) {
      if (!lesson.completed) {
        return lesson;
      }
    }
  }
  return null;
}

function getLastAccessedLesson(course: LearnerCourseDetails): CourseLesson | null {
  // Find the most recently accessed lesson that isn't completed
  let mostRecentLesson: CourseLesson | null = null;
  let mostRecentTime: string | null = null;
  
  for (const module of course.modules) {
    for (const lesson of module.lessons) {
      // Consider lessons that have been accessed but not completed
      if (lesson.last_accessed && !lesson.completed) {
        if (!mostRecentTime || lesson.last_accessed > mostRecentTime) {
          mostRecentTime = lesson.last_accessed;
          mostRecentLesson = lesson;
        }
      }
    }
  }
  
  return mostRecentLesson;
}

function getNextAvailableLesson(course: LearnerCourseDetails, currentLessonId: string): CourseLesson | null {
  let foundCurrent = false;
  
  for (const module of course.modules) {
    const sortedLessons = [...module.lessons].sort((a, b) => a.order_index - b.order_index);
    
    for (const lesson of sortedLessons) {
      if (foundCurrent && !lesson.completed) {
        return lesson;
      }
      
      if (lesson.id === currentLessonId) {
        foundCurrent = true;
      }
    }
  }
  
  return null;
}

function isAllLessonsComplete(course: LearnerCourseDetails): boolean {
  return course.modules.every(module => 
    module.lessons.every(lesson => lesson.completed)
  );
}