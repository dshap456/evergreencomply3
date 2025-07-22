import { notFound } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Progress } from '@kit/ui/progress';
import { Trans } from '@kit/ui/trans';

import { loadLearnerCourseDetails } from '../_lib/server/learner-course-details.loader';

interface CourseSidebarProps {
  courseId: string;
}

export async function CourseSidebar({ courseId }: CourseSidebarProps) {
  try {
    const course = await loadLearnerCourseDetails(courseId);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="courses:learner.courseNavigation" />
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {course.modules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                <Trans i18nKey="courses:learner.noModulesAvailable" />
              </p>
            </div>
          ) : (
            course.modules.map((module, moduleIndex) => (
              <div key={module.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">
                    {moduleIndex + 1}. {module.title}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    {module.lessons.filter(l => l.completed).length}/{module.lessons.length}
                  </Badge>
                </div>
                
                {module.description && (
                  <p className="text-xs text-muted-foreground">
                    {module.description}
                  </p>
                )}
                
                <div className="space-y-1">
                  {module.lessons.map((lesson, lessonIndex) => (
                    <div key={lesson.id} className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${
                        lesson.completed ? 'bg-green-500' : 'bg-muted'
                      }`} />
                      
                      <span className={`flex-1 ${
                        lesson.completed ? 'text-muted-foreground line-through' : ''
                      }`}>
                        {lessonIndex + 1}. {lesson.title}
                      </span>
                      
                      <Badge variant="outline" className="text-xs">
                        {lesson.content_type}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                {/* Module Progress */}
                <div className="pt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Module Progress</span>
                    <span>
                      {Math.round((module.lessons.filter(l => l.completed).length / module.lessons.length) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(module.lessons.filter(l => l.completed).length / module.lessons.length) * 100} 
                    className="h-1" 
                  />
                </div>
              </div>
            ))
          )}
          
          {/* Course Actions */}
          <div className="pt-4 space-y-2">
            <Button className="w-full" size="sm">
              <Trans i18nKey="courses:learner.startLesson" />
            </Button>
            
            {course.progress_percentage > 0 && (
              <Button variant="outline" className="w-full" size="sm">
                <Trans i18nKey="courses:learner.resetProgress" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  } catch (error) {
    notFound();
  }
}