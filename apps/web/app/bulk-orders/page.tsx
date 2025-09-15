import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { Phone, Users, BarChart3, ClipboardCheck, Rocket } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Heading } from '@kit/ui/heading';

import { withI18n } from '~/lib/i18n/with-i18n';
import { SiteHeader } from '../_components/site-header';
import { ContactForm } from '../contact/_components/contact-form';
import { SiteFooter } from '../_components/site-footer';

export const metadata: Metadata = {
  title: 'Bulk Orders — Team Training Pricing and Sales',
  description:
    'Discounts for large volume orders, centralized reporting, seat assignment, and near‑instant onboarding. Talk to sales or request a quote for team training.',
  openGraph: {
    title: 'Bulk Orders — Evergreen Comply',
    description:
      'Discounts for large volume orders, centralized reporting, seat assignment, and near‑instant onboarding.',
    images: [
      {
        url: '/images/bulk-orders-warehouse.png',
        width: 1200,
        height: 630,
        alt: 'Warehouse team outside loading docks at sunrise',
      },
    ],
  },
};

async function BulkOrdersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="border-b bg-card">
        <div className="container py-10 md:py-14">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Bulk Orders for Teams</h1>
              <p className="mt-3 text-muted-foreground text-lg">
                Save with volume discounts and manage training at scale — assign seats, track progress, and get audit‑ready reports, all from one place.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center sm:items-start">
                <Link href="/contact" className="w-full max-w-xs sm:w-auto sm:max-w-none mx-auto sm:mx-0">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Request Team Pricing
                  </Button>
                </Link>
                <Link
                  href="tel:9709190034"
                  aria-label="Call sales (970) 919-0034"
                  className="w-full max-w-xs sm:w-auto sm:max-w-none mx-auto sm:mx-0"
                >
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    <Phone className="h-4 w-4 mr-2" /> (970) 919-0034
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero image */}
            <div className="relative aspect-[16/10] md:aspect-[5/3] rounded-xl overflow-hidden shadow">
              <Image
                src="/images/bulk-orders-warehouse.png"
                alt="Warehouse team in safety vests outside loading docks at sunrise"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section>
        <div className="container py-10 grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-6 flex items-start gap-6">
              <div className="h-12 w-12 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <Heading level={3}>Volume discounts</Heading>
                <p className="text-muted-foreground mt-1">
                  Competitive pricing for large orders. The more seats you purchase, the more you save.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-start gap-6">
              <div className="h-12 w-12 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <Heading level={3}>Centralized reporting</Heading>
                <p className="text-muted-foreground mt-1">
                  One dashboard for completions, progress, and certificates — simple audit‑ready exports.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-start gap-6">
              <div className="h-12 w-12 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-6 w-6" />
              </div>
              <div>
                <Heading level={3}>Seat assignment</Heading>
                <p className="text-muted-foreground mt-1">
                  Assign training to learners in seconds and automatically track certifications.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-start gap-6">
              <div className="h-12 w-12 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                <Rocket className="h-6 w-6" />
              </div>
              <div>
                <Heading level={3}>Start instantly</Heading>
                <p className="text-muted-foreground mt-1">
                  Stand up your program today. Most teams are up and running in under an hour.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Form */}
      <section className="border-t bg-card/50">
        <div className="container py-10">
          <div className="max-w-xl mx-auto">
            <Heading level={2}>Request Team Pricing</Heading>
            <p className="text-muted-foreground mt-1 mb-4">
              Tell us about your team and we’ll follow up with a tailored quote.
            </p>
            <ContactForm />
            <div className="mt-6 flex justify-center">
              <Link href="tel:9709190034" aria-label="Call sales (970) 919-0034">
                <Button variant="outline" size="lg" className="min-w-[240px]">
                  <Phone className="h-4 w-4 mr-2" /> (970) 919‑0034
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default withI18n(BulkOrdersPage);
