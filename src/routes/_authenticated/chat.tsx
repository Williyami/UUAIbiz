import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
  queryOptions,
} from "@tanstack/react-query";
import { profilesQuery, currentUserQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOpenProfile } from "@/components/shared/profile-widget-context";
import { useOnlineUsers } from "@/components/shared/presence-context";
import { OnlineAvatar } from "@/components/shared/OnlineAvatar";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { Send, Trash2 } from "lucide-react";

const chatMessagesQuery = queryOptions({
  queryKey: ["chatMessages"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data ?? []).reverse();
  },
});

export const Route = createFileRoute("/_authenticated/chat")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(profilesQuery);
    context.queryClient.ensureQueryData(chatMessagesQuery);
  },
  component: ChatPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

function ChatPage() {
  const qc = useQueryClient();
  const { data: profiles } = useSuspenseQuery(profilesQuery);
  const { data: messages } = useSuspenseQuery(chatMessagesQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);
  const openProfile = useOpenProfile();
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const [draft, setDraft] = useState("");
  const online = useOnlineUsers();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Live message stream; presence comes from the app-wide provider.
  useEffect(() => {
    const channel = supabase
      .channel("team-chat-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => qc.invalidateQueries({ queryKey: ["chatMessages"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from("chat_messages")
        .insert({ author_id: me!.id, content: text.trim() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatMessages"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chatMessages"] }),
    onError: (e: any) => toast.error(e.message),
  });

  function submit() {
    if (!draft.trim()) return;
    send.mutate(draft);
    setDraft("");
  }

  const onlineMembers = profiles.filter((p) => online.has(p.id));

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 p-6 md:p-10">
      <PageHeader title="Chat" lede="Quick team talk — everything here is visible to everyone.">
        <div className="flex items-center gap-2">
          <span className="flex items-center -space-x-1.5">
            {onlineMembers.slice(0, 6).map((p) => (
              <OnlineAvatar key={p.id} profile={p} onClick={() => openProfile(p)} size="sm" />
            ))}
          </span>
          <span className="microlabel text-[9.5px] text-muted-foreground">
            {onlineMembers.length} online
          </span>
        </div>
      </PageHeader>

      <section className="flex min-h-0 flex-1 flex-col border bg-card">
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Nothing here yet — say hej.
            </p>
          ) : (
            <ul className="space-y-4">
              {messages.map((m: any) => {
                const author = m.author_id ? profileMap.get(m.author_id) : null;
                const name = author?.name || author?.email || "Former member";
                const mine = m.author_id === me?.id;
                return (
                  <li key={m.id} className="group flex items-start gap-2.5">
                    <OnlineAvatar profile={author} onClick={() => author && openProfile(author)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium">{name}</span>
                        <span className="microlabel text-[8.5px] text-muted-foreground/70">
                          {timeAgo(m.created_at)}
                        </span>
                        {(mine || me?.isAdmin) && (
                          <button
                            title="Delete message"
                            onClick={() => confirm("Delete this message?") && remove.mutate(m.id)}
                            className="ml-auto cursor-pointer text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">
                        {m.content}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="flex items-center gap-2 border-t p-3">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Message the team…"
            autoFocus
          />
          <Button disabled={!draft.trim() || send.isPending} onClick={submit}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
