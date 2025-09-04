import { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Input } from '@kit/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@kit/ui/select';
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  Award,
  Users,
  ArrowRight,
  TrendingUp,
  Shield,
  DollarSign,
} from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { 
  generateSEOMetadata, 
  generateOrganizationStructuredData,
  generateBreadcrumbStructuredData,
  generateFAQStructuredData,
} from '~/lib/seo/seo-utils';

export const metadata: Metadata = generateSEOMetadata({
  title: 'Online Compliance Training Courses',
  description: 'Browse our comprehensive catalog of online compliance and safety training courses. OSHA, DOT HAZMAT, EPA RCRA, and industry-specific certifications available.',
  keywords: [
    'online compliance training',
    'safety certification courses',
    'OSHA training online',
    'DOT HAZMAT certification',
    'EPA RCRA training',
    'professional development courses',
    'workplace safety training',
    'online certification programs',
  ],
  url: '/courses',
  type: 'website',
});

interface SearchParams {
  category?: string;
  sort?: 'price-asc' | 'price-desc' | 'title' | 'newest';
  search?: string;
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = getSupabaseServerClient();

  // Build query
  let query = supabase
    .from('courses')
    .select('*')
    .eq('status', 'published');

  // Apply filters
  if (params.category && params.category !== 'all') {
    query = query.eq('category', params.category);
  }

  if (params.search) {
    query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
  }

  // Apply sorting
  switch (params.sort) {
    case 'price-asc':
      query = query.order('price', { ascending: true });
      break;
    case 'price-desc':
      query = query.order('price', { ascending: false });
      break;
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'title':
    default:
      query = query.order('title', { ascending: true });
      break;
  }

  const { data: courses, error } = await query;

  // Get unique categories for filter
  const { data: categoriesData } = await supabase
    .from('courses')
    .select('category')
    .eq('status', 'published')
    .not('category', 'is', null);
  
  const categories = [...new Set(categoriesData?.map(c => c.category) || [])];

