import { redirect } from 'next/navigation';
import pathsConfig from '~/config/paths.config';

export default function UserHomePage() {
  // Redirect to My Learning page as the default landing page
  redirect(pathsConfig.app.personalAccountCourses);
}
