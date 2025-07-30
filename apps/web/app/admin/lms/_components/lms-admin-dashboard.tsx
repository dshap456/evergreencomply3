'use client';

import { useState } from 'react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { CourseManagement } from './course-management';
import { LMSAnalytics } from './lms-analytics';
import { UserManagement } from './user-management';
import { AdminEnrollmentTool } from './admin-enrollment-tool';

export function LMSAdminDashboard() {
  const [activeTab, setActiveTab] = useState('courses');

  return (
    <div className="space-y-6">
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          <CourseManagement />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AdminEnrollmentTool />
            <UserManagement />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}