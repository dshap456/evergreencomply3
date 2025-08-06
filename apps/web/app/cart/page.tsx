import { withI18n } from '~/lib/i18n/with-i18n';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { CartClient } from './_components/cart-client';

async function CartPage() {
  const supabase = getSupabaseServerClient();
  
  // Fetch all published courses
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, slug, sku, price, description, billing_product_id')
    .eq('status', 'published')
    .order('title');

  if (error) {
    console.error('Error loading courses:', error);
  }

  console.log('Courses loaded from database:', courses);
  console.log('Course slugs:', courses?.map(c => ({ id: c.id, slug: c.slug, title: c.title })));

  // Pass courses to client component
  return <CartClient availableCourses={courses || []} />;
}

export default withI18n(CartPage);