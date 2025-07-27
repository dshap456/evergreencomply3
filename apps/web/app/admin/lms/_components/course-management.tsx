'use client';

import { useState, useEffect, useTransition } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { Spinner } from '@kit/ui/spinner';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';
import { toast } from '@kit/ui/sonner';

import { CreateCourseDialog } from './create-course-dialog';
import { CourseEditorLoader } from './course-editor-loader';
import { loadCoursesAction } from '../_lib/server/load-courses-action';
import { deleteCourseAction } from '../_lib/server/delete-course-action';

interface Course {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  lessons_count: number;
  enrollments_count: number;
  created_at: string;
  updated_at: string;
  version: string;
}

export function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadCourses = async () => {
    try {
      console.log('🔄 CourseManagement: Starting to load courses...');
      setLoading(true);
      setError(null);
      const coursesData = await loadCoursesAction();
      console.log('📥 CourseManagement: Received courses data:', {
        count: coursesData.length,
        courses: coursesData.map(c => ({ id: c.id, title: c.title, status: c.status }))
      });
      setCourses(coursesData);
      console.log('✅ CourseManagement: State updated with courses');
    } catch (err) {
      console.error('❌ CourseManagement: Error loading courses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleBackFromEditor = () => {
    setSelectedCourse(null);
    // Refresh the course list when returning from editor
    loadCourses();
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;

    startTransition(async () => {
      try {
        await toast.promise(
          deleteCourseAction({ courseId: courseToDelete.id }),
          {
            loading: 'Deleting course...',
            success: 'Course deleted successfully',
            error: (error) => {
              console.error('Delete course error:', error);
              return error instanceof Error ? error.message : 'Failed to delete course';
            },
          }
        );
        
        // Close dialog and refresh courses
        setCourseToDelete(null);
        await loadCourses();
      } catch (error) {
        console.error('Error deleting course:', error);
      }
    });
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Course['status']) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (selectedCourse) {
    return (
      <CourseEditorLoader 
        courseId={selectedCourse.id} 
        onBack={handleBackFromEditor}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-muted-foreground">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <h2 className="text-lg font-medium text-red-600 mb-2">Error Loading Courses</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadCourses}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Course Management</h2>
          <p className="text-muted-foreground">Create and manage learning content</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          + Create Course
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input
          placeholder="Search courses..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <Badge 
                    variant="secondary" 
                    className={getStatusColor(course.status)}
                  >
                    {course.status}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">v{course.version}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {course.description}
              </p>

              {/* Enrollment Warning */}
              {course.enrollments_count > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 text-xs">
                  <span className="text-yellow-800">
                    ⚠️ {course.enrollments_count} active enrollment{course.enrollments_count > 1 ? 's' : ''}
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Lessons:</span>
                  <span className="ml-1 font-medium">{course.lessons_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Enrolled:</span>
                  <span className="ml-1 font-medium">{course.enrollments_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="ml-1 font-medium">
                    {new Date(course.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setSelectedCourse(course)}
                >
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setCourseToDelete(course)}
                  disabled={isPending || course.enrollments_count > 0}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <div className="text-4xl">📚</div>
            <div>
              <h3 className="text-lg font-medium">No courses found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters'
                  : 'Create your first course to get started'}
              </p>
            </div>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setShowCreateDialog(true)}>
                Create Course
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Create Course Dialog */}
      <CreateCourseDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCourseCreated={() => {
          setShowCreateDialog(false);
          // Refresh the course list to show the new course
          loadCourses();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{courseToDelete?.title}"? 
              {courseToDelete?.enrollments_count ? (
                <span className="block mt-2 text-red-600">
                  This course has {courseToDelete.enrollments_count} active enrollments and cannot be deleted.
                </span>
              ) : (
                <span className="block mt-2 text-red-600">
                  This action cannot be undone. All modules, lessons, quizzes, and videos associated with this course will be permanently deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCourse}
              disabled={isPending || (courseToDelete?.enrollments_count ?? 0) > 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? 'Deleting...' : 'Delete Course'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}