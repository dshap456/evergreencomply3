'use client';

import { useState, useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card } from '@kit/ui/card';
import { loadCoursesAction } from '../admin/lms/_lib/server/load-courses-action';

export default function DebugCoursesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [apiResult, setApiResult] = useState<any>(null);

  const testLoadCourses = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      console.log('Starting loadCoursesAction...');
      const courses = await loadCoursesAction();
      console.log('Success:', courses);
      setResult(courses);
    } catch (err: any) {
      console.error('Error:', err);
      setError({
        message: err.message,
        stack: err.stack,
        name: err.name,
        toString: err.toString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testApiEndpoint = async () => {
    try {
      const response = await fetch('/api/debug-courses-full');
      const data = await response.json();
      setApiResult(data);
    } catch (err: any) {
      setApiResult({ error: err.message });
    }
  };

  useEffect(() => {
    // Test API endpoint on mount
    testApiEndpoint();
  }, []);

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Debug Courses Loading</h1>
      
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Test loadCoursesAction</h2>
        <Button onClick={testLoadCourses} disabled={loading}>
          {loading ? 'Loading...' : 'Test Load Courses'}
        </Button>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="font-semibold text-red-800">Error:</h3>
            <pre className="text-sm overflow-auto">{JSON.stringify(error, null, 2)}</pre>
          </div>
        )}
        
        {result && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="font-semibold text-green-800">Success:</h3>
            <p>Loaded {result.length} courses</p>
            <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">API Debug Info</h2>
        {apiResult ? (
          <pre className="text-sm overflow-auto bg-gray-50 p-4 rounded">
            {JSON.stringify(apiResult, null, 2)}
          </pre>
        ) : (
          <p>Loading API debug info...</p>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Browser Console</h2>
        <p className="text-sm text-gray-600">Open browser console (F12) to see detailed logs</p>
      </Card>
    </div>
  );
}