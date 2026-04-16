-- Admin email allowlist (service-role access only)
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;
-- No policies = only service_role can read/write

INSERT INTO public.admin_emails (email) VALUES ('jallancrain@gmail.com');
