'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useTransition } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Button } from '@kit/ui/button';
import { Badge } from '@kit/ui/badge';
import { Trans } from '@kit/ui/trans';
import { Spinner } from '@kit/ui/spinner';
import { If } from '@kit/ui/if';
import { toast } from '@kit/ui/sonner';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { format } from 'date-fns';

import { removeFromCourseAction } from '../_lib/server/course-invitation-actions';

interface TeamEnrollment {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  enrolled_at: string;
  completed_at: string | null;
  progress_percentage: number;
  final_score: number | null;
  enrollment_type: 'invited' | 'self_enrolled';
}

interface PendingInvitation {
  id: number;
  email: string;
  created_at: string;
  expires_at: string;
  invited_by: string;
}

interface TeamEnrollmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    course_id: string;
    course_title: string;
  };
  accountId: string;
  onUpdate: () => void;
}

export function TeamEnrollmentsDialog({
  open,
  onOpenChange,
  course,
  accountId,
  onUpdate,
}: TeamEnrollmentsDialogProps) {
  const supabase = useSupabase();
  const [isPending, startTransition] = useTransition();
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const { data: enrollmentData, isLoading, refetch } = useQuery({
    queryKey: ['team-enrollments', course.course_id, accountId],
    queryFn: async () => {
      // Fetch enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('team_course_enrollments')
        .select('*')
        .eq('course_id', course.course_id)
        .eq('account_id', accountId)
        .order('enrolled_at', { ascending: false });

      if (enrollError) throw enrollError;

      // Fetch pending invitations
      const { data: invitations, error: inviteError } = await supabase
        .from('course_invitations')
        .select(`
          id,
          email,
          created_at,
          expires_at,
          invited_by
        `)
        .eq('course_id', course.course_id)
        .eq('account_id', accountId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (inviteError) throw inviteError;

      // Get inviter details
      const inviterIds = [...new Set(invitations?.map(inv => inv.invited_by) || [])];
      let inviterMap: Record<string, string> = {};
      
      if (inviterIds.length > 0) {
        const { data: inviters } = await supabase
          .from('accounts')
          .select('id, email')
          .in('id', inviterIds)
          .eq('is_personal_account', true);
        
        inviterMap = (inviters || []).reduce((acc, inv) => {
          acc[inv.id] = inv.email || 'Unknown';
          return acc;
        }, {} as Record<string, string>);
      }

      // Format invitations with inviter email
      const formattedInvitations = invitations?.map(inv => ({
        id: inv.id,
        email: inv.email,
        created_at: inv.created_at,
        expires_at: inv.expires_at,
        invited_by: inviterMap[inv.invited_by] || 'Unknown'
      })) || [];

      return {
        enrollments: enrollments as TeamEnrollment[],
        invitations: formattedInvitations as PendingInvitation[]
      };
    },
    enabled: open,
  });

  const enrollments = enrollmentData?.enrollments || [];
  const invitations = enrollmentData?.invitations || [];

  const handleRemoveUser = (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${userEmail} from this course?`)) {
      return;
    }

    setRemovingUserId(userId);
    startTransition(async () => {
      try {
        await removeFromCourseAction({
          userId,
          courseId: course.course_id,
          accountId,
        });

        toast.success('User removed from course');
        refetch();
        onUpdate();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to remove user');
      } finally {
        setRemovingUserId(null);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="courses:teamEnrollments" />
          </DialogTitle>
          <DialogDescription>
            <Trans 
              i18nKey="courses:teamEnrollmentsDescription" 
              values={{ courseName: course.course_title }} 
            />
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <If condition={isLoading}>
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          </If>

          <If condition={!isLoading && (enrollments.length > 0 || invitations.length > 0)}>
            <div className="space-y-6">
              {/* Enrolled Users Section */}
              <If condition={enrollments.length > 0}>
                <div>
                  <h4 className="font-medium mb-3">Enrolled Users ({enrollments.length})</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead><Trans i18nKey="common:name" /></TableHead>
                        <TableHead><Trans i18nKey="common:email" /></TableHead>
                        <TableHead><Trans i18nKey="courses:enrolledAt" /></TableHead>
                        <TableHead><Trans i18nKey="courses:progress" /></TableHead>
                        <TableHead><Trans i18nKey="courses:status" /></TableHead>
                        <TableHead><Trans i18nKey="courses:finalScore" /></TableHead>
                        <TableHead className="text-right"><Trans i18nKey="common:actions" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>{enrollment.user_name}</TableCell>
                          <TableCell>{enrollment.user_email}</TableCell>
                          <TableCell>
                            {format(new Date(enrollment.enrolled_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>{enrollment.progress_percentage}%</TableCell>
                          <TableCell>
                            <Badge variant={enrollment.completed_at ? 'default' : 'secondary'}>
                              {enrollment.completed_at ? (
                                <Trans i18nKey="courses:completed" />
                              ) : (
                                <Trans i18nKey="courses:inProgress" />
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {enrollment.final_score !== null ? `${enrollment.final_score}%` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveUser(enrollment.user_id, enrollment.user_email)}
                              disabled={isPending && removingUserId === enrollment.user_id}
                            >
                              <Trans i18nKey="common:remove" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </If>

              {/* Pending Invitations Section */}
              <If condition={invitations.length > 0}>
                <div>
                  <h4 className="font-medium mb-3">Pending Invitations ({invitations.length})</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead><Trans i18nKey="common:email" /></TableHead>
                        <TableHead>Invited By</TableHead>
                        <TableHead>Invited On</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead><Trans i18nKey="courses:status" /></TableHead>
                        <TableHead className="text-right"><Trans i18nKey="common:actions" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell>{invitation.email}</TableCell>
                          <TableCell>{invitation.invited_by}</TableCell>
                          <TableCell>
                            {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {format(new Date(invitation.expires_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              Pending
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled
                            >
                              <Trans i18nKey="common:remove" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </If>
            </div>
          </If>

          <If condition={!isLoading && enrollments.length === 0 && invitations.length === 0}>
            <div className="text-center py-8 text-muted-foreground">
              <Trans i18nKey="courses:noEnrollments" />
            </div>
          </If>
        </div>
      </DialogContent>
    </Dialog>
  );
}