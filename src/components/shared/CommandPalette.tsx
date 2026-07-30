import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  companiesQuery,
  contactsQuery,
  eventsQuery,
  meetingsQuery,
  tasksQuery,
} from "@/lib/queries";
import { isStale } from "@/lib/stale";
import { formatDate } from "@/lib/format";
import {
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  ContactRound,
  FileSignature,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  Search as SearchIcon,
  StickyNote,
  Users,
} from "lucide-react";

const PAGES = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Outreach", url: "/outreach", icon: Building2 },
  { title: "Contacts", url: "/contacts", icon: ContactRound },
  { title: "Meetings", url: "/meetings", icon: CalendarCheck },
  { title: "Events", url: "/events", icon: CalendarDays },
  { title: "Tasks", url: "/tasks", icon: ListChecks },
  { title: "Ideas", url: "/ideas", icon: StickyNote },
  { title: "Chat", url: "/chat", icon: MessagesSquare },
  { title: "Team", url: "/team", icon: Users },
  { title: "Info", url: "/info", icon: BookOpen },
  { title: "Contracts", url: "/contracts", icon: FileSignature },
] as const;

const OPEN_EVENT = "command-palette:open";

/** Opens the palette from anywhere without threading state through the shell. */
export function openCommandPalette() {
  document.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

/**
 * Header button that opens the palette.
 *
 * A keyboard-only entry point gets discovered by roughly nobody, so the
 * shortcut is advertised rather than hidden.
 */
export function CommandPaletteTrigger() {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => setIsMac(/mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)), []);

  return (
    <button
      onClick={openCommandPalette}
      title="Search everything"
      className="flex items-center gap-1.5 rounded-[3px] p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <SearchIcon className="h-4 w-4" />
      <span className="microlabel hidden text-[8.5px] text-muted-foreground/70 sm:inline">
        {isMac ? "⌘" : "Ctrl "}K
      </span>
    </button>
  );
}

/** Cmd/Ctrl-K jump-to-anything across every record in the hub. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Non-suspense: the palette must never block the shell from rendering, and
  // these caches are usually already warm from whichever route is mounted.
  const { data: companies = [] } = useQuery({ ...companiesQuery, enabled: open });
  const { data: contacts = [] } = useQuery({ ...contactsQuery, enabled: open });
  const { data: events = [] } = useQuery({ ...eventsQuery, enabled: open });
  const { data: tasks = [] } = useQuery({ ...tasksQuery, enabled: open });
  const { data: meetings = [] } = useQuery({ ...meetingsQuery, enabled: open });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  function go(to: string) {
    setOpen(false);
    navigate({ to });
  }

  // Outreach is the biggest table, so surface quiet relationships first — the
  // palette doubles as the fastest route into the follow-up backlog.
  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => Number(isStale(b)) - Number(isStale(a))),
    [companies],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search companies, contacts, events, tasks…" />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>No matches.</CommandEmpty>

        <CommandGroup heading="Go to">
          {PAGES.map((p) => (
            <CommandItem key={p.url} value={`page ${p.title}`} onSelect={() => go(p.url)}>
              <p.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {p.title}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Companies">
          {sortedCompanies.map((c: any) => (
            <CommandItem
              key={c.id}
              value={`company ${c.name} ${c.contact_person ?? ""} ${c.contact_email ?? ""}`}
              onSelect={() => go("/outreach")}
            >
              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{c.name}</span>
              {isStale(c) && (
                <span className="microlabel ml-2 shrink-0 text-[8.5px] text-amber-600 dark:text-amber-400">
                  quiet
                </span>
              )}
              <span className="microlabel ml-2 shrink-0 text-[8.5px] text-muted-foreground/70">
                {c.status}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Contacts">
          {contacts.map((c: any) => (
            <CommandItem
              key={c.id}
              value={`contact ${c.name} ${c.email ?? ""} ${c.company?.name ?? ""}`}
              onSelect={() => go("/contacts")}
            >
              <ContactRound className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{c.name}</span>
              {c.company?.name && (
                <span className="microlabel ml-2 shrink-0 text-[8.5px] text-muted-foreground/70">
                  {c.company.name}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Events">
          {events.map((e: any) => (
            <CommandItem
              key={e.id}
              value={`event ${e.title} ${e.venue ?? ""} ${e.company?.name ?? ""}`}
              onSelect={() => go(`/events/${e.id}`)}
            >
              <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{e.title}</span>
              <span className="microlabel ml-2 shrink-0 text-[8.5px] text-muted-foreground/70">
                {formatDate(e.date)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Tasks">
          {tasks.map((t: any) => (
            <CommandItem
              key={t.id}
              value={`task ${t.title} ${t.description ?? ""}`}
              onSelect={() => go("/tasks")}
            >
              <ListChecks className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{t.title}</span>
              <span className="microlabel ml-2 shrink-0 text-[8.5px] text-muted-foreground/70">
                {t.status}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Meetings">
          {meetings.map((m: any) => (
            <CommandItem
              key={m.id}
              value={`meeting ${m.title} ${m.company?.name ?? ""}`}
              onSelect={() => go("/meetings")}
            >
              <CalendarCheck className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate">{m.title}</span>
              <span className="microlabel ml-2 shrink-0 text-[8.5px] text-muted-foreground/70">
                {formatDate(m.meeting_date)}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
