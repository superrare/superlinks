-- Page view analytics
CREATE TABLE public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES public.storefronts(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  referrer TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
);

CREATE INDEX idx_page_views_storefront ON public.page_views(storefront_id, viewed_at DESC);

-- Aggregated view for fast counts per storefront
CREATE OR REPLACE VIEW public.page_view_counts AS
SELECT
  storefront_id,
  COUNT(*) AS total_views,
  COUNT(*) FILTER (WHERE viewed_at > now() - INTERVAL '24 hours') AS views_24h,
  COUNT(*) FILTER (WHERE viewed_at > now() - INTERVAL '7 days') AS views_7d,
  MAX(viewed_at) AS last_viewed_at
FROM public.page_views
GROUP BY storefront_id;

-- RLS: service role inserts (via edge function), owners read their own
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert page views"
  ON public.page_views FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Storefront owners can view their page views"
  ON public.page_views FOR SELECT
  USING (
    storefront_id IN (
      SELECT id FROM public.storefronts WHERE owner_id = auth.uid()
    )
  );
