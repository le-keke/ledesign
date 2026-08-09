/**
 * Apply en→{zh,ja} dict to sections.zh / sections.ja in a work detail JSON.
 * Usage: node scripts/work-i18n/apply-dict.mjs <slug> [dict.json]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const slug = process.argv[2];
const dictPath = process.argv[3] || path.join(__dirname, 'dict', `${slug}.json`);

if (!slug) {
  console.error('Usage: node apply-dict.mjs <slug> [dict.json]');
  process.exit(1);
}

const detailPath = path.join(__dirname, '../../src/data/details', `${slug}.json`);
const detail = JSON.parse(fs.readFileSync(detailPath, 'utf8'));
const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

const SKIP_KEYS = new Set(['type', 'bg', 'kind', 'src', 'layout', 'role', 'poster', 'href']);

function translateString(v, locale) {
  if (!v.trim()) return v;
  if (/^https?:/.test(v)) return v;
  if (/^detail_/.test(v) || /^spacing_/.test(v)) return v;
  if (['image', 'video', 'bleed', 'content', 'left', 'right'].includes(v)) return v;
  return dict[v]?.[locale] ?? v;
}

function localize(node, locale, parentKey = '') {
  if (typeof node === 'string') {
    if (SKIP_KEYS.has(parentKey)) return node;
    return translateString(node, locale);
  }
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((n) => localize(n, locale, parentKey));
  const out = {};
  for (const [k, v] of Object.entries(node)) {
    out[k] = localize(v, locale, k);
  }
  return out;
}

detail.sections.zh = localize(structuredClone(detail.sections.en), 'zh');
detail.sections.ja = localize(structuredClone(detail.sections.en), 'ja');
fs.writeFileSync(detailPath, JSON.stringify(detail, null, 2) + '\n');

let missing = [];
function findMissing(node, parentKey = '') {
  if (typeof node === 'string') {
    if (SKIP_KEYS.has(parentKey)) return;
    if (!node.trim() || /^https?:/.test(node) || /^detail_/.test(node) || /^spacing_/.test(node)) return;
    if (['image', 'video', 'bleed', 'content', 'left', 'right'].includes(node)) return;
    if (!dict[node]?.zh || !dict[node]?.ja) missing.push(node);
    return;
  }
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((n) => findMissing(n, parentKey));
  for (const [k, v] of Object.entries(node)) findMissing(v, k);
}
findMissing(detail.sections.en);
console.log('applied', slug, 'dict', Object.keys(dict).length, 'missing', missing.length);
if (missing.length) console.log(missing.slice(0, 20));
