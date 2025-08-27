-- Create table to log webhook calls for debugging
CREATE TABLE IF NOT EXISTS public.webhook_test_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL,
  endpoint TEXT,
  has_signature BOOLEAN,
  event_type TEXT,
  event_id TEXT,
  session_id TEXT,
  body_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow service role to insert
ALTER TABLE public.webhook_test_logs ENABLE ROW LEVEL SECURITY;

-- Simple policy for service role
CREATE POLICY "Service role can do everything" ON public.webhook_test_logs
  FOR ALL 
  USING (true)
  WITH CHECK (true);