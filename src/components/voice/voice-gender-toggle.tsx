"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserPreferences } from "@/types/database";

type VoiceGender = UserPreferences["voice_gender"];

const OPTIONS: { value: VoiceGender; label: string }[] = [
  { value: "auto", label: "Mentor default" },
  { value: "female", label: "Female voice" },
  { value: "male", label: "Male voice" },
];

/**
 * Stage 2.5 — user-controlled voice switching (independent of which
 * mentor is assigned). Writes directly to user_preferences via the
 * RLS-scoped browser client — no custom API route needed, since the
 * row-level "own row" policy already permits this (see migration 0010,
 * extended by 0016). /api/voice/tts re-reads this preference on every
 * request, so the change takes effect on the very next spoken reply.
 */
export function VoiceGenderToggle({ initialValue }: { initialValue: VoiceGender }) {
  const supabase = createClient();
  const [value, setValue] = useState<VoiceGender>(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(next: VoiceGender) {
    setValue(next);
    setIsSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_preferences").update({ voice_gender: next }).eq("user_id", user.id);
    }
    setIsSaving(false);
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-ink/10 dark:border-white/10 bg-white p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={isSaving}
          onClick={() => handleChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === option.value
              ? "bg-signal-600 text-white"
              : "text-ink/70 dark:text-white/70 hover:bg-ink/5 dark:hover:bg-white/10"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
