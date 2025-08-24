'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';

import type { LearnerCourse } from '../_lib/server/learner-courses.loader';

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
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePurchase = () => {
    setIsProcessing(true);
    // Redirect to the course-specific checkout page
    router.push(`/home/courses/${course.id}/checkout`);
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

        {/* Purchase Button */}
        <Button 
          className="w-full"
          onClick={handlePurchase}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              <Trans i18nKey="courses:learner.processingPurchase" />
            </>
          ) : (
            <Trans i18nKey="courses:learner.purchaseCourse" />
          )}
        </Button>
      </CardContent>
    </Card>
  );
}