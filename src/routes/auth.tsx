import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/layout/AuthLayout";
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
    adminExists()
      .then((r) => {
        if (!r.exists) setMode("bootstrap");
      })
      .catch(() => {});
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
    <AuthLayout
      heading={mode === "bootstrap" ? "First-time setup" : "Sign in"}
      sub={
        mode === "bootstrap"
          ? "Create the first admin account to get started."
          : "Use the account an admin created for you."
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        {mode === "bootstrap" && (
          <div className="space-y-2">
            <Label htmlFor="name" className="microlabel text-muted-foreground">
              Full name
            </Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email" className="microlabel text-muted-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="microlabel text-muted-foreground">
            Password
          </Label>
          <PasswordInput
            id="password"
            autoComplete={mode === "bootstrap" ? "new-password" : "current-password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Working…" : mode === "bootstrap" ? "Create admin account" : "Sign in"}
        </Button>
        {mode === "login" && (
          <p className="microlabel pt-1 text-center text-[10px] text-muted-foreground/70">
            No self sign-up — ask a team lead for access
          </p>
        )}
      </form>
    </AuthLayout>
  );
}
