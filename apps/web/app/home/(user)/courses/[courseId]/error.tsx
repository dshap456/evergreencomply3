'use client';

import { useEffect } from 'react';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';

export default function CourseError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Course page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-red-600">
            🔍 Debug: Course Page Error Captured
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Error Message:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {error.message}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Error Stack:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs max-h-64">
              {error.stack}
            </pre>
          </div>

          {error.digest && (
            <div>
              <h3 className="font-semibold mb-2">Error Digest:</h3>
              <code className="bg-gray-100 p-2 rounded text-xs">{error.digest}</code>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={reset} variant="default">
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.href = '/home/courses'} 
              variant="outline"
            >
              Back to Courses
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}