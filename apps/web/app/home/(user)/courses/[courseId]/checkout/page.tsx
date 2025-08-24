import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { requireUser } from '@kit/supabase/require-user';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@kit/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CheckoutButton } from './checkout-button';

interface PageProps {
  params: Promise<{ courseId: string }>;
}

async function loadCourseDetails(courseId: string) {
  const client = getSupabaseServerClient();
  
  const { data: course, error } = await client
    .from('courses')
    .select(`
      id,
      title,
      description,
      price,
      billing_product_id,
      status
    `)
    .eq('id', courseId)
    .single();

  if (error || !course) {
    return null;
  }

  return course;
}

export default async function CourseCheckoutPage({ params }: PageProps) {
  const { courseId } = await params;
  
  // Require authenticated user
  const client = getSupabaseServerClient();
  const auth = await requireUser(client);
  
  if (!auth.data) {
    redirect('/auth/sign-in');
  }

  const course = await loadCourseDetails(courseId);

  if (!course) {
    redirect('/home/courses');
  }

  // Check if course is published
  if (course.status !== 'published') {
    redirect('/home/courses');
  }

  // Check if course requires purchase
  if (!course.price || course.price === 0) {
    // Free course - redirect to enrollment
    redirect(`/home/courses/${courseId}`);
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Link href="/home/courses">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Courses
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Complete Your Purchase</CardTitle>
          <CardDescription>
            You're about to purchase access to this course
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Course Details */}
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-lg">{course.title}</h3>
            <p className="text-sm text-muted-foreground">{course.description}</p>
            <div className="pt-2">
              <span className="text-2xl font-bold">${course.price}</span>
            </div>
          </div>

          {/* Purchase Information */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Immediate access after purchase</p>
            <p>✓ Learn at your own pace</p>
            <p>✓ Certificate upon completion</p>
          </div>

          {/* Checkout Button */}
          <CheckoutButton 
            courseId={course.id} 
            courseName={course.title}
            price={course.price}
            billingProductId={course.billing_product_id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

