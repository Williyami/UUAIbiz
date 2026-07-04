import { Tri } from "@/components/shared/Tri";

/** Split-screen frame for the login / password screens: charcoal brand panel + paper form side. */
export function AuthLayout({
  heading,
  sub,
  children,
}: {
  heading: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="microlabel text-[10px] text-sidebar-foreground/50">
          UU AI Society · Uppsala
        </div>
        <div>
          <Tri className="h-16 w-16 text-(--brand-red)" />
          <h1 className="mt-8 max-w-md font-display text-5xl font-medium leading-[1.05] tracking-tight text-sidebar-accent-foreground">
            Business Hub
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-sidebar-foreground/70">
            Outreach, events, tasks and contracts for the Events &amp; Partnerships team — one
            ledger instead of ten spreadsheets.
          </p>
        </div>
        <div className="microlabel flex items-center justify-between text-[10px] text-sidebar-foreground/40">
          <span>Events &amp; Partnerships</span>
          <span className="tnum">EST. HT25</span>
        </div>
        {/* oversized ghost triangle bleeding off the panel */}
        <Tri className="absolute -bottom-40 -right-32 h-[420px] w-[420px] text-sidebar-accent/40" />
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 lg:hidden">
            <Tri className="h-5 w-5 text-(--brand-red)" />
            <span className="font-display text-lg font-medium tracking-tight">Business Hub</span>
          </div>
          <div className="mt-10 border-t-2 border-(--brand-red) pt-8 lg:mt-0">
            <h2 className="font-display text-2xl font-medium tracking-tight">{heading}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{sub}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
