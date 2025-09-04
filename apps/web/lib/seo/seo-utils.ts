import { Metadata } from 'next';

interface SEOConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  keywords?: string[];
  author?: string;
  type?: 'website' | 'article' | 'course';
  price?: number;
  currency?: string;
  availability?: string;
  category?: string;
  duration?: string;
  provider?: string;
  noindex?: boolean;
}

const DEFAULT_SITE_NAME = 'Evergreen Comply';
const DEFAULT_SITE_DESCRIPTION = 'Professional compliance training and certification courses for DOT HAZMAT, EPA RCRA, OSHA, and more.';
const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.evergreencomply.com';
const DEFAULT_SITE_IMAGE = `${DEFAULT_SITE_URL}/images/og-default.jpg`;

export function generateSEOMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    image = DEFAULT_SITE_IMAGE,
    url = DEFAULT_SITE_URL,
    keywords = [],
    author = DEFAULT_SITE_NAME,
    type = 'website',
    noindex = false,
  } = config;

  const fullTitle = title === DEFAULT_SITE_NAME ? title : `${title} | ${DEFAULT_SITE_NAME}`;
  const canonicalUrl = url.startsWith('http') ? url : `${DEFAULT_SITE_URL}${url}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(', '),
    authors: [{ name: author }],
    creator: author,
    publisher: DEFAULT_SITE_NAME,
    
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: DEFAULT_SITE_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_US',
      type: type === 'course' ? 'website' : type,
    },
    
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [image],
      creator: '@evergreencomply',
    },
    
    robots: {
      index: !noindex,
      follow: !noindex,
      googleBot: {
        index: !noindex,
        follow: !noindex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    
    alternates: {
      canonical: canonicalUrl,
    },
    
    metadataBase: new URL(DEFAULT_SITE_URL),
  };
}

export interface CourseStructuredData {
  title: string;
  description: string;
  provider: string;
  url: string;
  price?: number;
  currency?: string;
  duration?: string;
  category?: string;
  language?: string;
  image?: string;
  rating?: {
    value: number;
    count: number;
  };
  skills?: string[];
  prerequisites?: string[];
  targetAudience?: string[];
}

export function generateCourseStructuredData(course: CourseStructuredData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    description: course.description,
    provider: {
      '@type': 'Organization',
      name: course.provider || DEFAULT_SITE_NAME,
      sameAs: DEFAULT_SITE_URL,
    },
    url: course.url,
    ...(course.price && {
      offers: {
        '@type': 'Offer',
        price: course.price,
        priceCurrency: course.currency || 'USD',
        availability: 'https://schema.org/InStock',
      },
    }),
    ...(course.duration && {
      timeRequired: course.duration,
    }),
    ...(course.category && {
      educationalLevel: course.category,
      about: {
        '@type': 'Thing',
        name: course.category,
      },
    }),
    ...(course.language && {
      inLanguage: course.language,
    }),
    ...(course.image && {
      image: course.image,
    }),
    ...(course.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: course.rating.value,
        reviewCount: course.rating.count,
      },
    }),
    ...(course.skills && course.skills.length > 0 && {
      teaches: course.skills.map(skill => ({
        '@type': 'DefinedTerm',
        name: skill,
      })),
    }),
    ...(course.prerequisites && course.prerequisites.length > 0 && {
      coursePrerequisites: course.prerequisites.map(prereq => ({
        '@type': 'AlignmentObject',
        targetName: prereq,
      })),
    }),
    ...(course.targetAudience && course.targetAudience.length > 0 && {
      audience: {
        '@type': 'Audience',
        audienceType: course.targetAudience.join(', '),
      },
    }),
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: course.duration,
    },
    educationalCredentialAwarded: 'Certificate of Completion',
  };
}

export function generateOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: DEFAULT_SITE_NAME,
    url: DEFAULT_SITE_URL,
    logo: `${DEFAULT_SITE_URL}/logo.png`,
    description: DEFAULT_SITE_DESCRIPTION,
    sameAs: [
      'https://twitter.com/evergreencomply',
      'https://www.linkedin.com/company/evergreen-comply',
      'https://www.facebook.com/evergreencomply',
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-123-4567',
      contactType: 'customer service',
      availableLanguage: ['English', 'Spanish'],
    },
  };
}

export function generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${DEFAULT_SITE_URL}${item.url}`,
    })),
  };
}

export function generateFAQStructuredData(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// Generate category-specific keywords for better SEO
export function getCategoryKeywords(category: string): string[] {
  const keywordMap: Record<string, string[]> = {
    'Environment and Safety': [
      'environmental safety training',
      'safety compliance courses',
      'environmental regulations',
      'workplace safety certification',
      'environmental management',
    ],
    'OSHA': [
      'OSHA training',
      'OSHA certification',
      'OSHA compliance',
      'occupational safety',
      'workplace safety training',
      'OSHA 10',
      'OSHA 30',
    ],
    'Healthcare': [
      'healthcare training',
      'medical compliance',
      'HIPAA training',
      'healthcare certification',
      'medical safety courses',
    ],
    'Food & Alcohol': [
      'food safety training',
      'alcohol server training',
      'food handler certification',
      'ServSafe',
      'responsible beverage service',
    ],
    'HR & Compliance': [
      'HR training',
      'compliance training',
      'workplace harassment training',
      'diversity training',
      'employee compliance',
    ],
    'Industrial': [
      'industrial safety training',
      'manufacturing safety',
      'industrial compliance',
      'equipment safety',
      'industrial hygiene',
    ],
    'Insurance': [
      'insurance training',
      'insurance certification',
      'CE credits',
      'insurance compliance',
      'professional liability',
    ],
    'Real Estate': [
      'real estate training',
      'real estate certification',
      'CE courses',
      'real estate compliance',
      'property management training',
    ],
  };
  
  return keywordMap[category] || [
    'professional training',
    'online certification',
    'compliance training',
    'professional development',
  ];
}

// Generate location-specific content for local SEO
export function getLocationContent(location: string) {
  return {
    title: `Compliance Training in ${location}`,
    description: `Professional compliance and safety training courses available in ${location}. DOT HAZMAT, OSHA, EPA RCRA certifications for businesses and individuals in ${location}.`,
    keywords: [
      `compliance training ${location}`,
      `safety training ${location}`,
      `HAZMAT training ${location}`,
      `OSHA certification ${location}`,
      `professional training ${location}`,
    ],
  };
}

// Generate course slug from title
export function generateCourseSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

// Generate SEO-friendly course description
export function generateCourseDescription(
  title: string,
  category: string,
  duration: string,
  features: string[]
): string {
  const featuresList = features.slice(0, 3).join(', ');
  return `${title} - ${duration} ${category} certification course covering ${featuresList}. Get certified online with Evergreen Comply's comprehensive training program.`;
}