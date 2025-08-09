'use client';

import { useState, useTransition } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
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

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4">
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
        {course.duration_minutes && (
          <div className="text-xs text-muted-foreground">
            Duration: {Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60}m
          </div>
        )}

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

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