import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAuthenticatedUser } from "@/lib/supabase/auth-guard";
import { createAdminClient } from "@/lib/supabase/admin";

const insightSchema = z.object({
  title: z.string().trim().min(3).max(160), summary: z.string().trim().min(20).max(2000),
  category: z.string().trim().min(2).max(80), cohortDescription: z.string().trim().min(3).max(240),
  sampleSize: z.number().int().min(10),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["draft", "published", "archived"]),
}).refine(({ periodStart, periodEnd }) => periodStart <= periodEnd, { message: "End date must be on or after start date" });

async function requireAdmin() {
  const auth = await verifyAuthenticatedUser();
  if (!auth.ok) return auth;
  const { data } = await auth.data.supabase.from("admin_users").select("user_id").eq("user_id", auth.data.user.id).maybeSingle();
  if (!data) return { ok: false as const, response: NextResponse.json({ error: { code: "FORBIDDEN", message: "Administrator access required" } }, { status: 403 }) };
  return auth;
}

export async function POST(request: Request) {
  const auth = await requireAdmin(); if (!auth.ok) return auth.response;
  const parsed = insightSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.message } }, { status: 400 });
  const input = parsed.data; const isPublished = input.status === "published";
  const { error } = await createAdminClient().from("collective_insights").insert({
    title: input.title, summary: input.summary, category: input.category, cohort_description: input.cohortDescription,
    sample_size: input.sampleSize, period_start: input.periodStart, period_end: input.periodEnd, status: input.status,
    published_at: isPublished ? new Date().toISOString() : null, created_by: auth.data.user.id,
  });
  if (error) return NextResponse.json({ error: { code: "UPSTREAM_ERROR", message: error.message } }, { status: 502 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
