/**
 * Parse old ledesign/work/taobaovp.html → JSON that keeps the old class taxonomy.
 * New site only remaps token values (spacing / type / color / feed width).
 *
 * Block types (= old classes):
 *   detail_cover | detail_line | detail_line_image | detail_line_image_double
 * Aside roles:
 *   line_annotation | line_img_annotation | line_research_img | (empty)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, '../ledesign/work/taobaovp.html');
const outPath = path.join(__dirname, '../src/data/taobaovp-sections.json');

const html = fs.readFileSync(htmlPath, 'utf8');

/** Old bg class → tone key (CSS still uses detail_bg_* names in the page). */
const BG = {
  detail_bg_light: 'detail_bg_light',
  detail_bg_dark: 'detail_bg_dark',
  detail_bg_tbvp_dark: 'detail_bg_tbvp_dark',
  detail_bg_tbvp_grey: 'detail_bg_tbvp_grey',
};

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

function spacingFrom(classAttr = '') {
  return (classAttr.match(/spacing_(?:top|bottom)_(?:xlg|lg|md|min)/g) || []).filter(
    (v, i, a) => a.indexOf(v) === i,
  );
}

function mediaFrom(chunk) {
  const videos = [...chunk.matchAll(/<video[\s\S]*?<\/video>/gi)]
    .map((m) => {
      const src =
        m[0].match(/data-src="([^"]+)"/i)?.[1] || m[0].match(/src="([^"]+)"/i)?.[1];
      return src ? { kind: 'video', src } : null;
    })
    .filter(Boolean);

  const imgs = [...chunk.matchAll(/<img\b[^>]*>/gi)]
    .map((m) => {
      const src =
        m[0].match(/data-src="([^"]+)"/i)?.[1] || m[0].match(/src="([^"]+)"/i)?.[1];
      return src ? { kind: 'image', src } : null;
    })
    .filter(Boolean);

  return { videos, imgs };
}

function stripLine(s) {
  return stripTags(s.replace(/<br\s*\/?>/gi, ' '));
}

/** Numbered / caption lines that old HTML split with <br> inside <p>. */
function looksLikeListLines(lines) {
  if (lines.length < 2) return false;
  const numbered = lines.filter((l) => /^\d+[:.\-–]/.test(l) || /^\d+\./.test(l));
  return numbered.length >= 2;
}

/** Old inline #666 / #999 → muted; default inherit = primary (black / white). */
function hasMutedColor(html) {
  return /color\s*:\s*#?(?:666|999)\b/i.test(html);
}

function isMostlyMuted(inner) {
  if (!hasMutedColor(inner)) return false;
  /* lead(black)+body(#666) is mixed — not wholly muted */
  if (/color\s*:\s*black\b/i.test(inner)) return false;
  return true;
}

/**
 * Walk line_text_en body in order: real <ol>/<ul>/<li>, or <p> (incl. <br> lists).
 * Preserve old emphasis: default primary; only #666/#999 → muted.
 */
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
        results.push({
          type: 'list',
          ordered: tag === 'ol',
          bare: false,
          muted,
          items,
        });
      }
      continue;
    }

    /* <p> */
    const links = [...inner.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)].map(
      (a) => ({ href: a[1], label: stripTags(a[2]) }),
    );
    if (links.length) {
      results.push({ type: 'links', links, muted: true });
      continue;
    }

    if (/<br\s*\/?>/i.test(inner)) {
      const lines = inner
        .split(/<br\s*\/?>/i)
        .map((part) => stripLine(part))
        .filter(Boolean);
      if (looksLikeListLines(lines) || lines.length > 1) {
        results.push({
          type: 'list',
          ordered: true,
          bare: true,
          muted,
          items: lines,
        });
        continue;
      }
    }

    /* 1-Directly Reach. <span style="#999">…</span> — lead primary, body muted */
    const leadSpan = inner.match(
      /^([\s\S]*?)<span\b[^>]*style="[^"]*#999[^"]*"[^>]*>([\s\S]*?)<\/span>\s*$/i,
    );
    if (leadSpan) {
      results.push({
        lead: stripTags(leadSpan[1]),
        body: stripTags(leadSpan[2]),
        bodyMuted: true,
      });
      continue;
    }

    /* Familiar. (black) + body (#666) */
    const dual = [...inner.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi)];
    if (dual.length >= 2) {
      const texts = dual.map((s) => stripTags(s[2]));
      if (/\.$/.test(texts[0])) {
        results.push({
          lead: texts[0],
          body: texts.slice(1).join(' ').replace(/^\s+/, ''),
          bodyMuted: hasMutedColor(dual.slice(1).map((s) => s[1] + s[2]).join(' ')),
        });
        continue;
      }
    }

    results.push({ body: stripTags(inner), muted });
  }
  return results;
}

