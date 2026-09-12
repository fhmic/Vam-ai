import type { CoachingFramework, Goal, MemoryItem, Mentor, Profile, UserPreferences } from "@/types/database";

export interface ProfessionalContext {
  organizationName: string | null;
  industryName: string | null;
  functionalAreaName: string | null;
  currentRoleName: string | null;
}

export interface ProgramDay {
  dayNumber: number;
  week: number;
  title: string;
  objective: string;
}

export interface ProgressSummary {
  dayStreak: number | null;
  lastSessionNote: string | null;
  programDay: ProgramDay | null;
}

export interface PromptContext {
  mentor: Mentor;
  profile: Pick<Profile, "display_name" | "primary_goal" | "career_level">;
  professional: ProfessionalContext;
  preferences: Pick<UserPreferences, "coaching_intensity" | "mentor_style">;
  memories: Pick<MemoryItem, "type" | "content">[];
  goals: Pick<Goal, "title" | "status">[];
  framework?: Pick<CoachingFramework, "name" | "framework_prompt"> | null;
}

/**
 * Product Redefinition — Mentor Redefinition. Applies to every turn,
 * not just the opening: the brief is explicit that VA is not a
 * general-purpose chatbot and the mentor must never default to
 * generic, passive framing ("What can I help you with today?"). This
 * section is what enforces that platform-wide, independent of which
 * mentor persona is active or what that persona's specific style is.
 */
const COACHING_PHILOSOPHY = [
  "You are an Executive Communication Coach, not a general-purpose assistant.",
  "Never open with, or fall back on, generic passive framing like",
  '"What can I help you with today?" — you set the agenda, you challenge',
  "assumptions, and you ask probing questions rather than waiting to be asked.",
  "Teach and enforce recommendation-first communication — the user should",
  'lead with their recommendation, not bury it ("Think First. Speak Second.").',
  "When the user rambles, hedges, or delays their point, name it directly",
  "rather than letting it pass. Your objective is this person's advancement",
  "toward senior leadership, not just a pleasant conversation.",
].join(" ");

/**
 * Pure function — no I/O — so it's directly unit-testable
 * (tests/unit/groq-prompt-assembly.test.ts) without mocking Supabase or
 * Groq. Assembles the full system prompt sent as the first message in
 * every /api/chat call. Deliberately does NOT echo raw memory items
 * verbatim in a way the model is asked to "repeat" — see the Phase 1
 * blueprint's prompt-injection threat-model entry (Section 14.6).
 *
 * `professional` carries already-resolved names (not FK ids) —
 * industry_id/functional_area_id/current_role_id on profiles are
 * foreign keys, so the caller (route.ts) resolves them to display
 * names before calling this function, keeping this function pure and
 * free of any Supabase dependency.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
  const sections: string[] = [ctx.mentor.persona_prompt, COACHING_PHILOSOPHY];

  const roleContext = [
    ctx.professional.currentRoleName ? `working as a ${ctx.professional.currentRoleName}` : null,
    ctx.professional.functionalAreaName ? `in ${ctx.professional.functionalAreaName}` : null,
    ctx.professional.industryName ? `within the ${ctx.professional.industryName} industry` : null,
    ctx.professional.organizationName ? `at ${ctx.professional.organizationName}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  sections.push(
    `The user's name is ${ctx.profile.display_name ?? "not provided"}` +
      (roleContext ? `, ${roleContext}` : "") +
      `. Their self-reported career level is "${ctx.profile.career_level ?? "not specified"}". ` +
      `Their stated primary goal is "${ctx.profile.primary_goal ?? "not specified"}". ` +
      `Calibrate examples, scenarios, and vocabulary to this professional context — a Board-level ` +
      `executive and a Graduate Trainee should not receive the same kind of practice scenario.`,
  );

  sections.push(
    `Adapt your coaching intensity to "${ctx.preferences.coaching_intensity}" and your ` +
      `overall style toward "${ctx.preferences.mentor_style}", while staying in character.`,
  );

  if (ctx.framework) {
    sections.push(`Coaching framework to apply (${ctx.framework.name}): ${ctx.framework.framework_prompt}`);
  }

  if (ctx.goals.length > 0) {
    const activeGoals = ctx.goals.filter((g) => g.status === "active").map((g) => g.title);
    if (activeGoals.length > 0) {
      sections.push(`The user's active goals are: ${activeGoals.join("; ")}.`);
    }
  }

  if (ctx.memories.length > 0) {
    const memoryLines = ctx.memories.map((m) => `- (${m.type}) ${m.content}`).join("\n");
    sections.push(
      `Relevant things you remember about this user from past conversations:\n${memoryLines}\n` +
        `Use this naturally, as a mentor who remembers their mentee would — do not read it back verbatim or announce that you "recall" it from a database.`,
    );
  }

  return sections.join("\n\n");
}

/**
 * Product Redefinition — Mentor Redefinition, proactive opening.
 *
 * Builds the synthetic "kick off the session" directive sent as the
 * user-role turn when a brand-new (zero-message) session starts —
 * see /api/chat/greet/route.ts. This is never shown to the user and
 * is not persisted as a real message; it exists purely to give the
 * model something to respond to, since a chat completion needs at
 * least one non-system message.
 *
 * Mirrors the brief's "Good Example" structure directly: state who
 * they are and their objective, reference concrete recent progress if
 * any exists, end with one specific, time-boxed challenge or question
 * — never a generic "what would you like to work on".
 *
 * `progress.programDay`, when present, is what makes this genuinely
 * match the brief's example rather than approximate it — it's a real
 * day/objective from the 30-Day Transformation Program
 * (migration 0026), not an LLM-summarized memory note. It takes
 * priority over the other two signals when available.
 */
export function buildOpeningTurnDirective(progress: ProgressSummary): string {
  const progressLine = progress.programDay
    ? `The user is on Day ${progress.programDay.dayNumber} (Week ${progress.programDay.week}) of the ` +
      `30-Day Transformation Program. Today's assigned focus is "${progress.programDay.title}": ` +
      `${progress.programDay.objective} Open by referencing where they are in the program, then assign ` +
      "this exact objective as today's challenge, adapted to their professional context above."
    : progress.lastSessionNote
      ? `Reference this concretely in your opening (in your own words, not verbatim): ${progress.lastSessionNote}`
      : progress.dayStreak && progress.dayStreak > 1
        ? `The user is on a ${progress.dayStreak}-day streak — you may acknowledge that briefly.`
        : "This may be the user's first session — do not fabricate prior progress that doesn't exist.";

  return [
    "[SESSION START — this is an internal directive, not a message from the user.",
    "Begin the session now, proactively, following your identity and the coaching",
    "philosophy above. Do not wait to be asked what to work on. Open by naming who",
    "they are and their objective, in your own words. " + progressLine,
    "Close your opening with exactly one specific, concrete, time-boxed challenge",
    'or question for them to respond to right now — never a generic "what would',
    'you like to talk about" or "how can I help you today."]',
  ].join(" ");
}
