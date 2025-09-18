import Link from "next/link"
import Image from "next/image"
import { Button } from "@kit/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@kit/ui/card"
import { Badge } from "@kit/ui/badge"
import {
  CheckCircle,
  Clock,
  Users,
  Award,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Monitor,
  Smartphone,
  MessageCircle,
  Globe,
  Play,
  ChevronDown,
  ShoppingCart,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@kit/ui/accordion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu'

import pathsConfig from '~/config/paths.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { CustomShieldIcon } from '../../_components/custom-icons';
import { AddToCartButton } from '../../_components/add-to-cart-button';
import { CartCount } from '../../_components/cart-count';
import { LeadMagnetDownloadButton } from '../../_components/lead-magnet-download';

function DOTHazmatGeneralPage() {
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
            <Link href="/contact" className="text-sm font-medium hover:text-primary">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <CartCount />
            <Link href={pathsConfig.auth.signIn}>
              <Button variant="outline">Log In</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-muted/20 to-background">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary text-primary-foreground">49 CFR §172 Compliant</Badge>
                  <Badge className="bg-blue-600 text-white/90">Security Awareness included</Badge>
                </div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                  DOT HAZMAT General Awareness Training
                </h1>
                <p className="text-lg text-muted-foreground">
                  Essential training for employees involved in handling or shipping hazardous materials.
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>1-2 hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span>Certificate included</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <span className="text-lg leading-none" role="img" aria-label="United States flag">🇺🇸</span>
                  <span className="text-lg leading-none" role="img" aria-label="Mexico flag">🇲🇽</span>
                  <span>English & Spanish included</span>
                </div>
                <div className="pt-4">
                  <AddToCartButton
                    courseId="dot-hazmat-general"
                    price={119}
                    size="lg"
                    className="w-full sm:w-[260px] rounded-md font-semibold py-3 px-5"
                  />
                  <div className="mt-4">
                    <Link href="/bulk-orders">
                      <Button 
                        variant="outline" 
                        size="lg" 
                        className="w-full sm:w-[260px] rounded-md font-semibold py-3 px-5 bg-white border border-gray-300 text-black hover:bg-gray-50"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Team & Bulk Pricing
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="relative h-64 md:h-full w-full overflow-hidden rounded-lg shadow-lg">
                <Image
                  src="/images/taller-guy.png"
                  alt="Professional in warehouse aisle representing DOT HAZMAT training"
                  fill
                  className="object-cover transform hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Client Logos Section */}
        <section className="border-t bg-muted/30">
          <div className="container py-10 md:py-12">
            <p className="text-center text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-[0.2em] mb-8">
              Trusted by teams like yours
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-10 gap-y-8 items-center justify-items-center grayscale-[55%]">
              <li className="flex w-full items-center justify-center">
                <Image
                  src="/images/clients/metro.png"
                  alt="Metro Recycling Solutions"
                  width={220}
                  height={90}
                  className="h-16 w-auto object-contain opacity-90 transition hover:opacity-100 hover:scale-[1.04]"
                />
              </li>
              <li className="flex w-full items-center justify-center">
                <Image
                  src="/images/clients/green-valley.png"
                  alt="Green Valley Environmental Services"
                  width={220}
                  height={90}
                  className="h-16 w-auto object-contain opacity-90 transition hover:opacity-100 hover:scale-[1.04]"
                />
              </li>
              <li className="flex w-full items-center justify-center">
                <Image
                  src="/images/clients/allied.png"
                  alt="Allied Battery Systems"
                  width={220}
                  height={90}
                  className="h-16 w-auto object-contain opacity-90 transition hover:opacity-100 hover:scale-[1.04]"
                />
              </li>
              <li className="flex w-full items-center justify-center">
                <Image
                  src="/images/clients/pioneer.png"
                  alt="Pioneer Dedicated Carriers"
                  width={220}
                  height={90}
                  className="h-16 w-auto object-contain opacity-90 transition hover:opacity-100 hover:scale-[1.04]"
                />
              </li>
              <li className="flex w-full items-center justify-center">
                <Image
                  src="/images/clients/gateway.png"
                  alt="Gateway Freight Systems"
                  width={220}
                  height={90}
                  className="h-16 w-auto object-contain opacity-90 transition hover:opacity-100 hover:scale-[1.04]"
                />
              </li>
            </ul>
          </div>
        </section>

        {/* Course Details Section */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <div className="grid gap-12 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-12">
                <div>
                  <h2 className="text-2xl font-bold mb-4 text-primary">Course Overview</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    This comprehensive DOT HAZMAT General Awareness training course provides essential knowledge for
                    employees who handle, ship, or work around hazardous materials. Designed to meet 49 CFR §172 Subpart
                    H requirements, this course covers fundamental safety procedures, classification systems, and
                    regulatory compliance necessary for safe hazmat operations.
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-6 text-primary">Course Preview</h3>
                  <div className="mb-12">
                    <div className="relative aspect-video rounded-lg overflow-hidden shadow-xl">
                      <iframe
                        src="https://www.youtube.com/embed/kjI6JFHbM1A"
                        title="DOT HAZMAT General Awareness Course Preview"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-6 text-primary">Learning Objectives</h3>
                  <div className="space-y-4">
                    {learningObjectives.map((objective, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                        <span className="text-muted-foreground text-base">{objective}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-6 text-primary">Who Should Take This Course</h3>
                  <p className="text-muted-foreground mb-4">Required for employees in these roles:</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {targetAudience.map((audience, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-4 bg-gradient-to-r from-[rgba(233,195,81,0.25)] to-[rgba(233,195,81,0.35)] rounded-lg border border-[rgba(233,195,81,0.6)] hover:border-[rgba(233,195,81,0.8)] transition-all hover:shadow-md"
                      >
                        <div className="bg-[rgba(233,195,81,0.5)] p-2 rounded-full">
                          <Users className="h-5 w-5 text-[rgba(233,195,81,1)] flex-shrink-0" />
                        </div>
                        <span className="font-medium text-foreground">{audience}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-6 text-primary">Course Modules</h3>
                  <Accordion type="single" collapsible defaultValue="modules" className="w-full rounded-lg border">
                    <AccordionItem value="modules">
                      <AccordionTrigger className="px-6 py-4 text-base font-medium hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <span>View Course Modules</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4 pt-0">
                        <div className="space-y-3">
                          {courseModules.map((module, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg">
                              <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                {index + 1}
                              </div>
                              <span className="text-foreground font-medium">{module.title}</span>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

              </div>

              {/* Sidebar */}
              <aside className="space-y-8 sticky top-24 self-start">
                {/* Course Pricing */}
                <Card className="border-2 border-primary/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-center text-2xl">Course Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary">$119</div>
                      <p className="text-muted-foreground">per employee / 3-year cert</p>
                    </div>
                    <div className="space-y-3 text-sm pt-2">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">49 CFR §172 Compliant</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">Mobile-ready platform</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">English & Spanish</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">Security Awareness included</span>
                      </div>
                    </div>
                    <AddToCartButton
                      courseId="dot-hazmat-general"
                      price={119}
                      size="lg"
                      className="w-full mt-2"
                    >
                      Buy Seats
                    </AddToCartButton>
                  </CardContent>
                </Card>

                {/* Course Facts */}
                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100">
                  <CardHeader>
                    <CardTitle className="text-center text-lg flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Course Facts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3">
                        <Award className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-green-900">What You Get:</span>
                          <p className="text-green-700">Certificate of completion</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Monitor className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-green-900">Course Format:</span>
                          <p className="text-green-700">100% online</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Smartphone className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-green-900">Device:</span>
                          <p className="text-green-700">Start on your computer, finish on your phone</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MessageCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-green-900">Support:</span>
                          <p className="text-green-700">Chat, email, or phone</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Play className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-green-900">Availability:</span>
                          <p className="text-green-700">Start and stop as much as you need</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Globe className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-green-900">Languages:</span>
                          <p className="text-green-700">Available in English and Spanish with audio narration</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Related Courses */}
                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardHeader>
                    <CardTitle className="text-center text-lg flex items-center justify-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-blue-600" />
                      Related Courses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Link href="/courses/advanced-hazmat">
                      <div className="p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm text-blue-900 group-hover:text-blue-700">
                              DOT HAZMAT Advanced
                            </h4>
                            <p className="text-xs text-blue-600 mt-1">Function-specific • $179</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                    <Link href="/courses/epa-rcra">
                      <div className="p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm text-blue-900 group-hover:text-blue-700">
                              EPA RCRA Training
                            </h4>
                            <p className="text-xs text-blue-600 mt-1">Hazardous waste • $129</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border border-secondary/30 bg-white/80 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-center flex items-center justify-center gap-2">
                      <Award className="h-4 w-4 text-secondary" />
                      Free General Awareness Cross-Walk
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-sm text-muted-foreground text-center leading-relaxed">
                      Unlock a detailed table that maps this course to every baseline requirement in 49 CFR §172 Subpart H.
                    </p>
                    <ul className="space-y-2 text-sm text-foreground">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-secondary" />
                        <span>Clause-by-clause alignment</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-secondary" />
                        <span>Covers all hazmat employee basics</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-secondary" />
                        <span>Handy summary for HR and auditors</span>
                      </li>
                    </ul>
                    <LeadMagnetDownloadButton
                      buttonClassName="mx-auto flex w-[180px] justify-center rounded-full bg-[rgba(233,195,81,1)] px-5 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-[rgba(233,195,81,0.9)]"
                    >
                      Open Cross-Walk
                    </LeadMagnetDownloadButton>
                    <p className="text-xs text-muted-foreground text-center">No spam, just compliance insights</p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 lg:py-24 bg-muted/40">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold mb-2">Frequently Asked Questions</h2>
                <p className="text-muted-foreground">
                  Common questions about our DOT HAZMAT General Awareness training.
                </p>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-lg font-medium">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-base leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Desktop CTA Reinforcement */}
        <section className="hidden md:block py-14">
          <div className="container">
            <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary/5 px-8 py-10 text-center shadow-sm">
              <h3 className="text-2xl font-bold text-primary">Ready to get certified?</h3>
              <p className="mt-3 text-sm text-muted-foreground">
                Complete in 1–2 hours. Certificate included today.
              </p>
              <div className="mt-7 flex flex-col items-center gap-3">
                <AddToCartButton
                  courseId="dot-hazmat-general"
                  price={119}
                  size="lg"
                  className="w-full max-w-xs rounded-full px-6 py-3 font-semibold"
                >
                  <span className="flex items-center justify-center gap-2">
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                    Start Training – $119 per seat
                  </span>
                </AddToCartButton>
                <Link href="/bulk-orders" className="w-full max-w-xs">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full rounded-full px-6 py-3 font-semibold"
                  >
                    <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                    Team & Bulk Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Spacer for mobile sticky CTA */}
        <div className="h-16 md:hidden" />
      </main>

      {/* Mobile Sticky CTA */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-between py-3">
          <div className="text-sm font-medium">
            DOT HAZMAT Training - $119/seat
          </div>
          <AddToCartButton
            courseId="dot-hazmat-general"
            price={119}
            size="sm"
          />
        </div>
      </div>

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
                    <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
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
  )
}

export default withI18n(DOTHazmatGeneralPage);

const learningObjectives = [
  "Explain the purpose of DOT hazmat rules and common terminology.",
  "Identify hazard classes, labels, placards, and their associated risks.",
  "Describe general employee duties and basic emergency-response steps.",
]

const targetAudience = [
  "Shipping & Receiving Staff",
  "Warehouse / Stockroom Employees",
  "Administrative Personnel Preparing Paperwork",
  "Vehicle Operators & Couriers",
]

const courseModules = [
  { title: "Module 1: Orientation & Regulatory Framework" },
  { title: "Module 2: Mastering the Hazardous Materials Table (HMT)" },
  { title: "Module 3: Classification & Hazard Communication Basics" },
  { title: "Module 4: Packaging & Markings" },
  { title: "Module 5: Labels — Design, Selection, Placement" },
  { title: "Module 6: Placarding Deep Dive" },
  { title: "Module 7: Shipping Papers Mastery" },
  { title: "Module 8: Handling, Storage & Emergencies" },
  { title: "Module 9: Security Awareness Refresher" },
  { title: "Module 10: Wrap-Up & Assessment" },
]

const faqItems = [
  {
    question: "Who is this course for?",
    answer:
      "For any employee who touches, moves, or is simply around hazardous-material shipments and needs baseline awareness of DOT rules.",
  },
  {
    question: "Is this training accepted by all DOT inspectors?",
    answer:
      "Yes, our training meets all 49 CFR §172 Subpart H requirements and is accepted by DOT inspectors nationwide. We provide official certificates upon completion.",
  },
  {
    question: "Can I take this course on my mobile device?",
    answer:
      "Our platform is mobile-first and works on smartphones, tablets, and computers. You can start on one device and continue on another.",
  },
  {
    question: "Is the course available in Spanish?",
    answer:
      "Yes, the entire course is available in both English and Spanish, including all text content and audio narration.",
  },
  {
    question: "Do you provide certificates for compliance records?",
    answer:
      "Yes, upon successful completion, you'll receive an official certificate that meets DOT requirements and can be used for compliance documentation.",
  },
]
