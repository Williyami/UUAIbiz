import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, avatar_url")
      .order("name");
    if (error) throw error;
    return data ?? [];
  },
});

export const companiesQuery = queryOptions({
  queryKey: ["companies"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const eventsQuery = queryOptions({
  queryKey: ["events"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*, company:companies(id,name)")
      .order("date", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const tasksQuery = queryOptions({
  queryKey: ["tasks"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const currentUserQuery = queryOptions({
  queryKey: ["currentUser"],
  queryFn: async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;
    const [{ data: profile }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userData.user.id),
    ]);
    return {
      id: userData.user.id,
      email: userData.user.email ?? "",
      profile,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
    };
  },
});