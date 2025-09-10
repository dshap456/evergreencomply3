import Image from 'next/image';
import Link from 'next/link';

import { ArrowRightIcon, CheckCircle, ArrowRight, ArrowLeft, ChevronDown } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Trans } from '@kit/ui/trans';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';

import pathsConfig from '~/config/paths.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { CustomShieldIcon, CustomSmartphoneIcon, CustomAwardIcon } from './_components/custom-icons';
import { Globe } from 'lucide-react';
import { CartCount } from './_components/cart-count';

function Home() {
  return (
    <div className={'flex flex-col'}>
      {/* Header */}
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
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium hover:text-primary">
                Courses
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/courses/dot-hazmat" className="cursor-pointer">
                    DOT HAZMAT - General
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/courses/advanced-hazmat" className="cursor-pointer">
                    DOT HAZMAT - Advanced
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/courses/epa-rcra" className="cursor-pointer">
                    EPA RCRA
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/about" className="text-sm font-medium hover:text-primary">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium hover:text-primary">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <CartCount />
            {/** Point to /login alias to avoid any cached 404 on /auth/sign-in */}
            <Link href={`${(process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/,'') || 'https://www.evergreencomply.com')}/login`}>
              <Button variant="outline">Log In</Button>
            </Link>
          </div>
        </div>
      </header>
      {/* Hero Section */}
      <section className="w-full relative h-[600px] md:h-[700px] lg:h-[800px] overflow-hidden">
        <Image
          src="/images/hero-warehouse-safety-worker.png"
          alt="Professional warehouse worker in safety gear using tablet for training"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 h-full flex items-center justify-center px-4 md:px-6">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center text-white">
              <div className="space-y-6">
                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                  DOT and EPA Compliant Training
                </h1>
                <p className="text-xl md:text-2xl text-gray-200 leading-relaxed">
                  Get your team certified today. 100% online. 100% compliant.
                </p>
                <div className="pt-4">
                  <Link href="#courses">
                    <Button
                      size="lg"
                      className="px-12 py-4 text-lg bg-[rgba(233,195,81,1)] hover:bg-[rgba(233,195,81,0.9)] text-black font-semibold"
                    >
                      Browse Courses
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

        <section id="features" className="w-full py-12 md:py-16 lg:py-20 pb-8 md:pb-10">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg px-3 py-1 text-sm text-primary-foreground bg-[rgba(58,92,81,1)]">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Get Certified Today - 100% Online</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                  Pass your certification exam in 90 minutes. Avoid fines up to $75,000. Start training instantly on any device.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-8 md:grid-cols-2 lg:grid-cols-2">
              <Card className="shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <CustomSmartphoneIcon className="h-10 w-10 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="mb-2">Mobile-Ready</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Available 24/7 and mobile-optimized for learners who need to train on-the-go.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Globe className="h-10 w-10 text-[rgba(233,195,81,1)] transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="mb-2">Your Language</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Complete courses in English or Spanish with full text and audio narration.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <CustomAwardIcon className="h-10 w-10 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="mb-2">Active Content</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Modern visuals and interactive elements ensure students actually learn the material.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <CustomShieldIcon className="h-10 w-10 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="mb-2">Fully Compliant</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        All courses meet or exceed DOT and EPA regulations with annual updates.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Client Logos Section */}
        <section className="w-full py-12 md:py-16 bg-background">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">Trusted by Industry Leaders</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 lg:gap-20 opacity-60 grayscale">
              <div className="h-20 w-40 md:h-24 md:w-48 relative">
                <Image
                  src="/images/clients/metro.png"
                  alt="Metro Recycling Solutions"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="h-20 w-40 md:h-24 md:w-48 relative">
                <Image
                  src="/images/clients/green-valley.png"
                  alt="Green Valley Environmental Services"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="h-20 w-40 md:h-24 md:w-48 relative">
                <Image
                  src="/images/clients/allied.png"
                  alt="Allied Battery Systems"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="h-20 w-40 md:h-24 md:w-48 relative">
                <Image
                  src="/images/clients/pioneer.png"
                  alt="Pioneer Dedicated Carriers"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="h-20 w-40 md:h-24 md:w-48 relative">
                <Image
                  src="/images/clients/gateway.png"
                  alt="Gateway Freight Systems"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="courses" className="w-full py-12 md:py-16 lg:py-20 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Our Courses </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                  Comprehensive training solutions for your industry needs
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-8 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course, index) => (
                <Card key={index} className="flex flex-col h-full">
                  <CardHeader>
                    <div className="h-40 w-full overflow-hidden rounded-t-lg relative bg-gradient-to-r from-primary/10 to-primary/5">
                      {course.slug === "dot-hazmat" && (
                        <Image
                          src="/images/general-hazmat-training.png"
                          width={320}
                          height={160}
                          alt="DOT HAZMAT General Awareness Training - Warehouse employee in business attire walking through warehouse aisle"
                          className="h-full w-full object-cover"
                          style={{ objectPosition: "50% 30%" }}
                        />
                      )}
                      {course.slug === "advanced-hazmat" && (
                        <Image
                          src="/images/advanced-hazmat-training.jpg"
                          width={320}
                          height={160}
                          alt="Advanced HAZMAT Training - Experienced worker in safety gear conducting compliance inspection of chemical drums in warehouse"
                          className="h-full w-full object-cover"
                          style={{ objectPosition: "50% 30%" }}
                        />
                      )}
                      {course.slug === "epa-rcra" && (
                        <Image
                          src="/images/epa-rcra-training.png"
                          width={320}
                          height={160}
                          alt="EPA RCRA Hazardous Waste Training - Worker in full protective gear safely handling and labeling hazardous waste containers"
                          className="h-full w-full object-cover"
                          style={{ objectPosition: "50% 30%" }}
                        />
                      )}
                    </div>
                    <CardTitle className="mt-4">{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-2">
                      {course.features.map((feature, i) => (
                        <li key={i} className="flex items-center">
                          <CheckCircle className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <div className="p-6 pt-0 mt-auto">
                    <Link href={`/courses/${course.slug}`}>
                      <Button className="w-full bg-[rgba(233,195,81,1)]">
                        Learn More
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-16 text-primary-foreground bg-[rgba(58,92,81,1)]">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 md:mb-8">
                Ready to transform your training program?
              </h2>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/#courses" className="w-full sm:w-auto">
                  <Button size="lg" variant="secondary" className="w-full sm:w-auto px-8">
                    Browse Courses
                  </Button>
                </Link>
                <Link href="/contact" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-primary-foreground px-8 bg-transparent hover:bg-white/10">
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="w-full py-12 md:py-16 lg:py-20">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Have Questions?</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                  Our team is ready to help you find the right training solution for your needs
                </p>
              </div>
              <div className="mx-auto w-full max-w-sm space-y-2">
                <Link href="/contact">
                  <Button className="w-full bg-[rgba(233,195,81,1)]" size="lg">
                    Contact Us
                  </Button>
                </Link>
                <p className="text-base font-medium text-muted-foreground mt-3">
                  Or call us directly at{' '}
                  <a href="tel:9709190034" className="text-lg font-semibold text-foreground hover:text-primary transition-colors">
                    (970) 919-0034
                  </a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-muted">
          <div className="container flex flex-col gap-6 py-8 md:py-10">
            <div className="flex flex-col gap-6 md:flex-row md:gap-8">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <CustomShieldIcon className="h-6 w-6" />
                  <span className="text-xl font-bold">Evergreen Comply</span>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Modern, engaging, and legally compliant training for blue-collar professionals.
                </p>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-3">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Platform</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground">
                        Features
                      </Link>
                    </li>
                    <li>
                      <Link href="/#courses" className="text-sm text-muted-foreground hover:text-foreground">
                        Courses
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Company</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                        About
                      </Link>
                    </li>
                  </ul>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Legal</h3>
                  <ul className="space-y-2">
                    <li>
                      <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                        Terms
                      </Link>
                    </li>
                    <li>
                      <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                        Privacy
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Evergreen Comply, LLC. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
    </div>
  );
}

export default withI18n(Home);

const courses = [
  {
    title: "DOT HAZMAT - General Awareness",
    slug: "dot-hazmat",
    description: "Training for employees involved in handling or shipping hazardous materials",
    features: [
      "49 CFR §172 Subpart H compliant",
      "Core HAZMAT handling and safety procedures",
      "Includes intro to Security Awareness",
      "English and Spanish text and audio included",
      "Mobile-ready 24/7",
    ],
  },
  {
    title: "DOT HAZMAT - Advanced Awareness",
    slug: "advanced-hazmat",
    description: "Experienced hazmat employees with job-specific safety and compliance duties",
    features: [
      "49 CFR §172 Subpart H compliant",
      "Core and Function Specific procedures",
      "Includes intro to Security Awareness",
      "English and Spanish text and audio included",
      "Mobile-ready 24/7",
    ],
  },
  {
    title: "EPA RCRA Hazardous Waste - Annual",
    slug: "epa-rcra",
    description: "Annual certification and compliance for large and small quantity generators",
    features: [
      "40 CFR §262.17(a)(7) compliant",
      "Hazardous waste identification and classification",
      "Covers storage/labeling/disposal",
      "English and Spanish text and audio included",
      "Mobile-ready 24/7",
    ],
  },
]
