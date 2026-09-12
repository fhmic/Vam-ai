"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function DeleteAccountCard() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    setSaving(true); setError(null);
    const response = await fetch("/api/account/delete", { method: "POST" });
    if (!response.ok) {
      setError("We could not start account deletion. Please try again."); setSaving(false); return;
    }
    await createClient().auth.signOut();
    router.replace("/sign-in?notice=account_deactivated");
    router.refresh();
  }

  return <div>
    <p className="mt-1 text-sm text-ink/60 dark:text-white/60">Your account will be disabled immediately and permanently deleted after 30 days. Signing in during that period lets you restore it.</p>
    {confirming ? <div className="mt-3 flex flex-wrap items-center gap-3"><Button type="button" isLoading={saving} onClick={deleteAccount}>Confirm deletion</Button><Button type="button" variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button></div> : <Button type="button" variant="secondary" size="sm" className="mt-3 text-red-700 dark:text-red-300" onClick={() => setConfirming(true)}>Delete my account</Button>}
    {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
  </div>;
}
