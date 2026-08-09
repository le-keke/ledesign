/**
 * Parse old ledesign/research/*.html (+ work/effectiveness.html)
 * → src/data/details/research/{slug}.json
 *
 * Same DetailBlock taxonomy as Work. Chrome meta lifts date / type /
 * Key Words / Summary|Abstract / end_role credits out of the feed.
 *
 * Usage: node scripts/parse-research-details.mjs [slug ...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'src/data/details/research');

const PROJECTS = [
  { slug: 'aigui', file: 'ledesign/research/aigui.html' },
  { slug: 'xr', file: 'ledesign/research/xr.html' },
  { slug: 'course', file: 'ledesign/research/course.html' },
  { slug: 'vr', file: 'ledesign/research/vr.html' },
  { slug: 'connotation', file: 'ledesign/research/connotation.html' },
  { slug: 'proactive', file: 'ledesign/research/proactive.html' },
  { slug: 'aipl', file: 'ledesign/research/aipl.html' },
  { slug: 'interaction', file: 'ledesign/research/interaction.html' },
  { slug: 'effectiveness', file: 'ledesign/work/effectiveness.html' },
  { slug: 'ugc', file: 'ledesign/research/ugc.html' },
];

const BG = {
  detail_bg_light: 'detail_bg_light',
  detail_bg_dark: 'detail_bg_dark',
  detail_bg_grey: 'detail_bg_grey',
};

const CHROME_KEYWORDS = /^(key\s*words|keywords)$/i;
const CHROME_SUMMARY = /^(summary|abstract)$/i;

function stripTags(s) {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTagsKeepBreaks(s) {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n+/g, '\n')
    .trim();
}

function stripLine(s) {
  return stripTags(s.replace(/<br\s*\/?>/gi, ' '));
}

function spacingFrom(classAttr = '') {
  return (classAttr.match(/spacing_(?:top|bottom)_(?:xlg|lg|md|min)/g) || []).filter(
    (v, i, a) => a.indexOf(v) === i,
  );
}

function hasMutedColor(html) {
  return /color\s*:\s*#?(?:666|999)\b/i.test(html);
}

function isMostlyMuted(inner) {
  if (!hasMutedColor(inner)) return false;
  if (/color\s*:\s*black\b/i.test(inner)) return false;
  return true;
}

function looksLikeListLines(lines) {
  if (lines.length < 2) return false;
  const numbered = lines.filter((l) => /^\d+[:.\-–]/.test(l) || /^\d+\./.test(l));
  return numbered.length >= 2;
}

function localeTriple(value) {
  return { en: value, zh: value, ja: value };
}

function extractDivInner(html, startIdx) {
  const openEnd = html.indexOf('>', startIdx) + 1;
  let depth = 1;
  let i = openEnd;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 4;
    } else {
      depth--;
      if (depth === 0) return { inner: html.slice(openEnd, nextClose), end: nextClose + 6 };
      i = nextClose + 6;
    }
  }
  return { inner: '', end: openEnd };
}

function pickVideoSrc(chunk) {
  const sources = [...chunk.matchAll(/<source\b[^>]*>/gi)]
    .map((m) => {
      const src = m[0].match(/data-src="([^"]+)"/i)?.[1] || m[0].match(/src="([^"]+)"/i)?.[1];
      const type = m[0].match(/type="([^"]+)"/i)?.[1] || '';
      return src ? { src, type } : null;
    })
    .filter(Boolean);
  if (!sources.length) {
    return (
      chunk.match(/<video\b[^>]*data-src="([^"]+)"/i)?.[1] ||
      chunk.match(/<video\b[^>]*src="([^"]+)"/i)?.[1] ||
      null
    );
  }
  const mp4 = sources.find((s) => /mp4/i.test(s.type) || /\.mp4(\?|$)/i.test(s.src));
  return (mp4 || sources[0]).src;
}

function mediaFrom(chunk) {
  const videos = [];
  for (const m of chunk.matchAll(/<video[\s\S]*?<\/video>/gi)) {
    const src = pickVideoSrc(m[0]);
    if (src) videos.push({ kind: 'video', src });
  }
  const imgs = [...chunk.matchAll(/<img\b[^>]*>/gi)]
    .map((m) => {
      const src =
        m[0].match(/data-src="([^"]+)"/i)?.[1] || m[0].match(/src="([^"]+)"/i)?.[1];
      const spacing = spacingFrom(m[0].match(/class="([^"]*)"/i)?.[1] || '');
      return src ? { kind: 'image', src, spacing } : null;
    })
    .filter(Boolean);
  return { videos, imgs };
}

function parseBodyBlocks(textBlock) {
  const results = [];
  const re = /<(ol|ul|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(textBlock))) {
    const tag = m[1].toLowerCase();
    const attrs = m[2] || '';
    const inner = m[3];
    const muted = isMostlyMuted(attrs + inner);

    if (tag === 'ol' || tag === 'ul') {
      const items = [...inner.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((li) =>
        stripLine(li[1]),
      );
      if (items.length) {
        results.push({ type: 'list', ordered: tag === 'ol', bare: false, muted, items });
      }
      continue;
    }

    const links = [...inner.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map(
      (a) => ({ href: a[1], label: stripTags(a[2]) }),
    );
    if (links.length && !stripTags(inner.replace(/<a\b[\s\S]*?<\/a>/gi, '')).trim()) {
      results.push({ type: 'links', links, muted: true });
      continue;
    }

    if (/<br\s*\/?>/i.test(inner)) {
      const lines = inner
        .split(/<br\s*\/?>/i)
        .map((part) => stripLine(part))
        .filter(Boolean);
      if (looksLikeListLines(lines) || lines.length > 1) {
        results.push({ type: 'list', ordered: true, bare: true, muted, items: lines });
        continue;
      }
    }

    const leadMutedSpan = inner.match(
      /^([\s\S]*?)<span\b[^>]*style="[^"]*#(?:666|999)[^"]*"[^>]*>([\s\S]*?)<\/span>\s*$/i,
    );
    if (leadMutedSpan) {
      const lead = stripTags(leadMutedSpan[1]);
      const body = stripTags(leadMutedSpan[2]);
      if (lead || body) {
        results.push({
          ...(lead ? { lead } : {}),
          body: lead ? body : stripTags(inner),
          ...(lead ? { bodyMuted: true } : { muted: true }),
        });
        continue;
      }
    }

    results.push({ body: stripTags(inner), muted });
  }
  return results;
}

/** Split a text column into { h5?, html } segments (h5 opens a segment). */
function splitTextSegments(textHtml) {
  if (!textHtml.trim()) return [];
  if (/<h1\b/i.test(textHtml) && !/<h5\b/i.test(textHtml) && !/<p\b/i.test(textHtml)) {
    return [{ h5: '', html: textHtml, isTitle: true }];
  }

  const parts = textHtml.split(/(?=<h5\b)/i);
  const segments = [];
  for (const part of parts) {
    if (!part.trim()) continue;
    const h5 = stripTags(part.match(/<h5\b[^>]*>([\s\S]*?)<\/h5>/i)?.[1] ?? '');
    const html = part.replace(/<h5\b[^>]*>[\s\S]*?<\/h5>/i, '');
    segments.push({ h5, html, isTitle: false });
  }

  /* Leading prose before first h5 (rare) */
  if (parts[0] && !/^<h5\b/i.test(parts[0].trim()) && /<(p|ol|ul)\b/i.test(parts[0])) {
    /* already handled as segment with empty h5 */
  }

  return segments;
}

