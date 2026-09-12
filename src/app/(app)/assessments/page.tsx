import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { CoachCompanion } from "@/components/avatar/coach-companion";

export default async function AssessmentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: templates } = await supabase
    .from("assessment_templates")
    .select("id, slug, title, description")
    .eq("is_active", true);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink dark:text-white">Assessments</h1>
      <CoachCompanion moduleKey="assessments" />
      <div className="space-y-3">
        {(templates ?? []).map((t) => (
          <Link key={t.id} href={`/assessments/${t.slug}`}>
            <Card className="transition-colors hover:border-signal-300">
              <h2 className="font-medium text-ink dark:text-white">{t.title}</h2>
              <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{t.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
