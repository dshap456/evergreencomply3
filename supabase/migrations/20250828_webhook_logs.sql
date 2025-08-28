-- Create webhook_logs table for debugging
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_name TEXT NOT NULL,
  called_at TIMESTAMPTZ NOT NULL,
  url TEXT,
  headers JSONB,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_webhook_logs_called_at ON webhook_logs(called_at DESC);
CREATE INDEX idx_webhook_logs_webhook_name ON webhook_logs(webhook_name);
