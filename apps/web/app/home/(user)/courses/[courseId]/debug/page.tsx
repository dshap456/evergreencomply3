'use client';

import { use, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';

interface DebugPageProps {
  params: Promise<{ courseId: string }>;
}

export default function DebugCoursePage({ params }: DebugPageProps) {
  const { courseId } = use(params);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/courses/${courseId}?language=en`)
      .then(res => res.json())
      .then(data => {
        setResult(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, [courseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug Course Loader API</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Course ID:</h3>
              <code className="bg-gray-100 p-2 rounded">{courseId}</code>
            </div>

            {error && (
              <div>
                <h3 className="font-semibold text-red-600">Fetch Error:</h3>
                <pre className="bg-red-50 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </div>
            )}

            {result && (
              <div>
                <h3 className="font-semibold">API Response:</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}