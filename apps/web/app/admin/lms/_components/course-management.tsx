'use client';

import { useState } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { CreateCourseDialog } from './create-course-dialog';
import { CourseEditor } from './course-editor';

interface Course {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  lessons_count: number;
  enrollments_count: number;
  completion_rate: number;
  created_at: string;
  updated_at: string;
  version: string;
  tags: string[];
}

const mockCourses: Course[] = [
  {
    id: '1',
    title: 'Introduction to React',
    description: 'Learn the basics of React development',
    status: 'published',
    lessons_count: 12,
    enrollments_count: 245,
    completion_rate: 78,
    created_at: '2024-01-15',
    updated_at: '2024-01-20',
    version: '1.2',
    tags: ['React', 'JavaScript', 'Frontend']
  },
  {
    id: '2',
    title: 'Advanced TypeScript',
    description: 'Master TypeScript for professional development',
    status: 'published',
    lessons_count: 18,
    enrollments_count: 156,
    completion_rate: 85,
    created_at: '2024-02-01',
    updated_at: '2024-02-15',
    version: '2.1',
    tags: ['TypeScript', 'JavaScript', 'Advanced']
  },
  {
    id: '3',
    title: 'Database Design Fundamentals',
    description: 'Learn database design principles and best practices',
    status: 'draft',
    lessons_count: 8,
    enrollments_count: 0,
    completion_rate: 0,
    created_at: '2024-03-01',
    updated_at: '2024-03-05',
    version: '1.0',
    tags: ['Database', 'SQL', 'Design']
  }
];

export function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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
      <CourseEditor 
        course={selectedCourse} 
        onBack={() => setSelectedCourse(null)}
        onSave={(updatedCourse) => {
          setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
          setSelectedCourse(null);
        }}
      />
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

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {course.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {course.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{course.tags.length - 3}
                  </Badge>
                )}
              </div>

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
                  <span className="text-muted-foreground">Completion:</span>
                  <span className="ml-1 font-medium">{course.completion_rate}%</span>
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
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                >
                  Analytics
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
        onCourseCreated={(newCourse) => {
          setCourses(prev => [...prev, newCourse]);
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}