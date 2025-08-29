'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { If } from '@kit/ui/if';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useUser } from '@kit/supabase/hooks/use-user';

interface CourseInvitation {
  id: number;
  course_id: string;
  account_id: string;
  email: string;
  course: {
    title: string;
  };
  account: {
    name: string;
  };
}

export default function JoinCoursePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useSupabase();
  const user = useUser();
  const [isPending, startTransition] = useTransition();
  
  const token = searchParams.get('token');
  const [invitation, setInvitation] = useState<CourseInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      // Use API route to fetch invitation (bypasses RLS for anonymous users)
      const response = await fetch(`/api/get-course-invitation?token=${token}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Invalid or expired invitation');
        return;
      }

      const data = result.invitation;

      // Check if user email matches invitation email
      if (user?.email && user.email !== data.email) {
        setError(`This invitation was sent to ${data.email}. Please sign in with that email address.`);
        return;
      }

      setInvitation(data as any);
    } catch (err) {
      setError('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = () => {
    if (!user) {
      // Redirect to sign in/up with return URL
      const returnUrl = `/join/course?token=${token}`;
      router.push(`/auth/sign-in?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    startTransition(async () => {
      try {
        const { data, error } = await supabase.rpc('accept_course_invitation', {
          p_invite_token: token,
        });

        if (error) {
          setError(error.message);
          return;
        }

        if (!data.success) {
          setError(data.error);
          return;
        }

        // Redirect to the course
        router.push(`/home/(user)/courses/${data.course_id}`);
      } catch (err) {
        setError('Failed to accept invitation');
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="courses:courseInvitation" />
          </CardTitle>
          <CardDescription>
            <If condition={Boolean(invitation)}>
              <Trans 
                i18nKey="courses:invitedToCourse" 
                values={{ 
                  teamName: invitation?.account.name,
                  courseName: invitation?.course.title 
                }} 
              />
            </If>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <If condition={Boolean(error)}>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </If>

          <If condition={Boolean(invitation && !error)}>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="font-semibold">{invitation?.course.title}</p>
                <p className="text-sm text-muted-foreground">
                  <Trans i18nKey="courses:providedBy" values={{ teamName: invitation?.account.name }} />
                </p>
              </div>

              <Button
                onClick={handleAcceptInvitation}
                disabled={isPending}
                className="w-full"
              >
                <If condition={!user}>
                  <Trans i18nKey="courses:signInToAccept" />
                </If>
                <If condition={Boolean(user)}>
                  <If condition={isPending}>
                    <Spinner className="mr-2 h-4 w-4" />
                  </If>
                  <Trans i18nKey="courses:acceptInvitation" />
                </If>
              </Button>
            </div>
          </If>
        </CardContent>
      </Card>
    </div>
  );
}