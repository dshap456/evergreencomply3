import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import Script from 'next/script';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { MapPin, Building2, Users, TrendingUp, Award, Clock, ArrowRight, CheckCircle } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { generateSEOMetadata, generateOrganizationStructuredData, generateBreadcrumbStructuredData } from '~/lib/seo/seo-utils';

interface LocationPageProps {
  params: Promise<{ location: string }>;
}

// Location data with proper names and state info
const locationData: Record<string, { 
  name: string; 
  state: string; 
  region: string;
  industries: string[];
  population: string;
}> = {
  'new-york': { 
    name: 'New York', 
    state: 'NY', 
    region: 'Northeast',
    industries: ['Finance', 'Healthcare', 'Construction', 'Manufacturing'],
    population: '8.3M',
  },
  'los-angeles': { 
    name: 'Los Angeles', 
    state: 'CA', 
    region: 'West Coast',
    industries: ['Entertainment', 'Manufacturing', 'Healthcare', 'Logistics'],
    population: '3.9M',
  },
  'chicago': { 
    name: 'Chicago', 
    state: 'IL', 
    region: 'Midwest',
    industries: ['Manufacturing', 'Finance', 'Healthcare', 'Transportation'],
    population: '2.7M',
  },
  'houston': { 
    name: 'Houston', 
    state: 'TX', 
    region: 'South',
    industries: ['Energy', 'Healthcare', 'Manufacturing', 'Aerospace'],
    population: '2.3M',
  },
  'phoenix': { 
    name: 'Phoenix', 
    state: 'AZ', 
    region: 'Southwest',
    industries: ['Technology', 'Manufacturing', 'Healthcare', 'Construction'],
    population: '1.6M',
  },
  'philadelphia': { 
    name: 'Philadelphia', 
    state: 'PA', 
    region: 'Northeast',
    industries: ['Healthcare', 'Education', 'Manufacturing', 'Finance'],
    population: '1.6M',
  },
  'san-antonio': { 
    name: 'San Antonio', 
    state: 'TX', 
    region: 'South',
    industries: ['Military', 'Healthcare', 'Tourism', 'Manufacturing'],
    population: '1.5M',
  },
  'san-diego': { 
    name: 'San Diego', 
    state: 'CA', 
    region: 'West Coast',
    industries: ['Military', 'Tourism', 'Biotechnology', 'Manufacturing'],
    population: '1.4M',
  },
  'dallas': { 
    name: 'Dallas', 
    state: 'TX', 
    region: 'South',
    industries: ['Technology', 'Finance', 'Telecommunications', 'Healthcare'],
    population: '1.3M',
  },
  'austin': { 
    name: 'Austin', 
    state: 'TX', 
    region: 'South',
    industries: ['Technology', 'Government', 'Education', 'Healthcare'],
    population: '1.0M',
  },
  'denver': { 
    name: 'Denver', 
    state: 'CO', 
    region: 'Mountain West',
    industries: ['Energy', 'Technology', 'Healthcare', 'Aerospace'],
    population: '715K',
  },
  'seattle': { 
    name: 'Seattle', 
    state: 'WA', 
    region: 'Pacific Northwest',
    industries: ['Technology', 'Aerospace', 'Healthcare', 'Maritime'],
    population: '753K',
  },
  'boston': { 
    name: 'Boston', 
    state: 'MA', 
    region: 'Northeast',
    industries: ['Education', 'Healthcare', 'Finance', 'Biotechnology'],
    population: '695K',
  },
  'atlanta': { 
    name: 'Atlanta', 
    state: 'GA', 
    region: 'Southeast',
    industries: ['Transportation', 'Media', 'Technology', 'Healthcare'],
    population: '498K',
  },
  'miami': { 
    name: 'Miami', 
    state: 'FL', 
    region: 'Southeast',
    industries: ['Tourism', 'Finance', 'Real Estate', 'Healthcare'],
    population: '467K',
  },
};

export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const { location } = await params;
  const locationInfo = locationData[location];
  
  if (!locationInfo) {
    return {
      title: 'Location Not Found',
      robots: { index: false, follow: false },
    };
  }

  const keywords = [
    `compliance training ${locationInfo.name}`,
    `safety training ${locationInfo.name} ${locationInfo.state}`,
    `OSHA training ${locationInfo.name}`,
    `HAZMAT certification ${locationInfo.name}`,
    `professional training ${locationInfo.name}`,
    `workplace safety ${locationInfo.name}`,
    `${locationInfo.name} certification courses`,
    `online training ${locationInfo.name}`,
  ];

  return generateSEOMetadata({
    title: `Compliance Training in ${locationInfo.name}, ${locationInfo.state}`,
    description: `Professional compliance and safety training courses for businesses in ${locationInfo.name}, ${locationInfo.state}. OSHA, DOT HAZMAT, EPA RCRA, and industry-specific certifications available online.`,
    keywords,
    url: `/training/${location}`,
    type: 'website',
  });
}

