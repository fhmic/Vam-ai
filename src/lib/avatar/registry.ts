import {
  AvatarAva,
  AvatarElias,
  AvatarMorgan,
  AvatarNova,
  AvatarPriya,
  AvatarRiley,
} from "@/components/avatar/coach-avatars";
import type { ComponentType, SVGProps } from "react";

export type AvatarComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Ties each seeded mentor (migration 0011) to its illustrated avatar. */
export const MENTOR_AVATARS: Record<string, AvatarComponent> = {
  "the-coach": AvatarMorgan,
  "the-guide": AvatarAva,
  "the-strategist": AvatarPriya,
  "the-sparring-partner": AvatarElias,
};

/**
 * Used on non-chat modules (Progress, Assessments, Journeys, Insights)
 * where there's no single "assigned mentor" context — cycles through a
 * companion set for visual variety, the way Duolingo shows different
 * mascot poses across different screens rather than one static image
 * everywhere.
 */
export const COMPANION_AVATARS: AvatarComponent[] = [AvatarRiley, AvatarNova, AvatarMorgan, AvatarAva];

/**
 * Deterministic per-module selection — same module always shows the
 * same companion within a session (no flicker on re-render), but
 * different modules show different companions. Pure and unit-testable
 * (tests/unit/avatar-shuffle.test.ts): hashes the module key to an
 * index rather than using Math.random(), so it's reproducible.
 */
export function pickCompanionAvatar(moduleKey: string): AvatarComponent {
  let hash = 0;
  for (let i = 0; i < moduleKey.length; i++) {
    hash = (hash * 31 + moduleKey.charCodeAt(i)) % 2147483647;
  }
  const index = Math.abs(hash) % COMPANION_AVATARS.length;
  return COMPANION_AVATARS[index]!;
}

export function getMentorAvatar(mentorSlug: string | null | undefined): AvatarComponent {
  if (mentorSlug && MENTOR_AVATARS[mentorSlug]) {
    return MENTOR_AVATARS[mentorSlug]!;
  }
  return AvatarRiley;
}