  // Structured data
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Courses', url: '/courses' },
  ]);

  const courseCatalogData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Evergreen Comply Course Catalog',
    description: 'Complete catalog of compliance and safety training courses',
    numberOfItems: courses?.length || 0,
    itemListElement: courses?.map((course, index) => ({
      '@type': 'Course',
      position: index + 1,
      name: course.title,
      description: course.description,
      url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com'}/courses/${course.slug}`,
      provider: {
        '@type': 'Organization',
        name: 'Evergreen Comply',
      },
      offers: {
        '@type': 'Offer',
        price: course.price,
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    })),
  };

  const faqData = generateFAQStructuredData([
    {
      question: 'How long do I have access to the courses?',
      answer: 'Once enrolled, you have unlimited access to the course materials for as long as you need to complete the training.',
    },
    {
      question: 'Are the certifications recognized nationwide?',
      answer: 'Yes, our certifications meet federal compliance requirements and are recognized across all 50 states.',
    },
    {
      question: 'Can I get group discounts for my team?',
      answer: 'Yes, we offer volume discounts for organizations purchasing multiple course seats. Contact our sales team for custom pricing.',
    },
    {
      question: 'How quickly can I complete a course?',
      answer: 'Most courses can be completed in 2-4 hours. You can work at your own pace and pause/resume as needed.',
    },
    {
      question: 'Do I get a certificate immediately?',
      answer: 'Yes, certificates are issued immediately upon successful completion of the course and passing the final assessment.',
    },
  ]);

  return (
    <>
      <Script
        id="breadcrumb-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbData),
        }}
      />
      <Script
        id="course-catalog-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(courseCatalogData),
        }}
      />
      <Script
        id="faq-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqData),
        }}
      />
      
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-primary/10 to-background py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
                Professional Compliance Training Courses
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Get certified online with our comprehensive library of compliance and safety training courses. 
                Instant certificates, lifetime access, and expert support included.
              </p>
              
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Fully Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <span>Instant Certificates</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span>98% Pass Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span>10,000+ Trained</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="sticky top-0 z-30 bg-background border-b">
          <div className="container py-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <form className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search courses..."
                    className="pl-10"
                    name="search"
                    defaultValue={params.search}
                  />
                </form>
              </div>
              
              <div className="flex gap-4">
                <Select name="category" defaultValue={params.category || 'all'}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select name="sort" defaultValue={params.sort || 'title'}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Alphabetical</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {params.category && params.category !== 'all' && (
              <div className="mt-4">
                <Badge variant="secondary" className="text-sm">
                  Showing: {params.category} ({courses?.length || 0} courses)
                </Badge>
              </div>
            )}
          </div>
        </section>

        {/* Courses Grid */}
        <section className="py-12">
          <div className="container">
            {courses && courses.length > 0 ? (
              <>
                <div className="mb-6 text-sm text-muted-foreground">
                  Showing {courses.length} courses
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {courses.map((course) => (
                    <Card key={course.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            {course.category}
                          </Badge>
                          <div className="text-right">
                            <div className="text-2xl font-bold">${course.price}</div>
                            <div className="text-xs text-muted-foreground">per seat</div>
                          </div>
                        </div>
                        <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground mb-6 line-clamp-3">
                          {course.description}
                        </p>
                        
                        <div className="space-y-2 mb-6">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{course.estimated_duration || '2-3 hours'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Award className="h-4 w-4" />
                            <span>Certificate of Completion</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                            <span>Self-paced online learning</span>
                          </div>
                        </div>
                        
                        <Link href={`/courses/${course.slug}`}>
                          <Button className="w-full">
                            View Course Details
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-xl text-muted-foreground mb-4">
                  No courses found matching your criteria.
                </p>
                <Button variant="outline" onClick={() => window.location.href = '/courses'}>
                  Clear Filters
                </Button>
              </Card>
            )}
          </div>
        </section>

        {/* Categories Section */}
        <section className="py-12 bg-muted/50">
          <div className="container">
            <h2 className="text-3xl font-bold mb-8 text-center">Browse by Category</h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <Link
                  key={category}
                  href={`/courses/category/${category.toLowerCase().replace(/\s+/g, '-').replace('&', 'and')}`}
                >
                  <Card className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer">
                    <CardContent className="p-6">
                      <BookOpen className="h-8 w-8 text-primary mb-3" />
                      <h3 className="font-semibold">{category}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        View courses →
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
              <div className="space-y-6">
                <div className="border rounded-lg p-6">
                  <h3 className="font-semibold mb-2">How long do I have access to the courses?</h3>
                  <p className="text-muted-foreground">
                    Once enrolled, you have unlimited access to the course materials for as long as you need to complete the training.
                  </p>
                </div>
                <div className="border rounded-lg p-6">
                  <h3 className="font-semibold mb-2">Are the certifications recognized nationwide?</h3>
                  <p className="text-muted-foreground">
                    Yes, our certifications meet federal compliance requirements and are recognized across all 50 states.
                  </p>
                </div>
                <div className="border rounded-lg p-6">
                  <h3 className="font-semibold mb-2">Can I get group discounts for my team?</h3>
                  <p className="text-muted-foreground">
                    Yes, we offer volume discounts for organizations purchasing multiple course seats. Contact our sales team for custom pricing.
                  </p>
                </div>
                <div className="border rounded-lg p-6">
                  <h3 className="font-semibold mb-2">How quickly can I complete a course?</h3>
                  <p className="text-muted-foreground">
                    Most courses can be completed in 2-4 hours. You can work at your own pace and pause/resume as needed.
                  </p>
                </div>
                <div className="border rounded-lg p-6">
                  <h3 className="font-semibold mb-2">Do I get a certificate immediately?</h3>
                  <p className="text-muted-foreground">
                    Yes, certificates are issued immediately upon successful completion of the course and passing the final assessment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary/5">
          <div className="container text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who have enhanced their skills and achieved compliance with our training programs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg" variant="outline">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Get Group Pricing
                </Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button size="lg">
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}