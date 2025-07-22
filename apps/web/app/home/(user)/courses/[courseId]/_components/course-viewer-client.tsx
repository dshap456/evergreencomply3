'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';
import { Button } from '@kit/ui/button';

interface CourseViewerClientProps {
  courseId: string;
}

interface CourseData {
  enrollment_id: string;
  progress: number;
  course_id: string;
  course_title: string;
  is_published: boolean;
  modules_count: number;
  lessons_count: number;
  progress_records: number;
}

export function CourseViewerClient({ courseId }: CourseViewerClientProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CourseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/debug-course?courseId=${courseId}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center gap-3">
            <Spinner className="h-5 w-5" />
            <span>Loading course...</span>
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

  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>No course data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📚 {data.course_title}
            {data.is_published && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Published
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{data.progress}%</div>
              <div className="text-sm text-gray-500">Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{data.modules_count}</div>
              <div className="text-sm text-gray-500">Modules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{data.lessons_count}</div>
              <div className="text-sm text-gray-500">Lessons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{data.progress_records}</div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button className="flex-1">
              {data.progress > 0 ? 'Continue Learning' : 'Start Course'}
            </Button>
            <Button variant="outline">
              View Syllabus
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Course Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📊 Your Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{data.progress}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${data.progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              {data.progress === 0 
                ? "Ready to start your learning journey!"
                : `Keep going! You're making great progress.`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔍 Course Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Course ID:</span> {data.course_id}
            </div>
            <div>
              <span className="font-medium">Enrollment ID:</span> {data.enrollment_id}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}