'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';

export default function DebugCoursesPage() {
  const [courseId, setCourseId] = useState('');
  const [enrollmentData, setEnrollmentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchEnrollment = async () => {
    if (!courseId) {
      setError('Please enter a course ID');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/debug-enrollment?courseId=${courseId}`);
      const data = await response.json();
      
      if (data.success) {
        setEnrollmentData(data.enrollment);
      } else {
        setError(data.error || 'Failed to fetch enrollment');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (progressPercentage: number) => {
    if (!courseId) {
      setError('Please enter a course ID');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/debug-enrollment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          progressPercentage
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setEnrollmentData(data.enrollment);
      } else {
        setError(data.error || 'Failed to update enrollment');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Debug Course Enrollment Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Course ID"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={fetchEnrollment} disabled={loading}>
              Fetch Status
            </Button>
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-800 rounded">
              Error: {error}
            </div>
          )}

          {enrollmentData && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-100 rounded">
                <h3 className="font-semibold mb-2">Current Enrollment Status:</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Course:</strong> {enrollmentData.title}</div>
                  <div><strong>Course ID:</strong> {enrollmentData.courseId}</div>
                  <div><strong>Progress:</strong> {enrollmentData.progress_percentage}%</div>
                  <div><strong>Completed At:</strong> {enrollmentData.completed_at || 'Not completed'}</div>
                  <div><strong>Has Started:</strong> {enrollmentData.hasStarted ? 'Yes' : 'No'}</div>
                  <div><strong>Is Completed:</strong> {enrollmentData.isCompleted ? 'Yes' : 'No'}</div>
                  <div><strong>Button Text:</strong> {enrollmentData.buttonText}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Update Progress:</h4>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => updateProgress(0)} 
                    disabled={loading}
                    variant="outline"
                  >
                    Reset (0%)
                  </Button>
                  <Button 
                    onClick={() => updateProgress(25)} 
                    disabled={loading}
                    variant="outline"
                  >
                    25%
                  </Button>
                  <Button 
                    onClick={() => updateProgress(50)} 
                    disabled={loading}
                    variant="outline"
                  >
                    50%
                  </Button>
                  <Button 
                    onClick={() => updateProgress(75)} 
                    disabled={loading}
                    variant="outline"
                  >
                    75%
                  </Button>
                  <Button 
                    onClick={() => updateProgress(100)} 
                    disabled={loading}
                    variant="outline"
                  >
                    Complete (100%)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}