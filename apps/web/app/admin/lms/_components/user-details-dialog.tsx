'use client';

import { useState, useTransition } from 'react';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Badge } from '@kit/ui/badge';
import { Spinner } from '@kit/ui/spinner';
import { toast } from '@kit/ui/sonner';

import { getUserDetailsAction } from '../_lib/server/user-reporting-actions';

interface UserCourseCompletion {
  courseName: string;
  completionDate: string;
  finalQuizScore: number | null;
}

interface UserCourseEnrollment {
  courseName: string;
  enrolledAt: string;
  progress: number;
}

interface UserDetails {
  id: string;
  name: string;
  email: string;
  currentEnrollments?: UserCourseEnrollment[];
  courseCompletions: UserCourseCompletion[];
}

interface UserDetailsDialogProps {
  userId: string;
  userName: string;
  children: React.ReactNode;
}

export function UserDetailsDialog({ userId, userName, children }: UserDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenDialog = () => {
    setOpen(true);
    
    if (!userDetails) {
      console.log('UserDetailsDialog: Loading user details for:', userId);
      
      startTransition(async () => {
        try {
          const result = await getUserDetailsAction({ userId });
          
          if (result.success) {
            console.log('UserDetailsDialog: Loaded user details:', result.data);
            setUserDetails(result.data);
          } else {
            console.error('UserDetailsDialog: Failed to load user details');
            toast.error('Failed to load user details');
          }
        } catch (error) {
          console.error('UserDetailsDialog: Error loading user details:', error);
          toast.error('Failed to load user details');
        }
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100 text-gray-800';
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getScoreLabel = (score: number | null) => {
    if (score === null) return 'No Score';
    return `${score}%`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={handleOpenDialog}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details: {userName}</DialogTitle>
          <DialogDescription>
            Course completion history and performance
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="mr-2 h-6 w-6" />
            <span>Loading user details...</span>
          </div>
        ) : userDetails ? (
          <div className="space-y-6">
            {/* User Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-lg">{userDetails.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-lg">{userDetails.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Enrollments */}
            {userDetails.currentEnrollments && userDetails.currentEnrollments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Enrollments ({userDetails.currentEnrollments.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userDetails.currentEnrollments.map((enrollment, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-lg mb-1">
                            {enrollment.courseName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Enrolled on {formatDate(enrollment.enrolledAt)}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Progress
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${enrollment.progress}%` }}
                              />
                            </div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {enrollment.progress}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Course Completions */}
            <Card>
              <CardHeader>
                <CardTitle>Course Completions ({userDetails.courseCompletions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {userDetails.courseCompletions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4"></div>
                    <h3 className="text-lg font-medium mb-2">No course completions</h3>
                    <p className="text-muted-foreground">
                      This user hasn't completed any courses yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userDetails.courseCompletions.map((completion, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-lg mb-1">
                            {completion.courseName}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Completed on {formatDate(completion.completionDate)}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            Final Quiz Score
                          </p>
                          <Badge 
                            variant="secondary" 
                            className={getScoreColor(completion.finalQuizScore)}
                          >
                            {getScoreLabel(completion.finalQuizScore)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            {(userDetails.courseCompletions.length > 0 || (userDetails.currentEnrollments && userDetails.currentEnrollments.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle>Summary Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {(userDetails.currentEnrollments?.length || 0) + userDetails.courseCompletions.length}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Enrollments</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {userDetails.currentEnrollments?.length || 0}
                      </div>
                      <p className="text-sm text-muted-foreground">In Progress</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {userDetails.courseCompletions.length}
                      </div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                    
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Failed to load user details</h3>
            <p className="text-muted-foreground">
              Please try again or contact support
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}