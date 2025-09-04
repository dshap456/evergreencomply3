import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import Script from 'next/script';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { ArrowRight, BookOpen, Clock, Award, Users, TrendingUp, Shield } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { generateSEOMetadata, getCategoryKeywords, generateBreadcrumbStructuredData } from '~/lib/seo/seo-utils';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

// Map URL slugs to database category values
const categoryMapping: Record<string, string> = {
  'environment-and-safety': 'Environment and Safety',
  'osha': 'OSHA',
  'healthcare': 'Healthcare',
  'food-alcohol': 'Food & Alcohol',
  'hr-compliance': 'HR & Compliance',
  'industrial': 'Industrial',
  'insurance': 'Insurance',
  'real-estate': 'Real Estate',
  'other': 'Other',
};

const categoryDescriptions: Record<string, string> = {
  'Environment and Safety': 'Comprehensive environmental and workplace safety training courses designed to ensure compliance with federal and state regulations.',
  'OSHA': 'OSHA-compliant training programs for workplace safety, including 10-hour and 30-hour certification courses.',
  'Healthcare': 'Healthcare compliance and safety training for medical professionals, covering HIPAA, infection control, and patient safety.',
  'Food & Alcohol': 'Food safety and responsible alcohol service training, including ServSafe and state-specific certifications.',
  'HR & Compliance': 'Human resources and workplace compliance training covering harassment prevention, diversity, and employment law.',
  'Industrial': 'Industrial safety and equipment operation training for manufacturing and construction environments.',
  'Insurance': 'Continuing education courses for insurance professionals to maintain licenses and stay current with regulations.',
  'Real Estate': 'Real estate continuing education and certification courses for agents, brokers, and property managers.',
  'Other': 'Specialized professional training courses across various industries and compliance requirements.',
};

const categoryBenefits: Record<string, string[]> = {
  'Environment and Safety': [
    'Meet EPA and state environmental regulations',
    'Reduce workplace accidents and injuries',
    'Improve emergency response preparedness',
    'Minimize environmental impact and liability',
  ],
  'OSHA': [
    'Achieve OSHA compliance and avoid penalties',
    'Reduce workplace injuries by up to 40%',
    'Lower workers\' compensation costs',
    'Improve safety culture and employee morale',
  ],
  'Healthcare': [
    'Maintain healthcare facility accreditation',
    'Ensure HIPAA compliance and patient privacy',
    'Reduce medical errors and improve patient outcomes',
    'Meet continuing education requirements',
  ],
  'Food & Alcohol': [
    'Prevent foodborne illness outbreaks',
    'Comply with health department requirements',
    'Reduce liability and insurance costs',
    'Improve customer satisfaction and reputation',
  ],
  'HR & Compliance': [
    'Prevent workplace harassment and discrimination',
    'Reduce legal liability and lawsuits',
    'Improve employee retention and satisfaction',
    'Create inclusive workplace culture',
  ],
  'Industrial': [
    'Reduce industrial accidents and fatalities',
    'Comply with industry-specific regulations',
    'Improve equipment safety and maintenance',
    'Enhance operational efficiency',
  ],
  'Insurance': [
    'Maintain professional licenses',
    'Stay current with changing regulations',
    'Expand product knowledge and expertise',
    'Earn continuing education credits',
  ],
  'Real Estate': [
    'Maintain real estate licenses',
    'Learn about market trends and regulations',
    'Improve client service and satisfaction',
    'Expand professional expertise',
  ],
  'Other': [
    'Meet industry-specific requirements',
    'Enhance professional credentials',
    'Improve workplace safety and compliance',
    'Advance career opportunities',
  ],
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const dbCategory = categoryMapping[category];
  
  if (!dbCategory) {
    return {
      title: 'Category Not Found',
      robots: { index: false, follow: false },
    };
  }

  const keywords = [
    ...getCategoryKeywords(dbCategory),
    `${dbCategory.toLowerCase()} training`,
    `${dbCategory.toLowerCase()} certification`,
    `${dbCategory.toLowerCase()} courses online`,
    'compliance training',
    'professional certification',
  ];

  return generateSEOMetadata({
    title: `${dbCategory} Training Courses`,
    description: categoryDescriptions[dbCategory],
    keywords,
    url: `/courses/category/${category}`,
    type: 'website',
  });
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const dbCategory = categoryMapping[category];
  
  if (!dbCategory) {
    notFound();
  }

  const supabase = getSupabaseServerClient();
  
  // Fetch courses in this category
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .eq('category', dbCategory)
    .eq('status', 'published')
    .order('title');

  if (error) {
    console.error('Error fetching courses:', error);
    notFound();
  }

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Courses', url: '/courses' },
    { name: dbCategory, url: `/courses/category/${category}` },
  ]);

  const categoryStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${dbCategory} Training Courses`,
    description: categoryDescriptions[dbCategory],
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com'}/courses/category/${category}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: courses?.length || 0,
      itemListElement: courses?.map((course, index) => ({
        '@type': 'Course',
        position: index + 1,
        name: course.title,
        description: course.description,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com'}/courses/${course.slug}`,
        offers: {
          '@type': 'Offer',
          price: course.price,
          priceCurrency: 'USD',
        },
      })),
    },
  };

  return (
    <>
      <Script
        id="category-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(categoryStructuredData),
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
        <section className="relative bg-gradient-to-b from-primary/10 to-background py-16">
          <div className="container">
            <nav className="mb-6 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/courses" className="hover:text-foreground">Courses</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">{dbCategory}</span>
            </nav>
            
            <div className="max-w-3xl">
              <Badge className="mb-4" variant="secondary">
                {courses?.length || 0} Courses Available
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
                {dbCategory} Training & Certification
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                {categoryDescriptions[dbCategory]}
              </p>
              
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-sm">Industry Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <span className="text-sm">Certificates Provided</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-sm">Updated Content</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-12 bg-muted/50">
          <div className="container">
            <h2 className="text-3xl font-bold mb-8">Why Choose Our {dbCategory} Training?</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categoryBenefits[dbCategory]?.map((benefit, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <ArrowRight className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm">{benefit}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Courses Grid */}
        <section className="py-16">
          <div className="container">
            <h2 className="text-3xl font-bold mb-8">Available {dbCategory} Courses</h2>
            
            {courses && courses.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <BookOpen className="h-8 w-8 text-primary" />
                        <Badge variant="outline">${course.price}</Badge>
                      </div>
                      <CardTitle className="mt-4">{course.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4 line-clamp-3">
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
                          <Users className="h-4 w-4" />
                          <span>Self-paced learning</span>
                        </div>
                      </div>
                      
                      <Link href={`/courses/${course.slug}`}>
                        <Button className="w-full">
                          View Course
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No courses are currently available in this category.
                </p>
                <Link href="/courses">
                  <Button variant="outline">Browse All Courses</Button>
                </Link>
              </Card>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary/5">
          <div className="container text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Your {dbCategory} Training?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who have enhanced their skills and achieved compliance with our comprehensive training programs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/courses">
                <Button size="lg">
                  Browse All Courses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" variant="outline">
                  Contact Sales for Bulk Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}