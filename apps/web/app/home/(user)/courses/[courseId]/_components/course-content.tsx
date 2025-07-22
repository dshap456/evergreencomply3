import { notFound } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Progress } from '@kit/ui/progress';
import { Trans } from '@kit/ui/trans';

import { loadLearnerCourseDetails } from '../_lib/server/learner-course-details.loader';

interface CourseContentProps {
  courseId: string;
}

export async function CourseContent({ courseId }: CourseContentProps) {
  try {
    const course = await loadLearnerCourseDetails(courseId);
    
    const isCompleted = !!course.completed_at;
    const hasStarted = course.progress_percentage > 0;
    
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl">{course.title}</CardTitle>
              {course.description && (
                <p className="text-muted-foreground mt-2">
                  {course.description}
                </p>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              {isCompleted ? (
                <Badge className="bg-green-100 text-green-800">
                  <Trans i18nKey="courses:learner.completed" />
                </Badge>
              ) : hasStarted ? (
                <Badge className="bg-blue-100 text-blue-800">
                  <Trans i18nKey="courses:learner.inProgress" />
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-800">
                  <Trans i18nKey="courses:learner.notStarted" />
                </Badge>
              )}
              
              {course.final_score && (
                <Badge className="bg-green-100 text-green-800">
                  Final Score: {course.final_score}%
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              <Trans i18nKey="courses:learner.progress" />
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{course.progress_percentage}%</span>
              </div>
              <Progress value={course.progress_percentage} className="h-3" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="text-lg font-semibold">
                  {course.modules.reduce((acc, module) => acc + module.lessons.filter(l => l.completed).length, 0)}
                </div>
                <div className="text-muted-foreground">Lessons Completed</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="text-lg font-semibold">
                  {course.modules.reduce((acc, module) => acc + module.lessons.length, 0)}
                </div>
                <div className="text-muted-foreground">Total Lessons</div>
              </div>
            </div>
          </div>
          
          {/* Course Content Placeholder */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              <Trans i18nKey="courses:learner.courseContent" />
            </h3>
            
            <div className="p-8 text-center border-2 border-dashed border-muted-foreground/20 rounded-lg">
              <p className="text-muted-foreground">
                Lesson viewer will be implemented here
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This will show the current lesson content based on navigation selection
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    notFound();
  }
}