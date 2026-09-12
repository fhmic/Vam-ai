"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";

export function CollectiveInsightForm() {
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/collective-insights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: data.get("title"), summary: data.get("summary"), category: data.get("category"), cohortDescription: data.get("cohortDescription"), sampleSize: Number(data.get("sampleSize")), periodStart: data.get("periodStart"), periodEnd: data.get("periodEnd"), status }) });
    if (response.ok) { event.currentTarget.reset(); setMessage(status === "published" ? "Insight published." : "Draft saved."); } else { const body = await response.json().catch(() => null); setMessage(body?.error?.message ?? "Could not save insight."); }
    setSaving(false);
  }
  const input = "mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm text-ink dark:border-white/15 dark:bg-ink dark:text-white";
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    <label className="sm:col-span-2 text-sm font-medium text-ink dark:text-white">Title<input required name="title" maxLength={160} className={input} /></label>
    <label className="sm:col-span-2 text-sm font-medium text-ink dark:text-white">Aggregate finding<textarea required name="summary" minLength={20} maxLength={2000} rows={4} className={input} /></label>
    <label className="text-sm font-medium text-ink dark:text-white">Category<input required name="category" maxLength={80} placeholder="Executive presence" className={input} /></label>
    <label className="text-sm font-medium text-ink dark:text-white">Cohort description<input required name="cohortDescription" maxLength={240} placeholder="Opted-in programme participants" className={input} /></label>
    <label className="text-sm font-medium text-ink dark:text-white">Minimum cohort size<input required name="sampleSize" type="number" min="10" defaultValue="10" className={input} /></label>
    <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-ink dark:text-white">Start<input required name="periodStart" type="date" className={input} /></label><label className="text-sm font-medium text-ink dark:text-white">End<input required name="periodEnd" type="date" className={input} /></label></div>
    <div className="sm:col-span-2 flex items-center gap-3"><Button type="submit" isLoading={saving}>{status === "published" ? "Publish insight" : "Save draft"}</Button><Button type="button" variant="secondary" size="md" onClick={() => setStatus(status === "draft" ? "published" : "draft")}>{status === "draft" ? "Switch to publish" : "Switch to draft"}</Button>{message ? <span className="text-sm text-ink/60 dark:text-white/60">{message}</span> : null}</div>
  </form>;
}
