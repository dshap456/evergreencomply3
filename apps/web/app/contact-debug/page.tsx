'use client';

import { useState } from 'react';

export default function ContactDebugPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testContactForm = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/contact-form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Debug Test',
          email: 'debug@test.com',
          message: 'Debug test message'
        }),
      });
      
      const data = await response.json();
      console.log('Response:', { status: response.status, ok: response.ok, data });
      
      setResult({
        status: response.status,
        ok: response.ok,
        data
      });
    } catch (err) {
      console.error('Error:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Contact Form Debug</h1>
      <button onClick={testContactForm} disabled={loading}>
        {loading ? 'Testing...' : 'Test Contact Form API'}
      </button>
      
      {result && (
        <div>
          <h3>Result:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      
      {error && (
        <div>
          <h3>Error:</h3>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}