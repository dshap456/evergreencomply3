'use client';

import { useState, useTransition } from 'react';
import { Button } from '@kit/ui/button';
import { Card } from '@kit/ui/card';
import { updateCourseAction } from '../admin/lms/_lib/server/course-actions';

export default function TestCourseActionPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  const testAction = () => {
    startTransition(async () => {
      try {
        setError(null);
        setResult(null);
        
        const response = await updateCourseAction({
          id: 'd515f6a9-05e3-481d-a6db-d316ff098d09',
          title: 'Test from Action Page',
          description: 'Testing server action directly',
          status: 'draft'
        });
        
        setResult(response);
      } catch (err) {
        setError(err);
        console.error('Action error:', err);
      }
    });
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Test Course Action</h1>
      
      <Card className="p-6 mb-6">
        <Button onClick={testAction} disabled={isPending}>
          {isPending ? 'Testing...' : 'Test updateCourseAction'}
        </Button>
      </Card>

      {result && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Success Result</h2>
          <pre className="bg-green-50 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}

      {error && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Error Result</h2>
          <pre className="bg-red-50 p-4 rounded overflow-auto text-xs">
            {JSON.stringify({
              message: error?.message || 'Unknown error',
              stack: error?.stack,
              details: error
            }, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}