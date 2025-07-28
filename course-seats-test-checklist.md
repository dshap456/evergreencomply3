# Course Seat Management Test Checklist

## Prerequisites
- [ ] Local Supabase running (`pnpm supabase:web:start`)
- [ ] Dev server running (`pnpm dev`)
- [ ] Team account exists with you as owner
- [ ] At least one published course exists

## Test Setup
- [ ] Run SQL to create course seats for your team
- [ ] Note your team slug and course IDs

## Feature Tests

### 1. Seat Management Page
- [ ] Navigate to `/home/[team-slug]/courses/seats`
- [ ] Page loads without errors
- [ ] Shows course name, total/used/available seats

### 2. Update Seats
- [ ] Click "Update Seats" button
- [ ] Modal opens with current seat count
- [ ] Can increase seat count
- [ ] Cannot decrease below used seats
- [ ] Save updates the table

### 3. Invite Team Member
- [ ] Click "Invite Member" (should be enabled if seats available)
- [ ] Enter email address
- [ ] Submit creates invitation
- [ ] Check `course_invitations` table for record

### 4. Invitation Flow
- [ ] Get invite token from database
- [ ] Visit `/join/course?token=XXX` in incognito
- [ ] Shows course and team name
- [ ] "Sign In to Accept" if not logged in
- [ ] After sign in, can accept invitation
- [ ] Redirects to course after acceptance

### 5. View Enrollments
- [ ] Click "View Enrollments"
- [ ] Shows all enrolled team members
- [ ] Displays: name, email, progress, status
- [ ] Shows enrollment date

### 6. Remove Member
- [ ] Click "Remove" next to a member
- [ ] Confirmation prompt appears
- [ ] Member removed from course
- [ ] Seat becomes available again

### 7. Team Owner Enrollment
- [ ] As team owner, go to `/home/(user)/courses`
- [ ] Enroll in the same course
- [ ] Verify it uses a seat from the team's allocation
- [ ] Shows in team enrollments list

## Edge Cases to Test
- [ ] Try inviting same email twice
- [ ] Try accepting expired invitation
- [ ] Try removing yourself as owner
- [ ] Try inviting with 0 available seats

## Check Database Tables
- [ ] `course_seats`: Has correct total_seats
- [ ] `course_invitations`: Has pending/accepted invitations
- [ ] `course_enrollments`: Has account_id set for team enrollments
- [ ] `team_course_enrollments` view: Shows correct data