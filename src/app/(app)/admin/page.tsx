import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CollectiveInsightForm } from "@/components/admin/collective-insight-form";
import { isCurrentUserAdmin } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminPage() {
  if (!(await isCurrentUserAdmin())) redirect("/dashboard");
  const { data: insights } = await createAdminClient().from("collective_insights").select("id, title, category, sample_size, status, published_at, created_at").order("created_at", { ascending: false }).limit(20);
  return <div className="space-y-8">
    <div><h1 className="text-2xl font-semibold text-ink dark:text-white">Administration</h1><p className="mt-1 text-sm text-ink/60 dark:text-white/60">Review and publish only aggregate findings from consented cohorts of at least 10 people.</p></div>
    <Card><h2 className="mb-4 text-lg font-medium text-ink dark:text-white">Create collective insight</h2><CollectiveInsightForm /></Card>
    <Card><h2 className="mb-4 text-lg font-medium text-ink dark:text-white">Recent insights</h2><div className="space-y-3">{(insights ?? []).map((insight) => <div key={insight.id} className="flex items-start justify-between gap-4 border-b border-ink/10 pb-3 last:border-0 dark:border-white/10"><div><p className="font-medium text-ink dark:text-white">{insight.title}</p><p className="text-sm text-ink/60 dark:text-white/60">{insight.category} · n={insight.sample_size}</p></div><span className="rounded-full bg-ink/5 px-2 py-1 text-xs font-medium capitalize text-ink/60 dark:bg-white/10 dark:text-white/60">{insight.status}</span></div>)}{!(insights ?? []).length ? <p className="text-sm text-ink/50 dark:text-white/50">No insights have been created.</p> : null}</div></Card>
  </div>;
}
