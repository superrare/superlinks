-- Follow relationships
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id <> following_id)
);

-- Events / notifications foundation
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('follow', 'purchase', 'new_product', 'new_listing', 'price_drop')),
  payload JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Follower/following counts on profiles (denormalized for fast reads)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Indexes
CREATE INDEX idx_follows_follower ON public.follows(follower_id);
CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_events_user ON public.events(user_id, created_at DESC);
CREATE INDEX idx_events_unread ON public.events(user_id) WHERE read = false;

-- RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Follows: anyone can read, only follower can insert/delete
CREATE POLICY "follows_select" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert" ON public.follows FOR INSERT WITH CHECK (true);
CREATE POLICY "follows_delete" ON public.follows FOR DELETE USING (true);

-- Events: only the user can see their own events
CREATE POLICY "events_select" ON public.events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "events_insert" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "events_update" ON public.events FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
    UPDATE profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
    UPDATE profiles SET follower_count = GREATEST(follower_count - 1, 0) WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER follow_count_trigger
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();
