import { Metadata } from 'next';

import { headers } from 'next/headers';

import appConfig from '~/config/app.config';

/**
 * @name generateRootMetadata
 * @description Generates the root metadata for the application
 */
export const generateRootMetadata = async (): Promise<Metadata> => {
  const headersStore = await headers();
  const csrfToken = headersStore.get('x-csrf-token') ?? '';

  return {
    title: appConfig.title,
    description: appConfig.description,
    metadataBase: new URL(appConfig.url),
    applicationName: appConfig.name,
    other: {
      'csrf-token': csrfToken,
    },
    openGraph: {
      url: appConfig.url,
      siteName: appConfig.name,
      title: appConfig.title,
      description: appConfig.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: appConfig.title,
      description: appConfig.description,
    },
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/images/favicon/favicon-96x96.png', sizes: '96x96', type: 'image/png' }
      ],
      apple: '/images/favicon/apple-touch-icon.png',
      other: [
        {
          rel: 'mask-icon',
          url: '/images/favicon/safari-pinned-tab.svg',
          color: '#2D5A2B'
        }
      ]
    },
  };
};
