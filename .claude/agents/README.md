# Claude Code Custom Agents

This directory contains custom agents for Claude Code that provide specialized expertise for different aspects of the application.

## Available Agents

### 1. **supabase-migration.md**
Expert in Supabase database migrations and schema design. Use when:
- Creating new database tables or migrations
- Setting up RLS policies
- Designing database schema
- Troubleshooting migration issues

### 2. **rls-debugger.md**
Specialist in debugging Row Level Security (RLS) issues. Use when:
- Users report "permission denied" errors
- Debugging access control problems
- Testing RLS policies
- Implementing complex authorization logic

### 3. **lms-expert.md**
Expert in Learning Management System features. Use when:
- Building course-related features
- Implementing progress tracking
- Working with video players or quizzes
- Handling enrollment and completion logic

### 4. **performance-optimizer.md**
Specialist in application performance. Use when:
- Optimizing slow queries
- Improving page load times
- Reducing bundle sizes
- Implementing caching strategies

### 5. **ui-ux-expert.md**
Expert in UI/UX design and implementation. Use when:
- Creating new UI components
- Improving mobile responsiveness
- Ensuring accessibility
- Implementing animations

## How to Use

These agents are automatically available in Claude Code. You can reference them by mentioning their area of expertise in your prompts.

Example prompts:
- "Help me debug why users can't see their enrolled courses" (triggers RLS debugger)
- "I need to optimize the course listing page performance" (triggers performance optimizer)
- "Create a mobile-friendly quiz interface" (triggers UI/UX expert)

## Adding New Agents

To add a new agent:
1. Create a new `.md` file in this directory
2. Start with a clear title and description
3. Include specific expertise areas
4. Add common patterns and best practices
5. List typical issues and solutions

## Project-Specific Context

These agents are configured specifically for:
- Next.js 15 with App Router
- Supabase with RLS
- Multi-tenant LMS architecture
- Tailwind CSS with shadcn/ui components