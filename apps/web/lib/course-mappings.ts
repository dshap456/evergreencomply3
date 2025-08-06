/**
 * Maps frontend course identifiers to database SKUs
 * This provides a consistent way to identify courses across the application
 */
export const COURSE_MAPPINGS = {
  // Frontend ID -> Database SKU
  'dot-hazmat-general': 'DOT-HAZMAT-001',
  'dot-hazmat-advanced': 'ADV-HAZMAT-001', 
  'epa-rcra': 'EPA-RCRA-001',
} as const;

export type FrontendCourseId = keyof typeof COURSE_MAPPINGS;
export type DatabaseCourseSku = typeof COURSE_MAPPINGS[FrontendCourseId];

/**
 * Get the database SKU for a frontend course ID
 */
export function getCourseSku(frontendId: string): string | undefined {
  return COURSE_MAPPINGS[frontendId as FrontendCourseId];
}

/**
 * Get the frontend ID for a database SKU
 */
export function getFrontendCourseId(sku: string): string | undefined {
  const entry = Object.entries(COURSE_MAPPINGS).find(([_, dbSku]) => dbSku === sku);
  return entry?.[0];
}