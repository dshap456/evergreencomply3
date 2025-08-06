import { AdminGuard } from '@kit/admin/components/admin-guard';
import { PageBody, PageHeader } from '@kit/ui/page';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { CourseManagementClient } from './_components/course-management-client';

async function AdminCoursesPage() {
  const supabase = getSupabaseServerAdminClient();
  
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .order('title');

  if (error) {
    console.error('Failed to load courses:', error);
  }

  return (
    <>
      <PageHeader 
        title="Course Management" 
        description="Manage course slugs and publishing status"
      />
      
      <PageBody>
        <CourseManagementClient initialCourses={courses || []} />
      </PageBody>
    </>
  );
}

export default AdminGuard(AdminCoursesPage);