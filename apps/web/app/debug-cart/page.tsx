import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export default async function DebugCartPage() {
  const supabase = getSupabaseServerAdminClient();
  
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, slug, sku, status, price')
    .order('title');

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Debug Cart - Course Information</h1>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">All Courses in Database:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(courses, null, 2)}
        </pre>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Published Courses:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(courses?.filter(c => c.status === 'published'), null, 2)}
        </pre>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Course Mapping Issues:</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Title</th>
              <th className="text-left p-2">DB Slug</th>
              <th className="text-left p-2">Expected Slug</th>
              <th className="text-left p-2">Match?</th>
            </tr>
          </thead>
          <tbody>
            {courses?.map(course => {
              const expectedSlugs: Record<string, string> = {
                'DOT HAZMAT - General Awareness': 'dot-hazmat-general',
                'DOT HAZMAT - 3': 'dot-hazmat',
                'Advanced HAZMAT': 'advanced-hazmat',
                'EPA - RCRA': 'epa-rcra'
              };
              const expected = expectedSlugs[course.title] || 'unknown';
              const matches = course.slug === expected;
              
              return (
                <tr key={course.id} className="border-b">
                  <td className="p-2">{course.title}</td>
                  <td className="p-2 font-mono">{course.slug || 'null'}</td>
                  <td className="p-2 font-mono">{expected}</td>
                  <td className="p-2">
                    <span className={matches ? 'text-green-600' : 'text-red-600'}>
                      {matches ? '✓' : '✗'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Cart Test:</h2>
        <p className="mb-2">Try these in the browser console:</p>
        <pre className="bg-gray-100 p-4 rounded text-sm">
{`// Check current cart
localStorage.getItem('training-cart')

// Add a course by slug
localStorage.setItem('training-cart', JSON.stringify([{courseId: 'dot-hazmat', quantity: 1}]))

// Clear cart
localStorage.removeItem('training-cart')`}
        </pre>
      </div>
    </div>
  );
}