"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveTheme, type ThemePreference } from "@/lib/theme/resolve";

function applyTheme(preference: ThemePreference) {
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveTheme(preference, systemPrefersDark);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  localStorage.setItem("vam-theme", preference);
}

/**
 * Mount once in the authenticated app shell. Fetches the user's stored
 * theme preference and re-applies it (in case it differs from the
 * localStorage fast path ThemeScript used pre-hydration — e.g. a
 * change made on another device). Also listens for OS-level scheme
 * changes while preference is 'system'.
 */
export function ThemeProvider() {
  useEffect(() => {
    const supabase = createClient();
    let preference: ThemePreference = "system";

    async function syncFromServer() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_preferences")
        .select("theme")
        .eq("user_id", user.id)
        .single();

      if (data?.theme) {
        preference = data.theme;
        applyTheme(preference);
      }
    }

    void syncFromServer();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (preference === "system") applyTheme("system");
    };
    media.addEventListener("change", handleSystemChange);
    return () => media.removeEventListener("change", handleSystemChange);
  }, []);

  return null;
}
