import { CourseSlugFixer } from '../_components/course-slug-fixer';
import { withI18n } from '~/lib/i18n/with-i18n';

function FixCoursesPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-center mb-8">Fix Course Slugs</h1>
        <CourseSlugFixer />
        <div className="text-center text-sm text-muted-foreground">
          <p>This page can be accessed by anyone to fix course slug issues.</p>
          <p>After fixing, your cart should work properly.</p>
        </div>
      </div>
    </div>
  );
}

export default withI18n(FixCoursesPage);