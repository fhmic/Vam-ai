import { NextResponse } from "next/server";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { generateWeeklyActionPlan } from "@/lib/action-plans/suggest";
import { reportApiError } from "@/lib/observability/error-reporting";

/** Stage 3.2 — POST -> generates (or returns existing) this week's action plan. */
export async function POST() {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth.response;
  const { user } = auth.data;

  const utilityModel = process.env.GEMINI_MODEL_UTILITY;
  if (!utilityModel) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "AI model configuration is missing" } },
      { status: 502 },
    );
  }

  try {
    const result = await generateWeeklyActionPlan({ userId: user.id, utilityModel });
    return NextResponse.json(result);
  } catch (err) {
    reportApiError(err, { route: "action-plans/generate", userId: user.id });
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message } }, { status: 502 });
  }
}
