'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Progress } from '@kit/ui/progress';
import { Trans } from '@kit/ui/trans';

import type { LearnerCourse } from '../_lib/server/learner-courses.loader';

interface EnrolledCoursesListProps {
  courses: LearnerCourse[];
}

export function EnrolledCoursesList({ courses }: EnrolledCoursesListProps) {
  const sortedCourses = courses.sort((a, b) => {
    // Sort by last accessed (most recent first), then by enrollment date
    if (a.last_accessed && b.last_accessed) {
      return new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime();
    }
    if (a.last_accessed && !b.last_accessed) return -1;
    if (!a.last_accessed && b.last_accessed) return 1;
    return new Date(b.enrollment_date).getTime() - new Date(a.enrollment_date).getTime();
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedCourses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}

function CourseCard({ course }: { course: LearnerCourse }) {
  const isCompleted = !!course.completed_at;
  const hasStarted = course.progress_percentage > 0;
  
  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('🎓 CourseCard Debug:', {
      courseId: course.id,
      title: course.title,
      progress_percentage: course.progress_percentage,
      completed_at: course.completed_at,
      isCompleted,
      hasStarted,
      expectedButton: isCompleted ? 'Completed' : hasStarted ? 'Resume Course' : 'Start Course'
    });
  }
  
  // Debug logging (temporary - remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 Debug - CourseCard render:', {
      courseId: course.id,
      title: course.title,
      progress_percentage: course.progress_percentage,
      completed_at: course.completed_at,
      hasStarted,
      isCompleted,
      buttonText: isCompleted ? 'review' : hasStarted ? 'continue' : 'start'
    });
  }
  

  const getLastAccessedText = () => {
    if (!course.last_accessed) return null;
    
    try {
      const timeAgo = formatDistanceToNow(new Date(course.last_accessed), { addSuffix: true });
      return `Last accessed ${timeAgo}`;
    } catch {
      return null;
    }
  };

  const getScoreBadge = () => {
    if (!course.final_quiz_score) return null;
    
    const score = course.final_quiz_score;
    const colorClass = score >= 80 ? 'bg-green-100 text-green-800' : 
                     score >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                     'bg-red-100 text-red-800';
    
    return (
      <Badge className={colorClass}>
        Final Score: {score}%
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{course.progress_percentage}%</span>
          </div>
          <Progress value={course.progress_percentage} className="h-2" />
        </div>

        {/* Course Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium">Modules</div>
            <div className="text-muted-foreground">
              {course.completed_modules}/{course.total_modules}
            </div>
          </div>
          <div>
            <div className="font-medium">Lessons</div>
            <div className="text-muted-foreground">
              {course.completed_lessons}/{course.total_lessons}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-2">
          {course.duration_minutes && (
            <div className="text-xs text-muted-foreground">
              Duration: {Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60}m
            </div>
          )}
          
          {getLastAccessedText() && (
            <div className="text-xs text-muted-foreground">
              {getLastAccessedText()}
            </div>
          )}

          {getScoreBadge()}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            asChild 
            className={`flex-1 ${isCompleted 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
          >
            <Link href={`/home/courses/${course.id}`}>
              {isCompleted ? (
                <Trans i18nKey="courses:learner.review" />
              ) : hasStarted ? (
                <Trans i18nKey="courses:learner.continue" />
              ) : (
                <Trans i18nKey="courses:learner.start" />
              )}
            </Link>
          </Button>
          
          {course.certificate_url && (
            <Button variant="outline" asChild>
              <Link href={course.certificate_url} target="_blank">
                <Trans i18nKey="courses:learner.certificate" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}