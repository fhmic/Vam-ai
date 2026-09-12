"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CollectiveIntelligenceConsentCard({ initialOptIn }: { initialOptIn: boolean }) {
  const [optedIn, setOptedIn] = useState(initialOptIn);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function changeConsent() {
    setSaving(true); setError(null);
    const next = !optedIn;
    const response = await fetch("/api/collective-intelligence/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optedIn: next }) });
    if (response.ok) setOptedIn(next); else setError("We could not save your choice. Please try again.");
    setSaving(false);
  }
  return <div>
    <p className="mt-1 text-sm text-ink/60 dark:text-white/60">Help improve VAM with de-identified, cohort-level learning patterns. Your conversations, assessment answers, and identity are never included in published insights. You can withdraw at any time.</p>
    <div className="mt-3 flex items-center gap-3"><Button variant={optedIn ? "secondary" : "primary"} size="sm" isLoading={saving} onClick={changeConsent}>{optedIn ? "Withdraw consent" : "Contribute anonymously"}</Button><span className="text-sm text-ink/60 dark:text-white/60">{optedIn ? "You are contributing." : "You are not contributing."}</span></div>
    {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
  </div>;
}
