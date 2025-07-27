'use client';

import { useState } from 'react';

import { BookOpenIcon, SettingsIcon, UsersIcon } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';

import { CourseSettingsForm } from './course-settings-form';
import { ModulesManager } from './modules-manager';
import { CompletionReports } from './completion-reports';

interface Course {
  id: string;
  title: string;
  description: string | null;
  sku: string | null;
  price: number;
  status: 'draft' | 'published' | 'archived';
  sequential_completion: boolean;
  passing_score: number;
  modules?: Array<{
    id: string;
    title: string;
    description: string | null;
    order_index: number;
    lessons?: Array<{
      id: string;
      title: string;
      description: string | null;
      content_type: string;
      content: string | null;
      video_url: string | null;
      asset_url: string | null;
      order_index: number;
      is_final_quiz: boolean;
      passing_score: number;
      quiz_questions?: Array<{
        id: string;
        question: string;
        options: any;
        correct_answer: string;
        points: number;
        order_index: number;
      }>;
    }>;
  }>;
}

interface CourseBuilderProps {
  course: Course;
  account: string;
}

export function CourseBuilder({ course, account }: CourseBuilderProps) {
  const [activeTab, setActiveTab] = useState('content');

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BookOpenIcon className="h-5 w-5" />
                <span>{course.title}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  course.status === 'published' 
                    ? 'bg-green-100 text-green-800' 
                    : course.status === 'archived'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                </span>
              </CardTitle>
              {course.description && (
                <CardDescription className="mt-2">
                  {course.description}
                </CardDescription>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {course.price > 0 && (
                <span className="text-lg font-semibold">
                  ${course.price}
                </span>
              )}
              <Button variant="outline" size="sm">
                <Trans i18nKey="courses:preview" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Course Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content" className="flex items-center space-x-2">
            <BookOpenIcon className="h-4 w-4" />
            <span><Trans i18nKey="courses:modules.title" /></span>
          </TabsTrigger>
          <TabsTrigger value="enrollments" className="flex items-center space-x-2">
            <UsersIcon className="h-4 w-4" />
            <span><Trans i18nKey="courses:enrollment.title" /></span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center space-x-2">
            <UsersIcon className="h-4 w-4" />
            <span>Reports</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <SettingsIcon className="h-4 w-4" />
            <span><Trans i18nKey="courses:settings.title" /></span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <ModulesManager course={course} account={account} />
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans i18nKey="courses:enrollment.title" />
              </CardTitle>
              <CardDescription>
                <Trans i18nKey="courses:enrollment.description" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <UsersIcon className="mx-auto h-12 w-12 mb-4" />
                <p><Trans i18nKey="courses:enrollment.noEnrollments" /></p>
                <p className="text-sm mt-2">
                  <Trans i18nKey="courses:enrollment.noEnrollmentsDescription" />
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <CompletionReports 
            account={account} 
            courses={[{ id: course.id, title: course.title }]} 
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <CourseSettingsForm course={course} account={account} />
        </TabsContent>
      </Tabs>
    </div>
  );
}