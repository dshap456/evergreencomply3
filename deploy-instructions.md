# LMS Deployment Instructions

## 🗄️ Database Setup (Supabase Cloud)

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy your project credentials:
   - Project URL: `https://[your-project-ref].supabase.co`
   - Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 
   - Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. Apply the database schema:
   ```bash
   cd /Users/davidshapiro/Desktop/next-supabase-saas-kit-turbo/apps/web
   
   # Option A: Via CLI (recommended)
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   
   # Option B: Manual - Copy contents of supabase/migrations/20250717024704_lms-schema.sql 
   # and run in Supabase SQL Editor
   ```

## 🚀 Vercel Deployment

### Option 1: Vercel CLI (Fastest)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
cd /Users/davidshapiro/Desktop/next-supabase-saas-kit-turbo
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: your-lms-app
# - Directory: apps/web
# - Override settings? No
```

### Option 2: GitHub + Vercel (Recommended for production)
1. Push code to GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Set build settings:
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`

## 🔐 Environment Variables (Vercel Dashboard)

Add these in Vercel Project Settings > Environment Variables:

### Production Environment Variables
```bash
# Supabase (from your cloud project)
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site Configuration  
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NEXT_PUBLIC_PRODUCT_NAME=Your LMS

# Feature Flags (copy from .env)
NEXT_PUBLIC_ENABLE_THEME_TOGGLE=true
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS=true
NEXT_PUBLIC_ENABLE_TEAM_ACCOUNTS_CREATION=true
NEXT_PUBLIC_LANGUAGE_PRIORITY=application

# Auth Configuration
NEXT_PUBLIC_AUTH_PASSWORD=true
NEXT_PUBLIC_AUTH_MAGIC_LINK=false

# Optional: Email (use Supabase built-in for now)
EMAIL_SENDER="Your LMS <noreply@yourdomain.com>"
```

## ✅ Testing Your Deployed LMS

1. **Access your deployed app**: `https://your-app.vercel.app`
2. **Create an account** and sign in
3. **Create a team account** (if enabled)
4. **Navigate to**: `/home/[your-team-slug]/courses`
5. **Test the LMS features**:
   - Create a course
   - Add modules and lessons  
   - Upload videos/PDFs
   - Create quizzes with 80% pass rate
   - Set final quiz designation
   - View completion reports

## 🎯 LMS Features Ready for Testing

✅ **Course Management**: Create, edit, publish courses
✅ **Module Organization**: Logical content grouping  
✅ **Lesson Types**: Video, text, quiz, PDF assets
✅ **Video Upload**: Direct file upload with progress
✅ **Quiz System**: Multiple choice, point-based scoring
✅ **Sequential Learning**: Enforced lesson order
✅ **80% Pass Rate**: Default quiz passing requirement
✅ **Final Quiz Tracking**: Designated per course
✅ **Completion Reports**: Name, email, date, course, final score
✅ **CSV Export**: Admin download functionality
✅ **Multi-Tenant**: Team account isolation
✅ **Permissions**: Role-based access control

## 🔍 Troubleshooting

If deployment fails:
1. Check Vercel build logs for errors
2. Verify all environment variables are set
3. Ensure Supabase database schema was applied
4. Check Supabase > Authentication > Settings for correct site URL

The LMS is production-ready and fully functional!