function parseDetailLine(chunk, classAttr) {
  const spacing = spacingFrom(classAttr);
  const annotation =
    chunk.match(/<div class="line_annotation"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? null;
  const imgAnnotation =
    chunk.match(/<div class="line_img_annotation"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? null;
  const research =
    chunk.match(/<div class="line_research_img"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? null;
  const textEn =
    chunk.match(/<div class="line_text_en"[^>]*>([\s\S]*?)<\/div>/i)?.[1] ?? '';

  let aside = { role: 'line_annotation', text: '' };
  if (research) {
    const img = mediaFrom(research).imgs[0];
    aside = { role: 'line_research_img', media: img };
  } else if (imgAnnotation !== null) {
    aside = { role: 'line_img_annotation', text: stripTags(imgAnnotation) };
  } else if (annotation !== null) {
    aside = { role: 'line_annotation', text: stripTags(annotation) };
  }

  const h5 = stripTags(textEn.match(/<h5\b[^>]*>([\s\S]*?)<\/h5>/i)?.[1] ?? '') || undefined;
  const paragraphs = parseBodyBlocks(textEn);

  return {
    type: 'detail_line',
    spacing,
    aside,
    text: { h5, paragraphs },
  };
}

function extractDivInner(startIdx) {
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

function extractOrphan(startIdx) {
  const end = html.indexOf('</div>', startIdx);
  return html.slice(startIdx, end + 6);
}

function parseBlocks(inner, { skipAbstractMeta = false } = {}) {
  const blocks = [];
  const cover = inner.match(
    /<div class="detail_cover"\s*>\s*<img\b[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i,
  );
  if (cover) {
    blocks.push({ type: 'detail_cover', kind: 'image', src: cover[1], alt: 'Taobao Vision cover' });
  }

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
    const spacing = spacingFrom(classAttr);

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
          left: leftM,
          right: rightM,
        });
      }
      continue;
    }

    if (classAttr.startsWith('detail_line_image')) {
      const { videos, imgs } = mediaFrom(chunk);
      const media = videos[0] || imgs[0];
      if (media) {
        blocks.push({
          type: 'detail_line_image',
          spacing,
          kind: media.kind,
          src: media.src,
          /* old in-content image — feed width in new layout */
          layout: 'content',
        });
      }
      continue;
    }

    if (classAttr.startsWith('detail_line')) {
      if (skipAbstractMeta) {
        if (/<h1\b/i.test(chunk)) continue;
        if (/UX Design/.test(chunk) && /line_text_en/.test(chunk) && !/<h5\b/i.test(chunk)) {
          continue;
        }
      }
      if (/detail_end|end_role|end_copyright/.test(chunk)) continue;

      const line = parseDetailLine(chunk, classAttr);
      if (
        !line.text.h5 &&
        !line.aside.text &&
        !line.aside.media &&
        !(line.text.paragraphs && line.text.paragraphs.length)
      ) {
        continue;
      }
      /* Awards live in the right chrome meta — drop the feed module. */
      if (line.text.h5 === 'Awards' || /award\.png/i.test(line.aside.media?.src || '')) {
        continue;
      }
      blocks.push(line);
    }
  }

  return blocks;
}

const markers = [];
const containerRe = /<div class="detail_container\s+([^"]+)"/g;
let m;
while ((m = containerRe.exec(html))) {
  markers.push({ kind: 'container', index: m.index, classes: m[1] });
}
const orphanRe = /<div class="detail_line_image">/g;
while ((m = orphanRe.exec(html))) {
  const lineStart = html.lastIndexOf('\n', m.index) + 1;
  const indent = html.slice(lineStart, m.index);
  if (indent === '        ') markers.push({ kind: 'orphan', index: m.index });
}
markers.sort((a, b) => a.index - b.index);

/** Next container bg after index, for orphan bleeds that had no own bg in old HTML. */
function nextContainerBg(afterIndex) {
  for (const marker of markers) {
    if (marker.kind !== 'container' || marker.index <= afterIndex) continue;
    const bgKey = Object.keys(BG).find((k) => marker.classes.includes(k));
    return bgKey ? BG[bgKey] : 'detail_bg_light';
  }
  return 'detail_bg_light';
}

const sections = [];
let skipFirstAbstract = true;

for (const marker of markers) {
  if (marker.kind === 'orphan') {
    const chunk = extractOrphan(marker.index);
    const { videos, imgs } = mediaFrom(chunk);
    const media = videos[0] || imgs[0];
    if (!media) continue;
    /*
     * Old orphans sat outside detail_container (no band class). In the new
     * full-bleed-band model, inherit the following section’s bg so image
     * bleeds before grey panels aren’t stuck on black.
     */
    const bg = nextContainerBg(marker.index);
    sections.push({
      bg,
      blocks: [
        {
          type: 'detail_line_image',
          spacing: [],
          kind: media.kind,
          src: media.src,
          /* old full-window → new feed-width cover-like */
          layout: 'bleed',
        },
      ],
    });
    continue;
  }

  const classes = marker.classes;
  const bgKey = Object.keys(BG).find((k) => classes.includes(k));
  const bg = bgKey ? BG[bgKey] : 'detail_bg_light';
  const { inner } = extractDivInner(marker.index);
  const isFirstLight =
    skipFirstAbstract && bg === 'detail_bg_light' && /detail_cover/.test(inner);
  const blocks = parseBlocks(inner, { skipAbstractMeta: isFirstLight });
  if (isFirstLight) skipFirstAbstract = false;
  if (!blocks.length) continue;
  sections.push({ bg, blocks });
}

fs.writeFileSync(outPath, JSON.stringify(sections, null, 2));
console.log(
  `Wrote ${sections.length} sections, ${sections.reduce((n, s) => n + s.blocks.length, 0)} blocks`,
);
for (const [i, s] of sections.slice(0, 4).entries()) {
  console.log(
    i,
    s.bg,
    s.blocks.map((b) => b.type).join(', '),
  );
}
