'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';

interface CourseCompletion {
  id: string;
  student_name: string;
  student_email: string;
  course_name: string;
  final_quiz_score: number | null;
  final_quiz_passed: boolean;
  completion_percentage: number;
  completed_at: string;
  course_id: string;
}

interface Course {
  id: string;
  title: string;
}

interface CompletionReportsProps {
  account: string;
  courses: Course[];
}

export function CompletionReports({ account, courses }: CompletionReportsProps) {
  const [completions, setCompletions] = useState<CourseCompletion[]>([]);
  const [filteredCompletions, setFilteredCompletions] = useState<CourseCompletion[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const supabase = useSupabase();

  useEffect(() => {
    loadCompletions();
  }, []);

  useEffect(() => {
    filterCompletions();
  }, [completions, selectedCourse, searchQuery]);

  const loadCompletions = async () => {
    try {
      setLoading(true);
      
      // First try to get from course_completions (proper completion records)
      let query = supabase
        .from('course_completions')
        .select(`
          *,
          courses!inner(account_id)
        `);

      // Filter by account courses only
      const courseIds = courses.map(c => c.id);
      if (courseIds.length > 0) {
        query = query.in('course_id', courseIds);
      }

      const { data, error } = await query
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Error loading completions:', error);
      }

      let allCompletions = data || [];

      // If no completions found, also check enrollments with 100% progress as fallback
      if (allCompletions.length === 0) {
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('course_enrollments')
          .select(`
            id,
            user_id,
            course_id,
            final_score,
            completed_at,
            progress_percentage,
            courses!inner(
              title,
              account_id
            )
          `)
          .eq('progress_percentage', 100)
          .in('course_id', courseIds);

        if (!enrollmentError && enrollmentData) {
          // Get user details for these enrollments
          const userIds = [...new Set(enrollmentData.map(e => e.user_id))];
          const { data: users } = await supabase
            .from('accounts')
            .select('primary_owner_user_id, name, email')
            .in('primary_owner_user_id', userIds);

          const userMap = new Map(users?.map(u => [u.primary_owner_user_id, u]) || []);

          // Transform enrollment data to match completion format
          allCompletions = enrollmentData.map(enrollment => {
            const user = userMap.get(enrollment.user_id);
            return {
              id: enrollment.id,
              user_id: enrollment.user_id,
              course_id: enrollment.course_id,
              student_name: user?.name || 'Unknown',
              student_email: user?.email || 'unknown@email.com',
              course_name: enrollment.courses.title,
              final_quiz_score: enrollment.final_score,
              final_quiz_passed: enrollment.final_score ? enrollment.final_score >= 80 : false,
              completion_percentage: enrollment.progress_percentage,
              completed_at: enrollment.completed_at || new Date().toISOString()
            };
          });
        }
      }

      setCompletions(allCompletions);
    } catch (error) {
      console.error('Error loading completions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCompletions = () => {
    let filtered = completions;

    // Filter by course
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(c => c.course_id === selectedCourse);
    }

    // Filter by search query (name or email)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.student_name.toLowerCase().includes(query) ||
        c.student_email.toLowerCase().includes(query)
      );
    }

    setFilteredCompletions(filtered);
  };

  const exportToCSV = () => {
    const headers = [
      'Student Name',
      'Student Email',
      'Course Name',
      'Final Quiz Score',
      'Final Quiz Passed',
      'Completion Date',
      'Completion Percentage'
    ];

    const csvData = filteredCompletions.map(completion => [
      completion.student_name,
      completion.student_email,
      completion.course_name,
      completion.final_quiz_score?.toString() || 'N/A',
      completion.final_quiz_passed ? 'Yes' : 'No',
      format(new Date(completion.completed_at), 'yyyy-MM-dd HH:mm:ss'),
      `${completion.completion_percentage}%`
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `course-completions-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Course Completion Reports</CardTitle>
          <CardDescription>Loading completion data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Course Completion Reports</CardTitle>
            <CardDescription>
              Track student completion with names, emails, dates, courses, and final quiz scores
            </CardDescription>
          </div>
          <Button onClick={exportToCSV} disabled={filteredCompletions.length === 0}>
            Export CSV
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Students</Label>
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="w-48">
              <Label htmlFor="course-filter">Filter by Course</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="All courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {filteredCompletions.length} of {completions.length} completions
            </span>
            {selectedCourse !== 'all' && (
              <span>
                Filtered by: {courses.find(c => c.id === selectedCourse)?.title}
              </span>
            )}
          </div>

          {/* Completions Table */}
          {filteredCompletions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {completions.length === 0 ? (
                <div>
                  <p className="text-lg font-medium mb-2">No completions yet</p>
                  <p>Course completions will appear here once students finish courses.</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium mb-2">No completions match your filters</p>
                  <p>Try adjusting your search or course filter.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Final Quiz Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Completion Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompletions.map((completion) => (
                    <TableRow key={completion.id}>
                      <TableCell className="font-medium">
                        {completion.student_name}
                      </TableCell>
                      <TableCell>{completion.student_email}</TableCell>
                      <TableCell>{completion.course_name}</TableCell>
                      <TableCell>
                        {completion.final_quiz_score !== null && completion.final_quiz_score !== undefined ? (
                          <div className="flex items-center space-x-2">
                            <span>{Math.round(completion.final_quiz_score)}%</span>
                            <Badge
                              variant={completion.final_quiz_passed ? 'default' : 'destructive'}
                            >
                              {completion.final_quiz_passed ? 'Passed' : 'Failed'}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No score</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {completion.completion_percentage}% Complete
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(completion.completed_at), 'MMM dd, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}