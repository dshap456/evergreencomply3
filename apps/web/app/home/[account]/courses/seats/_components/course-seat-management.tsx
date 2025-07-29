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

  // Early return if account is not loaded
  if (!account?.id) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const { data: courseSeatData, isLoading, refetch } = useQuery({
    queryKey: ['course-seats', account.id],
    queryFn: async () => {
      try {
        // Get all courses with seat information
        const { data: seats, error: seatsError } = await supabase
          .from('course_seats')
          .select(`
            id,
            course_id,
            total_seats
          `)
          .eq('account_id', account.id);

        if (seatsError) {
          console.error('Error fetching course seats:', seatsError);
          throw seatsError;
        }

      // Get course details
      const courseIds = seats?.map(s => s.course_id) || [];
      
      // If no course seats, return empty array
      if (courseIds.length === 0) {
        return [];
      }

      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, status')
        .in('id', courseIds);

      if (coursesError) throw coursesError;

      // Get enrollment counts for each course
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('account_id', account.id)
        .in('course_id', courseIds);

      if (enrollError) throw enrollError;

      // Get pending invitations count for each course
      const { data: invitations, error: inviteError } = await supabase
        .from('course_invitations')
        .select('course_id')
        .eq('account_id', account.id)
        .in('course_id', courseIds)
        .is('accepted_at', null);

      if (inviteError) throw inviteError;

      // Calculate used seats per course (enrolled + pending invites)
      const enrollmentMap = enrollments?.reduce((acc, enrollment) => {
        acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const invitationMap = invitations?.reduce((acc, invitation) => {
        acc[invitation.course_id] = (acc[invitation.course_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Combine enrolled and pending counts
      const usedSeatsMap = courseIds.reduce((acc, courseId) => {
        acc[courseId] = (enrollmentMap[courseId] || 0) + (invitationMap[courseId] || 0);
        return acc;
      }, {} as Record<string, number>);

      // Create a map of course data for easy lookup
      const courseMap = courses?.reduce((acc, course) => {
        acc[course.id] = course;
        return acc;
      }, {} as Record<string, typeof courses[0]>) || {};

        // Combine data
        return seats?.map(seat => ({
          course_id: seat.course_id,
          course_title: courseMap[seat.course_id]?.title || 'Unknown Course',
          total_seats: seat.total_seats,
          used_seats: usedSeatsMap[seat.course_id] || 0,
          available_seats: seat.total_seats - (usedSeatsMap[seat.course_id] || 0),
        })) || [];
      } catch (error) {
        console.error('Error in course seat query:', error);
        throw error;
      }
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

  return (
    <div className="space-y-6">
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
                  <TableHead><Trans i18nKey="common:actions" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseSeatData?.map((course) => (
                  <TableRow key={course.course_id}>
                    <TableCell className="font-medium">{course.course_title}</TableCell>
                    <TableCell className="text-center">{course.total_seats}</TableCell>
                    <TableCell className="text-center">{course.used_seats}</TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={course.available_seats > 0 ? 'default' : 'secondary'}
                        className={course.available_seats > 0 ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        {course.available_seats}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2 lg:flex-row lg:justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateSeats(course)}
                          className="w-full lg:w-auto"
                        >
                          <Trans i18nKey="courses:updateSeats" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleViewEnrollments(course)}
                          className="w-full lg:w-auto"
                        >
                          <Trans i18nKey="courses:viewEnrollments" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleInvite(course)}
                          disabled={course.available_seats <= 0}
                          className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Trans i18nKey="courses:inviteMember" />
                        </Button>
                      </div>
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