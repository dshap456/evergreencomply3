'use client';

import { useState } from 'react';

export default function TestContactPage() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Sending...');

    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      message: formData.get('message'),
    };

    console.log('Submitting:', data);

    try {
      const response = await fetch('/api/contact-form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      console.log('Response:', response.status, result);

      if (response.ok && result.success) {
        setStatus(`Success! Email sent with ID: ${result.result?.emailId}`);
      } else {
        setStatus(`Error: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setStatus(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Test Contact Form</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <input
            name="name"
            placeholder="Name"
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <textarea
            name="message"
            placeholder="Message"
            required
            style={{ width: '100%', padding: '8px', minHeight: '100px' }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 20px' }}
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>
      {status && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#f0f0f0' }}>
          {status}
        </div>
      )}
    </div>
  );
}