// Alias route for sign-in to bypass any path-level caching issues on /auth/sign-in
export { default } from '../auth/sign-in/page';
export { generateMetadata } from '../auth/sign-in/page';
export const dynamic = 'force-dynamic';

