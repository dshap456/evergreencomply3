# Course Slug Implementation Guide

## Overview
This implementation adds a slug-based system to dynamically link frontend course pages with database courses. This eliminates hardcoded course data and allows for easy course management.

## What Was Changed

### 1. Database Migration
- Added `slug` column to `courses` table
- Created auto-generation function for slugs based on course titles
- Added triggers to auto-generate slugs on insert/update
- Updated existing courses with appropriate slugs:
  - `dot-hazmat` for DOT HAZMAT courses
  - `advanced-hazmat` for Advanced HAZMAT courses
  - `epa-rcra` for EPA RCRA courses

### 2. Dynamic Course Pages
- Created `/app/courses/[slug]/page.tsx` - a single dynamic page that handles ALL courses
- Course data is fetched from database based on slug
- SEO metadata is generated dynamically
- Course-specific content (curriculum, features) can be extended

### 3. Cart System Update
- Replaced hardcoded `AVAILABLE_COURSES` with database queries
- Cart now fetches real course data including prices
- Cart items use course UUIDs (not slugs) for reliability

## How to Deploy

1. **Run the database migration**:
   ```sql
   -- In Supabase SQL Editor, run:
   -- /apps/web/supabase/migrations/20250205_add_course_slug_field.sql
   ```

2. **Verify slugs were created**:
   ```sql
   -- Run the verification script:
   -- /verify-course-slugs.sql
   ```

3. **Deploy the code changes**

## How It Works

### Adding a New Course
1. Create course in admin dashboard with title "OSHA Forklift Safety"
2. Slug auto-generates as "osha-forklift-safety"
3. Course immediately available at `/courses/osha-forklift-safety`
4. No code changes needed!

### Course URLs
- Frontend: `/courses/[slug]` (e.g., `/courses/dot-hazmat`)
- Database: Looks up course by slug
- Cart: Stores course UUID for reliability

### Benefits
- **Single source of truth** - Database controls everything
- **SEO-friendly URLs** - Clean slugs instead of UUIDs
- **No hardcoding** - Add/edit courses without touching code
- **Flexible** - Change titles without breaking URLs

## Next Steps (Optional)
1. Move course content (curriculum, features) to database
2. Add course images to Supabase storage
3. Create admin UI for managing course slugs
4. Add redirects for old static URLs to new dynamic ones

## Important Notes
- Slugs must be unique across all courses
- Changing a slug will break existing links (consider redirects)
- Cart uses UUIDs internally, so slug changes won't break purchases
- The slug connects everything: Database ↔ URLs ↔ Cart