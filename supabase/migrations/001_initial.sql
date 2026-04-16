-- Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  email TEXT,
  public_key TEXT,
  wallet_provider TEXT CHECK (wallet_provider IN ('cdp', 'privy')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Wallets
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('cdp', 'privy')),
  provider_wallet_id TEXT NOT NULL,
  address TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'base-sepolia',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, network)
);

-- Encrypted messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id),
  recipient_id UUID REFERENCES public.profiles(id),
  encrypted_content TEXT NOT NULL,
  sender_public_key TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, only owner can update
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Wallets: only owner
CREATE POLICY "wallets_select" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallets_insert" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages: sender can insert, both parties can read
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (auth.uid() = recipient_id OR auth.uid() = sender_id);
CREATE POLICY "messages_update" ON public.messages FOR UPDATE USING (auth.uid() = recipient_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(split_part(NEW.email, '@', 1), 'user_' || left(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
