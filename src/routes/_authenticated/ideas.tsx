import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { boardPostsQuery, currentUserQuery } from "@/lib/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { initials, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import { Pencil, Trash2, Send, Heart, MessageCircle } from "lucide-react";
import { ProfileWidget } from "@/components/shared/ProfileWidget";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/ideas")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(boardPostsQuery);
  },
  component: IdeasPage,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">Error: {error.message}</div>,
});

const CATEGORIES = ["General", "Company idea", "Event idea"] as const;

const categoryColor: Record<string, string> = {
  General: "text-muted-foreground",
  "Company idea": "text-(--brand-red)",
  "Event idea": "text-emerald-500",
};

function IdeasPage() {
  const qc = useQueryClient();
  const { data: posts } = useSuspenseQuery(boardPostsQuery);
  const { data: me } = useSuspenseQuery(currentUserQuery);

  const [content, setContent] = useState("");
  const [category, setCategory] = useState<string>("General");
  const [filter, setFilter] = useState<string>("All");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [editContent, setEditContent] = useState("");
  const [openComments, setOpenComments] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("board_posts")
        .insert({ author_id: me!.id, category, content: content.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ["boardPosts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from("board_posts")
        .update({ content: content.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["boardPosts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("board_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boardPosts"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const toggleLike = useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (liked) {
        const { error } = await supabase
          .from("idea_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", me!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("idea_likes")
          .insert({ post_id: postId, user_id: me!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boardPosts"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, text }: { postId: string; text: string }) => {
      const { error } = await supabase
        .from("idea_comments")
        .insert({ post_id: postId, author_id: me!.id, content: text.trim() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boardPosts"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const removeComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("idea_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["boardPosts"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const shown = posts.filter((p: any) => filter === "All" || p.category === filter);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <PageHeader
        title="Ideas"
        lede="Shared notes for the whole team — companies worth contacting, event ideas, anything."
      />

      <form
        className="space-y-3 border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!content.trim()) return;
          create.mutate();
        }}
      >
        <Textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share an idea — a company we should reach out to, an event format, anything…"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`microlabel rounded-[3px] border px-2 py-1 text-[9.5px] transition-colors ${
                  category === c
                    ? "border-foreground/40 bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <Button type="submit" size="sm" disabled={create.isPending || !content.trim()}>
            <Send className="h-3.5 w-3.5" /> Post
          </Button>
        </div>
      </form>

      <div className="flex items-center gap-1.5">
        {["All", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`microlabel rounded-[3px] border px-2 py-1 text-[9.5px] transition-colors ${
              filter === c
                ? "border-foreground/40 bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/50"
            }`}
          >
            {c}
          </button>
        ))}
        <span className="microlabel tnum ml-auto text-[10px] text-muted-foreground">
          {shown.length}
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="border border-dashed bg-card/50 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">Nothing here yet — share the first idea.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map((p: any) => {
            const mine = p.author_id === me?.id;
            const canDelete = mine || me?.isAdmin;
            const authorName = p.author?.name || p.author?.email || "Former member";
            return (
              <li key={p.id} className="border bg-card p-4">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => p.author && setViewing(p.author)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
                  >
                    {p.author?.avatar_url ? (
                      <img src={p.author.avatar_url} alt="" className="size-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-7 items-center justify-center rounded-full bg-accent font-mono text-[9px] font-semibold uppercase">
                        {initials(authorName)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium">{authorName}</span>
                      <span className="microlabel ml-2 text-[9px] text-muted-foreground/70">
                        {timeAgo(p.created_at)}
                      </span>
                    </div>
                  </button>
                  <span className={`microlabel text-[9px] ${categoryColor[p.category] ?? "text-muted-foreground"}`}>
                    {p.category}
                  </span>
                  {mine && (
                    <button
                      title="Edit"
                      onClick={() => {
                        setEditingId(p.id);
                        setEditContent(p.content);
                      }}
                      className="rounded-[3px] p-1 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      title="Delete"
                      onClick={() => confirm("Delete this post?") && remove.mutate(p.id)}
                      className="rounded-[3px] p-1 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                {editingId === p.id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={update.isPending || !editContent.trim()}
                        onClick={() => update.mutate({ id: p.id, content: editContent })}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed">{p.content}</p>
                )}
                <PostFooter
                  post={p}
                  meId={me?.id}
                  isAdmin={!!me?.isAdmin}
                  expanded={openComments === p.id}
                  onToggleComments={() => setOpenComments(openComments === p.id ? null : p.id)}
                  onToggleLike={(liked) => toggleLike.mutate({ postId: p.id, liked })}
                  onAddComment={(text) => addComment.mutate({ postId: p.id, text })}
                  onRemoveComment={(id) => removeComment.mutate(id)}
                  onViewProfile={setViewing}
                />
              </li>
            );
          })}
        </ul>
      )}
      <ProfileWidget profile={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </div>
  );
}

function PostFooter({
  post,
  meId,
  isAdmin,
  expanded,
  onToggleComments,
  onToggleLike,
  onAddComment,
  onRemoveComment,
  onViewProfile,
}: {
  post: any;
  meId?: string;
  isAdmin: boolean;
  expanded: boolean;
  onToggleComments: () => void;
  onToggleLike: (liked: boolean) => void;
  onAddComment: (text: string) => void;
  onRemoveComment: (id: string) => void;
  onViewProfile: (p: any) => void;
}) {
  const [draft, setDraft] = useState("");
  const likes: any[] = post.likes ?? [];
  const comments: any[] = post.comments ?? [];
  const liked = likes.some((l) => l.user_id === meId);

  function submit() {
    if (!draft.trim()) return;
    onAddComment(draft);
    setDraft("");
  }

  return (
    <div className="mt-3 border-t pt-2.5">
      <div className="flex items-center gap-4">
        <button
          onClick={() => onToggleLike(liked)}
          className={`flex cursor-pointer items-center gap-1.5 rounded-[3px] px-1.5 py-1 transition-colors hover:bg-accent ${
            liked ? "text-(--brand-red)" : "text-muted-foreground"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${liked ? "fill-current" : ""}`} />
          <span className="microlabel tnum text-[10px]">{likes.length}</span>
        </button>
        <button
          onClick={onToggleComments}
          className={`flex cursor-pointer items-center gap-1.5 rounded-[3px] px-1.5 py-1 transition-colors hover:bg-accent ${
            expanded ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="microlabel tnum text-[10px]">
            {comments.length === 0
              ? "Comment"
              : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
          </span>
        </button>
      </div>
      {expanded && (
        <div className="mt-2.5 space-y-2.5">
          {comments.map((c) => {
            const name = c.author?.name || c.author?.email || "Former member";
            return (
              <div key={c.id} className="flex items-start gap-2">
                <button onClick={() => c.author && onViewProfile(c.author)} className="shrink-0 cursor-pointer pt-0.5">
                  {c.author?.avatar_url ? (
                    <img src={c.author.avatar_url} alt="" className="size-5 rounded-full object-cover" />
                  ) : (
                    <div className="flex size-5 items-center justify-center rounded-full bg-accent font-mono text-[7px] font-semibold uppercase">
                      {initials(name)}
                    </div>
                  )}
                </button>
                <div className="min-w-0 flex-1 border bg-muted/40 px-2.5 py-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[11px] font-medium">{name}</span>
                    <span className="microlabel text-[8px] text-muted-foreground/70">
                      {timeAgo(c.created_at)}
                    </span>
                    {(c.author_id === meId || isAdmin) && (
                      <button
                        title="Delete comment"
                        onClick={() => confirm("Delete this comment?") && onRemoveComment(c.id)}
                        className="ml-auto cursor-pointer text-muted-foreground/50 transition-colors hover:text-destructive"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed">{c.content}</p>
                </div>
              </div>
            );
          })}
          <div className="flex items-center gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Write a comment…"
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8" disabled={!draft.trim()} onClick={submit}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
