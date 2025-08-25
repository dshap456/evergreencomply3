import { getSupabaseServerClient } from '@kit/supabase/server-client';

export async function loadSeatData(accountId: string) {
  const client = getSupabaseServerClient();
  
  try {
    // Get all courses with seat information
    const { data: seats, error: seatsError } = await client
      .from('course_seats')
      .select(`
        id,
        course_id,
        total_seats
      `)
      .eq('account_id', accountId);

    if (seatsError) {
      console.error('Error fetching course seats:', seatsError);
      return [];
    }

    // Get course details
    const courseIds = seats?.map(s => s.course_id) || [];
    
    // If no course seats, return empty array
    if (courseIds.length === 0) {
      return [];
    }

    const { data: courses, error: coursesError } = await client
      .from('courses')
      .select('id, title, status')
      .in('id', courseIds);

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      return [];
    }

    // Get enrollment counts for each course
    const { data: enrollments, error: enrollError } = await client
      .from('course_enrollments')
      .select('course_id')
      .eq('account_id', accountId)
      .in('course_id', courseIds);

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError);
      return [];
    }

    // Get pending invitation counts for each course
    const { data: pendingInvitations, error: inviteError } = await client
      .from('course_invitations')
      .select('course_id')
      .eq('account_id', accountId)
      .in('course_id', courseIds)
      .is('accepted_at', null);

    if (inviteError) {
      console.error('Error fetching pending invitations:', inviteError);
      return [];
    }

    // Calculate enrolled seats per course
    const enrolledSeatsMap = enrollments?.reduce((acc, enrollment) => {
      acc[enrollment.course_id] = (acc[enrollment.course_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Calculate pending invitation seats per course
    const pendingSeatsMap = pendingInvitations?.reduce((acc, invitation) => {
      acc[invitation.course_id] = (acc[invitation.course_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Calculate total used seats (enrolled + pending)
    const usedSeatsMap = courseIds.reduce((acc, courseId) => {
      const enrolled = enrolledSeatsMap[courseId] || 0;
      const pending = pendingSeatsMap[courseId] || 0;
      acc[courseId] = enrolled + pending;
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
    console.error('Error in loadSeatData:', error);
    return [];
  }
}