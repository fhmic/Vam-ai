"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RestoreAccountForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function restore() {
    setSaving(true); setError(null);
    const response = await fetch("/api/account/restore", { method: "POST" });
    if (!response.ok) { setError("We could not restore your account. Please try again."); setSaving(false); return; }
    router.replace("/dashboard"); router.refresh();
  }
  return <div className="mt-6"><Button isLoading={saving} onClick={restore}>Restore my account</Button>{error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}</div>;
}
