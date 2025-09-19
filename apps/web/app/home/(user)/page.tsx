import { redirect } from 'next/navigation';

import pathsConfig from '~/config/paths.config';

import { loadUserWorkspace } from './_lib/server/load-user-workspace';

type AccountOption = {
  value: string | null;
  is_personal_account?: boolean | null;
};

export default async function UserHomePage() {
  const workspace = await loadUserWorkspace();

  const accounts = workspace.accounts as AccountOption[] | undefined;
  const teamAccount = accounts?.find((account) => {
    return account?.is_personal_account === false && typeof account?.value === 'string';
  });

  if (teamAccount?.value) {
    const teamSlug = encodeURIComponent(teamAccount.value);
    redirect(`/home/${teamSlug}/courses/seats`);
  }

  redirect(pathsConfig.app.personalAccountCourses);
}