function resolveBg(classes) {
  const bgKey = Object.keys(BG).find((k) => classes.includes(k));
  if (bgKey) return BG[bgKey];
  if (/\bdark_mode\b/.test(classes)) return 'detail_bg_dark';
  return 'detail_bg_light';
}

function extractChromeFromSegments(segments, meta, { keepAbstractInFeed = false } = {}) {
  const kept = [];
  for (const seg of segments) {
    if (seg.isTitle) continue;
    if (CHROME_KEYWORDS.test(seg.h5)) {
      const paragraphs = parseBodyBlocks(seg.html)
        .filter((p) => !('type' in p))
        .map((p) => p.body)
        .filter(Boolean);
      meta.keywords = paragraphs.join(', ') || paragraphs[0] || '';
      continue;
    }
    if (CHROME_SUMMARY.test(seg.h5)) {
      /*
       * Default: Summary / Abstract → right chrome.
       * effectiveness: Abstract stays in the left feed (too long for chrome).
       */
      if (keepAbstractInFeed) {
        kept.push(seg);
        continue;
      }
      const paragraphs = parseBodyBlocks(seg.html)
        .filter((p) => !('type' in p))
        .map((p) => p.body)
        .filter(Boolean);
      const text = paragraphs.join('\n\n');
      meta.summary = meta.summary ? `${meta.summary}\n\n${text}` : text;
      continue;
    }
    kept.push(seg);
  }
  return kept;
}

