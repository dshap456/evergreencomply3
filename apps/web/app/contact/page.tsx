import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';

import { SitePageHeader } from '../marketing-temp/_components/site-page-header';
import { ContactForm } from './_components/contact-form';
import { createI18nServerInstance } from '~/lib/i18n/i18n.server';
import { withI18n } from '~/lib/i18n/with-i18n';
import { SiteHeader } from '../_components/site-header';

export async function generateMetadata() {
  const { t } = await createI18nServerInstance();

  return {
    title: t('marketing:contact'),
  };
}

async function ContactPage() {
  const { t } = await createI18nServerInstance();

  return (
    <div>
      <SiteHeader />
      <SitePageHeader
        title={t(`marketing:contact`)}
        subtitle={t(`marketing:contactDescription`)}
      />

      <div className={'container mx-auto'}>
        <div
          className={'flex flex-1 flex-col items-center justify-center py-12'}
        >
          <div
            className={
              'flex w-full max-w-lg flex-col space-y-4 rounded-lg border p-8'
            }
          >
            <div>
              <Heading level={3}>
                <Trans i18nKey={'marketing:contactHeading'} />
              </Heading>

              <p className={'text-muted-foreground'}>
                <Trans i18nKey={'marketing:contactSubheading'} />
              </p>

              <div className="mt-4 p-4 bg-muted rounded-lg text-center">
                <p className="text-base font-medium mb-1">Prefer to call or text?</p>
                <div className="text-center text-primary text-xl font-bold">
                  <a href="tel:9709190034" className="hover:underline">(970) 919‑0034</a>
                  <span className="mx-1">·</span>
                  <a href="sms:9709190034" className="hover:underline">Text us</a>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Mon‑Fri, 8am‑5pm MST</p>
              </div>
            </div>

            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export default withI18n(ContactPage);
