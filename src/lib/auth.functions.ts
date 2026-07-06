import { createServerFn } from "@tanstack/react-start";

export const getAccountStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!email) throw new Error("Enter an email address");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("must_change_password")
      .ilike("email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) return { status: "unknown" as const };
    return { status: profile.must_change_password ? ("needs_setup" as const) : ("existing" as const) };
  });

export const claimAccount = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (data.password.length < 8) throw new Error("Password must be at least 8 characters");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("id, must_change_password")
      .ilike("email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!profile) throw new Error("No account found for this email");
    if (!profile.must_change_password)
      throw new Error("This account is already set up — sign in with your password.");
    const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: data.password,
      user_metadata: { must_change_password: false },
    });
    if (upErr) throw new Error(upErr.message);
    await supabaseAdmin
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", profile.id);
    return { ok: true };
  });
