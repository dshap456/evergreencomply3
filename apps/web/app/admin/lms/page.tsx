import { AdminGuard } from '@kit/admin/components/admin-guard';
import { PageBody, PageHeader } from '@kit/ui/page';

import { LMSAdminDashboard } from './_components/lms-admin-dashboard';

function LMSAdminPage() {
  return (
    <>
      <PageHeader 
        title="LMS Management"
        description="Manage courses, content, and learning analytics across all tenants"
      />

      <PageBody>
        <LMSAdminDashboard />
      </PageBody>
    </>
  );
}

export default AdminGuard(LMSAdminPage);