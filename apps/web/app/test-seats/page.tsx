'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Card } from '@kit/ui/card';

export default function TestSeatsPage() {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  const runDebugTest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug-seats');
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      setDebugData({ error: 'Failed to fetch', details: error });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Course Seats Debug Test</h1>
      
      <Button onClick={runDebugTest} disabled={loading}>
        {loading ? 'Running tests...' : 'Run Debug Tests'}
      </Button>
      
      {debugData && (
        <Card className="mt-4 p-4">
          <pre className="whitespace-pre-wrap text-xs">
            {JSON.stringify(debugData, null, 2)}
          </pre>
        </Card>
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Quick Actions:</h2>
        <div className="space-y-2">
          <p>1. Click "Run Debug Tests" to check database tables</p>
          <p>2. Check the console for any client-side errors</p>
          <p>3. Look for any missing tables or columns in the output</p>
        </div>
      </div>
    </div>
  );
}