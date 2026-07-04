import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/Logo";
import { toast } from "sonner";
import { adminExists, bootstrapFirstAdmin } from "@/lib/bootstrap.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "bootstrap">("login");
  const [name, setName] = useState("");

  useEffect(() => {
    adminExists().then((r) => { if (!r.exists) setMode("bootstrap"); }).catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (mode === "bootstrap") {
      try {
        await bootstrapFirstAdmin({ data: { name, email, password } });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) return toast.error(error.message);
        toast.success("Admin account created");
        navigate({ to: "/dashboard" });
      } catch (err: any) {
        setLoading(false);
        toast.error(err.message ?? "Bootstrap failed");
      }
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const mustChange = (data.user?.user_metadata as any)?.must_change_password;
    navigate({ to: mustChange ? "/auth/change-password" : "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 mb-6">
          <Logo size={40} className="text-[color:var(--brand-red)]" />
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight">UUAIS Business</h1>
            <p className="text-xs text-muted-foreground">
              {mode === "bootstrap" ? "Create the first admin account to get started" : "Sign in to the team ops app"}
            </p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "bootstrap" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordInput id="password" autoComplete={mode === "bootstrap" ? "new-password" : "current-password"} required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Working…" : mode === "bootstrap" ? "Create admin account" : "Sign in"}
          </Button>
          {mode === "login" && (
            <p className="text-[11px] text-center text-muted-foreground pt-2">
              Accounts are created by an admin. Ask a team lead for access.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}