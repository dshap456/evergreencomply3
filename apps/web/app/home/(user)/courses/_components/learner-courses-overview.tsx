import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';

interface LearnerCoursesOverviewProps {
  completedCount: number;
  inProgressCount: number;
  totalEnrollments: number;
  availableCount: number;
}

export function LearnerCoursesOverview({
  completedCount,
  inProgressCount,
  totalEnrollments,
  availableCount,
}: LearnerCoursesOverviewProps) {
  const notStartedCount = totalEnrollments - inProgressCount - completedCount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            <Trans i18nKey="courses:learner.totalEnrollments" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalEnrollments}</div>
          <p className="text-xs text-muted-foreground">
            <Trans i18nKey="courses:learner.coursesEnrolled" />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            <Trans i18nKey="courses:learner.inProgress" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
          <p className="text-xs text-muted-foreground">
            <Trans i18nKey="courses:learner.activeLearning" />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            <Trans i18nKey="courses:learner.completed" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          <p className="text-xs text-muted-foreground">
            <Trans i18nKey="courses:learner.coursesCompleted" />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            <Trans i18nKey="courses:learner.available" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{availableCount}</div>
          <p className="text-xs text-muted-foreground">
            <Trans i18nKey="courses:learner.newCoursesAvailable" />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}