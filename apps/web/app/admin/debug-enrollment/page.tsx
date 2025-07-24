'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

export default function DebugEnrollmentPage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testBasicLoad = async () => {
    setLoading(true);
    setResult('Testing basic component load...');
    
    try {
      // Test 1: Can we import the actions?
      const { adminEnrollUserAction, listUsersForEnrollmentAction } = await import('../lms/_lib/server/admin-enrollment-actions');
      setResult(prev => prev + '\n✅ Successfully imported admin actions');
      
      // Test 2: Can we import load courses?
      const { loadCoursesAction } = await import('../lms/_lib/server/load-courses-action');
      setResult(prev => prev + '\n✅ Successfully imported load courses action');
      
      // Test 3: Can we call listUsers?
      setResult(prev => prev + '\n🔄 Testing user list...');
      const users = await listUsersForEnrollmentAction({});
      setResult(prev => prev + `\n✅ Users loaded: ${users.length} users found`);
      
      // Test 4: Can we call loadCourses?
      setResult(prev => prev + '\n🔄 Testing course list...');
      const courses = await loadCoursesAction({});
      setResult(prev => prev + `\n✅ Courses loaded: ${courses.length} courses found`);
      
      setResult(prev => prev + '\n\n🎉 All tests passed!');
      
    } catch (error) {
      setResult(prev => prev + `\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Debug test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const testEnrollment = async () => {
    setLoading(true);
    setResult('Testing enrollment action...');
    
    try {
      const { adminEnrollUserAction } = await import('../lms/_lib/server/admin-enrollment-actions');
      
      const result = await adminEnrollUserAction({
        userEmail: 'learner@test.com',
        courseId: '123e4567-e89b-12d3-a456-426614174000' // dummy UUID
      });
      
      setResult(prev => prev + `\n✅ Enrollment test result: ${JSON.stringify(result, null, 2)}`);
      
    } catch (error) {
      setResult(prev => prev + `\n❌ Enrollment error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Enrollment test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Admin Enrollment Debug Tool</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test the admin enrollment functionality step by step
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testBasicLoad} disabled={loading}>
              {loading ? 'Testing...' : 'Test Basic Load'}
            </Button>
            <Button onClick={testEnrollment} disabled={loading} variant="outline">
              {loading ? 'Testing...' : 'Test Enrollment'}
            </Button>
          </div>
          
          {result && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Test Results:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto whitespace-pre-wrap max-h-96">
                {result}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}