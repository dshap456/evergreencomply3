export default function TestPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Page</h1>
      <p>If you can see this, the app is running!</p>
      <p>Build Time: {new Date().toISOString()}</p>
      <p>Environment: {process.env.NODE_ENV}</p>
      <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not Set'}</p>
    </div>
  );
}