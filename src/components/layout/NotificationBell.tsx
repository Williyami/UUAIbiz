import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { notificationsQuery } from "@/lib/queries";
import { timeAgo } from "@/lib/format";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: notifications = [] } = useQuery(notificationsQuery);
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n: any) => !n.read);

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  function openNotification(n: any) {
    if (!n.read) markRead.mutate([n.id]);
    setOpen(false);
    if (n.link) navigate({ to: n.link });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          title="Notifications"
          className="relative rounded-[3px] p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-(--brand-red) px-0.5 font-mono text-[8px] font-bold leading-none text-white">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3.5 py-2.5">
          <span className="microlabel text-[10px] font-semibold">Notifications</span>
          {unread.length > 0 && (
            <button
              onClick={() => markRead.mutate(unread.map((n: any) => n.id))}
              className="microlabel text-[9px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="px-3.5 py-8 text-center text-xs text-muted-foreground">
            Nothing yet — you'll hear about tasks assigned to you and new board posts.
          </p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {notifications.map((n: any) => (
              <li key={n.id}>
                <button
                  onClick={() => openNotification(n)}
                  className={`block w-full px-3.5 py-2.5 text-left transition-colors hover:bg-accent/50 ${
                    n.read ? "opacity-55" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-medium">{n.title}</span>
                    <span className="microlabel shrink-0 text-[8.5px] text-muted-foreground/70">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.body && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{n.body}</p>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
