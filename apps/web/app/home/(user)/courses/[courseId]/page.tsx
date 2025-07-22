export default function TestCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Course Page - Direct Render</h1>
      <p>If you can see this, the basic routing works!</p>
      <p>Course ID from URL: Will be shown by client component</p>
    </div>
  );
}