export default async function LocationPage({ params }: LocationPageProps) {
  const { location } = await params;
  const locationInfo = locationData[location];
  
  if (!locationInfo) {
    notFound();
  }

  const supabase = getSupabaseServerClient();
  
  // Fetch featured courses
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('status', 'published')
    .limit(6)
    .order('title');

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Training Locations', url: '/training' },
    { name: `${locationInfo.name}, ${locationInfo.state}`, url: `/training/${location}` },
  ]);

  const localBusinessData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: `Evergreen Comply - ${locationInfo.name}`,
    description: `Professional compliance training provider serving ${locationInfo.name}, ${locationInfo.state} and surrounding areas.`,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com'}/training/${location}`,
    areaServed: {
      '@type': 'City',
      name: locationInfo.name,
      containedIn: {
        '@type': 'State',
        name: locationInfo.state,
      },
    },
    knowsAbout: [
      'OSHA Compliance',
      'DOT HAZMAT Training',
      'EPA RCRA Certification',
      'Workplace Safety',
      'Professional Development',
    ],
  };

  return (
    <>
      <Script
        id="local-business-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessData),
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
              <Link href="/courses" className="hover:text-foreground">Training</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">{locationInfo.name}, {locationInfo.state}</span>
            </nav>
            
            <div className="max-w-4xl">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-primary" />
                <Badge variant="secondary">{locationInfo.region}</Badge>
              </div>
              
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
                Compliance Training in {locationInfo.name}, {locationInfo.state}
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8">
                Professional safety and compliance training for businesses and individuals in {locationInfo.name}. 
                Get certified online with our comprehensive, industry-specific courses designed for {locationInfo.state} regulations.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{locationInfo.population}</div>
                  <div className="text-sm text-muted-foreground">Population</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">100%</div>
                  <div className="text-sm text-muted-foreground">Online</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">24/7</div>
                  <div className="text-sm text-muted-foreground">Access</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">Same Day</div>
                  <div className="text-sm text-muted-foreground">Certificates</div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/courses">
                  <Button size="lg">
                    Browse All Courses
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline">
                    Get Group Training Quote
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Industries Section */}
        <section className="py-12 bg-muted/50">
          <div className="container">
            <h2 className="text-3xl font-bold mb-8">Industries We Serve in {locationInfo.name}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {locationInfo.industries.map((industry) => (
                <Card key={industry} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{industry}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Specialized compliance training for {industry.toLowerCase()} professionals
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Local Compliance Info */}
        <section className="py-16">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12">
              <div>
                <h2 className="text-3xl font-bold mb-6">
                  Why {locationInfo.name} Businesses Choose Evergreen Comply
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">State-Specific Compliance</h3>
                      <p className="text-muted-foreground">
                        Training tailored to {locationInfo.state} state regulations and local requirements
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Industry Expertise</h3>
                      <p className="text-muted-foreground">
                        Specialized courses for {locationInfo.name}'s key industries
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Flexible Online Learning</h3>
                      <p className="text-muted-foreground">
                        Train your team without disrupting operations
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-1">Instant Certification</h3>
                      <p className="text-muted-foreground">
                        Receive certificates immediately upon course completion
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-4">
                    Popular Certifications in {locationInfo.name}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-medium">OSHA 10-Hour</span>
                      <Badge>Most Popular</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-medium">DOT HAZMAT</span>
                      <Badge variant="outline">Required</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-medium">EPA RCRA</span>
                      <Badge variant="outline">Compliance</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-medium">Workplace Safety</span>
                      <Badge variant="outline">Essential</Badge>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Courses */}
        {courses && courses.length > 0 && (
          <section className="py-16 bg-muted/50">
            <div className="container">
              <h2 className="text-3xl font-bold mb-8">
                Popular Training Courses for {locationInfo.name} Professionals
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <Card key={course.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline">{course.category}</Badge>
                        <span className="text-lg font-bold">${course.price}</span>
                      </div>
                      <CardTitle>{course.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4 line-clamp-2">
                        {course.description}
                      </p>
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{course.estimated_duration || '2-3 hours'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span>Certificate Included</span>
                        </div>
                      </div>
                      <Link href={`/courses/${course.slug}`}>
                        <Button className="w-full">View Course</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link href="/courses">
                  <Button variant="outline" size="lg">
                    View All Courses
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 bg-primary/5">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Get Your Team Certified in {locationInfo.name}?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join thousands of {locationInfo.state} businesses that trust Evergreen Comply for their compliance training needs. 
                Special group rates available for {locationInfo.name} organizations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/courses">
                  <Button size="lg">
                    Start Training Today
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline">
                    Request Group Pricing
                  </Button>
                </Link>
              </div>
              
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>10,000+ Trained</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>98% Pass Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span>Instant Certificates</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}