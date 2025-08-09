'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card } from '@kit/ui/card';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export default function DebugCourseSavePage() {
  const [courseId, setCourseId] = useState('');
  const [debugOutput, setDebugOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    fetch('/api/list-courses')
      .then(res => res.json())
      .then(data => {
        setCourses(data.courses || []);
        setLoadingCourses(false);
      })
      .catch(() => setLoadingCourses(false));
  }, []);

  const runDebug = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-course-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: courseId,
          title: 'Test Course Update',
          description: 'Testing course update',
          status: 'draft'
        })
      });

      const data = await response.json();
      setDebugOutput(data);
    } catch (error) {
      setDebugOutput({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Debug Course Save</h1>
      
      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Course ID</label>
            <input
              type="text"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="Enter a course ID to test"
              className="w-full p-2 border rounded"
            />
          </div>
          
          {!loadingCourses && courses.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Or select from existing courses:</p>
              <select 
                value={courseId} 
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select a course</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title} ({course.status}) - {course.id}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <Button 
            onClick={runDebug} 
            disabled={loading || !courseId}
          >
            {loading ? 'Running Debug...' : 'Run Debug Test'}
          </Button>
        </div>
      </Card>

      {debugOutput && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Debug Output</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 text-xs">
            {JSON.stringify(debugOutput, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}