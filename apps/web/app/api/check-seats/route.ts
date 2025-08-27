import { NextResponse } from 'next/server';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function GET() {
  const adminClient = getSupabaseServerAdminClient();
  
  const accountId = 'ba638bb1-9b90-4966-8be6-d278cc2e5120';
  const courseId = '5e6ae121-8f89-4786-95a6-1e823c21a22e';
  
  // Check if seat record exists
  const { data: seats, error } = await adminClient
    .from('course_seats')
    .select('*')
    .eq('account_id', accountId)
    .eq('course_id', courseId);
  
  // Get all seats for this account
  const { data: allSeats } = await adminClient
    .from('course_seats')
    .select('*')
    .eq('account_id', accountId);
  
  return NextResponse.json({
    specificCourseSeat: {
      found: seats && seats.length > 0,
      data: seats,
      error
    },
    allAccountSeats: {
      count: allSeats?.length || 0,
      data: allSeats
    },
    diagnosis: !seats || seats.length === 0 
      ? '❌ No seat record exists for this course! This is why total_seats is 0'
      : seats[0].total_seats === 0 
        ? '❌ Seat record exists but total_seats is set to 0'
        : '✅ Seat record exists with total_seats: ' + seats[0].total_seats
  });
}