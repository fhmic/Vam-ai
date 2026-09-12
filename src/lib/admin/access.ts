import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Checks the caller's own RLS-scoped membership row; no client claim is trusted. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  return Boolean(data);
}
