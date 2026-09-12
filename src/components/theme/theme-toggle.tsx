"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ThemePreference } from "@/lib/theme/resolve";
import { resolveTheme } from "@/lib/theme/resolve";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeToggle({ initialValue }: { initialValue: ThemePreference }) {
  const supabase = createClient();
  const [value, setValue] = useState<ThemePreference>(initialValue);

  async function handleChange(next: ThemePreference) {
    setValue(next);
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", resolveTheme(next, systemPrefersDark) === "dark");
    localStorage.setItem("vam-theme", next);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_preferences").update({ theme: next }).eq("user_id", user.id);
    }
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-ink/10 bg-paper p-1 dark:border-white/10 dark:bg-ink-soft">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => handleChange(option.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            value === option.value
              ? "bg-signal-500 text-white"
              : "text-ink/60 hover:bg-ink/5 dark:text-white/60 dark:hover:bg-white/5"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
