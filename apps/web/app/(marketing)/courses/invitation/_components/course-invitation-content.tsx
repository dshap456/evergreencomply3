'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kit/ui/card';
import { Button } from '@kit/ui/button';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';

interface InvitationData {
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

export function CourseInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = useSupabase();
  const token = searchParams.get('token');
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      loadInvitation();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [token]);

  const loadInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('course_invitations')
        .select(`
          id,
          course_id,
          account_id,
          email,
          expires_at,
          accepted_at,
          courses!inner (
            title
          ),
          accounts!inner (
            name
          )
        `)
        .eq('invite_token', token)
        .single();

      if (error || !data) {
        setError('Invalid or expired invitation');
        return;
      }

      // Check if already accepted
      if (data.accepted_at) {
        setError('This invitation has already been accepted');
        return;
      }

      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        return;
      }

      // Transform the data to match our interface
      setInvitation({
        id: data.id,
        course_id: data.course_id,
        account_id: data.account_id,
        email: data.email,
        course: {
          title: data.courses.title
        },
        account: {
          name: data.accounts.name
        }
      });
    } catch (err) {
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Store token and redirect to sign in
        sessionStorage.setItem('course_invitation_token', token!);
        router.push('/auth/sign-in');
        return;
      }

      // Accept the invitation
      const { data, error } = await supabase.rpc('accept_course_invitation', {
        p_invite_token: token
      });

      if (error || !data?.success) {
        setError(data?.error || 'Failed to accept invitation');
        return;
      }

      // Redirect to the course
      router.push(`/home/${invitation!.account.name}/courses/${invitation!.course_id}`);
    } catch (err) {
      setError('An error occurred while accepting the invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="flex items-center justify-center py-8">
          <Spinner className="h-8 w-8" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="courses:courseInvitation" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button 
            className="mt-4 w-full" 
            onClick={() => router.push('/')}
          >
            Go to Home
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          <Trans i18nKey="courses:courseInvitation" />
        </CardTitle>
        <CardDescription>
          <Trans 
            i18nKey="courses:invitedToCourse" 
            values={{ 
              courseName: invitation.course.title,
              teamName: invitation.account.name
            }} 
          />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h3 className="font-semibold text-lg">{invitation.course.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              <Trans 
                i18nKey="courses:providedBy" 
                values={{ teamName: invitation.account.name }} 
              />
            </p>
          </div>

          <Button 
            className="w-full" 
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Processing...
              </>
            ) : (
              <Trans i18nKey="courses:acceptInvitation" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}