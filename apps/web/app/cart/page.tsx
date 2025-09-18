import { withI18n } from '~/lib/i18n/with-i18n';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { CartClient } from './_components/cart-client';

async function CartPage() {
  // Use admin client to bypass RLS and account restrictions for public course display
  const supabase = getSupabaseServerAdminClient();

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, slug, sku, price, description, billing_product_id, status')
    .eq('status', 'published')
    .order('title');

  if (error) {
    console.error('Error loading published courses:', error);
  }

  // Map common course identifiers to help with cart matching
  const coursesWithMapping = courses?.map(course => {
    // Map known titles to expected slugs
    const slugMapping: Record<string, string> = {
      'DOT HAZMAT - 3': 'dot-hazmat',
      'Advanced HAZMAT': 'advanced-hazmat',
      'Advanced Awareness': 'advanced-hazmat',
      'DOT HAZMAT - Advanced Awareness': 'advanced-hazmat',
      'DOT HAZMAT - General and Security Awareness': 'dot-hazmat-general',
      'DOT HAZMAT - General Awareness': 'dot-hazmat-general',
      'DOT HAZMAT - General Awareness ': 'dot-hazmat-general', // Legacy name with trailing space
      'EPA RCRA': 'epa-rcra',
      'EPA - RCRA': 'epa-rcra'
    };

    // Map known prices based on course titles (all courses are $119)
    const priceMapping: Record<string, string> = {
      'DOT HAZMAT - 3': '119',
      'DOT HAZMAT - General and Security Awareness': '119',
      'DOT HAZMAT - General Awareness': '119',
      'DOT HAZMAT - General Awareness ': '119', // Legacy name with trailing space
      'DOT HAZMAT - Advanced Awareness': '119',
      'Advanced HAZMAT': '119',
      'Advanced Awareness': '119',
      'EPA RCRA': '119',
      'EPA - RCRA': '119'
    };

    // If the course has a slug mapping, add it as an alias
    // Trim whitespace from title to handle database inconsistencies
    const expectedSlug = slugMapping[course.title.trim()];

    // Use mapped price if database price is null or 0
    const mappedPrice = priceMapping[course.title.trim()];
    const price =
      course.price && parseFloat(course.price) > 0
        ? course.price
        : mappedPrice || '0';

    return {
      ...course,
      price: price.toString(), // Ensure it's a string
      expectedSlug,
    };
  });

  // Pass courses to client component
  return <CartClient availableCourses={coursesWithMapping || []} />;
}

export default withI18n(CartPage);
