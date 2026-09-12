const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('vam-theme') || 'system';
    var isDark = stored === 'dark' || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;

/**
 * Runs before hydration (in <head>) so the correct theme class is on
 * <html> before the first paint — avoids a flash of the wrong theme.
 * localStorage is a fast-path cache only; user_preferences.theme in
 * Supabase remains the source of truth and is synced by
 * ThemeProvider once the session loads (same fast-path-cookie-then-DB
 * pattern already used for onboarding/legal-acceptance state
 * elsewhere in this app).
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
