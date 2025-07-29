import { use } from 'react';
import { redirect } from 'next/navigation';

interface TeamAccountHomePageProps {
  params: Promise<{ account: string }>;
}

export default function TeamAccountHomePage({ params }: TeamAccountHomePageProps) {
  const account = use(params).account;
  
  // Redirect to My Learning as the default page
  redirect(`/home/${account}/my-learning`);
}
