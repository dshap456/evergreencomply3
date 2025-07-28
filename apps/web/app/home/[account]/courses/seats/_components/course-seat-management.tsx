'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Badge } from '@kit/ui/badge';
import { Trans } from '@kit/ui/trans';
import { Spinner } from '@kit/ui/spinner';
import { If } from '@kit/ui/if';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useTeamAccountWorkspace } from '@kit/team-accounts/hooks/use-team-account-workspace';

import { InviteToCourseDialog } from './invite-to-course-dialog';
import { TeamEnrollmentsDialog } from './team-enrollments-dialog';
import { UpdateSeatsDialog } from './update-seats-dialog';

interface CourseSeatData {
  course_id: string;
  course_title: string;
  total_seats: number;
  used_seats: number;
  available_seats: number;
}

export function CourseSeatManagement({ accountSlug }: { accountSlug: string }) {
  const supabase = useSupabase();
  const { account } = useTeamAccountWorkspace();
  
  const [selectedCourse, setSelectedCourse] = useState<CourseSeatData | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEnrollmentsDialog, setShowEnrollmentsDialog] = useState(false);
  const [showUpdateSeatsDialog, setShowUpdateSeatsDialog] = useState(false);

  const { data: courseSeatData, isLoading, refetch } = useQuery({
    queryKey: ['course-seats', account.id],
    queryFn: async () => {
      // Get all courses with seat information
      const { data: seats, error: seatsError } = await supabase
        .from('course_seats')
        .select(`
          id,
          course_id,
          total_seats,
          courses!inner (
            id,
            title,
            status
          )
        `)
        .eq('account_id', account.id);

      if (seatsError) throw seatsError;

      // Get enrollment counts for each course
      const courseIds = seats?.map(s => s.course_id) || [];
      
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('account_id', account.id)
        .in('course_id', courseIds);

      if (enrollError) throw enrollError;

      // Calculate used seats per course
      const usedSeatsMap = enrollments?.reduce((acc, enrollment) => {
        acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Combine data
      return seats?.map(seat => ({
        course_id: seat.course_id,
        course_title: seat.courses.title,
        total_seats: seat.total_seats,
        used_seats: usedSeatsMap[seat.course_id] || 0,
        available_seats: seat.total_seats - (usedSeatsMap[seat.course_id] || 0),
      })) || [];
    },
    enabled: !!account.id,
  });

  const handleInvite = (course: CourseSeatData) => {
    setSelectedCourse(course);
    setShowInviteDialog(true);
  };

  const handleViewEnrollments = (course: CourseSeatData) => {
    setSelectedCourse(course);
    setShowEnrollmentsDialog(true);
  };

  const handleUpdateSeats = (course: CourseSeatData) => {
    setSelectedCourse(course);
    setShowUpdateSeatsDialog(true);
  };

  // Test function
  const testInvitation = async () => {
    if (!courseSeatData || courseSeatData.length === 0) return;
    
    const testCourse = courseSeatData[0];
    const response = await fetch('/api/test-invitation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        courseId: testCourse.course_id,
        accountId: account.id,
      }),
    });
    
    const result = await response.json();
    console.log('Test result:', result);
    
    if (!response.ok) {
      alert('Test error: ' + result.error);
    } else {
      alert('Test success!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Temporary test button */}
      <Button onClick={testInvitation} variant="outline">
        Test Invitation API
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="courses:courseSeatOverview" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <If condition={isLoading} fallback={
            <If condition={!courseSeatData || courseSeatData.length === 0}>
              <div className="text-center py-8 text-muted-foreground">
                <Trans i18nKey="courses:noCoursesWithSeats" />
              </div>
            </If>
          }>
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          </If>

          <If condition={courseSeatData && courseSeatData.length > 0}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><Trans i18nKey="courses:courseName" /></TableHead>
                  <TableHead className="text-center"><Trans i18nKey="courses:totalSeats" /></TableHead>
                  <TableHead className="text-center"><Trans i18nKey="courses:usedSeats" /></TableHead>
                  <TableHead className="text-center"><Trans i18nKey="courses:availableSeats" /></TableHead>
                  <TableHead className="text-right"><Trans i18nKey="common:actions" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseSeatData?.map((course) => (
                  <TableRow key={course.course_id}>
                    <TableCell className="font-medium">{course.course_title}</TableCell>
                    <TableCell className="text-center">{course.total_seats}</TableCell>
                    <TableCell className="text-center">{course.used_seats}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={course.available_seats > 0 ? 'default' : 'secondary'}>
                        {course.available_seats}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateSeats(course)}
                      >
                        <Trans i18nKey="courses:updateSeats" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewEnrollments(course)}
                      >
                        <Trans i18nKey="courses:viewEnrollments" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleInvite(course)}
                        disabled={course.available_seats <= 0}
                      >
                        <Trans i18nKey="courses:inviteMember" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </If>
        </CardContent>
      </Card>

      <If condition={selectedCourse !== null}>
        <InviteToCourseDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          course={selectedCourse!}
          accountId={account.id}
          onSuccess={() => refetch()}
        />

        <TeamEnrollmentsDialog
          open={showEnrollmentsDialog}
          onOpenChange={setShowEnrollmentsDialog}
          course={selectedCourse!}
          accountId={account.id}
          onUpdate={() => refetch()}
        />

        <UpdateSeatsDialog
          open={showUpdateSeatsDialog}
          onOpenChange={setShowUpdateSeatsDialog}
          course={selectedCourse!}
          accountId={account.id}
          onSuccess={() => refetch()}
        />
      </If>
    </div>
  );
}