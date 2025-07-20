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

interface Course {
  id: string;
  title: string;
  status: string;
}

interface User {
  id: string;
  email: string;
  name: string;
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
      const [coursesData, usersData] = await Promise.all([
        loadCoursesAction(),
        listUsersForEnrollmentAction()
      ]);
      
      setCourses(coursesData.filter((c: Course) => c.status === 'published'));
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load courses and users');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedCourse || !userEmail) {
      toast.error('Please select a course and enter user email');
      return;
    }

    setEnrolling(true);
    try {
      const result = await adminEnrollUserAction({
        courseId: selectedCourse,
        userEmail: userEmail.trim()
      });
      
      toast.success(result.message);
      setUserEmail('');
      setSelectedCourse('');
    } catch (error) {
      console.error('Enrollment failed:', error);
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