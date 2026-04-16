-- Fundraiser products: extend content_type, make file_path nullable

-- Allow 'fundraiser' as a content type
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_content_type_check;
ALTER TABLE public.products ADD CONSTRAINT products_content_type_check
  CHECK (content_type IN ('pdf', 'video', 'image', 'bundle', 'other', 'app', 'fundraiser'));

-- Fundraisers have no file — make file_path nullable
ALTER TABLE public.products ALTER COLUMN file_path DROP NOT NULL;
