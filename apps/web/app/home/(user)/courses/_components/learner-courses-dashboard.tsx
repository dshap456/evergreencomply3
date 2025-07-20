import { Suspense } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';

import { loadLearnerCoursesData } from '../_lib/server/learner-courses.loader';
import { LearnerCoursesOverview } from './learner-courses-overview';
import { EnrolledCoursesList } from './enrolled-courses-list';
import { AvailableCoursesList } from './available-courses-list';

export function LearnerCoursesDashboard() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <LearnerCoursesContent />
      </Suspense>
    </div>
  );
}

async function LearnerCoursesContent() {
  const data = await loadLearnerCoursesData();

  return (
    <>
      {/* Overview Stats */}
      <LearnerCoursesOverview 
        completedCount={data.completedCount}
        inProgressCount={data.inProgressCount}
        totalEnrollments={data.totalEnrollments}
        availableCount={data.availableCourses.length}
      />

      {/* My Courses Section */}
      {data.enrolledCourses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="courses:learner.myCourses" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnrolledCoursesList courses={data.enrolledCourses} />
          </CardContent>
        </Card>
      )}

      {/* Available Courses Section */}
      {data.availableCourses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="courses:learner.availableCourses" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AvailableCoursesList courses={data.availableCourses} />
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {data.enrolledCourses.length === 0 && data.availableCourses.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-lg font-medium mb-2">
                <Trans i18nKey="courses:learner.noCourses" />
              </h3>
              <p className="text-muted-foreground">
                <Trans i18nKey="courses:learner.noCoursesDescription" />
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded animate-pulse w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content skeleton */}
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
    </div>
  );
}