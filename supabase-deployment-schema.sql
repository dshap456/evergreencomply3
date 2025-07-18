-- =====================================================
-- COMPLETE SUPABASE DEPLOYMENT SCHEMA FOR LMS
-- Run this entire script in your Supabase SQL Editor
-- =====================================================

-- Enable extensions
create extension if not exists "uuid-ossp";

-- ===================
-- ENUMS
-- ===================

create type public.app_permissions as enum(
  'roles.manage',
  'billing.manage',
  'settings.manage',
  'members.manage',
  'invites.manage'
);

create type public.subscription_status as ENUM(
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused'
);

create type public.payment_status as ENUM('pending', 'succeeded', 'failed');
create type public.billing_provider as ENUM('stripe', 'lemon-squeezy', 'paddle');
create type public.subscription_item_type as ENUM('flat', 'per_seat', 'metered');
create type public.invitation as (email text, role varchar(50));

-- LMS Enums
create type public.content_type as enum('video', 'text', 'quiz', 'asset');
create type public.lesson_status as enum('not_started', 'in_progress', 'completed');

-- ===================
-- CORE TABLES
-- ===================

-- Accounts table (core multi-tenancy)
create table if not exists public.accounts (
  id uuid unique not null default uuid_generate_v4(),
  primary_owner_user_id uuid references auth.users on delete cascade not null default auth.uid(),
  name varchar(255) not null,
  slug text unique,
  email varchar(320) unique,
  is_personal_account boolean default false not null,
  updated_at timestamp with time zone,
  created_at timestamp with time zone,
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
  picture_url varchar(1000),
  public_data jsonb default '{}'::jsonb not null,
  primary key (id)
);

-- Roles table
create table if not exists public.roles (
  id bigint generated by default as identity primary key,
  name varchar(50) unique not null,
  hierarchy_level int not null,
  description text
);

-- Insert default roles
insert into public.roles (name, hierarchy_level, description) values
  ('owner', 1, 'Account owner with full permissions'),
  ('admin', 2, 'Administrator with most permissions'),
  ('member', 3, 'Regular member with basic permissions')
on conflict (name) do nothing;

-- Account memberships
create table if not exists public.accounts_memberships (
  user_id uuid references auth.users on delete cascade not null,
  account_id uuid references public.accounts(id) on delete cascade not null,
  account_role varchar(50) references public.roles(name) not null,
  created_at timestamptz default current_timestamp not null,
  updated_at timestamptz default current_timestamp not null,
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
  primary key (user_id, account_id)
);

-- Role permissions
create table if not exists public.role_permissions (
  id bigint generated by default as identity primary key,
  role varchar(50) references public.roles(name) not null,
  permission public.app_permissions not null,
  unique (role, permission)
);

-- Insert default permissions
insert into public.role_permissions (role, permission) values
  ('owner', 'roles.manage'),
  ('owner', 'billing.manage'),
  ('owner', 'settings.manage'),
  ('owner', 'members.manage'),
  ('owner', 'invites.manage'),
  ('admin', 'settings.manage'),
  ('admin', 'members.manage'),
  ('admin', 'invites.manage')
on conflict (role, permission) do nothing;

-- ===================
-- LMS TABLES
-- ===================

