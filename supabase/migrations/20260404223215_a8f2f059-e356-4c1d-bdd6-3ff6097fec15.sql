
-- Enums
CREATE TYPE public.trigger_type AS ENUM ('prefix', 'emoji');
CREATE TYPE public.model_type AS ENUM ('sonnet', 'opus');
CREATE TYPE public.handler_type AS ENUM ('hubspot', 'web_search', 'passthrough', 'custom');
CREATE TYPE public.processing_mode AS ENUM ('sync', 'async');
CREATE TYPE public.connector_type AS ENUM ('slack', 'anthropic', 'hubspot', 'web_search', 'custom');
CREATE TYPE public.connector_status AS ENUM ('configured', 'not_configured', 'error');
CREATE TYPE public.activity_status AS ENUM ('success', 'error', 'timeout', 'rate_limited');
CREATE TYPE public.job_status AS ENUM ('queued', 'running', 'completed', 'failed');

-- 1. users
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. bots
CREATE TABLE public.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  slack_channel_id VARCHAR(50),
  trigger_pattern TEXT,
  trigger_type public.trigger_type NOT NULL,
  system_prompt TEXT,
  model public.model_type NOT NULL DEFAULT 'sonnet',
  handler_type public.handler_type NOT NULL,
  processing_mode public.processing_mode NOT NULL DEFAULT 'sync',
  is_active BOOLEAN NOT NULL DEFAULT false,
  acknowledgment_message TEXT,
  escalation_user_id TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. connectors
CREATE TABLE public.connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  connector_type public.connector_type NOT NULL,
  vault_key VARCHAR(200),
  is_shared BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  status public.connector_status NOT NULL DEFAULT 'not_configured',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. bot_connectors
CREATE TABLE public.bot_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  connector_id UUID NOT NULL REFERENCES public.connectors(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bot_id, connector_id)
);

-- 5. tool_definitions
CREATE TABLE public.tool_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  tool_name VARCHAR(100) NOT NULL,
  tool_description TEXT,
  input_schema JSONB,
  handler_type public.handler_type NOT NULL,
  handler_config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. activity_log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  bot_name VARCHAR(200),
  slack_user_id VARCHAR(50),
  slack_user_name VARCHAR(200),
  slack_channel_id VARCHAR(50),
  query_text TEXT,
  response_text TEXT,
  status public.activity_status NOT NULL,
  duration_ms INTEGER,
  model_used VARCHAR(50),
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_usd DECIMAL(10,6),
  tool_calls JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  status public.job_status NOT NULL DEFAULT 'queued',
  slack_channel_id VARCHAR(50),
  slack_thread_ts VARCHAR(50),
  slack_user_id VARCHAR(50),
  query_text TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 8. audit_log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  before_state JSONB,
  after_state JSONB,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bots_slack_channel_id ON public.bots(slack_channel_id);
CREATE INDEX idx_bots_is_active ON public.bots(is_active);
CREATE INDEX idx_bot_connectors_bot_id ON public.bot_connectors(bot_id);
CREATE INDEX idx_bot_connectors_connector_id ON public.bot_connectors(connector_id);
CREATE INDEX idx_tool_definitions_bot_id ON public.tool_definitions(bot_id);
CREATE INDEX idx_activity_log_bot_id ON public.activity_log(bot_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at);
CREATE INDEX idx_activity_log_status ON public.activity_log(status);
CREATE INDEX idx_jobs_bot_id ON public.jobs(bot_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_bots_updated_at BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_connectors_updated_at BEFORE UPDATE ON public.connectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER tr_tool_definitions_updated_at BEFORE UPDATE ON public.tool_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS (policies created in P3)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
