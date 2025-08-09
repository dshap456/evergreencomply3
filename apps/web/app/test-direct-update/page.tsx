'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Card } from '@kit/ui/card';

export default function TestDirectUpdatePage() {
  const [result, setResult] = useState<any>(null);
  
  const testUpdate = async () => {
    const res = await fetch('/api/test-direct-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseId: 'd515f6a9-05e3-481d-a6db-d316ff098d09',
        slug: 'test-slug-' + Date.now(),
        status: 'draft'
      })
    });
    const data = await res.json();
    setResult(data);
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">Test Direct Database Update</h1>
      
      <Button onClick={testUpdate}>Test Direct Update</Button>
      
      {result && (
        <Card className="mt-4 p-4">
          <h2 className="font-bold mb-2">Result:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}