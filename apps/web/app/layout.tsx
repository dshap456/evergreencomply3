import { headers } from 'next/headers';

import { Toaster } from '@kit/ui/sonner';

import { RootProviders } from '~/components/root-providers';
import { getFontsClassName } from '~/lib/fonts';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { generateRootMetadata } from '~/lib/root-metdata';
import { getRootTheme } from '~/lib/root-theme';
import Script from 'next/script';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

import '../styles/globals.css';

export const generateMetadata = () => {
  return generateRootMetadata();
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language } = await createI18nServerInstance();
  const theme = await getRootTheme();
  const className = getFontsClassName(theme);
  const nonce = await getCspNonce();

  return (
    <html lang={language} className={className}>
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-T7Q6Q5HM0B"
          strategy="afterInteractive"
        />
        <Script id="gtag-init" nonce={nonce} strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} 
          gtag('js', new Date());
          gtag('config', 'G-T7Q6Q5HM0B');
        `}</Script>
      </head>
      <body>
        {/* ClickCease.com tracking */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `var script = document.createElement('script');
      script.async = true; script.type = 'text/javascript';
      var target = 'https://www.clickcease.com/monitor/stat.js';
      script.src = target;var elem = document.head;elem.appendChild(script);`,
          }}
        />
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <a href="https://www.clickcease.com" rel="nofollow">
            <img src="https://monitor.clickcease.com" alt="ClickCease" />
          </a>
        </noscript>
        {/* End ClickCease.com tracking */}
        <RootProviders theme={theme} lang={language} nonce={nonce}>
          {children}
        </RootProviders>

        <Toaster richColors={true} theme={theme} position="top-center" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

async function getCspNonce() {
  const headersStore = await headers();

  return headersStore.get('x-nonce') ?? undefined;
}
