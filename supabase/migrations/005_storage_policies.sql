-- Storage policies for public read access and service role inserts

-- Public read on preview/asset buckets
CREATE POLICY "public_read_commerce_previews" ON storage.objects
  FOR SELECT USING (bucket_id = 'commerce-previews');

CREATE POLICY "public_read_storefront_assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'storefront-assets');

-- Allow inserts (edge functions use service role, but policy still needed)
CREATE POLICY "service_insert_commerce_previews" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'commerce-previews');

CREATE POLICY "service_insert_commerce_content" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'commerce-content');

CREATE POLICY "service_insert_storefront_assets" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'storefront-assets');

-- Allow service role to read private content bucket (for signed URLs)
CREATE POLICY "service_read_commerce_content" ON storage.objects
  FOR SELECT USING (bucket_id = 'commerce-content');

-- Allow delete on storefront assets (needed for re-uploading avatar/banner)
CREATE POLICY "service_delete_storefront_assets" ON storage.objects
  FOR DELETE USING (bucket_id = 'storefront-assets');

-- Allow update on storefront assets
CREATE POLICY "service_update_storefront_assets" ON storage.objects
  FOR UPDATE USING (bucket_id = 'storefront-assets');
