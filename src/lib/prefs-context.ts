/**
 * React bindings for language + theme. Context lives here (a `.ts` file) so the
 * provider component in `PrefsProvider.tsx` is the only export of its module.
 */
import { createContext, useContext } from "react";

import type { Lang, TKey, TVars } from "@/lib/i18n";
import type { ResolvedTheme, ThemeChoice } from "@/lib/prefs";

export type PrefsValue = {
  readonly lang: Lang;
  readonly dir: "rtl" | "ltr";
  readonly theme: ThemeChoice;
  readonly resolvedTheme: ResolvedTheme;
  /** Translate a key in the current language, substituting `{vars}`. */
  readonly t: (key: TKey, vars?: TVars) => string;
  readonly setLang: (lang: Lang) => void;
  readonly setTheme: (theme: ThemeChoice) => void;
};

export const PrefsContext = createContext<PrefsValue | null>(null);

function usePrefsContext(): PrefsValue {
  const value = useContext(PrefsContext);
  if (value === null) {
    throw new Error("useLang/useTheme must be used inside <PrefsProvider>");
  }
  return value;
}

/** Current language + translator. */
export function useLang(): PrefsValue {
  return usePrefsContext();
}

/** Current colour theme + setter. */
export function useTheme(): PrefsValue {
  return usePrefsContext();
}
