'use client';

import { useState, useTransition } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';
import { toast } from '@kit/ui/sonner';

import type { LearnerCourse } from '../_lib/server/learner-courses.loader';
import { enrollInCourseAction } from '../_lib/server/course-enrollment-actions';

interface AvailableCoursesListProps {
  courses: LearnerCourse[];
}

export function AvailableCoursesList({ courses }: AvailableCoursesListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((course) => (
        <AvailableCourseCard key={course.id} course={course} />
      ))}
    </div>
  );
}

function AvailableCourseCard({ course }: { course: LearnerCourse }) {
  const [isPending, startTransition] = useTransition();
  const [isEnrolled, setIsEnrolled] = useState(false);

  const handleEnroll = () => {
    startTransition(async () => {
      try {
        const result = await enrollInCourseAction({ courseId: course.id });
        
        if (result.success) {
          setIsEnrolled(true);
          toast.success('Successfully enrolled in course!');
          // Optionally refresh the page or update the UI
          window.location.reload();
        } else {
          toast.error(result.error || 'Failed to enroll in course');
        }
      } catch (error) {
        console.error('Enrollment error:', error);
        toast.error('An unexpected error occurred');
      }
    });
  };

  const getLevelBadge = (level: string) => {
    const colorMap = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800',
    };
    
    return (
      <Badge className={colorMap[level as keyof typeof colorMap] || 'bg-gray-100 text-gray-800'}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
          {getLevelBadge(course.level)}
        </div>
        
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {course.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Course Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-medium">Modules</div>
            <div className="text-muted-foreground">{course.total_modules}</div>
          </div>
          <div>
            <div className="font-medium">Lessons</div>
            <div className="text-muted-foreground">{course.total_lessons}</div>
          </div>
        </div>

        {/* Additional Details */}
        <div className="space-y-1">
          {course.duration_minutes && (
            <div className="text-xs text-muted-foreground">
              Duration: {Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60}m
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Language: {course.language}
          </div>
        </div>

        {/* Enrollment Button */}
        <Button 
          className="w-full"
          onClick={handleEnroll}
          disabled={isPending || isEnrolled}
        >
          {isPending ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              <Trans i18nKey="courses:learner.enrolling" />
            </>
          ) : isEnrolled ? (
            <Trans i18nKey="courses:learner.enrolled" />
          ) : (
            <Trans i18nKey="courses:learner.enroll" />
          )}
        </Button>
      </CardContent>
    </Card>
  );
}