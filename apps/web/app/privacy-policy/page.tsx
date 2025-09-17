import Link from 'next/link';

import { Metadata } from 'next';
import { SiteHeader } from '../_components/site-header';
import { SiteFooter } from '../_components/site-footer';

export const metadata: Metadata = {
  title: 'Privacy Policy — Evergreen Comply',
  description:
    'Learn how Evergreen Comply collects, uses, and protects your information. We do not sell your personal data. You can opt out of marketing at any time.',
};

export default function PrivacyPolicyPage() {
  const effectiveDate = 'September 2025';

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      <main className="container max-w-3xl py-10">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Privacy Policy</h1>
          <p className="text-muted-foreground mt-2">Effective {effectiveDate}</p>
        </header>

        <section className="space-y-4 mb-8">
          <p>
            This Privacy Policy explains how Evergreen Comply ("we", "us", "our") collects, uses, and shares
            information about you when you visit our website, purchase courses, or otherwise interact with us.
          </p>
          <div className="rounded-lg border bg-card p-4 text-sm">
            <ul className="list-disc pl-5 space-y-1">
              <li>We do not sell your personal data.</li>
              <li>We use emails and phone numbers to deliver services, provide support, and—if you opt in—send marketing or place follow‑up calls.</li>
              <li>You can unsubscribe from marketing emails at any time using the link in our messages.</li>
              <li>Payments are processed by Stripe; we do not store full card numbers.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-2xl font-semibold">Information We Collect</h2>
          <p>We collect the following categories of information:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Account and contact information: name, email address, phone number, company name, and team details
              you provide during checkout, contact requests, or account creation.
            </li>
            <li>
              Purchase and billing information: items purchased, seat quantities, transaction identifiers, partial
              payment details handled by our payment processor (Stripe).
            </li>
            <li>
              Course activity: progress, quiz results, completion records, certificates, and related timestamps.
            </li>
            <li>
              Device and usage data: IP address, browser type, pages viewed, and similar analytics via cookies or
              SDKs to operate and improve the service.
            </li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-2xl font-semibold">How We Use Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide, operate, and secure our website, learning platform, and customer support.</li>
            <li>Process payments, fulfill orders, issue certificates, and manage team seats.</li>
            <li>
              Communicate with you about your account and purchases. With your consent or where permitted by law,
              we may send marketing emails, special offers, and product updates, or place follow‑up calls.
            </li>
            <li>Personalize content and measure performance to improve the learning experience.</li>
            <li>Comply with legal obligations, prevent fraud, and enforce our terms.</li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-2xl font-semibold">Legal Bases (EEA/UK)</h2>
          <p>Where GDPR or UK GDPR applies, we rely on the following legal bases:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Performance of a contract (e.g., providing purchased training and certificates).</li>
            <li>Legitimate interests (e.g., platform safety, product improvement, limited direct marketing).</li>
            <li>Consent (e.g., non‑essential cookies, promotional emails where required).</li>
            <li>Compliance with a legal obligation.</li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-2xl font-semibold">Sharing and Disclosure</h2>
          <p>We share information with service providers who help us run the business. Typical recipients include:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Payment processing: Stripe</li>
            <li>Hosting, storage, authentication, and databases (e.g., Supabase/managed cloud providers)</li>
            <li>Email, analytics, and customer support tools</li>
          </ul>
          <p>
            We may disclose information to comply with law, protect our rights, resolve disputes, or during a
            corporate transaction. We do not sell personal information.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-2xl font-semibold">Cookies and Analytics</h2>
          <p>
            We use cookies and similar technologies to keep you signed in, remember preferences, measure campaign
            performance, and improve the product. You can control cookies through your browser settings. Some
            features may not work without essential cookies.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-2xl font-semibold">Your Choices</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Marketing emails: Click “unsubscribe” in any email or contact us to opt out. Transactional or
              service messages may still be sent.
            </li>
            <li>Calls: Tell us during a call or contact us to opt out of follow‑up calls.</li>
            <li>Access, correction, deletion: Contact us to exercise rights available in your region.</li>
          </ul>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-2xl font-semibold">Data Retention</h2>
          <p>
            We keep information for as long as necessary to deliver services, meet legal obligations, resolve
            disputes, and maintain business records. Certificate and training history may be retained to support
            compliance needs.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-2xl font-semibold">Security</h2>
          <p>
            We implement administrative, technical, and physical safeguards appropriate to the sensitivity of the
            data. No method of transmission or storage is 100% secure.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-2xl font-semibold">Children</h2>
          <p>
            Our services are not directed to children under 13 (or the minimum age in your jurisdiction). We do not
            knowingly collect personal information from children.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-2xl font-semibold">International Transfers</h2>
          <p>
            We may process and store information in the United States and other countries. Where applicable, we rely
            on appropriate safeguards for cross‑border transfers.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-2xl font-semibold">Your Rights</h2>
          <p>
            Depending on your location, you may have rights to request access, correction, deletion, portability,
            restrict/opt out of certain processing, or object to processing. To make a request, contact us using the
            details below. We will verify your identity and respond as required by law.
          </p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-2xl font-semibold">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. If we make material changes, we will notify you by
            posting the updated policy and adjusting the effective date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">Contact Us</h2>
          <p>
            Questions about this policy or your data? Contact us at{' '}
            <a className="underline" href="mailto:support@evergreencomply.com">support@evergreencomply.com</a>{' '}
            or call or text{' '}
            <a className="underline" href="tel:9709190034">(970) 919‑0034</a>{' '} 
            or <a className="underline" href="sms:9709190034">text us</a>.
          </p>
        </section>

        <div className="mt-8 text-sm text-muted-foreground">
          Looking for our terms? See{' '}
          <Link className="underline" href="/terms-of-service">
            Terms of Service
          </Link>
          .
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
