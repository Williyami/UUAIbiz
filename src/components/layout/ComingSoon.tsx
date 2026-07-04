import { Clock } from "lucide-react";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-8 rounded-xl border border-dashed bg-card/40 p-12 flex flex-col items-center justify-center text-center">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-sm font-semibold">Coming next</h2>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          This page is part of Phase 2 — Events, Tasks, Team, Info and Contract Generator will be built out next.
        </p>
      </div>
    </div>
  );
}