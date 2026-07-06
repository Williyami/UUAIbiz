import { Tri } from "@/components/shared/Tri";

/* Auth screens: centered form over the dark cathedral artwork.
   The "dark" wrapper pins dark tokens regardless of the visitor's saved
   theme, so it renders identically on every device. */
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
    <div className="dark min-h-screen bg-background bg-[url(/bg-dark.jpg)] bg-cover bg-center text-foreground">
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5">
            <Tri className="h-5 w-5 text-(--brand-red)" />
            <span className="font-display text-lg font-medium tracking-tight">Business Hub</span>
          </div>
          <div className="mt-10 border-t-2 border-(--brand-red) pt-8">
            <h2 className="font-display text-2xl font-medium tracking-tight">{heading}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{sub}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
