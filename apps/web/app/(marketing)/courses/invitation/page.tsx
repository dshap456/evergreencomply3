import { Suspense } from 'react';
import { Spinner } from '@kit/ui/spinner';
import { CourseInvitationContent } from './_components/course-invitation-content';

export default function CourseInvitationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }>
        <CourseInvitationContent />
      </Suspense>
    </div>
  );
}