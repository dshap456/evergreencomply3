import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import {
  Search,
  Calendar,
  Clock,
  User,
  ArrowRight,
  TrendingUp,
  BookOpen,
  Tag,
  Filter,
} from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { 
  generateSEOMetadata,
  generateBreadcrumbStructuredData,
} from '~/lib/seo/seo-utils';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Compliance Training Blog',
  description: 'Expert insights on compliance training, safety regulations, OSHA updates, DOT HAZMAT requirements, and workplace safety best practices.',
  keywords: [
    'compliance training blog',
    'safety regulations news',
    'OSHA updates',
    'DOT HAZMAT guide',
    'EPA RCRA articles',
    'workplace safety tips',
    'compliance best practices',
    'training industry news',
  ],
  url: '/blog',
  type: 'website',
});

interface SearchParams {
  category?: string;
  tag?: string;
  search?: string;
  page?: string;
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = getSupabaseServerClient();
  
  const page = parseInt(params.page || '1', 10);
  const postsPerPage = 12;
  const offset = (page - 1) * postsPerPage;

  // Build query
  let query = supabase
    .from('blog_posts')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(offset, offset + postsPerPage - 1);

  // Apply filters
  if (params.category) {
    query = query.eq('category', params.category);
  }

  if (params.tag) {
    query = query.contains('tags', [params.tag]);
  }

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,excerpt.ilike.%${params.search}%,content.ilike.%${params.search}%`);
  }

  const { data: posts, count, error } = await query;

  // Get categories for filter
  const { data: categoriesData } = await supabase
    .from('blog_posts')
    .select('category')
    .eq('status', 'published')
    .not('category', 'is', null);
  
  const categories = [...new Set(categoriesData?.map(c => c.category) || [])];

  // Get popular tags
  const { data: tagsData } = await supabase
    .from('blog_posts')
    .select('tags')
    .eq('status', 'published');
  
  const allTags = tagsData?.flatMap(post => post.tags || []) || [];
  const tagCounts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const popularTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([tag]) => tag);

  // Get featured posts (most viewed)
  const { data: featuredPosts } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, featured_image, published_at, read_time_minutes')
    .eq('status', 'published')
    .order('view_count', { ascending: false })
    .limit(3);

  const totalPages = Math.ceil((count || 0) / postsPerPage);

  // Structured data
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
  ]);

  const blogStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Evergreen Comply Compliance Blog',
    description: 'Expert insights on compliance training and workplace safety',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com'}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'Evergreen Comply',
    },
    blogPost: posts?.map(post => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      datePublished: post.published_at,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`,
      author: {
        '@type': 'Person',
        name: post.author_name || 'Evergreen Comply Team',
      },
    })),
  };

  return (
    <>
      <Script
        id="blog-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogStructuredData),
        }}
      />
      <Script
        id="breadcrumb-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbData),
        }}
      />
      
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Compliance Training Insights
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Stay informed with the latest compliance regulations, safety best practices, and industry updates.
              </p>
              
              {/* Search Bar */}
              <form className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search articles..."
                  className="pl-12 pr-4 py-6 text-lg"
                  name="search"
                  defaultValue={params.search}
                />
              </form>
            </div>
          </div>
        </section>

        <div className="container py-12">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="lg:col-span-1 space-y-8">
              {/* Categories */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Categories
                </h3>
                <div className="space-y-2">
                  <Link href="/blog">
                    <Button variant={!params.category ? 'default' : 'ghost'} size="sm" className="w-full justify-start">
                      All Categories
                    </Button>
                  </Link>
                  {categories.map((category) => (
                    <Link key={category} href={`/blog?category=${encodeURIComponent(category)}`}>
                      <Button 
                        variant={params.category === category ? 'default' : 'ghost'} 
                        size="sm" 
                        className="w-full justify-start"
                      >
                        {category}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Popular Tags */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Popular Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag) => (
                    <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                      <Badge 
                        variant={params.tag === tag ? 'default' : 'outline'} 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                      >
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Featured Posts */}
              {featuredPosts && featuredPosts.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Popular Articles
                  </h3>
                  <div className="space-y-3">
                    {featuredPosts.map((post) => (
                      <Link key={post.id} href={`/blog/${post.slug}`}>
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <h4 className="font-medium text-sm line-clamp-2 mb-2">
                              {post.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{post.read_time_minutes || 5} min read</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Newsletter CTA */}
              <Card className="bg-primary/5">
                <CardHeader>
                  <h3 className="font-semibold">Stay Updated</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get compliance updates and training tips delivered to your inbox.
                  </p>
                  <Link href="/contact">
                    <Button className="w-full" size="sm">
                      Subscribe
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </aside>

            {/* Main Content */}
            <main className="lg:col-span-3">
              {/* Active Filters */}
              {(params.category || params.tag || params.search) && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Filtering by:</span>
                  {params.category && (
                    <Badge variant="secondary">
                      Category: {params.category}
                      <Link href="/blog" className="ml-2">×</Link>
                    </Badge>
                  )}
                  {params.tag && (
                    <Badge variant="secondary">
                      Tag: {params.tag}
                      <Link href="/blog" className="ml-2">×</Link>
                    </Badge>
                  )}
                  {params.search && (
                    <Badge variant="secondary">
                      Search: {params.search}
                      <Link href="/blog" className="ml-2">×</Link>
                    </Badge>
                  )}
                </div>
              )}

              {/* Posts Grid */}
              {posts && posts.length > 0 ? (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post) => (
                      <article key={post.id}>
                        <Card className="h-full hover:shadow-lg transition-shadow">
                          {post.featured_image && (
                            <div className="relative aspect-video overflow-hidden rounded-t-lg">
                              <Image
                                src={post.featured_image}
                                alt={post.title}
                                width={400}
                                height={225}
                                className="object-cover hover:scale-105 transition-transform"
                              />
                            </div>
                          )}
                          <CardContent className="p-6">
                            {post.category && (
                              <Badge variant="outline" className="mb-2">
                                {post.category}
                              </Badge>
                            )}
                            <h2 className="font-semibold text-lg mb-2 line-clamp-2">
                              {post.title}
                            </h2>
                            <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                              {post.excerpt || post.content.substring(0, 150)}...
                            </p>
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <time dateTime={post.published_at}>
                                  {new Date(post.published_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </time>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>{post.read_time_minutes || Math.ceil(post.content.split(' ').length / 200)} min</span>
                              </div>
                            </div>
                            
                            <Link href={`/blog/${post.slug}`}>
                              <Button variant="ghost" size="sm" className="w-full">
                                Read More
                                <ArrowRight className="ml-2 h-3 w-3" />
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      </article>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-12 flex justify-center gap-2">
                      {page > 1 && (
                        <Link href={`/blog?page=${page - 1}${params.category ? `&category=${params.category}` : ''}${params.tag ? `&tag=${params.tag}` : ''}`}>
                          <Button variant="outline">Previous</Button>
                        </Link>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <Link key={pageNum} href={`/blog?page=${pageNum}${params.category ? `&category=${params.category}` : ''}${params.tag ? `&tag=${params.tag}` : ''}`}>
                              <Button variant={page === pageNum ? 'default' : 'outline'} size="sm">
                                {pageNum}
                              </Button>
                            </Link>
                          );
                        })}
                      </div>
                      
                      {page < totalPages && (
                        <Link href={`/blog?page=${page + 1}${params.category ? `&category=${params.category}` : ''}${params.tag ? `&tag=${params.tag}` : ''}`}>
                          <Button variant="outline">Next</Button>
                        </Link>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <Card className="p-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">No articles found</h2>
                  <p className="text-muted-foreground mb-4">
                    {params.search || params.category || params.tag 
                      ? "Try adjusting your filters or search terms."
                      : "Check back soon for new compliance insights and training tips."}
                  </p>
                  <Link href="/blog">
                    <Button variant="outline">Clear Filters</Button>
                  </Link>
                </Card>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}