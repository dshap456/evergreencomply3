'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';

export default function TestUpdateProgressPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // These are the lesson IDs from your data
  const lessons = [
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d480', title: 'DOT HAZMAT 2-1', status: 'completed' },
    { id: '30228643-1dc7-4d4b-9802-80e7b53cf990', title: 'New Lesson 2', status: 'completed' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d483', title: 'testing to see if this works 4', status: 'completed' },
    { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d484', title: 'Knowledge Check', status: 'not started' },
    { id: '90e8f212-58aa-49bf-be77-2facdc656a86', title: 'testing to see if this works 5', status: 'not started' },
    { id: '63185702-fa18-4aff-b6f4-f8536ff797ff', title: 'Quiz Test', status: 'not started' },
  ];

  const testUpdateProgress = async (lessonId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-update-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Test Update Progress Function</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
        <p className="text-sm">
          Click on any completed lesson to manually trigger the update_course_progress RPC function.
          This should update the progress_percentage in course_enrollments.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Lessons</h2>
        {lessons.map((lesson) => (
          <div key={lesson.id} className="flex items-center gap-4 p-3 border rounded">
            <div className="flex-1">
              <div className="font-medium">{lesson.title}</div>
              <div className="text-sm text-gray-600">ID: {lesson.id}</div>
              <div className="text-sm">Status: <span className={lesson.status === 'completed' ? 'text-green-600' : 'text-gray-500'}>{lesson.status}</span></div>
            </div>
            <Button 
              onClick={() => testUpdateProgress(lesson.id)}
              disabled={loading || lesson.status !== 'completed'}
              variant={lesson.status === 'completed' ? 'default' : 'outline'}
            >
              Test Update Progress
            </Button>
          </div>
        ))}
      </div>

      {result && (
        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Result:</h3>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="text-sm text-gray-600">
        <p>Expected behavior:</p>
        <ul className="list-disc ml-5">
          <li>3 completed lessons out of 6 total = 50% progress</li>
          <li>The update_course_progress function should calculate and update this</li>
          <li>Check server logs for detailed output</li>
        </ul>
      </div>
    </div>
  );
}