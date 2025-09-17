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
import { AddToCartButton } from '../../_components/add-to-cart-button';
import { CartCount } from '../../_components/cart-count';

function EPARCRAPage() {
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
        {/* Breadcrumb */}
        <div className="border-b bg-muted/40">
          <div className="container py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <span>/</span>
              <Link href="/#courses" className="hover:text-foreground">
                Courses
              </Link>
              <span>/</span>
              <span className="text-foreground">EPA RCRA Hazardous Waste - Annual</span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-muted/20 to-background">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-4">
                <Badge className="bg-secondary text-secondary-foreground">EPA Certified</Badge>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                  EPA RCRA Hazardous Waste Training
                </h1>
                <p className="text-lg text-muted-foreground">
                  Annual certification for Large Quantity Generators (LQGs) under EPA regulations.
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>3-4 hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Generator personnel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span>Annual certification</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <span className="text-lg leading-none" role="img" aria-label="United States flag">🇺🇸</span>
                  <span className="text-lg leading-none" role="img" aria-label="Mexico flag">🇲🇽</span>
                  <span>English & Spanish included</span>
                </div>
                <div className="pt-4">
                  <AddToCartButton
                    courseId="epa-rcra"
                    price={119}
                    size="lg"
                    className="w-full sm:w-auto"
                  />
                  <div className="mt-3">
                    <Link href="/bulk-orders">
                      <Button variant="outline" size="lg" className="w-full sm:w-auto">
                        Team & Bulk Pricing
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              <div className="relative h-64 md:h-full w-full overflow-hidden rounded-lg shadow-lg">
                <Image
                  src="/images/epa-rcra-training.png"
                  alt="EPA RCRA Training"
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
                    EPA-approved RCRA training for Large & Small Quantity Generators—hazardous-waste ID, storage,
                    labeling, disposal, and emergency response in one concise course that meets EPA's annual training
                    mandate.
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-bold mb-6 text-primary">Course Preview</h3>
                  <div className="mb-12">
                    <p className="text-sm text-muted-foreground mb-4 text-center">
                      Watch a sample of our engaging course content and see how we make compliance training effective and painless.
                    </p>
                    <div className="relative aspect-video rounded-lg overflow-hidden shadow-xl">
                      <iframe
                        src="https://www.youtube.com/embed/Zl2QW71CxdQ"
                        title="EPA RCRA Course Preview"
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
                  <h3 className="text-2xl font-bold mb-6 text-primary">Who Must Take This Course</h3>
                  <p className="text-muted-foreground mb-4">Mandatory annual training for LQG facility personnel:</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {targetAudience.map((audience, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-4 bg-gradient-to-r from-[rgba(34,197,94,0.25)] to-[rgba(34,197,94,0.35)] rounded-lg border border-[rgba(34,197,94,0.6)] hover:border-[rgba(34,197,94,0.8)] transition-all hover:shadow-md"
                      >
                        <div className="bg-[rgba(34,197,94,0.5)] p-2 rounded-full">
                          <Users className="h-5 w-5 text-[rgba(34,197,94,1)] flex-shrink-0" />
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
                <Card className="border-2 border-secondary/20 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-center text-2xl">Course Pricing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-primary">$119</div>
                      <p className="text-muted-foreground">per employee / 1-year cert</p>
                    </div>
                    <div className="space-y-3 text-sm pt-2">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">EPA 40 CFR Compliant</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">English & Spanish</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">LQG-specific content</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">Certificate of completion</span>
                      </div>
                    </div>
                    <AddToCartButton
                      courseId="epa-rcra"
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
                    <Link href="/courses/dot-hazmat">
                      <div className="p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm text-blue-900 group-hover:text-blue-700">
                              DOT HAZMAT General
                            </h4>
                            <p className="text-xs text-blue-600 mt-1">Basic awareness • $79</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
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
                  </CardContent>
                </Card>

                <Card className="border-2 border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10">
                  <CardHeader>
                    <CardTitle className="text-center flex items-center justify-center gap-2">
                      <Award className="h-5 w-5 text-secondary" />
                      Free RCRA Compliance Cross-Walk
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        Instantly see how every lesson lines up with 40 CFR hazardous-waste rules—perfect for audits or
                        management sign-off.
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-secondary" />
                        <span>Regulation-by-regulation mapping</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-secondary" />
                        <span>Inspector-ready citations (LQG & SQG)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-secondary" />
                        <span>One-page summary for your training file</span>
                      </div>
                    </div>
                    <Button className="w-full bg-[rgba(233,195,81,1)] hover:bg-[rgba(233,195,81,0.9)] text-black font-semibold">Download Free Guide</Button>
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
                <p className="text-muted-foreground">Common questions about our EPA RCRA Hazardous Waste training.</p>
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

export default withI18n(EPARCRAPage);

const learningObjectives = [
  "Distinguish hazardous waste from non-hazardous materials under 40 CFR standards.",
  "Apply proper container labeling, accumulation, storage, and disposal practices.",
  "Maintain generator records and execute contingency actions to protect health and environment.",
]

const targetAudience = [
  "Hazardous Waste Generator Personnel",
  "Environmental Health & Safety (EHS) Staff",
  "Facilities / Operations Managers",
  "Laboratory & Production Technicians",
]

const courseModules = [
  { title: "Module 1: Welcome & Compliance Checklist" },
  { title: "Module 2: RCRA Framework & Generator Categories" },
  { title: "Module 3: Identifying Hazardous Waste" },
  { title: "Module 4: LQG Accumulation Standards (90-Day Area)" },
  { title: "Module 5: Satellite Accumulation Areas (SAAs)" },
  { title: "Module 6: Labeling & Marking" },
  { title: "Module 7: Waste Minimization & Land-Disposal Restrictions (LDR)" },
  { title: "Module 8: Hazardous-Waste Manifest & e-Manifest" },
  { title: "Module 9: Preparedness, Prevention & Contingency Plan" },
  { title: "Module 10: Inspections & Recordkeeping" },
  { title: "Module 11: Universal Waste & Used Oil Touch-Points" },
  { title: "Module 12: State Specific Variances" },
  { title: "Module 13: Review and Final Exam" },
]

const faqItems = [
  {
    question: "Who this course for?",
    answer:
      "Managers and compliance Officers who oversee hazardous-waste programs; Plant, Lab, and Warehouse personnel who label, store, or ship regulated waste; Maintenance and operations staff at Large or Small Quantity Generator sites.",
  },
  {
    question: "Is this training accepted by the EPA?",
    answer:
      "Yes. The content is mapped line-by-line to the EPA's RCRA training requirement in 40 CFR §262.17(a)(7). Finish the course, pass the quiz, and you receive a time-stamped certificate recognized by inspectors as proof of annual compliance.",
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
      "Yes, upon successful completion, you'll receive an official certificate that meets EPA requirements and can be used for compliance documentation.",
  },
]
