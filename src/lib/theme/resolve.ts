export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/**
 * Resolves a stored preference ('light' | 'dark' | 'system') to an
 * actual theme to render, given the OS-level color scheme when the
 * preference is 'system'. Pure — no DOM access — so it's directly
 * unit-testable (tests/unit/theme.test.ts); the DOM-touching wrapper
 * lives in theme-script.tsx / theme-provider.tsx.
 */
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return preference;
}
