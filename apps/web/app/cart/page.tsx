import { withI18n } from '~/lib/i18n/with-i18n';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { CartClient } from './_components/cart-client';

async function CartPage() {
  // Use admin client to bypass RLS and account restrictions for public course display
  const supabase = getSupabaseServerAdminClient();
  
  // First check if courses table exists and has data
  const { data: allCourses, error: allError } = await supabase
    .from('courses')
    .select('id, title, slug, sku, price, description, billing_product_id, is_published, account_id')
    .order('title');

  console.log('All courses in database:', allCourses);
  console.log('All courses error:', allError);
  console.log('Course account_ids:', allCourses?.map(c => ({ 
    title: c.title, 
    account_id: c.account_id,
    is_published: c.is_published
  })));

  // Then fetch published courses
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, slug, sku, price, description, billing_product_id, is_published')
    .eq('is_published', true)
    .order('title');

  if (error) {
    console.error('Error loading published courses:', error);
  }

  console.log('Published courses loaded from database:', courses);
  console.log('Course details:', courses?.map(c => ({ 
    id: c.id, 
    slug: c.slug, 
    title: c.title, 
    is_published: c.is_published,
    sku: c.sku 
  })));

  // Pass courses to client component
  return <CartClient availableCourses={courses || []} />;
}

export default withI18n(CartPage);