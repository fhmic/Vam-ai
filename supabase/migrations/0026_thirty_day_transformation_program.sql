-- 0026_thirty_day_transformation_program.sql
-- Product Redefinition — 30-Day Transformation Program.
--
-- Modeled as a coaching_journeys row (Stage 4.3 infrastructure), not a
-- new parallel schema: steps jsonb already supports an ordered,
-- per-user-tracked curriculum with server-validated sequential
-- advancement (/api/journeys/advance), which is exactly what a 30-day
-- program needs. primary_goal is null — unlike the goal-specific
-- journeys seeded in migration 0022, this one is universal; every user
-- is auto-enrolled at onboarding (see /api/onboarding/complete),
-- not offered as one option among several.
--
-- Each step embeds "week" and "module" directly in its jsonb — the
-- Communication Competency Framework's 6 modules are descriptive
-- metadata on curriculum content here, not a separate reference table,
-- since nothing else in the system needs to query by module
-- independently of a journey step.

insert into public.coaching_journeys (slug, title, description, primary_goal, steps)
values (
  'thirty-day-transformation',
  'The 30-Day Transformation Program',
  'From your current role to boardroom-ready: four weeks of structured, deliberate communication practice.',
  null,
  '[
    { "order": 1, "week": 1, "module": "Communication Foundations", "title": "Day 1: Breath and Pace", "objective": "Practice speaking three sentences at a deliberately slower pace, with a full breath before each one. Notice where you rush." },
    { "order": 2, "week": 1, "module": "Communication Foundations", "title": "Day 2: Cut the Filler", "objective": "Answer a question about your current project without using any filler words (um, like, basically, sort of)." },
    { "order": 3, "week": 1, "module": "Communication Foundations", "title": "Day 3: One Idea, One Sentence", "objective": "State your single biggest work priority this week in one sentence, no sub-clauses." },
    { "order": 4, "week": 1, "module": "Communication Foundations", "title": "Day 4: Confident Opening", "objective": "Practice opening a hypothetical meeting with a clear, confident one-line agenda statement." },
    { "order": 5, "week": 1, "module": "Communication Foundations", "title": "Day 5: Structure Under Pressure", "objective": "Given a sudden question you were not prepared for, structure a 30-second answer instead of rambling." },
    { "order": 6, "week": 1, "module": "Communication Foundations", "title": "Day 6: Recap and Reinforce", "objective": "Explain, out loud, the single communication habit you most want to change this month." },
    { "order": 7, "week": 1, "module": "Communication Foundations", "title": "Day 7: Foundation Check-In", "objective": "Review the week: which foundation habit (pace, filler words, structure) improved the most, and which needs more repetition?" },

    { "order": 8, "week": 2, "module": "Professional Communication", "title": "Day 8: Meeting Opener", "objective": "Open a status update meeting in under 30 seconds, stating outcome first, detail second." },
    { "order": 9, "week": 2, "module": "Professional Communication", "title": "Day 9: Executive Vocabulary", "objective": "Rephrase a casual work update using precise, professional vocabulary instead of informal phrasing." },
    { "order": 10, "week": 2, "module": "Professional Communication", "title": "Day 10: Difficult Question", "objective": "Respond to a pointed question about a missed deadline without becoming defensive or over-explaining." },
    { "order": 11, "week": 2, "module": "Professional Communication", "title": "Day 11: Presentation Framing", "objective": "Frame the purpose of a presentation in one sentence before diving into any slide content." },
    { "order": 12, "week": 2, "module": "Professional Communication", "title": "Day 12: Written-to-Spoken", "objective": "Take a written status update you sent recently and deliver the same content verbally, more concisely." },
    { "order": 13, "week": 2, "module": "Professional Communication", "title": "Day 13: Corporate Jargon, Used Well", "objective": "Use two pieces of relevant industry jargon correctly and naturally in a work update." },
    { "order": 14, "week": 2, "module": "Professional Communication", "title": "Day 14: Professional Communication Check-In", "objective": "Review the week: where did you sound most credible, and where did you sound uncertain?" },

    { "order": 15, "week": 3, "module": "Leadership Communication", "title": "Day 15: Delegate Clearly", "objective": "Practice delegating a task in three sentences: what, by when, and why it matters." },
    { "order": 16, "week": 3, "module": "Leadership Communication", "title": "Day 16: Give Direct Feedback", "objective": "Give a piece of constructive feedback using Situation-Behavior-Impact, without softening it into vagueness." },
    { "order": 17, "week": 3, "module": "Leadership Communication", "title": "Day 17: Influence a Skeptic", "objective": "Make the case for a decision to someone who disagrees with it, addressing their objection directly." },
    { "order": 18, "week": 3, "module": "Leadership Communication", "title": "Day 18: Navigate Conflict", "objective": "Practice responding to a disagreement in a meeting without either capitulating or escalating." },
    { "order": 19, "week": 3, "module": "Leadership Communication", "title": "Day 19: Communicate a Hard Decision", "objective": "Deliver a difficult decision (e.g. a changed priority) to a stakeholder, leading with the decision, not the justification." },
    { "order": 20, "week": 3, "module": "Leadership Communication", "title": "Day 20: Stakeholder Update", "objective": "Deliver a status update to a senior stakeholder in under 90 seconds, recommendation first." },
    { "order": 21, "week": 3, "module": "Leadership Communication", "title": "Day 21: Leadership Check-In", "objective": "Review the week: which leadership conversation felt most natural, and which still feels rehearsed?" },

    { "order": 22, "week": 4, "module": "Boardroom Communication", "title": "Day 22: The 90-Second Pitch", "objective": "Present a budget or resource request in 90 seconds, recommendation first, then the three points supporting it." },
    { "order": 23, "week": 4, "module": "Boardroom Communication", "title": "Day 23: Handle the Hard Question", "objective": "Practice answering a skeptical board-style question about risk without becoming defensive." },
    { "order": 24, "week": 4, "module": "Boardroom Communication", "title": "Day 24: Investor-Style Update", "objective": "Deliver a performance update the way you would to an investor: numbers first, narrative second." },
    { "order": 25, "week": 4, "module": "Boardroom Communication", "title": "Day 25: Crisis Communication", "objective": "Practice communicating a setback to leadership — what happened, what you are doing about it, what you need." },
    { "order": 26, "week": 4, "module": "Boardroom Communication", "title": "Day 26: Executive Presence Under Pressure", "objective": "Deliver your budget pitch again (Day 22), this time with a simulated interruption partway through — recover without losing your structure." },
    { "order": 27, "week": 4, "module": "Boardroom Communication", "title": "Day 27: Strategic Communication", "objective": "Explain how your current work connects to the organization's broader strategy, in under a minute." },
    { "order": 28, "week": 4, "module": "Boardroom Communication", "title": "Day 28: Board-Level Q&A", "objective": "Field three unscripted, increasingly pointed questions on a topic of your choice, staying composed throughout." },
    { "order": 29, "week": 4, "module": "Boardroom Communication", "title": "Day 29: Full Boardroom Simulation", "objective": "Deliver a complete 3-minute boardroom-style presentation on a real initiative you are working on." },
    { "order": 30, "week": 4, "module": "Boardroom Communication", "title": "Day 30: Transformation Review", "objective": "Reflect out loud on the single biggest change in how you communicate compared to Day 1, and name the habit you will keep deliberately practicing." }
  ]'::jsonb
)
on conflict (slug) do nothing;