-- Courses
create table if not exists public.courses (
  id uuid default uuid_generate_v4() primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  title varchar(255) not null,
  description text,
  sku varchar(100) unique,
  price decimal(10,2) default 0.00,
  is_published boolean default false,
  sequential_completion boolean default true,
  passing_score integer default 80 check (passing_score >= 0 and passing_score <= 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

-- Course Modules
create table if not exists public.course_modules (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  title varchar(255) not null,
  description text,
  order_index integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(course_id, order_index)
);

-- Lessons
create table if not exists public.lessons (
  id uuid default uuid_generate_v4() primary key,
  module_id uuid not null references public.course_modules(id) on delete cascade,
  title varchar(255) not null,
  description text,
  content_type public.content_type not null default 'video',
  video_url text,
  asset_url text,
  content text,
  order_index integer not null default 0,
  is_final_quiz boolean default false,
  passing_score integer default 80 check (passing_score >= 0 and passing_score <= 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(module_id, order_index)
);

-- Quiz Questions
create table if not exists public.quiz_questions (
  id uuid default uuid_generate_v4() primary key,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  question text not null,
  question_type varchar(50) default 'multiple_choice',
  options jsonb,
  correct_answer text not null,
  points integer default 1,
  order_index integer not null default 0,
  created_at timestamptz default now(),
  unique(lesson_id, order_index)
);

-- Course Enrollments
create table if not exists public.course_enrollments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  progress_percentage integer default 0 check (progress_percentage >= 0 and progress_percentage <= 100),
  final_score decimal(5,2),
  unique(user_id, course_id)
);

-- Lesson Progress
create table if not exists public.lesson_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status public.lesson_status default 'not_started',
  completed_at timestamptz,
  time_spent integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, lesson_id)
);

-- Quiz Attempts
create table if not exists public.quiz_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  answers jsonb not null,
  score decimal(5,2) not null,
  total_points integer not null,
  passed boolean not null,
  attempt_number integer default 1,
  created_at timestamptz default now()
);

-- Course Completions (tracking table with all required fields)
create table if not exists public.course_completions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  enrollment_id uuid not null references public.course_enrollments(id) on delete cascade,
  student_name varchar(255) not null,
  student_email varchar(320) not null,
  course_name varchar(255) not null,
  final_quiz_score decimal(5,2),
  final_quiz_passed boolean default false,
  completion_percentage integer default 100,
  completed_at timestamptz default now(),
  certificate_url text,
  unique(user_id, course_id)
);

-- ===================
-- HELPER FUNCTIONS
-- ===================

-- Function to check if user has role on account
create or replace function public.has_role_on_account(
  account_id uuid,
  account_role varchar(50) default null
) returns boolean language sql security definer
set search_path = '' as $$
  select exists(
    select 1
    from public.accounts_memberships membership
    where membership.user_id = auth.uid()
      and membership.account_id = has_role_on_account.account_id
      and (membership.account_role = has_role_on_account.account_role or has_role_on_account.account_role is null)
  );
$$;

-- Function to check permissions
create or replace function public.has_permission(
  user_id uuid,
  account_id uuid,
  permission_name public.app_permissions
) returns boolean
set search_path = '' as $$
begin
  return exists(
    select 1
    from public.accounts_memberships
    join public.role_permissions on accounts_memberships.account_role = role_permissions.role
    where accounts_memberships.user_id = has_permission.user_id
      and accounts_memberships.account_id = has_permission.account_id
      and role_permissions.permission = has_permission.permission_name
  );
end;
$$ language plpgsql;

-- ===================
-- ROW LEVEL SECURITY
-- ===================

-- Enable RLS
alter table public.accounts enable row level security;
alter table public.accounts_memberships enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.course_completions enable row level security;

-- Accounts policies
create policy "accounts_read" on public.accounts for select
  to authenticated using (
    auth.uid() = primary_owner_user_id or
    public.has_role_on_account(id)
  );

create policy "accounts_manage" on public.accounts for all
  to authenticated using (
    auth.uid() = primary_owner_user_id
  );

-- Memberships policies
create policy "memberships_read" on public.accounts_memberships for select
  to authenticated using (
    user_id = auth.uid() or
    public.has_role_on_account(account_id)
  );

-- Courses policies
create policy "courses_read" on public.courses for select
  to authenticated using (
    public.has_role_on_account(account_id) or
    (is_published and exists (
      select 1 from public.course_enrollments 
      where course_id = courses.id and user_id = auth.uid()
    ))
  );

create policy "courses_manage" on public.courses for all
  to authenticated using (
    public.has_permission(auth.uid(), account_id, 'settings.manage'::public.app_permissions)
  );

