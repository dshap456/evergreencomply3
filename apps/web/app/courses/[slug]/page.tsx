import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import {
  CheckCircle,
  Clock,
  Users,
  Award,
  ShieldCheck,
  ArrowLeft,
  BookOpen,
  ArrowRight,
  Monitor,
  Smartphone,
  MessageCircle,
  Globe,
  Play,
  ChevronDown,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@kit/ui/accordion';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import pathsConfig from '~/config/paths.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { CustomShieldIcon } from '../../_components/custom-icons';
import { AddToCartButton } from '../../_components/add-to-cart-button';

interface CoursePageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseServerClient();
  
  const { data: course } = await supabase
    .from('courses')
    .select('title, description')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!course) {
    return {
      title: 'Course Not Found',
    };
  }

  return {
    title: `${course.title} - Evergreen Comply`,
    description: course.description || `Learn ${course.title} with Evergreen Comply's comprehensive training program.`,
  };
}

async function CoursePage({ params }: CoursePageProps) {
  const { slug } = await params;
  const supabase = getSupabaseServerClient();
  
  // Fetch course data from database
  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error || !course) {
    notFound();
  }

  // Course-specific content based on slug
  // This could be moved to the database in the future
  const courseContent = getCourseContent(slug);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <CustomShieldIcon className="h-6 w-6" />
              <span className="text-xl font-bold">Evergreen Comply</span>
            </Link>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="/#features" className="text-sm font-medium hover:text-primary">
              Features
            </Link>
            <Link href="/courses" className="text-sm font-medium hover:text-primary">
              Courses
            </Link>
            <Link href="/#pricing" className="text-sm font-medium hover:text-primary">
              Pricing
            </Link>
            <Link href="/cart" className="text-sm font-medium hover:text-primary flex items-center gap-2">
              Cart
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href={pathsConfig.auth.signIn}>
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href={pathsConfig.auth.signUp}>
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-16">
          <div className="container relative">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Badge className="inline-flex" variant="secondary">
                    {courseContent.badge}
                  </Badge>
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                    {course.title}
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    {course.description || courseContent.description}
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{courseContent.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>{courseContent.students}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span>{courseContent.certification}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <AddToCartButton 
                    courseId={course.id} 
                    price={Number(course.price)}
                    size="lg"
                  />
                  <span className="text-3xl font-bold">${course.price}</span>
                  <span className="text-sm text-muted-foreground">per seat</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  <span>30-day money back guarantee</span>
                </div>
              </div>

              <div className="relative">
                <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                  <Image
                    src={courseContent.image}
                    alt={course.title}
                    width={600}
                    height={400}
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="rounded-full bg-white p-4 shadow-lg">
                      <Play className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Course Features */}
        <section className="py-16 bg-muted/50">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-12">What You'll Learn</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courseContent.features.map((feature, index) => (
                <Card key={index} className="border-2 hover:border-primary transition-colors">
                  <CardHeader>
                    <CheckCircle className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Course Curriculum */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold text-center mb-12">Course Curriculum</h2>
              <Accordion type="single" collapsible className="w-full">
                {courseContent.curriculum.map((module, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left">
                      <div className="flex items-center gap-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold">{module.title}</div>
                          <div className="text-sm text-muted-foreground">{module.duration}</div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="ml-12 space-y-2">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <li key={lessonIndex} className="flex items-center gap-2 text-sm">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {lesson}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary/5">
          <div className="container text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who have enhanced their skills with our comprehensive training programs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <AddToCartButton 
                courseId={course.id} 
                price={Number(course.price)}
                size="lg"
              />
              <Link href="/courses">
                <Button variant="outline" size="lg">
                  Browse All Courses
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// Helper function to get course-specific content
// In the future, this could be stored in the database
function getCourseContent(slug: string) {
  const content: Record<string, any> = {
    'dot-hazmat': {
      badge: 'DOT Compliance',
      description: 'Master the essentials of DOT HAZMAT regulations with our comprehensive general awareness training.',
      duration: '2-3 hours',
      students: '10,000+ enrolled',
      certification: '3-year certification',
      image: '/images/dot-hazmat-training.jpg',
      features: [
        {
          title: 'DOT Regulations Overview',
          description: 'Comprehensive understanding of 49 CFR Parts 100-185 and their practical applications.'
        },
        {
          title: 'Hazard Classes & Divisions',
          description: 'Master all 9 hazard classes and their divisions for proper classification.'
        },
        {
          title: 'Shipping Papers & Marking',
          description: 'Learn proper documentation, marking, labeling, and placarding requirements.'
        },
        {
          title: 'Emergency Response',
          description: 'Essential emergency response procedures and incident reporting protocols.'
        },
        {
          title: 'Security Awareness',
          description: 'HAZMAT security plans and threat assessment fundamentals.'
        },
        {
          title: 'Real-World Scenarios',
          description: 'Practical exercises based on actual shipping situations and compliance challenges.'
        }
      ],
      curriculum: [
        {
          title: 'Module 1: Introduction to HAZMAT',
          duration: '30 minutes',
          lessons: [
            'What is Hazardous Material?',
            'Why HAZMAT Training Matters',
            'Overview of DOT Regulations',
            'Your Role in HAZMAT Safety'
          ]
        },
        {
          title: 'Module 2: Hazard Classes',
          duration: '45 minutes',
          lessons: [
            'Class 1: Explosives',
            'Class 2: Gases',
            'Class 3: Flammable Liquids',
            'Classes 4-9: Other Hazards',
            'Multiple Hazards & Precedence'
          ]
        },
        {
          title: 'Module 3: Shipping Requirements',
          duration: '45 minutes',
          lessons: [
            'Shipping Papers Requirements',
            'Marking & Labeling',
            'Placarding Requirements',
            'Packaging Standards',
            'Documentation Best Practices'
          ]
        },
        {
          title: 'Module 4: Emergency Response',
          duration: '30 minutes',
          lessons: [
            'Emergency Response Information',
            'Incident Reporting',
            'Spill Response Procedures',
            'First Responder Communication'
          ]
        }
      ]
    },
    'advanced-hazmat': {
      badge: 'Advanced Training',
      description: 'Take your HAZMAT expertise to the next level with advanced handling and compliance strategies.',
      duration: '4-5 hours',
      students: '5,000+ enrolled',
      certification: '3-year certification',
      image: '/images/advanced-hazmat-training.jpg',
      features: [
        {
          title: 'Advanced Classification',
          description: 'Complex mixture classification and subsidiary risk determination.'
        },
        {
          title: 'International Regulations',
          description: 'IATA and IMDG Code requirements for international shipments.'
        },
        {
          title: 'Packaging Certification',
          description: 'UN specification packaging selection and testing requirements.'
        },
        {
          title: 'Advanced Documentation',
          description: 'Multi-modal shipping papers and international documentation.'
        },
        {
          title: 'Compliance Management',
          description: 'Building and maintaining effective HAZMAT compliance programs.'
        },
        {
          title: 'Audit Preparation',
          description: 'Preparing for DOT inspections and internal compliance audits.'
        }
      ],
      curriculum: [
        {
          title: 'Module 1: Advanced Classification',
          duration: '60 minutes',
          lessons: [
            'Complex Mixture Analysis',
            'Subsidiary Risk Assessment',
            'Classification Precedence',
            'Special Provisions Application'
          ]
        },
        {
          title: 'Module 2: International Shipping',
          duration: '90 minutes',
          lessons: [
            'IATA Dangerous Goods Regulations',
            'IMDG Code Requirements',
            'Multi-modal Considerations',
            'Country-Specific Variations'
          ]
        },
        {
          title: 'Module 3: Advanced Packaging',
          duration: '60 minutes',
          lessons: [
            'UN Specification Packages',
            'Performance Testing Standards',
            'Combination Packaging Rules',
            'Overpacks and Salvage Drums'
          ]
        },
        {
          title: 'Module 4: Compliance Programs',
          duration: '90 minutes',
          lessons: [
            'Program Development',
            'Training Management',
            'Record Keeping Systems',
            'Audit and Inspection Readiness'
          ]
        }
      ]
    },
    'epa-rcra': {
      badge: 'EPA Compliance',
      description: 'Ensure compliance with EPA RCRA regulations for hazardous waste management and disposal.',
      duration: '3-4 hours',
      students: '8,000+ enrolled',
      certification: '1-year certification',
      image: '/images/epa-rcra-training.png',
      features: [
        {
          title: 'RCRA Fundamentals',
          description: 'Understanding the Resource Conservation and Recovery Act framework.'
        },
        {
          title: 'Waste Identification',
          description: 'Proper identification and characterization of hazardous wastes.'
        },
        {
          title: 'Generator Requirements',
          description: 'Requirements for SQGs, LQGs, and CESQGs including accumulation limits.'
        },
        {
          title: 'Manifest System',
          description: 'Proper use of the uniform hazardous waste manifest and e-Manifest.'
        },
        {
          title: 'Storage Standards',
          description: 'Container management, labeling, and accumulation time limits.'
        },
        {
          title: 'Inspection & Records',
          description: 'Required inspections, contingency planning, and recordkeeping.'
        }
      ],
      curriculum: [
        {
          title: 'Module 1: RCRA Overview',
          duration: '45 minutes',
          lessons: [
            'History and Purpose of RCRA',
            'Regulatory Framework',
            'Generator Categories',
            'Key Definitions and Terms'
          ]
        },
        {
          title: 'Module 2: Waste Identification',
          duration: '60 minutes',
          lessons: [
            'Listed Wastes (F, K, P, U)',
            'Characteristic Wastes (D-codes)',
            'Mixture and Derived-From Rules',
            'Waste Determination Process'
          ]
        },
        {
          title: 'Module 3: Generator Requirements',
          duration: '75 minutes',
          lessons: [
            'Accumulation Time Limits',
            'Container Management',
            'Labeling and Marking',
            'Emergency Preparedness',
            'Training Requirements'
          ]
        },
        {
          title: 'Module 4: Shipping & Disposal',
          duration: '60 minutes',
          lessons: [
            'Manifest Requirements',
            'Land Disposal Restrictions',
            'Treatment Standards',
            'Recordkeeping and Reporting'
          ]
        }
      ]
    }
  };

  // Default content for any new courses
  const defaultContent = {
    badge: 'Professional Training',
    description: 'Enhance your skills with our comprehensive training program.',
    duration: '2-4 hours',
    students: '1,000+ enrolled',
    certification: 'Certificate of completion',
    image: '/images/general-training.jpg',
    features: [
      {
        title: 'Comprehensive Coverage',
        description: 'Complete coverage of all essential topics and regulations.'
      },
      {
        title: 'Practical Examples',
        description: 'Real-world scenarios and hands-on exercises.'
      },
      {
        title: 'Expert Instruction',
        description: 'Learn from industry professionals with years of experience.'
      },
      {
        title: 'Updated Content',
        description: 'Course content regularly updated to reflect latest standards.'
      },
      {
        title: 'Interactive Learning',
        description: 'Engaging multimedia content and interactive assessments.'
      },
      {
        title: 'Certification',
        description: 'Receive official certification upon successful completion.'
      }
    ],
    curriculum: [
      {
        title: 'Module 1: Introduction',
        duration: '30 minutes',
        lessons: ['Course Overview', 'Learning Objectives', 'Prerequisites']
      },
      {
        title: 'Module 2: Core Concepts',
        duration: '60 minutes',
        lessons: ['Fundamental Principles', 'Key Terminology', 'Industry Standards']
      },
      {
        title: 'Module 3: Practical Application',
        duration: '60 minutes',
        lessons: ['Case Studies', 'Best Practices', 'Common Challenges']
      },
      {
        title: 'Module 4: Assessment',
        duration: '30 minutes',
        lessons: ['Knowledge Check', 'Final Exam', 'Certification Process']
      }
    ]
  };

  return content[slug] || defaultContent;
}

export default withI18n(CoursePage);