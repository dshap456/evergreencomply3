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
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@kit/ui/accordion"

import pathsConfig from '~/config/paths.config';
import { withI18n } from '~/lib/i18n/with-i18n';
import { CustomShieldIcon } from '../../_components/custom-icons';

function DOTHazmatAdvancedPage() {
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
            <Link href="/marketing-temp#courses" className="text-sm font-medium hover:text-primary">
              Courses
            </Link>
            <Link href="/marketing-temp/contact" className="text-sm font-medium hover:text-primary">
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                0
              </span>
            </Button>
            <Link href={pathsConfig.auth.signIn}>
              <Button variant="outline">Log In</Button>
            </Link>
            <Link href={pathsConfig.auth.signUp}>
              <Button className="bg-[rgba(58,92,81,1)]">Get Started</Button>
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
              <span className="text-foreground">DOT HAZMAT - Advanced Awareness</span>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-muted/20 to-background">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-4">
                <Badge className="bg-primary text-primary-foreground">Advanced Level</Badge>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                  DOT HAZMAT Advanced Awareness Training
                </h1>
                <p className="text-lg text-muted-foreground">
                  Comprehensive training for experienced hazmat employees with job-specific safety and compliance
                  duties.
                </p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>4-5 hours</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Experienced personnel</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span>Advanced certificate</span>
                  </div>
                </div>
                <div className="pt-4">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-[rgba(233,195,81,1)] hover:bg-[rgba(233,195,81,0.9)]"
                  >
                    Enroll Now for $179
                  </Button>
                </div>
              </div>
              <div className="relative h-64 md:h-full w-full overflow-hidden rounded-lg shadow-lg">
                <Image
                  src="/images/advanced-hazmat-training.jpg"
                  alt="Advanced HAZMAT Training"
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
                    This Advanced DOT HAZMAT training course is designed for experienced personnel who perform
                    function-specific duties in hazardous materials operations. Building upon general awareness
                    principles, this comprehensive program covers advanced safety procedures, specialized handling
                    techniques, and in-depth regulatory compliance requirements under 49 CFR §172 Subpart H.
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
                  <p className="text-muted-foreground mb-4">
                    Designed for experienced professionals in these positions:
                  </p>
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
                      <div className="text-5xl font-bold text-primary">$179</div>
                      <p className="text-muted-foreground">per employee / 3-year cert</p>
                    </div>
                    <div className="space-y-3 text-sm pt-2">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">Advanced curriculum</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">Function-specific training</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">Security awareness included</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium">Official Certificate</span>
                      </div>
                    </div>
                    <Button size="lg" className="w-full mt-2 bg-[rgba(233,195,81,1)] hover:bg-[rgba(233,195,81,0.9)]">
                      Enroll Now
                    </Button>
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
                    <Link href="/marketing-temp/courses/dot-hazmat">
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
                      Free Compliance Cross-Walk
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        Verify that each advanced module matches the precise packaging, documentation, and security
                        clauses in 49 CFR §172.704(a).
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-secondary" />
                        <span>Function-specific clause mapping</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-secondary" />
                        <span>Highlights security-plan coverage</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-secondary" />
                        <span>Easy reference during audits</span>
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
                  Common questions about our DOT HAZMAT Advanced Awareness training.
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
            <Link href="/marketing-temp">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default withI18n(DOTHazmatAdvancedPage);

const learningObjectives = [
  "Correctly classify, package, mark, label, and placard hazardous-materials shipments.",
  "Prepare and verify shipping papers and records to meet 49 CFR §172.704.",
  "Implement security plans, safety procedures, and incident-response protocols for transport.",
]

const targetAudience = [
  "Hazmat Shipping / Receiving Coordinators",
  "Packaging & Labeling Specialists",
  "Compliance / Regulatory Managers",
  "Fleet / Transportation Managers & Lead Drivers",
]

const courseModules = [
  { title: "Module 1: Introduction to Advanced HAZMAT Regulations" },
  { title: "Module 2: Advanced Hazard Classification Systems" },
  { title: "Module 3: Function-Specific Training Requirements" },
  { title: "Module 4: Advanced Packaging and Container Standards" },
  { title: "Module 5: Complex Shipping Paper Documentation" },
  { title: "Module 6: Advanced Marking and Labeling Requirements" },
  { title: "Module 7: Placarding for Complex Shipments" },
  { title: "Module 8: Multi-Modal Transportation Requirements" },
  { title: "Module 9: Highway Transportation Specifics" },
  { title: "Module 10: Rail Transportation Requirements" },
  { title: "Module 11: Air Transportation (IATA/ICAO)" },
  { title: "Module 12: Vessel Transportation Requirements" },
  { title: "Module 13: Advanced Security Awareness Training" },
  { title: "Module 14: Emergency Response Planning" },
  { title: "Module 15: Incident Reporting and Documentation" },
  { title: "Module 16: Quality Control and Inspection Procedures" },
  { title: "Module 17: Advanced Regulatory Compliance" },
  { title: "Module 18: Case Studies and Practical Applications" },
]

const faqItems = [
  {
    question: "Who is this course for?",
    answer:
      "For employees who actively prepare, classify, package, label, document, loan/unload, or oversee hazmat shipments and therefore require function-specific, in-depth DOT training",
  },
  {
    question: "What are the prerequisites for the Advanced Awareness course?",
    answer:
      "None. If you need Advanced Awareness, you do NOT need to buy General Awareness separately. This course is enough for both General + Advanced.",
  },
  {
    question: "How does this differ from the General Awareness course?",
    answer:
      "The big difference between the two courses is the function-specific procedures, which covers rail, vessel, and air in greater depth, plus new information on shipping lithium ion batteries. This course also has ad longer section on security awareness and incident reporting.",
  },
  {
    question: "Is Security Awareness training included?",
    answer:
      "Yes, security awareness principles is included and goes beyond what is in the General Course, covering threat recognition, security planning, and incident reporting procedures.",
  },
]