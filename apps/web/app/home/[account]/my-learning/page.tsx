import { redirect } from 'next/navigation';

export default function TeamMyLearningPage() {
  // Redirect to personal learning page
  redirect('/home/courses');
}