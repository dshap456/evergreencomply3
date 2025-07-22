'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';

interface CourseViewerClientProps {
  courseId: string;
}

interface CourseLesson {
  id: string;
  title: string;
  description: string;
  content_type: 'video' | 'text' | 'quiz' | 'asset';
  order_index: number;
  video_url: string | null;
  content: string | null;
  asset_url: string | null;
  is_final_quiz: boolean;
  completed: boolean;
  time_spent: number;
}

interface CourseModule {
  id: string;
  title: string;
  description: string;
  order_index: number;
  lessons: CourseLesson[];
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  enrollment_id: string;
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
  final_score: number | null;
  modules: CourseModule[];
}

export function CourseViewerClient({ courseId }: CourseViewerClientProps) {
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/debug-course?courseId=${courseId}`);
      const result = await response.json();
      
      if (result.success) {
        setCourse(result.course);
      } else {
        setError(result.error || 'Failed to load course data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'video': return '🎥';
      case 'text': return '📝';
      case 'quiz': return '📊';
      case 'asset': return '📎';
      default: return '📄';
    }
  };

  const getContentTypeColor = (contentType: string) => {
    switch (contentType) {
      case 'video': return 'bg-blue-100 text-blue-800';
      case 'text': return 'bg-green-100 text-green-800';
      case 'quiz': return 'bg-purple-100 text-purple-800';
      case 'asset': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextLesson = () => {
    for (const module of course?.modules || []) {
      for (const lesson of module.lessons) {
        if (!lesson.completed) {
          return { module, lesson };
        }
      }
    }
    return null;
  };

  const handleStartLesson = (moduleId: string, lessonId: string) => {
    // TODO: Navigate to lesson viewer
    console.log('Starting lesson:', { moduleId, lessonId });
    alert(`Starting lesson: ${lessonId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-3">
            <Spinner className="h-5 w-5" />
            <span>Loading course content...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h3 className="text-lg font-medium text-red-600 mb-4">Failed to Load Course</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={loadCourseData} variant="outline" size="sm">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!course) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>No course data available</p>
        </CardContent>
      </Card>
    );
  }

  const nextLesson = getNextLesson();

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-2xl mb-2">{course.title}</CardTitle>
            {course.description && (
              <p className="text-gray-600">{course.description}</p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-full bg-gray-200 rounded-full h-2 w-32">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${course.progress_percentage}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{course.progress_percentage}%</span>
              </div>
            </div>
          </div>
        </CardHeader>
        {nextLesson && (
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  ▶
                </div>
                <div>
                  <p className="font-medium">Continue Learning</p>
                  <p className="text-sm text-gray-600">{nextLesson.lesson.title}</p>
                </div>
              </div>
              <Button 
                onClick={() => handleStartLesson(nextLesson.module.id, nextLesson.lesson.id)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {course.progress_percentage > 0 ? 'Continue' : 'Start'}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Course Modules */}
      <div className="space-y-4">
        {course.modules.map((module) => (
          <Card key={module.id}>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                📚 {module.title}
                <Badge variant="secondary" className="ml-auto">
                  {module.lessons.filter(l => l.completed).length} / {module.lessons.length} completed
                </Badge>
              </CardTitle>
              {module.description && (
                <p className="text-gray-600">{module.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {module.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 ${
                      lesson.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                    }`}
                    onClick={() => handleStartLesson(module.id, lesson.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        lesson.completed ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {lesson.completed ? '✓' : lesson.order_index}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{lesson.title}</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getContentTypeColor(lesson.content_type)}`}
                          >
                            {getContentTypeIcon(lesson.content_type)} {lesson.content_type}
                          </Badge>
                          {lesson.is_final_quiz && (
                            <Badge variant="destructive" className="text-xs">
                              Final Quiz
                            </Badge>
                          )}
                        </div>
                        {lesson.description && (
                          <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {lesson.completed ? (
                        <div className="text-sm text-green-600">
                          ✓ Complete
                          {lesson.time_spent > 0 && (
                            <div className="text-xs text-gray-500">
                              {Math.floor(lesson.time_spent / 60)}m spent
                            </div>
                          )}
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm">
                          Start →
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}