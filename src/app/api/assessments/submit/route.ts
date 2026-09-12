import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitAssessment } from "@/lib/assessments/scoring";

const bodySchema = z.object({
  templateId: z.string().uuid(),
  answers: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const utilityModel = process.env.GROQ_MODEL_UTILITY;
  if (!utilityModel) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Groq model configuration is missing" } },
      { status: 502 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error.message } },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();
    const { data: template, error: templateError } = await admin
      .from("assessment_templates")
      .select("schema")
      .eq("id", parsed.data.templateId)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Unknown or inactive assessment template" } },
        { status: 400 },
      );
    }

    const result = await submitAssessment({
      userId: auth.data.user.id,
      templateId: parsed.data.templateId,
      template,
      answers: parsed.data.answers,
      utilityModel,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message } }, { status: 502 });
  }
}
