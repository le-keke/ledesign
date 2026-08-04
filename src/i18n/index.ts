import en from './en.json';
import ja from './ja.json';
import zh from './zh.json';

export const locales = ['zh', 'en', 'ja'] as const;
export type Locale = (typeof locales)[number];

/** Site default when no saved preference (matches menu order / x-default). */
export const defaultLocale: Locale = 'en';

/**
 * Footer language menu order (top → bottom when expanded upward).
 * Keep separate from `locales` so routing / build order stay stable.
 */
export const localeMenuOrder: readonly Locale[] = ['en', 'zh', 'ja'];

/** localStorage key for the visitor’s last language choice. */
export const LOCALE_STORAGE_KEY = 'ledesign-locale';

/** en.json is the source of truth for the dictionary shape. */
export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { zh, en, ja };

/** Label shown in the footer language switch (Figma: EN / ZH / JP). */
export const localeLabels: Record<Locale, string> = { en: 'EN', zh: 'ZH', ja: 'JP' };

/** Value for the `lang` attribute and hreflang alternates. */
export const localeTags: Record<Locale, string> = { zh: 'zh-CN', en: 'en', ja: 'ja-JP' };

export function isLocale(value: string | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/**
 * Splits About copy containing `{n}` tokens into text and hover-trigger parts.
 * Each `{n}` is rendered as the localised label plus a superscript.
 */
export function splitFootnotes(
  text: string,
): Array<{ type: 'text'; value: string } | { type: 'trigger'; id: string }> {
  return text
    .split(/(\{\d+\})/)
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^\{(\d+)\}$/);
      return match
        ? { type: 'trigger' as const, id: match[1] }
        : { type: 'text' as const, value: part };
    });
}
