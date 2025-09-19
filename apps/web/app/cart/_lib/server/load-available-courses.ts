import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export interface AvailableCourse {
  id: string;
  title: string;
  slug: string;
  sku?: string | null;
  price: string;
  description: string | null;
  billing_product_id: string | null;
  status: string;
  expectedSlug?: string;
}

const TITLE_TO_SLUG: Record<string, string> = {
  'DOT HAZMAT - 3': 'dot-hazmat',
  'Advanced HAZMAT': 'advanced-hazmat',
  'Advanced Awareness': 'advanced-hazmat',
  'DOT HAZMAT - Advanced Awareness': 'advanced-hazmat',
  'DOT HAZMAT - General and Security Awareness': 'dot-hazmat-general',
  'DOT HAZMAT - General Awareness': 'dot-hazmat-general',
  'DOT HAZMAT - General Awareness ': 'dot-hazmat-general',
  'EPA RCRA': 'epa-rcra',
  'EPA - RCRA': 'epa-rcra',
};

const TITLE_TO_PRICE: Record<string, string> = {
  'DOT HAZMAT - 3': '119',
  'DOT HAZMAT - General and Security Awareness': '119',
  'DOT HAZMAT - General Awareness': '119',
  'DOT HAZMAT - General Awareness ': '119',
  'DOT HAZMAT - Advanced Awareness': '119',
  'Advanced HAZMAT': '119',
  'Advanced Awareness': '119',
  'EPA RCRA': '119',
  'EPA - RCRA': '119',
};

export async function loadAvailableCourses() {
  const supabase = getSupabaseServerAdminClient();

  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, title, slug, sku, price, description, billing_product_id, status')
    .eq('status', 'published')
    .order('title');

  if (error) {
    console.error('Error loading published courses:', error);
  }

  const coursesWithMapping: AvailableCourse[] = (courses || []).map((course) => {
    const trimmedTitle = course.title?.trim();
    const expectedSlug = trimmedTitle ? TITLE_TO_SLUG[trimmedTitle] : undefined;
    const mappedPrice = trimmedTitle ? TITLE_TO_PRICE[trimmedTitle] : undefined;

    const price =
      course.price && parseFloat(course.price) > 0
        ? course.price.toString()
        : mappedPrice || '0';

    return {
      ...course,
      price,
      expectedSlug,
    };
  });

  return coursesWithMapping;
}
