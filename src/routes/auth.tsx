import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { toast } from "sonner";
import { adminExists, bootstrapFirstAdmin } from "@/lib/bootstrap.functions";
import { getAccountStatus, claimAccount } from "@/lib/auth.functions";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

type Step = "email" | "password" | "setup";

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "bootstrap">("login");
  const [step, setStep] = useState<Step>("email");
  const [name, setName] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    adminExists()
      .then((r) => {
        if (!r.exists) setMode("bootstrap");
      })
      .catch(() => {});
  }, []);

  function backToEmail() {
    setStep("email");
    setPassword("");
    setConfirm("");
  }

  async function onSubmitEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { status } = await getAccountStatus({ data: { email } });
      if (status === "unknown") {
        toast.error("No account found for this email — ask a team lead, or request access below.");
      } else {
        setStep(status === "needs_setup" ? "setup" : "password");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const mustChange = (data.user?.user_metadata as any)?.must_change_password;
    navigate({ to: mustChange ? "/auth/change-password" : "/dashboard" });
  }

  async function onSubmitSetup(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      await claimAccount({ data: { email, password } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      toast.success("Password set — welcome!");
      navigate({ to: "/auth/setup-profile" });
    } catch (err: any) {
      toast.error(err.message ?? "Could not set password");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitBootstrap(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
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
  }

  if (mode === "bootstrap") {
    return (
      <AuthLayout heading="First-time setup" sub="Create the first admin account to get started.">
        <form onSubmit={onSubmitBootstrap} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="microlabel text-muted-foreground">
              Full name
            </Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Working…" : "Create admin account"}
          </Button>
        </form>
      </AuthLayout>
    );
  }

  const heading = step === "setup" ? "Set your password" : "Sign in";
  const sub =
    step === "email"
      ? "Enter your email to continue."
      : step === "setup"
        ? "A team lead created this account for you. Choose a password to finish setting it up."
        : "Welcome back — enter your password.";

  return (
    <AuthLayout heading={heading} sub={sub}>
      {step === "email" ? (
        <form onSubmit={onSubmitEmail} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="microlabel text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Checking…" : "Continue"}
          </Button>
          <p className="microlabel pt-1 text-center text-[10px] text-muted-foreground/70">
            No self sign-up — ask a team lead for access, or{" "}
            <button
              type="button"
              onClick={() => setRequestOpen(true)}
              className="underline underline-offset-2 hover:text-foreground"
            >
              request access
            </button>
          </p>
        </form>
      ) : (
        <form
          onSubmit={step === "setup" ? onSubmitSetup : onSubmitPassword}
          className="space-y-5"
        >
          <div className="flex items-center justify-between gap-2 border bg-muted/60 px-3 py-2">
            <span className="truncate font-mono text-xs">{email}</span>
            <button
              type="button"
              onClick={backToEmail}
              className="microlabel shrink-0 text-[10px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Change
            </button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="microlabel text-muted-foreground">
              {step === "setup" ? "New password" : "Password"}
            </Label>
            <PasswordInput
              id="password"
              autoComplete={step === "setup" ? "new-password" : "current-password"}
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {step === "setup" && (
            <div className="space-y-2">
              <Label htmlFor="confirm" className="microlabel text-muted-foreground">
                Confirm password
              </Label>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Working…" : step === "setup" ? "Set password & sign in" : "Sign in"}
          </Button>
        </form>
      )}
      <RequestAccessDialog open={requestOpen} onOpenChange={setRequestOpen} />
    </AuthLayout>
  );
}

function RequestAccessDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("access_requests")
        .insert({ name: name.trim(), email: email.trim(), message: message.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request sent — a team lead will follow up.");
      onOpenChange(false);
      setName("");
      setEmail("");
      setMessage("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-medium tracking-tight">
            Request access
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !email.trim()) return toast.error("Name and email are required");
            submit.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label className="microlabel text-muted-foreground">Full name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="microlabel text-muted-foreground">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label className="microlabel text-muted-foreground">Message (optional)</Label>
            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Which team, why you need access…"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submit.isPending}>
              {submit.isPending ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
