-- Custom links for storefront link pages (Linktree-style)
CREATE TABLE public.custom_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES public.storefronts(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  url TEXT NOT NULL CHECK (char_length(url) <= 2000),
  icon TEXT DEFAULT NULL,          -- emoji or icon key
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_custom_links_storefront ON public.custom_links(storefront_id, sort_order);

-- RLS
ALTER TABLE public.custom_links ENABLE ROW LEVEL SECURITY;

-- Anyone can read active links (public link pages)
CREATE POLICY "public_read_custom_links" ON public.custom_links
  FOR SELECT USING (active = true);

-- Owner can do everything via service role (edge function handles auth)
CREATE POLICY "service_all_custom_links" ON public.custom_links
  FOR ALL USING (true);
