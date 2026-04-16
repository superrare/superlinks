-- App products: extend content_type, add entry_point, create storage bucket

-- Allow 'app' as a content type
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_content_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_content_type_check
  CHECK (content_type IN ('pdf', 'video', 'image', 'bundle', 'other', 'app'));

-- Entry point file for app products (default index.html)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS entry_point TEXT DEFAULT 'index.html';

-- Private storage bucket for extracted app files (served through edge function)
INSERT INTO storage.buckets (id, name, public) VALUES ('commerce-apps', 'commerce-apps', false)
  ON CONFLICT DO NOTHING;

-- Service-role storage policies for commerce-apps bucket
CREATE POLICY "commerce_apps_service_insert" ON storage.objects
  FOR INSERT TO service_role WITH CHECK (bucket_id = 'commerce-apps');
CREATE POLICY "commerce_apps_service_select" ON storage.objects
  FOR SELECT TO service_role USING (bucket_id = 'commerce-apps');
CREATE POLICY "commerce_apps_service_delete" ON storage.objects
  FOR DELETE TO service_role USING (bucket_id = 'commerce-apps');
