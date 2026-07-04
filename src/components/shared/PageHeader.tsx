import { Tri } from "./Tri";

export function PageHeader({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5">
      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          <Tri className="h-3.5 w-3.5 translate-y-px text-brand" />
          <h1 className="font-display text-3xl font-medium leading-none tracking-tight">{title}</h1>
        </div>
        {lede && <p className="mt-2.5 text-sm text-muted-foreground">{lede}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}
