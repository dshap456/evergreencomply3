'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';

import type { LearnerCourse } from '../_lib/server/learner-courses.loader';

// Map database billing_product_id to cart course IDs
const COURSE_ID_MAPPING: Record<string, string> = {
  'dot-hazmat': 'dot-hazmat-general',
  'advanced-hazmat': 'dot-hazmat-advanced',
  'epa-rcra': 'epa-rcra',
};

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
    
    // Map the billing_product_id to the cart course ID
    const cartCourseId = course.billing_product_id && COURSE_ID_MAPPING[course.billing_product_id] 
      ? COURSE_ID_MAPPING[course.billing_product_id]
      : course.billing_product_id || course.id;
    
    // Add to cart in localStorage
    const existingCartJson = localStorage.getItem('training-cart');
    let cartItems = [];
    
    if (existingCartJson) {
      try {
        cartItems = JSON.parse(existingCartJson);
      } catch (e) {
        console.error('Error parsing existing cart:', e);
      }
    }
    
    // Check if course is already in cart
    const existingItem = cartItems.find((item: any) => item.courseId === cartCourseId);
    
    if (existingItem) {
      // Update quantity to 1 if it exists
      existingItem.quantity = 1;
    } else {
      // Add new item with quantity 1
      cartItems.push({
        courseId: cartCourseId,
        quantity: 1
      });
    }
    
    // Save updated cart
    localStorage.setItem('training-cart', JSON.stringify(cartItems));
    
    // Redirect to cart page
    router.push('/marketing-temp/cart');
  };

  return (
    <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4">
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