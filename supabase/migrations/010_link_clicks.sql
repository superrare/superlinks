-- Link click analytics
CREATE TABLE public.link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.custom_links(id) ON DELETE CASCADE,
  storefront_id UUID NOT NULL REFERENCES public.storefronts(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  referrer TEXT DEFAULT NULL,
  user_agent TEXT DEFAULT NULL
);

CREATE INDEX idx_link_clicks_link ON public.link_clicks(link_id, clicked_at DESC);
CREATE INDEX idx_link_clicks_storefront ON public.link_clicks(storefront_id, clicked_at DESC);

-- Materialized view for fast counts per link
CREATE OR REPLACE VIEW public.link_click_counts AS
SELECT
  link_id,
  COUNT(*) AS total_clicks,
  COUNT(*) FILTER (WHERE clicked_at > now() - INTERVAL '24 hours') AS clicks_24h,
  COUNT(*) FILTER (WHERE clicked_at > now() - INTERVAL '7 days') AS clicks_7d,
  MAX(clicked_at) AS last_clicked_at
FROM public.link_clicks
GROUP BY link_id;

-- RLS: service role inserts (via edge function), owners read their own
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert link clicks"
  ON public.link_clicks FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Storefront owners can view their link clicks"
  ON public.link_clicks FOR SELECT
  USING (
    storefront_id IN (
      SELECT id FROM public.storefronts WHERE owner_id = auth.uid()
    )
  );
