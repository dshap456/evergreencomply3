import { use } from 'react';
import { redirect } from 'next/navigation';

interface TeamAccountHomePageProps {
  params: Promise<{ account: string }>;
}

export default function TeamAccountHomePage({ params }: TeamAccountHomePageProps) {
  const account = use(params).account;
  
  // Redirect to Seat Management as the default page for team accounts
  redirect(`/home/${account}/courses/seats`);
}
