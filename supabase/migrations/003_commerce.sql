-- Creator Commerce: storefronts, products, and purchase receipts

-- Storefronts
CREATE TABLE public.storefronts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products (digital goods)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES public.storefronts(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  price TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('pdf', 'video', 'image', 'bundle', 'other')),
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  preview_path TEXT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unlisted', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase receipts
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id),
  seller_id UUID NOT NULL REFERENCES public.profiles(id),
  price_paid TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  x402_receipt JSONB,
  nft_token_id TEXT,
  nft_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_storefronts_owner ON public.storefronts(owner_id);
CREATE INDEX idx_storefronts_slug ON public.storefronts(slug);
CREATE INDEX idx_products_storefront ON public.products(storefront_id);
CREATE INDEX idx_products_creator ON public.products(creator_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_content_type ON public.products(content_type);
CREATE INDEX idx_purchases_buyer ON public.purchases(buyer_id);
CREATE INDEX idx_purchases_product ON public.purchases(product_id);
CREATE INDEX idx_purchases_tx ON public.purchases(tx_hash);

-- RLS
ALTER TABLE public.storefronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Storefronts: anyone can read, owner manages
CREATE POLICY "storefronts_select" ON public.storefronts
  FOR SELECT USING (true);
CREATE POLICY "storefronts_insert" ON public.storefronts
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "storefronts_update" ON public.storefronts
  FOR UPDATE USING (auth.uid() = owner_id);

-- Products: anyone can read active, creator manages
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (status = 'active' OR auth.uid() = creator_id);
CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (auth.uid() = creator_id);

-- Purchases: buyer and seller can see their own, edge function inserts via service role
CREATE POLICY "purchases_select" ON public.purchases
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "purchases_insert" ON public.purchases
  FOR INSERT WITH CHECK (true);

-- Storage bucket for product files (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('commerce-content', 'commerce-content', false)
  ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('commerce-previews', 'commerce-previews', true)
  ON CONFLICT DO NOTHING;
