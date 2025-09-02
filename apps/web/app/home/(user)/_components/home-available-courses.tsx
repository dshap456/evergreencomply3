'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

import type { AvailableCourse } from '../_lib/server/load-available-courses';

interface HomeAvailableCoursesProps {
  courses: AvailableCourse[];
}

export function HomeAvailableCourses({ courses }: HomeAvailableCoursesProps) {
  if (courses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          <Trans i18nKey="courses:learner.availableCourses" />
        </h2>
        <p className="text-muted-foreground">
          <Trans i18nKey="courses:learner.browseAndPurchase" />
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((course) => (
          <PurchasableCourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}

function PurchasableCourseCard({ course }: { course: AvailableCourse }) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // For now, link to the courses page where they can enroll
  // In the future, this could link to a dedicated course details page
  const courseDetailsLink = `/home/courses`;

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
        
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {course.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4 flex-1 flex flex-col">
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

        {/* Price */}
        <div className="text-2xl font-bold text-primary mt-auto">
          {formatPrice(course.price)}
        </div>

        {/* Purchase Button */}
        <Link href={courseDetailsLink} className="w-full">
          <Button className="w-full">
            <Trans i18nKey="courses:learner.purchase" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}