-- Course modules policies
create policy "course_modules_read" on public.course_modules for select
  to authenticated using (
    exists (
      select 1 from public.courses c 
      where c.id = course_modules.course_id 
      and (
        public.has_role_on_account(c.account_id) or
        (c.is_published and exists (
          select 1 from public.course_enrollments 
          where course_id = c.id and user_id = auth.uid()
        ))
      )
    )
  );

create policy "course_modules_manage" on public.course_modules for all
  to authenticated using (
    exists (
      select 1 from public.courses c 
      where c.id = course_modules.course_id 
      and public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
    )
  );

-- Lessons policies
create policy "lessons_read" on public.lessons for select
  to authenticated using (
    exists (
      select 1 from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = lessons.module_id 
      and (
        public.has_role_on_account(c.account_id) or
        (c.is_published and exists (
          select 1 from public.course_enrollments 
          where course_id = c.id and user_id = auth.uid()
        ))
      )
    )
  );

create policy "lessons_manage" on public.lessons for all
  to authenticated using (
    exists (
      select 1 from public.course_modules cm
      join public.courses c on c.id = cm.course_id
      where cm.id = lessons.module_id 
      and public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
    )
  );

-- Quiz questions policies
create policy "quiz_questions_read" on public.quiz_questions for select
  to authenticated using (
    exists (
      select 1 from public.lessons l
      join public.course_modules cm on cm.id = l.module_id
      join public.courses c on c.id = cm.course_id
      where l.id = quiz_questions.lesson_id 
      and (
        public.has_role_on_account(c.account_id) or
        (c.is_published and exists (
          select 1 from public.course_enrollments 
          where course_id = c.id and user_id = auth.uid()
        ))
      )
    )
  );

create policy "quiz_questions_manage" on public.quiz_questions for all
  to authenticated using (
    exists (
      select 1 from public.lessons l
      join public.course_modules cm on cm.id = l.module_id
      join public.courses c on c.id = cm.course_id
      where l.id = quiz_questions.lesson_id 
      and public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
    )
  );

-- Course enrollments policies
create policy "course_enrollments_read" on public.course_enrollments for select
  to authenticated using (
    user_id = auth.uid() or
    exists (
      select 1 from public.courses c 
      where c.id = course_enrollments.course_id 
      and public.has_role_on_account(c.account_id)
    )
  );

create policy "course_enrollments_insert" on public.course_enrollments for insert
  to authenticated with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.courses c 
      where c.id = course_enrollments.course_id 
      and c.is_published = true
    )
  );

-- Lesson progress policies
create policy "lesson_progress_manage" on public.lesson_progress for all
  to authenticated using (
    user_id = auth.uid() or
    exists (
      select 1 from public.lessons l
      join public.course_modules cm on cm.id = l.module_id
      join public.courses c on c.id = cm.course_id
      where l.id = lesson_progress.lesson_id 
      and public.has_role_on_account(c.account_id)
    )
  );

-- Quiz attempts policies
create policy "quiz_attempts_manage" on public.quiz_attempts for all
  to authenticated using (
    user_id = auth.uid() or
    exists (
      select 1 from public.lessons l
      join public.course_modules cm on cm.id = l.module_id
      join public.courses c on c.id = cm.course_id
      where l.id = quiz_attempts.lesson_id 
      and public.has_role_on_account(c.account_id)
    )
  );

-- Course completions policies
create policy "course_completions_read" on public.course_completions for select
  to authenticated using (
    user_id = auth.uid() or
    exists (
      select 1 from public.courses c 
      where c.id = course_completions.course_id 
      and public.has_role_on_account(c.account_id)
    )
  );

create policy "course_completions_insert" on public.course_completions for insert
  to authenticated with check (
    user_id = auth.uid()
  );

-- ===================
-- STORAGE SETUP
-- ===================

-- Create storage bucket for course content
insert into storage.buckets (id, name, public)
values ('course-content', 'course-content', true)
on conflict (id) do nothing;

