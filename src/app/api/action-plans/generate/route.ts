import { NextResponse } from "next/server";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { generateWeeklyActionPlan } from "@/lib/action-plans/suggest";

/** Stage 3.2 — POST -> generates (or returns existing) this week's action plan. */
export async function POST() {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth.response;

  const utilityModel = process.env.GROQ_MODEL_UTILITY;
  if (!utilityModel) {
    return NextResponse.json(
      { error: { code: "UPSTREAM_ERROR", message: "Groq model configuration is missing" } },
      { status: 502 },
    );
  }

  try {
    const result = await generateWeeklyActionPlan({ userId: auth.data.user.id, utilityModel });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message } }, { status: 502 });
  }
}
