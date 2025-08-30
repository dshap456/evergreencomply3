# Course Invitation Bug Analysis

## The Problem
When a Team Manager sends a course invitation to themselves (same email), they cannot accept it. The error is "invite not found or expired".

## Current Flow Analysis

### 1. Invitation Creation (WORKS)
- Team Manager creates invitation via `/api/send-course-invitation`
- Invitation stored in `course_invitations` table
- Email sent with link: `/auth/sign-up?invite_token={token}`

### 2. Click Link Flow (BROKEN)
When Team Manager (already authenticated) clicks the link:

#### Expected:
1. Go to `/auth/sign-up?invite_token={token}`
2. Redirect to `/auth/callback?invite_token={token}` (since authenticated)
3. Callback processes invitation
4. User enrolled in course

#### Actual:
1. Go to `/auth/sign-up?invite_token={token}`
2. Gets redirected to callback
3. **BUG**: Callback tries to check `invitations` table (line 43-47) which doesn't exist
4. Token considered invalid, no processing happens
5. User redirected to home without enrollment

## Root Causes Found

### Bug #1: Non-existent table reference
File: `/apps/web/app/auth/callback/route.ts`
Line 43-47 tries to query `invitations` table which doesn't exist.
**Fixed**: Removed the check for non-existent team invitations table.

### Bug #2: Possible authentication flow issue
When already authenticated users click invite link, they might not be properly redirected with the token preserved.

## Solution Steps

1. ✅ Fixed callback to not check non-existent `invitations` table
2. Need to ensure token is preserved through authentication redirects
3. Need to verify the sign-up page properly redirects authenticated users

## Test Case
- User: testbrittnay@gmail.com
- Token: 6bd1a310-3e2f-4b36-a8a3-e753150bcc3b
- Course: DOT HAZMAT - Advanced Awareness
- Status: Not accepted yet