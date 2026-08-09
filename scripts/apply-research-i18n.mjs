/**
 * Apply scripts/research-i18n/dict.json onto research detail JSON.
 *
 * dict: { [exactSourceText]: { en: string, zh: string, ja: string } }
 *
 * IMPORTANT: run only on freshly parsed JSON (identical en/zh/ja trees in the
 * authorial language). Do not re-apply after localization — `sections.en` is
 * used as the walk source; a second pass would corrupt Chinese trees.
 *
 * Pipeline: node scripts/parse-research-details.mjs && node scripts/apply-research-i18n.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const detailsDir = path.join(__dirname, '../src/data/details/research');
const dictPath = path.join(__dirname, 'research-i18n/dict.json');

const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
const missing = new Map();

function tr(text, locale) {
  if (text == null || text === '') return text;
  const entry = dict[text];
  if (!entry) {
    missing.set(text, (missing.get(text) || 0) + 1);
    return text;
  }
  return entry[locale] ?? text;
}

function walk(node, locale) {
  if (node == null) return node;
  if (Array.isArray(node)) return node.map((n) => walk(n, locale));
  if (typeof node !== 'object') return node;

  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (
      key === 'src' ||
      key === 'href' ||
      key === 'kind' ||
      key === 'type' ||
      key === 'bg' ||
      key === 'role' ||
      key === 'layout' ||
      key === 'spacing' ||
      typeof value === 'boolean' ||
      typeof value === 'number'
    ) {
      out[key] = value;
      continue;
    }
    if (
      typeof value === 'string' &&
      (key === 'h5' ||
        key === 'body' ||
        key === 'lead' ||
        key === 'text' ||
        key === 'label' ||
        key === 'value' ||
        key === 'alt')
    ) {
      out[key] = tr(value, locale);
      continue;
    }
    if (key === 'items' && Array.isArray(value) && typeof value[0] === 'string') {
      out[key] = value.map((item) => tr(item, locale));
      continue;
    }
    if (key === 'links' && Array.isArray(value)) {
      out[key] = value.map((link) => ({
        ...link,
        label: typeof link.label === 'string' ? tr(link.label, locale) : link.label,
      }));
      continue;
    }
    out[key] = walk(value, locale);
  }
  return out;
}

function localizeTriple(triple) {
  if (!triple) return { en: '', zh: '', ja: '' };
  const key = dict[triple.en] ? triple.en : dict[triple.zh] ? triple.zh : triple.en || triple.zh || '';
  const e = dict[key];
  if (!e) return { en: triple.en, zh: triple.zh, ja: triple.ja };
  return {
    en: e.en ?? triple.en,
    zh: e.zh ?? triple.zh,
    ja: e.ja ?? triple.ja,
  };
}

function localizeMeta(meta) {
  return {
    ...meta,
    displayTitle: localizeTriple(meta.displayTitle),
    summary: localizeTriple(meta.summary),
    keywords: localizeTriple(meta.keywords),
    period: meta.period,
    category: localizeTriple(meta.category),
    ...(meta.institution ? { institution: localizeTriple(meta.institution) } : {}),
    roles: meta.roles.map((role) => {
      const labelKey = typeof role.label === 'string' ? role.label : role.label.en;
      const valueKey = typeof role.value === 'string' ? role.value : role.value.en;
      const le = dict[labelKey];
      const ve = dict[valueKey];
      return {
        ...(role.href ? { href: role.href } : {}),
        label: le
          ? { en: le.en ?? labelKey, zh: le.zh ?? labelKey, ja: le.ja ?? labelKey }
          : labelKey,
        value: ve
          ? { en: ve.en ?? valueKey, zh: ve.zh ?? valueKey, ja: ve.ja ?? valueKey }
          : valueKey,
      };
    }),
    disclaimer: localizeTriple(meta.disclaimer),
  };
}

for (const file of fs.readdirSync(detailsDir).filter((f) => f.endsWith('.json'))) {
  const p = path.join(detailsDir, file);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  const base = data.sections.en;
  const next = {
    ...data,
    meta: localizeMeta(data.meta),
    sections: {
      en: walk(base, 'en'),
      zh: walk(base, 'zh'),
      ja: walk(base, 'ja'),
    },
  };
  fs.writeFileSync(p, `${JSON.stringify(next, null, 2)}\n`);
  console.log('updated', file);
}

const missList = [...missing.entries()].sort((a, b) => b[0].length - a[0].length);
fs.mkdirSync(path.join(__dirname, 'research-i18n'), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, 'research-i18n/missing.json'),
  `${JSON.stringify(
    missList.map(([text, n]) => ({ n, len: text.length, han: /[\u4e00-\u9fff]/.test(text), text })),
    null,
    2,
  )}\n`,
);
console.log('missing unique strings:', missList.length);
