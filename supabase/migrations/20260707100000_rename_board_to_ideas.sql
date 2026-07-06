-- The Board page is now called Ideas: point notifications at the new route
-- and reword the title. Table name stays board_posts.
CREATE OR REPLACE FUNCTION public.notify_board_post()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _author TEXT;
BEGIN
  SELECT COALESCE(NULLIF(name, ''), email) INTO _author FROM public.profiles WHERE id = NEW.author_id;
  INSERT INTO public.notifications (user_id, title, body, link)
  SELECT p.id, 'New idea from ' || COALESCE(_author, 'a teammate'),
         LEFT(NEW.content, 120), '/ideas'
  FROM public.profiles p
  WHERE p.id <> NEW.author_id;
  RETURN NEW;
END $$;

UPDATE public.notifications SET link = '/ideas' WHERE link = '/board';
