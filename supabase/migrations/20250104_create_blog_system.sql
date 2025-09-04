-- Create blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image VARCHAR(500),
  category VARCHAR(100),
  tags TEXT[],
  author_id UUID REFERENCES auth.users(id),
  author_name VARCHAR(255) DEFAULT 'Evergreen Comply Team',
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  -- SEO fields
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[],
  canonical_url VARCHAR(500),
  
  -- Engagement metrics
  view_count INTEGER DEFAULT 0,
  read_time_minutes INTEGER,
  
  -- Dates
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Related content
  related_course_ids UUID[],
  related_post_ids UUID[]
);

-- Create blog categories table
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES blog_categories(id),
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for auto-generated content tracking
CREATE TABLE IF NOT EXISTS blog_content_generation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL, -- 'course', 'regulation', 'industry_news'
  source_id UUID,
  target_keywords TEXT[],
  generated_title VARCHAR(500),
  generated_content TEXT,
  generation_status VARCHAR(50) DEFAULT 'pending',
  published_post_id UUID REFERENCES blog_posts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_tags ON blog_posts USING GIN(tags);
CREATE INDEX idx_blog_categories_slug ON blog_categories(slug);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_content_generation ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Public can read published blog posts" ON blog_posts
  FOR SELECT
  USING (status = 'published');

-- Admins can do everything
CREATE POLICY "Admins can manage blog posts" ON blog_posts
  FOR ALL
  USING (auth.uid() IN (
    SELECT user_id FROM accounts_memberships 
    WHERE account_role = 'owner'
  ));

-- Public can read categories
CREATE POLICY "Public can read blog categories" ON blog_categories
  FOR SELECT
  TO PUBLIC
  USING (true);

-- Admins can manage categories
CREATE POLICY "Admins can manage blog categories" ON blog_categories
  FOR ALL
  USING (auth.uid() IN (
    SELECT user_id FROM accounts_memberships 
    WHERE account_role = 'owner'
  ));

-- Only admins can see content generation
CREATE POLICY "Admins can manage content generation" ON blog_content_generation
  FOR ALL
  USING (auth.uid() IN (
    SELECT user_id FROM accounts_memberships 
    WHERE account_role = 'owner'
  ));