# LMS SaaS - Context for Claude Code

## CRITICAL: How to Work on This Project

**BEFORE WRITING ANY CODE:**
1. Think deeply about the problem - use as many tokens as needed to be precise
2. Ask clarifying questions about:
   - What the current implementation looks like
   - What specific behavior is expected
   - Which files are already involved
   - Whether there are existing patterns to follow
3. Consider mobile-first for ALL UI changes

**GENERAL APPROACH:**
- Think carefully and only action the specific task given
- Provide the most precise and elegant solution
- Change as little code as possible
- Prefer surgical fixes over refactoring
- Don't add features or improvements unless explicitly asked

## What We're Building
**LMS Platform** - I deploy custom courses, users can purchase and enroll. Mobile-first always.

## User Roles
1. **Super Admin** (me) - Full access to everything
2. **Team/Organization Learner** - Part of an organization account
3. **Individual Learner** - Personal account

## Tech Stack (Confirmed)
- **Database:** Supabase (PostgreSQL with RLS)
- **Auth:** Supabase Auth
- **Hosting:** Vercel
- **Email:** Resend
- **Payments:** Stripe
- **MCP Servers:** Configured for Supabase and Vercel

## KILLER BUG - Critical Pattern for Admin Operations

### The Problem
When admin tries to enroll users or look up user data:
- RLS policies block admin from seeing other users' accounts
- Server Components give cryptic errors with no debugging info
- The is_super_admin() function requires MFA (AAL2) authentication level
- Mix of JWT roles + RLS policies creates unpredictable behavior

### The Solution (Verified Working Pattern)
```javascript
// ALWAYS use this pattern for admin operations:

// 1. Admin client for lookups (bypasses RLS)
const adminClient = getSupabaseServerAdminClient();

// 2. Regular client for inserts (respects policies)  
const client = getSupabaseServerClient();

// Example that works:
const { data: userAccount } = await adminClient
  .from('accounts')
  .select('primary_owner_user_id')
  .eq('email', userEmail);

const { data: enrollment } = await client
  .from('course_enrollments')
  .insert({...});
```

### Key Lessons
- Remove wrapper functions (like enhanceAction) for better error messages
- Always check both auth.users AND accounts tables
- When data isn't saving, check if RLS is blocking the operation

## Known Facts
- We have recurring issues with things not saving properly
- Mobile-first is required for all UI
- Three user role types exist
- Supabase RLS causes admin lookup issues (solved with admin client pattern)

## Questions Claude Code Should Ask

**IMPORTANT:** If you feel unsure about a task or the requirements aren't completely clear, ASK QUESTIONS before diving into implementation. It's better to clarify than to make assumptions.

Before implementing anything:
1. What does the current implementation look like?
2. What files/tables are already in place?
3. What's the specific expected behavior?
4. Is there an existing pattern to follow?

For database operations:
1. Should this use admin or regular client?
2. What RLS policies might apply?

For UI changes:
1. How should this behave on mobile?

## Git & Deployment

When we're discussing committing changes:
- Claude Code can commit directly to GitHub/remote repository
- Don't hesitate to push changes when appropriate
- If the context involves finalizing features or deploying, feel free to commit and push
- Always create clear, descriptive commit messages

---
*Goal: Ship a working LMS. Surgical fixes only. Change as little as possible.*