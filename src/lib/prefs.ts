/**
 * User preferences (language + colour theme): pure logic, no React.
 * The React bindings are in `prefs-context.ts` / `PrefsProvider.tsx`.
 */
import { DEFAULT_LANG, LANG_STORAGE_KEY, isLang, langDir, type Lang } from "@/lib/i18n";

export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "eltawkol.theme";

export const THEME_CHOICES: readonly ThemeChoice[] = ["system", "light", "dark"];

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

/** Reads a preference from raw storage, falling back to a safe default. */
export function readLang(raw: string | null): Lang {
  return isLang(raw) ? raw : DEFAULT_LANG;
}

export function readTheme(raw: string | null): ThemeChoice {
  return isThemeChoice(raw) ? raw : "system";
}

/** `system` resolves against the OS preference; anything else is used as-is. */
export function resolveTheme(choice: ThemeChoice, prefersDark: boolean): ResolvedTheme {
  if (choice === "system") return prefersDark ? "dark" : "light";
  return choice;
}

export type DocumentLike = Pick<Document, "documentElement">;

/**
 * Writes language + resolved theme onto `<html>` so that `lang`, `dir` and the
 * `dark` class always match what the user chose.
 */
export function applyToDocument(doc: DocumentLike, lang: Lang, theme: ResolvedTheme): void {
  const root = doc.documentElement;
  root.lang = lang;
  root.dir = langDir(lang);
  root.classList.toggle("dark", theme === "dark");
}

/** Storage + media-query accessors, isolated so tests can stub them. */
export function createPreferenceIO(storage: Storage | null) {
  return {
    loadLang(): Lang {
      return readLang(storage?.getItem(LANG_STORAGE_KEY) ?? null);
    },
    saveLang(lang: Lang): void {
      try {
        storage?.setItem(LANG_STORAGE_KEY, lang);
      } catch {
        /* private mode / quota — the in-memory value still applies */
      }
    },
    loadTheme(): ThemeChoice {
      return readTheme(storage?.getItem(THEME_STORAGE_KEY) ?? null);
    },
    saveTheme(theme: ThemeChoice): void {
      try {
        storage?.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        /* private mode / quota — the in-memory value still applies */
      }
    },
    prefersDark(): boolean {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    },
  };
}

export { langDir };
