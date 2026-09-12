import "server-only";
import { z } from "zod";
import { completeJson } from "@/lib/groq/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AssessmentTemplate, Json } from "@/types/database";

const scoreResultSchema = z.object({
  scores: z.record(z.string(), z.number().min(0).max(100)),
  narrative_summary: z.string().min(1).max(1000),
});

const SCORING_SYSTEM_PROMPT = `You score a user's assessment answers. Likert (1-5 scale) questions map
directly to a 0-100 score per dimension (question id -> score). For any
open-ended question, factor its content qualitatively into the
narrative summary rather than inventing a numeric score for it. Respond
ONLY with JSON: {"scores": {"<question_id>": number 0-100, ...},
"narrative_summary": string}`;

/**
 * Stage 4.1 — Assessments.
 *
 * Submits a response and its Groq-derived score together, and writes a
 * progress_snapshots row (source: 'assessment') per dimension score so
 * the Progress page's trend data includes assessment results alongside
 * activity metrics — this is exactly the extension point
 * docs/STAGE-2-3-4-NOTES.md said the schema was already shaped for.
 */
export async function submitAssessment(params: {
  userId: string;
  templateId: string;
  template: Pick<AssessmentTemplate, "schema">;
  answers: Record<string, unknown>;
  utilityModel: string;
}): Promise<{ responseId: string; scores: Record<string, number>; narrativeSummary: string }> {
  const admin = createAdminClient();

  const { data: response, error: responseError } = await admin
    .from("assessment_responses")
    .insert({ user_id: params.userId, template_id: params.templateId, answers: params.answers as Json })
    .select("id")
    .single();

  if (responseError || !response) {
    throw new Error(`submitAssessment: failed to save response: ${responseError?.message}`);
  }

  const raw = await completeJson<unknown>({
    model: params.utilityModel,
    messages: [
      { role: "system", content: SCORING_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Questions: ${JSON.stringify(params.template.schema)}\nAnswers: ${JSON.stringify(params.answers)}`,
      },
    ],
  });

  const parsed = scoreResultSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`submitAssessment: Groq returned an unparseable score: ${parsed.error.message}`);
  }

  const { error: scoreError } = await admin.from("assessment_scores").insert({
    response_id: response.id,
    user_id: params.userId,
    scores: parsed.data.scores,
    narrative_summary: parsed.data.narrative_summary,
  });

  if (scoreError) {
    throw new Error(`submitAssessment: failed to save score: ${scoreError.message}`);
  }

  const now = new Date().toISOString();
  await admin.from("progress_snapshots").insert(
    Object.entries(parsed.data.scores).map(([dimension, value]) => ({
      user_id: params.userId,
      source: "assessment" as const,
      metric_key: `assessment:${dimension}`,
      metric_value: value,
      recorded_at: now,
    })),
  );

  return {
    responseId: response.id,
    scores: parsed.data.scores,
    narrativeSummary: parsed.data.narrative_summary,
  };
}
