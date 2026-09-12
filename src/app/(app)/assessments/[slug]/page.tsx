import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssessmentForm } from "./assessment-form";

interface QuestionSchema {
  questions: { id: string; type: "likert" | "open"; prompt: string; scale?: number }[];
}

export default async function AssessmentDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: template } = await supabase
    .from("assessment_templates")
    .select("id, title, description, schema")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!template) {
    notFound();
  }

  const schema = template.schema as unknown as QuestionSchema;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink dark:text-white">{template.title}</h1>
        <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{template.description}</p>
      </div>
      <AssessmentForm templateId={template.id} questions={schema.questions} />
    </div>
  );
}
