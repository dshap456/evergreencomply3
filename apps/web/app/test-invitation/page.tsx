'use client';

import { useState } from 'react';
import { Button } from '@kit/ui/button';
import { Input } from '@kit/ui/input';
import { Card } from '@kit/ui/card';

export default function TestInvitationPage() {
  const [email, setEmail] = useState('test@example.com');
  const [courseId, setCourseId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fill in some default values from your debug data
  const fillDefaults = () => {
    setCourseId('fcd4dd56-745b-4e22-8ffa-766af906303d'); // test16 course
    setAccountId('ba638bb1-9b90-4966-8be6-d278cc2e5120'); // your account
  };

  const testInvitation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, courseId, accountId }),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: 'Failed to send request', details: error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Test Course Invitation</h1>
      
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <label className="block mb-1">Email</label>
            <Input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
            />
          </div>
          
          <div>
            <label className="block mb-1">Course ID</label>
            <Input 
              value={courseId} 
              onChange={(e) => setCourseId(e.target.value)}
              placeholder="Course UUID"
            />
          </div>
          
          <div>
            <label className="block mb-1">Account ID</label>
            <Input 
              value={accountId} 
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Account UUID"
            />
          </div>
          
          <div className="flex gap-2">
            <Button onClick={fillDefaults} variant="outline">
              Fill Test Values
            </Button>
            <Button onClick={testInvitation} disabled={loading}>
              {loading ? 'Testing...' : 'Test Invitation'}
            </Button>
          </div>
        </div>
      </Card>

      {result && (
        <Card className="mt-4 p-4">
          <h2 className="font-semibold mb-2">Result:</h2>
          <pre className="whitespace-pre-wrap text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}