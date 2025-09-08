import { AuthLayoutShell } from '@kit/auth/shared';
import { AppLogo } from '~/components/app-logo';

// Import the sign-in page component
import SignInPage from '../auth/sign-in/page';

export { generateMetadata } from '../auth/sign-in/page';
export const dynamic = 'force-dynamic';

// Wrap the sign-in page with the auth layout
export default function LoginPage(props: any) {
  return (
    <AuthLayoutShell Logo={AppLogo}>
      <SignInPage {...props} />
    </AuthLayoutShell>
  );
}

