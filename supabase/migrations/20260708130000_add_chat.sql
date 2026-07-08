-- Team chat: flat message stream, realtime-enabled so the page updates live.
-- Presence (who's online) runs over Supabase Realtime channels and needs no table.
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_created ON public.chat_messages (created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can read chat" ON public.chat_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users chat as themselves" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors and admins can delete messages" ON public.chat_messages
  FOR DELETE TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