-- Storage RLS policy
create policy "course_content_access" on storage.objects for all
using (
  bucket_id = 'course-content'
  and (
    -- Course creators can manage their content
    exists (
      select 1 from public.courses c
      where (
        split_part(name, '/', 1) = c.account_id::text
        and public.has_permission(auth.uid(), c.account_id, 'settings.manage'::public.app_permissions)
      )
    )
    or
    -- Enrolled students can read content
    exists (
      select 1 from public.courses c
      join public.course_enrollments ce on ce.course_id = c.id
      where (
        split_part(name, '/', 1) = c.account_id::text
        and ce.user_id = auth.uid()
        and c.is_published = true
      )
    )
  )
);

-- ===================
-- TRIGGERS & FUNCTIONS
-- ===================

-- Function to auto-create personal account for new users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  user_name text;
  picture_url text;
begin
  if new.raw_user_meta_data ->> 'name' is not null then
    user_name := new.raw_user_meta_data ->> 'name';
  end if;

  if user_name is null and new.email is not null then
    user_name := split_part(new.email, '@', 1);
  end if;

  if user_name is null then
    user_name := '';
  end if;

  if new.raw_user_meta_data ->> 'avatar_url' is not null then
    picture_url := new.raw_user_meta_data ->> 'avatar_url';
  else
    picture_url := null;
  end if;

  insert into public.accounts(
    id,
    primary_owner_user_id,
    name,
    is_personal_account,
    picture_url,
    email
  )
  values (
    new.id,
    new.id,
    user_name,
    true,
    picture_url,
    new.email
  );

  return new;
end;
$$;

-- Trigger for new users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Grant permissions
grant execute on function public.has_role_on_account(uuid, varchar) to authenticated;
grant execute on function public.has_permission(uuid, uuid, public.app_permissions) to authenticated;

-- Grant table permissions
grant select, insert, update, delete on table public.accounts to authenticated;
grant select, insert, update, delete on table public.accounts_memberships to authenticated;
grant select, insert, update, delete on table public.courses to authenticated;
grant select, insert, update, delete on table public.course_modules to authenticated;
grant select, insert, update, delete on table public.lessons to authenticated;
grant select, insert, update, delete on table public.quiz_questions to authenticated;
grant select, insert, update, delete on table public.course_enrollments to authenticated;
grant select, insert, update, delete on table public.lesson_progress to authenticated;
grant select, insert, update, delete on table public.quiz_attempts to authenticated;
grant select, insert, update, delete on table public.course_completions to authenticated;
grant select on table public.roles to authenticated;
grant select on table public.role_permissions to authenticated;

-- ===================
-- INDEXES
-- ===================

create index if not exists idx_accounts_primary_owner on public.accounts(primary_owner_user_id);
create index if not exists idx_courses_account_id on public.courses(account_id);
create index if not exists idx_courses_published on public.courses(is_published);
create index if not exists idx_course_modules_course_id on public.course_modules(course_id);
create index if not exists idx_lessons_module_id on public.lessons(module_id);
create index if not exists idx_quiz_questions_lesson_id on public.quiz_questions(lesson_id);
create index if not exists idx_course_enrollments_user_id on public.course_enrollments(user_id);
create index if not exists idx_course_enrollments_course_id on public.course_enrollments(course_id);
create index if not exists idx_lesson_progress_user_id on public.lesson_progress(user_id);
create index if not exists idx_lesson_progress_lesson_id on public.lesson_progress(lesson_id);
create index if not exists idx_quiz_attempts_user_lesson on public.quiz_attempts(user_id, lesson_id);
create index if not exists idx_course_completions_user_id on public.course_completions(user_id);
create index if not exists idx_course_completions_course_id on public.course_completions(course_id);

-- ===================
-- COMPLETED
-- ===================
-- Your LMS database is now ready!
-- Next steps:
-- 1. Test by creating a user account
-- 2. Create a team account
-- 3. Navigate to /home/[team-slug]/courses
-- 4. Start creating courses!