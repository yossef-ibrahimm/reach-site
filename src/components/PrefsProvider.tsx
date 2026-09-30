import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { DEFAULT_LANG, langDir, translate, type Lang, type TKey, type TVars } from "@/lib/i18n";
import { PrefsContext, type PrefsValue } from "@/lib/prefs-context";
import {
  applyToDocument,
  createPreferenceIO,
  resolveTheme,
  type ResolvedTheme,
  type ThemeChoice,
} from "@/lib/prefs";

/**
 * Holds the visitor's language + colour-theme choice, mirrors it onto
 * `<html lang dir class="dark">`, and persists both to localStorage.
 *
 * First render always matches the server output (Arabic, light) so hydration
 * stays clean; a matching inline script in `<head>` applies the stored choice
 * before first paint, then this provider takes over.
 */
export function PrefsProvider({ children }: { children: ReactNode }) {
  const io = useRef(createPreferenceIO(typeof window === "undefined" ? null : window.localStorage));
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [systemDark, setSystemDark] = useState(false);

  // Adopt the persisted choice as soon as we are on the client.
  useEffect(() => {
    const store = createPreferenceIO(window.localStorage);
    io.current = store;
    setLangState(store.loadLang());
    setThemeState(store.loadTheme());
    setSystemDark(store.prefersDark());
  }, []);

  // Track the OS preference so `theme: "system"` stays live.
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: ResolvedTheme = resolveTheme(theme, systemDark);

  useEffect(() => {
    applyToDocument(document, lang, resolvedTheme);
  }, [lang, resolvedTheme]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    io.current.saveLang(next);
  }, []);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    io.current.saveTheme(next);
  }, []);

  const t = useCallback((key: TKey, vars?: TVars) => translate(lang, key, vars), [lang]);

  const value = useMemo<PrefsValue>(
    () => ({
      lang,
      dir: langDir(lang),
      theme,
      resolvedTheme,
      t,
      setLang,
      setTheme,
    }),
    [lang, theme, resolvedTheme, t, setLang, setTheme],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}
