import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { RestoreAccountForm } from "@/components/account/restore-account-form";
import { createClient } from "@/lib/supabase/server";

export default async function RestoreAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: profile } = await supabase.from("profiles").select("deleted_at").eq("id", user.id).single();
  if (!profile?.deleted_at) redirect("/dashboard");
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-4"><Card><h1 className="text-2xl font-semibold text-ink dark:text-white">Your account is scheduled for deletion</h1><p className="mt-3 text-sm text-ink/60 dark:text-white/60">Your account and data are unavailable while deletion is pending. You can restore access within 30 days of your request.</p><RestoreAccountForm /></Card></main>;
}