function parseResearchLine(chunk, classAttr, meta, options) {
  const spacing = spacingFrom(classAttr);
  const annotation =
    chunk.match(/<div class="line_annotation"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? null;
  const research =
    chunk.match(/<div class="line_research_img"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? null;
  const textHtml =
    chunk.match(/<div class="line_text_(?:en|ch)"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '';

  if (/<h1\b/i.test(textHtml)) {
    /* Title row — period / type already taken from first annotation in extractMeta */
    return [];
  }

  if (/detail_end|end_role|end_copyright/.test(chunk)) return [];

  let aside = { role: 'line_annotation', text: '' };
  if (research) {
    const imgs = mediaFrom(research).imgs.filter((img) => img.src);
    const videos = mediaFrom(research).videos;
    const medias = [...videos, ...imgs].map(({ kind, src }) => ({ kind, src }));
    if (medias.length === 1) {
      aside = { role: 'line_research_img', media: medias[0] };
    } else if (medias.length > 1) {
      aside = { role: 'line_research_img', media: medias[0], medias };
    } else {
      aside = { role: 'line_annotation', text: '' };
    }
  } else if (annotation !== null) {
    aside = { role: 'line_annotation', text: stripTags(annotation) };
  }

  const segments = extractChromeFromSegments(splitTextSegments(textHtml), meta, options);
  if (!segments.length) return [];

  const blocks = [];
  segments.forEach((seg, index) => {
    const paragraphs = parseBodyBlocks(seg.html);
    if (!seg.h5 && !paragraphs.length && !(index === 0 && aside.media)) return;

    const blockAside =
      index === 0
        ? aside
        : { role: 'line_annotation', text: '' };

    blocks.push({
      type: 'detail_line',
      spacing: index === 0 ? spacing : [],
      aside: blockAside,
      text: {
        ...(seg.h5 ? { h5: seg.h5 } : {}),
        paragraphs,
      },
    });
  });

  return blocks;
}

function parseBlocks(inner, meta, options = {}) {
  const blocks = [];
  const pieceRe =
    /<div class="((?:detail_line_image_double|detail_line_image|detail_line)(?:\s[^"]*)?)"[^>]*>/gi;
  const pieces = [];
  let pm;
  while ((pm = pieceRe.exec(inner))) {
    pieces.push({ classAttr: pm[1], index: pm.index });
  }

  for (let i = 0; i < pieces.length; i++) {
    const start = pieces[i].index;
    const end = i + 1 < pieces.length ? pieces[i + 1].index : inner.length;
    let chunk = inner.slice(start, end);
    const openEnd = chunk.indexOf('>') + 1;
    let depth = 1;
    let j = openEnd;
    let closeAt = chunk.length;
    while (j < chunk.length && depth > 0) {
      const no = chunk.indexOf('<div', j);
      const nc = chunk.indexOf('</div>', j);
      if (nc === -1) break;
      if (no !== -1 && no < nc) {
        depth++;
        j = no + 4;
      } else {
        depth--;
        if (depth === 0) {
          closeAt = nc + 6;
          break;
        }
        j = nc + 6;
      }
    }
    chunk = chunk.slice(0, closeAt);
    const classAttr = pieces[i].classAttr;
    let spacing = spacingFrom(classAttr);

    if (classAttr.startsWith('detail_line_image_double')) {
      const left = chunk.match(/line_double_img_left[\s\S]*?(?=line_double_img_right)/i)?.[0];
      const right = chunk.match(/line_double_img_right[\s\S]*/i)?.[0];
      const L = mediaFrom(left || '');
      const R = mediaFrom(right || '');
      const leftM = L.videos[0] || L.imgs[0];
      const rightM = R.videos[0] || R.imgs[0];
      if (leftM && rightM) {
        blocks.push({
          type: 'detail_line_image_double',
          spacing,
          left: { kind: leftM.kind, src: leftM.src },
          right: { kind: rightM.kind, src: rightM.src },
        });
      }
      continue;
    }

    if (classAttr.startsWith('detail_line_image')) {
      const { videos, imgs } = mediaFrom(chunk);
      const medias = [...videos, ...imgs];
      medias.forEach((media, idx) => {
        let sp = idx === 0 ? [...spacing] : [];
        if (media.spacing?.length) sp = [...new Set([...sp, ...media.spacing])];
        blocks.push({
          type: 'detail_line_image',
          spacing: sp,
          kind: media.kind,
          src: media.src,
          layout: 'content',
        });
      });
      continue;
    }

    if (classAttr.startsWith('detail_line')) {
      blocks.push(...parseResearchLine(chunk, classAttr, meta, options));
    }
  }

  return blocks.filter((block) => {
    if (block.type !== 'detail_line') return true;
    return (
      block.text.h5 ||
      block.aside.text ||
      block.aside.media ||
      (block.text.paragraphs && block.text.paragraphs.length)
    );
  });
}

