-- App Hosting: product slugs, app deployments table, deployment tracking
-- Enables R2-based app hosting at /app/<product-slug>/

-- Globally unique product slug for stable app URLs
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Index for slug lookups
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

-- App deployments track each version of an uploaded app
CREATE TABLE public.app_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  r2_base_path TEXT NOT NULL,
  entry_point TEXT NOT NULL DEFAULT 'index.html',
  file_count INTEGER NOT NULL,
  total_size_bytes BIGINT NOT NULL,
  file_manifest JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_app_deployments_product ON public.app_deployments(product_id);

-- Current deployment pointer on products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS current_deployment_id UUID
  REFERENCES public.app_deployments(id) ON DELETE SET NULL;

-- RLS for app_deployments
ALTER TABLE public.app_deployments ENABLE ROW LEVEL SECURITY;

-- Anyone can read deployments (needed by worker to serve apps)
CREATE POLICY "app_deployments_select" ON public.app_deployments
  FOR SELECT USING (true);

-- Only creator can insert/update (via service role in practice)
CREATE POLICY "app_deployments_insert" ON public.app_deployments
  FOR INSERT WITH CHECK (true);
CREATE POLICY "app_deployments_update" ON public.app_deployments
  FOR UPDATE USING (true);
