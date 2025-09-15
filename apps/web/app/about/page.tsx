import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';
import { Card, CardContent } from '@kit/ui/card';
import { CheckCircle, Users, Award, Target, Shield, Lightbulb, Globe } from 'lucide-react';
import Image from 'next/image';

import { SitePageHeader } from '../marketing-temp/_components/site-page-header';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { SiteHeader } from '../_components/site-header';
import { SiteFooter } from '../_components/site-footer';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: 'About Evergreen Comply - Modern Safety Training for Blue-Collar Professionals',
    description: 'Learn about Evergreen Comply\'s mission to provide accessible, engaging, and compliant safety training for movers and doers in the transportation and waste management industries.',
  };
}

async function AboutPage() {
  return (
    <div>
      <SiteHeader />
      <SitePageHeader
        title="About Evergreen Comply"
        subtitle="Empowering blue-collar professionals with modern, accessible safety training"
      />

      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Mission Section */}
        <section className="mb-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Mission</h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                We believe that safety training should be accessible, engaging, and actually helpful. 
                That's why we've built a platform specifically designed for the way blue-collar professionals 
                work and learn - mobile-first, multilingual, and available 24/7.
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <Card>
                <CardContent className="p-6 text-center">
                  <Globe className="h-12 w-12 mx-auto mb-4 text-[rgba(233,195,81,1)]" />
                  <h3 className="font-semibold text-lg mb-2">Accessible Everywhere</h3>
                  <p className="text-sm text-muted-foreground">
                    Mobile-optimized training that works on any device, anywhere, anytime
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-[rgba(58,92,81,1)]" />
                  <h3 className="font-semibold text-lg mb-2">Fully Compliant</h3>
                  <p className="text-sm text-muted-foreground">
                    All courses meet or exceed DOT and EPA regulatory requirements
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 text-[rgba(233,195,81,1)]" />
                  <h3 className="font-semibold text-lg mb-2">Actually Engaging</h3>
                  <p className="text-sm text-muted-foreground">
                    Modern visuals and interactive content that keeps learners engaged
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Who We Serve Section */}
        <section className="mb-16 bg-muted rounded-lg p-8 md:p-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Who We Serve</h2>
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-shrink-0">
                  <Users className="h-10 w-10 text-[rgba(58,92,81,1)]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Transportation Companies</h3>
                  <p className="text-muted-foreground">
                    From small carriers to large fleets, we help transportation companies ensure their 
                    drivers and warehouse staff are properly trained on hazardous materials handling 
                    and safety procedures.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-shrink-0">
                  <Award className="h-10 w-10 text-[rgba(233,195,81,1)]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Waste Management Facilities</h3>
                  <p className="text-muted-foreground">
                    Large and small quantity generators rely on our EPA RCRA training to maintain 
                    compliance and keep their teams safe when handling hazardous waste.
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-shrink-0">
                  <Target className="h-10 w-10 text-[rgba(58,92,81,1)]" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Manufacturing & Distribution</h3>
                  <p className="text-muted-foreground">
                    Companies that ship or receive hazardous materials trust our training to keep 
                    their operations compliant and their employees safe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="mb-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">Why Companies Choose Evergreen Comply</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4 items-start">
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Designed for Blue-Collar Workers</h3>
                  <p className="text-sm text-muted-foreground">
                    Our content is created specifically for people who work with their hands, 
                    not office workers. Clear, practical, and relevant.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Bilingual Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Full English and Spanish text and audio narration ensures everyone on 
                    your team can complete their training effectively.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Mobile-First Design</h3>
                  <p className="text-sm text-muted-foreground">
                    Built from the ground up for mobile devices, because that's what your 
                    employees actually use.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Regulatory Expertise</h3>
                  <p className="text-sm text-muted-foreground">
                    We stay up-to-date with DOT and EPA regulations so you don't have to. 
                    Annual updates keep your training current.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Certificate Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatic certificate generation and tracking makes compliance audits 
                    simple and stress-free.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Dedicated Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Real people answer the phone when you call. We're here to help you 
                    succeed, not just sell you software.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="mb-16">
          <div className="max-w-4xl mx-auto">
            <div className="bg-[rgba(58,92,81,0.05)] rounded-lg p-8 md:p-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Evergreen Comply was born from a simple observation: traditional safety training 
                  wasn't working for the people who needed it most. Blue-collar workers were stuck 
                  with outdated, boring content designed for office environments, delivered on 
                  platforms that barely worked on mobile devices.
                </p>
                <p>
                  We knew there had to be a better way. So we built one.
                </p>
                <p>
                  Our team combines decades of experience in regulatory compliance, adult education, 
                  and technology to create training that actually works for the modern workforce. 
                  We understand that your employees are busy, multilingual, and mobile-first. 
                  Our training reflects that reality.
                </p>
                <p>
                  Today, we're proud to help companies across the country keep their workers safe, 
                  stay compliant, and avoid costly violations. But we're just getting started. 
                  Our mission is to make quality safety training accessible to every blue-collar 
                  worker in America, regardless of language, location, or device.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA Section */}
        <section className="text-center py-12 bg-[rgba(233,195,81,0.1)] rounded-lg">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Let's discuss how Evergreen Comply can transform your safety training program
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/contact" 
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-md text-black bg-[rgba(233,195,81,1)] hover:bg-[rgba(233,195,81,0.9)] transition-colors"
              >
                Contact Us
              </a>
              <a 
                href="tel:9709190034" 
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
              >
                Call (970) 919-0034
              </a>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}

export default withI18n(AboutPage);
