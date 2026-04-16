-- Add media support to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_path TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('image', 'video', 'audio'));

-- Comments on posts
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_comments_post ON public.comments(post_id, created_at ASC);
CREATE INDEX idx_comments_author ON public.comments(author_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "comments_delete" ON public.comments FOR DELETE USING (auth.uid() = author_id);
