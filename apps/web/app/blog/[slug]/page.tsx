import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import Script from 'next/script';

import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft, 
  ArrowRight,
  BookOpen,
  Share2,
  ChevronRight,
  Tag
} from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { 
  generateSEOMetadata,
  generateBreadcrumbStructuredData,
} from '~/lib/seo/seo-utils';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseServerClient();
  
  const { data: post } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!post) {
    return {
      title: 'Post Not Found',
      robots: { index: false, follow: false },
    };
  }

  return generateSEOMetadata({
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt || post.content.substring(0, 160),
    keywords: post.seo_keywords || post.tags || [],
    url: `/blog/${slug}`,
    type: 'article',
    image: post.featured_image,
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const supabase = getSupabaseServerClient();
  
  // Fetch the blog post
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !post) {
    notFound();
  }

  // Increment view count
  await supabase
    .from('blog_posts')
    .update({ view_count: (post.view_count || 0) + 1 })
    .eq('id', post.id);

  // Fetch related posts
  const { data: relatedPosts } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, featured_image, published_at, read_time_minutes')
    .eq('status', 'published')
    .eq('category', post.category)
    .neq('id', post.id)
    .limit(3)
    .order('published_at', { ascending: false });

  // Fetch related courses if any
  let relatedCourses = [];
  if (post.related_course_ids && post.related_course_ids.length > 0) {
    const { data: courses } = await supabase
      .from('courses')
      .select('id, slug, title, description, price')
      .in('id', post.related_course_ids)
      .eq('status', 'published');
    relatedCourses = courses || [];
  }

  // Generate structured data
  const articleStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || post.seo_description,
    image: post.featured_image,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: {
      '@type': 'Person',
      name: post.author_name || 'Evergreen Comply Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Evergreen Comply',
      logo: {
        '@type': 'ImageObject',
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${slug}`,
    },
    keywords: post.tags?.join(', '),
    articleSection: post.category,
    wordCount: post.content.split(' ').length,
  };

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${slug}` },
  ]);

  // Format the content (basic Markdown to HTML - you might want to use a proper markdown parser)
  const formatContent = (content: string) => {
    return content
      .split('\n\n')
      .map((paragraph, index) => {
        if (paragraph.startsWith('#')) {
          const level = paragraph.match(/^#+/)?.[0].length || 1;
          const text = paragraph.replace(/^#+\s/, '');
          const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
          return <HeadingTag key={index} className="font-bold mt-8 mb-4">{text}</HeadingTag>;
        }
        if (paragraph.startsWith('- ')) {
          const items = paragraph.split('\n').map(item => item.replace(/^- /, ''));
          return (
            <ul key={index} className="list-disc list-inside mb-4 space-y-2">
              {items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          );
        }
        return <p key={index} className="mb-4 leading-relaxed">{paragraph}</p>;
      });
  };

  return (
    <>
      <Script
        id="article-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleStructuredData),
        }}
      />
      <Script
        id="breadcrumb-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbData),
        }}
      />
      
      <article className="min-h-screen bg-background">
        {/* Hero Section */}
        <header className="bg-gradient-to-b from-primary/5 to-background">
          <div className="container py-12">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <ChevronRight className="inline h-4 w-4 mx-2" />
              <Link href="/blog" className="hover:text-foreground">Blog</Link>
              <ChevronRight className="inline h-4 w-4 mx-2" />
              <span className="text-foreground">{post.category}</span>
            </nav>
            
            {/* Post Header */}
            <div className="max-w-4xl mx-auto">
              {post.category && (
                <Badge className="mb-4" variant="secondary">
                  {post.category}
                </Badge>
              )}
              
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                {post.title}
              </h1>
              
              {post.excerpt && (
                <p className="text-xl text-muted-foreground mb-6">
                  {post.excerpt}
                </p>
              )}
              
              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{post.author_name || 'Evergreen Comply Team'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={post.published_at}>
                    {new Date(post.published_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{post.read_time_minutes || Math.ceil(post.content.split(' ').length / 200)} min read</span>
                </div>
              </div>
              
              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {post.tags.map((tag) => (
                    <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                      <Badge variant="outline" className="hover:bg-primary hover:text-primary-foreground">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {post.featured_image && (
          <div className="container py-6">
            <div className="max-w-4xl mx-auto">
              <div className="relative aspect-video overflow-hidden rounded-lg">
                <Image
                  src={post.featured_image}
                  alt={post.title}
                  width={1200}
                  height={675}
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="container py-12">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg max-w-none">
              {formatContent(post.content)}
            </div>
            
            {/* Related Courses CTA */}
            {relatedCourses.length > 0 && (
              <div className="mt-12 p-6 bg-primary/5 rounded-lg">
                <h3 className="text-2xl font-bold mb-4">Related Training Courses</h3>
                <div className="grid gap-4">
                  {relatedCourses.map((course) => (
                    <Card key={course.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{course.title}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {course.description}
                            </p>
                          </div>
                          <div className="ml-4 text-right">
                            <div className="text-2xl font-bold">${course.price}</div>
                            <Link href={`/courses/${course.slug}`}>
                              <Button size="sm" className="mt-2">
                                View Course
                                <ArrowRight className="ml-2 h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            {/* Share Section */}
            <div className="mt-12 pt-8 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Share this article:</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Link href="/blog">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Blog
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts && relatedPosts.length > 0 && (
          <section className="py-12 bg-muted/50">
            <div className="container">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold mb-8">Related Articles</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {relatedPosts.map((relatedPost) => (
                    <Card key={relatedPost.id} className="hover:shadow-lg transition-shadow">
                      {relatedPost.featured_image && (
                        <div className="relative aspect-video overflow-hidden rounded-t-lg">
                          <Image
                            src={relatedPost.featured_image}
                            alt={relatedPost.title}
                            width={400}
                            height={225}
                            className="object-cover"
                          />
                        </div>
                      )}
                      <CardContent className="p-6">
                        <h3 className="font-semibold mb-2 line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                          {relatedPost.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{relatedPost.read_time_minutes} min</span>
                          </div>
                          <Link href={`/blog/${relatedPost.slug}`}>
                            <Button size="sm" variant="ghost">
                              Read More
                              <ArrowRight className="ml-2 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Newsletter CTA */}
        <section className="py-16 bg-primary/5">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">
                Stay Updated on Compliance Training
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Get the latest compliance news, training updates, and exclusive offers delivered to your inbox.
              </p>
              <Link href="/contact">
                <Button size="lg">
                  Subscribe to Newsletter
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </article>
    </>
  );
}