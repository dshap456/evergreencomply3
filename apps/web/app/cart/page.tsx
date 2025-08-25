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
    .select('id, title, slug, sku, price, description, billing_product_id, status, account_id')
    .order('title');

  console.log('All courses in database:', allCourses);
  console.log('All courses error:', allError);
  console.log('Course account_ids:', allCourses?.map(c => ({ 
    title: c.title, 
    account_id: c.account_id,
    status: c.status
  })));

  // Then fetch published courses
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, slug, sku, price, description, billing_product_id, status')
    .eq('status', 'published')
    .order('title');

  if (error) {
    console.error('Error loading published courses:', error);
  }

  console.log('Published courses loaded from database:', courses);
  console.log('Course details:', courses?.map(c => ({ 
    id: c.id, 
    slug: c.slug, 
    title: c.title, 
    status: c.status,
    sku: c.sku,
    price: c.price 
  })));

  // Map common course identifiers to help with cart matching
  const coursesWithMapping = courses?.map(course => {
    // Map known titles to expected slugs
    const slugMapping: Record<string, string> = {
      'DOT HAZMAT - 3': 'dot-hazmat',
      'Advanced HAZMAT': 'advanced-hazmat',
      'Advanced Awareness': 'advanced-hazmat',
      'DOT HAZMAT - Advanced Awareness': 'advanced-hazmat',
      'DOT HAZMAT - General Awareness': 'dot-hazmat-general',
      'DOT HAZMAT - General Awareness ': 'dot-hazmat-general', // With trailing space
      'EPA RCRA': 'epa-rcra',
      'EPA - RCRA': 'epa-rcra'
    };
    
    // Map known prices based on course titles (temporary until DB is updated)
    const priceMapping: Record<string, string> = {
      'DOT HAZMAT - 3': '79',
      'DOT HAZMAT - General Awareness': '79',
      'DOT HAZMAT - General Awareness ': '79', // With trailing space
      'DOT HAZMAT - Advanced Awareness': '1',
      'Advanced HAZMAT': '179',
      'Advanced Awareness': '179',
      'EPA RCRA': '129',
      'EPA - RCRA': '129'
    };
    
    // If the course has a slug mapping, add it as an alias
    // Trim whitespace from title to handle database inconsistencies
    const expectedSlug = slugMapping[course.title.trim()];
    
    // Use mapped price if database price is null or 0
    const mappedPrice = priceMapping[course.title.trim()];
    const price = (course.price && parseFloat(course.price) > 0) 
      ? course.price 
      : (mappedPrice || '0');
    
    return {
      ...course,
      price: price.toString(), // Ensure it's a string
      expectedSlug
    };
  });

  // Pass courses to client component
  return <CartClient availableCourses={coursesWithMapping || []} />;
}

export default withI18n(CartPage);# Redeploy to fix cart route
