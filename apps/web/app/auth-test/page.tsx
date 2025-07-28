'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function AuthTestPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        // User is authenticated, redirect to home
        setTimeout(() => {
          router.push('/home');
        }, 2000);
      }
    });
  }, [router]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      {user ? (
        <div>
          <p className="text-green-600 mb-2">✓ You are authenticated!</p>
          <p>Email: {user.email}</p>
          <p>ID: {user.id}</p>
          <p className="mt-4 text-gray-600">Redirecting to /home in 2 seconds...</p>
        </div>
      ) : (
        <div>
          <p className="text-red-600">✗ You are not authenticated</p>
          <a href="/auth/sign-in" className="text-blue-600 underline">Go to sign in</a>
        </div>
      )}
    </div>
  );
}