function extractMeta(html) {
  const h1 = stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');

  /* First title-row annotation: date + optional institution + type */
  const titleLine =
    html.match(
      /<div class="detail_line[^"]*"[^>]*>\s*<div class="line_annotation"[^>]*>([\s\S]*?)<\/div>\s*<div class="line_text_(?:en|ch)"[^>]*>\s*<h1\b/i,
    )?.[1] || '';
  const annPs = [...titleLine.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((p) => stripTags(p[1]))
    .filter(Boolean);

  const period = annPs[0] || '';
  let category = '';
  let institution = '';
  if (annPs.length >= 3) {
    institution = annPs.slice(1, -1).join('\n');
    category = annPs[annPs.length - 1];
  } else if (annPs.length === 2) {
    category = annPs[1];
  }

  const roles = [];
  for (const m of html.matchAll(
    /<div class="end_role"[^>]*>\s*<h4[^>]*>([\s\S]*?)<\/h4>\s*<p\b[^>]*>([\s\S]*?)<\/p>/gi,
  )) {
    const label = stripTags(m[1]);
    const inner = m[2];
    const link = inner.match(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (link) {
      let linkLabel = stripTags(link[2]).replace(/\s+/g, ' ').trim();
      if (linkLabel && !/→/.test(linkLabel)) linkLabel = `${linkLabel} →`;
      roles.push({
        label,
        value: linkLabel || stripTagsKeepBreaks(inner),
        href: link[1],
      });
    } else {
      roles.push({ label, value: stripTagsKeepBreaks(inner) });
    }
  }

  const copyrightBlock =
    html.match(/<div class="end_copyright"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || '';
  const disclaimer = [...copyrightBlock.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((p) => stripTags(p[1]))
    .filter(Boolean)
    .join(' ');

  return {
    displayTitle: localeTriple(h1 || 'Research'),
    summary: '',
    keywords: '',
    period: localeTriple(period),
    category: localeTriple(category),
    ...(institution ? { institution: localeTriple(institution) } : {}),
    roles,
    disclaimer: localeTriple(disclaimer),
  };
}

function parseResearch(html, slug) {
  const meta = extractMeta(html);
  /* Mutable bag for Key Words / Summary while parsing feed */
  const chromeBag = { summary: '', keywords: '' };
  const options = { keepAbstractInFeed: slug === 'effectiveness' };

  const sections = [];
  const containerRe = /<div class="detail_container(?:\s+([^"]*))?"/g;
  let m;
  while ((m = containerRe.exec(html))) {
    const classes = m[1] || '';
    const bg = resolveBg(classes);
    const { inner } = extractDivInner(html, m.index);
    /* Research content sits in detail_content, not detail_abstract */
    const contentStart = inner.search(/<div class="detail_content\b/);
    const scope =
      contentStart >= 0 ? extractDivInner(inner, contentStart).inner : inner;
    const blocks = parseBlocks(scope, chromeBag, options);
    if (blocks.length) sections.push({ bg, blocks });
  }

  meta.summary = localeTriple(chromeBag.summary);
  meta.keywords = localeTriple(chromeBag.keywords);

  /*
   * Locale section trees — same structure; copy is filled/translated later.
   * Source language stays in the matching locale; others get translations.
   */
  const clone = () => JSON.parse(JSON.stringify(sections));
  return {
    slug,
    meta,
    sections: {
      en: clone(),
      zh: clone(),
      ja: clone(),
    },
  };
}

fs.mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const targets = args.length
  ? PROJECTS.filter((p) => args.includes(p.slug))
  : PROJECTS;

for (const project of targets) {
  const htmlPath = path.join(root, project.file);
  if (!fs.existsSync(htmlPath)) {
    console.warn(`skip ${project.slug}: missing ${project.file}`);
    continue;
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const data = parseResearch(html, project.slug);
  const outPath = path.join(outDir, `${project.slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  const enSections = data.sections.en;
  const blocks = enSections.reduce((n, s) => n + s.blocks.length, 0);
  const firstH5 = enSections[0]?.blocks[0]?.text?.h5 || '';
  console.log(
    `${project.slug}: ${enSections.length} sections, ${blocks} blocks → ${path.relative(root, outPath)}`,
  );
  console.log(
    `  title: ${data.meta.displayTitle.en.slice(0, 56)} | ${data.meta.period.en} | ${data.meta.category.en}`,
  );
  console.log(
    `  keywords: ${Boolean(data.meta.keywords.en)} summaryPs: ${data.meta.summary.en.split(/\n\n+/).filter(Boolean).length} roles: ${data.meta.roles.length} firstH5: ${firstH5}`,
  );
}
