-- Contact person's job title on outreach companies (was being stuffed into notes).
ALTER TABLE public.companies ADD COLUMN contact_title TEXT;

-- Likes on ideas: one row per user per post.
CREATE TABLE public.idea_likes (
  post_id UUID NOT NULL REFERENCES public.board_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.idea_likes TO authenticated;
GRANT ALL ON public.idea_likes TO service_role;
ALTER TABLE public.idea_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view likes" ON public.idea_likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users like as themselves" ON public.idea_likes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can remove own like" ON public.idea_likes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Comments on ideas.
CREATE TABLE public.idea_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.board_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.idea_comments TO authenticated;
GRANT ALL ON public.idea_comments TO service_role;
ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view comments" ON public.idea_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users comment as themselves" ON public.idea_comments
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors and admins can delete comments" ON public.idea_comments
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- A comment notifies the idea's author (not when commenting on your own idea).
CREATE OR REPLACE FUNCTION public.notify_idea_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _post_author UUID;
  _commenter TEXT;
BEGIN
  SELECT author_id INTO _post_author FROM public.board_posts WHERE id = NEW.post_id;
  IF _post_author IS NULL OR _post_author = NEW.author_id THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(name, ''), email) INTO _commenter FROM public.profiles WHERE id = NEW.author_id;
  INSERT INTO public.notifications (user_id, title, body, link)
  VALUES (_post_author, 'New comment from ' || COALESCE(_commenter, 'a teammate'),
          LEFT(NEW.content, 120), '/ideas');
  RETURN NEW;
END $$;

CREATE TRIGGER idea_comments_notify AFTER INSERT ON public.idea_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_idea_comment();
