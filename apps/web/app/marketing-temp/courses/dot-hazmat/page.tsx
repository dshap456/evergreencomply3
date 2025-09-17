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
  ArrowLeft,
  ShoppingCart,
  BookOpen,
  ArrowRight,
  Monitor,
  Smartphone,
  MessageCircle,
  Globe,
  Play,
  ChevronDown,
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

function DOTHazmatGeneralPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Link href="/marketing-temp" className="flex items-center gap-2">
              <CustomShieldIcon className="h-6 w-6" />
              <span className="text-xl font-bold">Evergreen Comply</span>
            </Link>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="/marketing-temp#features" className="text-sm font-medium hover:text-primary">
              Features
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium hover:text-primary">
                Courses
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem asChild>
                  <Link href="/marketing-temp/courses/dot-hazmat" className="cursor-pointer">
                    DOT HAZMAT - General
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/marketing-temp/courses/advanced-hazmat" className="cursor-pointer">
                    DOT HAZMAT - Advanced
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/marketing-temp/courses/epa-rcra" className="cursor-pointer">
                    EPA RCRA
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/marketing-temp/contact" className="text-sm font-medium hover:text-primary">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/marketing-temp/cart">
              <Button variant="ghost" size="sm" className="relative">
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  0
                </span>
              </Button>
            </Link>
            <Link href={pathsConfig.auth.signIn}>
              <Button variant="outline">Log In</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b bg-muted/40">
          <div className="container py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/marketing-temp" className="hover:text-foreground">
                Home
              </Link>
              <span>/</span>
              <Link href="/marketing-temp#courses" className="hover:text-foreground">
                Courses
              </Link>
              <span>/</span>
              <span className="text-foreground">DOT HAZMAT - General Awareness</span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-muted/20 to-background">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-4">
                <Badge className="bg-primary text-primary-foreground">49 CFR §172 Compliant</Badge>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                  DOT HAZMAT General Awareness Training
                </h1>
                <p className="text-lg text-muted-foreground">
                  Essential training for employees involved in handling or shipping hazardous materials.
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none" role="img" aria-label="United States flag">🇺🇸</span>
                    <span className="text-lg leading-none" role="img" aria-label="Mexico flag">🇲🇽</span>
                    <span>English & Spanish included</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>1-2 hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>All skill levels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span>Certificate included</span>
                  </div>
                </div>
                <div className="pt-4">
                  <Link href="/marketing-temp/cart">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto bg-[rgba(233,195,81,1)] hover:bg-[rgba(233,195,81,0.9)]"
                    >
                      Buy Seats - $119 per seat
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="relative h-64 md:h-full w-full overflow-hidden rounded-lg shadow-lg">
                <Image
                  src="/images/general-hazmat-training.png"
                  alt="General HAZMAT Training"
                  fill
                  className="object-cover transform hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
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
                        className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border border-muted"
                      >
                        <div className="bg-primary/10 p-2 rounded-full">
                          <Users className="h-5 w-5 text-primary flex-shrink-0" />
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
                      <div className="text-5xl font-bold text-primary">$79</div>
                      <p className="text-muted-foreground">per employee / 3-year cert</p>
                    </div>
                    <div className="space-y-3 text-sm pt-2">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">3-year certification</span>
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
                        <span className="font-medium">24/7 access</span>
                      </div>
                    </div>
                    <Link href="/marketing-temp/cart" className="block w-full mt-2">
                      <Button size="lg" className="w-full bg-[rgba(233,195,81,1)] hover:bg-[rgba(233,195,81,0.9)]">
                        Buy Seats
                      </Button>
                    </Link>
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
                    <Link href="/marketing-temp/courses/advanced-hazmat">
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
                    <Link href="/marketing-temp/courses/epa-rcra">
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

                <Card className="border-2 border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10">
                  <CardHeader>
                    <CardTitle className="text-center flex items-center justify-center gap-2">
                      <Award className="h-5 w-5 text-secondary" />
                      Free General Awareness Cross-Walk
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        Get a clear table showing how this course meets every baseline requirement in 49 CFR §172
                        Subpart H.
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-secondary" />
                        <span>Clause-by-clause alignment</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-secondary" />
                        <span>Covers all hazmat employee basics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-secondary" />
                        <span>Handy summary for HR or auditors</span>
                      </div>
                    </div>
                    <Button className="w-full bg-secondary hover:bg-secondary/90">Download Free Guide</Button>
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
      </main>

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
                    <Link href="/marketing-temp#features" className="text-sm text-muted-foreground hover:text-foreground">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="/marketing-temp#courses" className="text-sm text-muted-foreground hover:text-foreground">
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
