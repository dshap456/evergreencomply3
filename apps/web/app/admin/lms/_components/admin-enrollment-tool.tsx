'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { toast } from '@kit/ui/sonner';
import { Spinner } from '@kit/ui/spinner';

import { adminEnrollUserAction, listUsersForEnrollmentAction } from '../_lib/server/admin-enrollment-actions';
import { loadCoursesAction } from '../_lib/server/load-courses-action';
import { simpleEnrollUserAction } from '../_lib/server/simple-enrollment-action';

interface Course {
  id: string;
  title: string;
  status: string;
}

interface User {
  id: string;
  email: string | null;
  name: string;
  created_at?: string | null;
}

export function AdminEnrollmentTool() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('🔄 AdminEnrollmentTool: Starting to load data...');
      
      const [coursesData, usersData] = await Promise.all([
        loadCoursesAction({}),
        listUsersForEnrollmentAction({})
      ]);
      
      console.log('📊 AdminEnrollmentTool: Raw data loaded:', {
        coursesCount: coursesData?.length || 0,
        usersCount: usersData?.length || 0,
        courses: coursesData?.map(c => ({ id: c.id, title: c.title, status: c.status })),
        users: usersData?.map(u => ({ email: u.email, name: u.name }))
      });
      
      const publishedCourses = coursesData.filter((c: Course) => c.status === 'published');
      console.log('📚 AdminEnrollmentTool: Published courses:', publishedCourses.length);
      
      setCourses(publishedCourses);
      setUsers(usersData);
      
      console.log('✅ AdminEnrollmentTool: Data loaded successfully');
    } catch (error) {
      console.error('❌ AdminEnrollmentTool: Failed to load data:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      toast.error(`Failed to load courses and users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedCourse || !userEmail) {
      toast.error('Please select a course and enter user email');
      return;
    }

    console.log('🔄 AdminEnrollmentTool: Starting enrollment...', {
      courseId: selectedCourse,
      userEmail: userEmail.trim()
    });

    setEnrolling(true);
    try {
      // Use the simpler action without enhanceAction wrapper
      const result = await simpleEnrollUserAction(userEmail.trim(), selectedCourse);
      
      if (result.success) {
        console.log('✅ AdminEnrollmentTool: Enrollment successful:', result);
        toast.success(result.message);
        setUserEmail('');
        setSelectedCourse('');
      } else {
        throw new Error(result.error || 'Enrollment failed');
      }
    } catch (error) {
      console.error('❌ AdminEnrollmentTool: Enrollment failed:', error);
      console.error('❌ Enrollment error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        courseId: selectedCourse,
        userEmail: userEmail.trim()
      });
      toast.error(error instanceof Error ? error.message : 'Failed to enroll user');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Spinner className="mr-2" />
          Loading enrollment tool...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>👨‍🎓 Manual Learner Enrollment</CardTitle>
        <p className="text-sm text-muted-foreground">
          Assign users to courses without payment (for testing)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">User Email</label>
          <Input
            type="email"
            placeholder="learner@example.com"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
          />
          <div className="text-xs text-muted-foreground">
            Available test users: learner@test.com, manager@test.com
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Select Course</label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a published course..." />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleEnroll} 
          disabled={!selectedCourse || !userEmail || enrolling}
          className="w-full"
        >
          {enrolling ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Enrolling...
            </>
          ) : (
            'Enroll User in Course'
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Quick Test Setup:</strong></p>
          <p>1. Use email: learner@test.com (password: password)</p>
          <p>2. Select any published course</p>
          <p>3. Click "Enroll User in Course"</p>
          <p>4. Login as learner to test the course experience</p>
        </div>
      </CardContent>
    </Card>
  );
}