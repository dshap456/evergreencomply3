'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';

export default function TestSavePage() {
  const [result, setResult] = useState<any>(null);

  const testSimpleUpdate = async () => {
    const res = await fetch('/api/test-simple-update', { method: 'POST' });
    const data = await res.json();
    setResult(data);
  };

  const testCourseEditor = () => {
    // This will open the course editor
    window.location.href = '/admin/lms';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-6">Test Course Save</h1>
      
      <div className="space-y-4">
        <div>
          <Button onClick={testSimpleUpdate}>Test Simple Update (No Server Action)</Button>
          {result && (
            <pre className="mt-4 p-4 bg-gray-100 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
        
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Now go to the admin panel and try to save a course. 
            Check the browser console for any errors.
          </p>
          <Button onClick={testCourseEditor}>Go to Course Editor</Button>
        </div>
        
        <div>
          <p className="font-bold">Browser Console Instructions:</p>
          <ol className="list-decimal list-inside text-sm">
            <li>Open browser console (F12)</li>
            <li>Go to Network tab</li>
            <li>Try to save a course</li>
            <li>Look for any failed requests (red)</li>
            <li>Check Console tab for JavaScript errors</li>
          </ol>
        </div>
      </div>
    </div>
  );
}