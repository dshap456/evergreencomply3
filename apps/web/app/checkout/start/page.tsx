import { redirect } from 'next/navigation';

import { withI18n } from '~/lib/i18n/with-i18n';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';
import { loadAvailableCourses } from '../../cart/_lib/server/load-available-courses';
import { CheckoutClient } from './_components/checkout-client';

async function CheckoutStartPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${pathsConfig.auth.signIn}?redirect=/checkout/start`);
  }

  const coursesWithMapping = await loadAvailableCourses();

  return <CheckoutClient availableCourses={coursesWithMapping} />;
}

export default withI18n(CheckoutStartPage);
