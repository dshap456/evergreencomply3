'use client';

import { useState, useEffect } from 'react';
import { AdminGuard } from '@kit/admin/components/admin-guard';

function TestCoursePage() {
  const [mounted, setMounted] = useState(false);
  const [testData, setTestData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    async function testAPI() {
      try {
        console.log('🧪 Testing admin debug API...');
        const response = await fetch('/api/admin/debug');
        const result = await response.json();
        console.log('🧪 Debug API result:', result);
        setTestData(result);
      } catch (err) {
        console.error('🧪 Debug API error:', err);
        setError(err instanceof Error ? err.message : 'Test failed');
      }
    }

    testAPI();
  }, [mounted]);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Course Test Page</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">API Test Results:</h2>
        {error ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            <p className="text-red-800">Error: {error}</p>
          </div>
        ) : testData ? (
          <div className="bg-green-50 border border-green-200 p-4 rounded">
            <p className="text-green-800">✅ API Working</p>
            <pre className="mt-2 text-sm overflow-auto">
              {JSON.stringify(testData, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded">
            <p className="text-blue-800">Testing API...</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Simple Course Editor Test:</h2>
        <div className="bg-gray-50 border p-4 rounded">
          <p>If you can see this text without an "Ouch" error, the basic admin routing works.</p>
          <button 
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => window.history.back()}
          >
            Back to LMS Admin
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminGuard(TestCoursePage);