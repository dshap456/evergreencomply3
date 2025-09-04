import { MetadataRoute } from 'next';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getSupabaseServerClient();
  
  // Fetch all published courses
  const { data: courses } = await supabase
    .from('courses')
    .select('slug, updated_at')
    .eq('status', 'published');

  // Fetch all course categories
  const { data: categoriesData } = await supabase
    .from('courses')
    .select('category')
    .eq('status', 'published')
    .not('category', 'is', null);
  
  const categories = [...new Set(categoriesData?.map(c => c.category) || [])];

  // Fetch all published blog posts
  const { data: blogPosts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/courses`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // Dynamic course pages
  const coursePages: MetadataRoute.Sitemap = courses?.map((course) => ({
    url: `${BASE_URL}/courses/${course.slug}`,
    lastModified: course.updated_at ? new Date(course.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  })) || [];

  // Category landing pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${BASE_URL}/courses/category/${encodeURIComponent(category.toLowerCase().replace(/\s+/g, '-'))}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Location-based landing pages (top cities for local SEO)
  const locations = [
    'new-york',
    'los-angeles',
    'chicago',
    'houston',
    'phoenix',
    'philadelphia',
    'san-antonio',
    'san-diego',
    'dallas',
    'austin',
    'denver',
    'seattle',
    'boston',
    'atlanta',
    'miami',
  ];

  const locationPages: MetadataRoute.Sitemap = locations.map((location) => ({
    url: `${BASE_URL}/training/${location}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // Blog posts
  const blogPostPages: MetadataRoute.Sitemap = blogPosts?.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  })) || [];

  // Blog main page
  const blogPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
  ];

  // Combine all pages
  return [...staticPages, ...coursePages, ...categoryPages, ...locationPages, ...blogPages, ...blogPostPages];
}