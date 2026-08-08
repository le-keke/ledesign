/**
 * Parse old ledesign/work/*.html → src/data/details/{slug}.json
 * Same class taxonomy as the Taobao Vision port (detail_cover / detail_line / …).
 *
 * Usage: node scripts/parse-project-details.mjs [slug ...]
 * Default: all unlocked work projects with an HTML file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workDir = path.join(__dirname, '../ledesign/work');
const outDir = path.join(__dirname, '../src/data/details');

/** slug on new site → old HTML basename */
const PROJECTS = [
  { slug: 'taobaovp', file: 'taobaovp.html' },
  { slug: 'versionai', file: 'versionai.html' },
  { slug: 'taoweb', file: 'taoweb.html' },
  { slug: 'tisland', file: 'tisland.html' },
  { slug: 'fss', file: 'fss.html' },
  { slug: 'swap', file: 'swap.html' },
  { slug: 'automarket', file: 'automarket.html' },
  { slug: 'dscafe', file: 'dscafe.html' },
  { slug: 'sgmc', file: 'sgmc.html' },
  { slug: 'wine', file: 'wine.html' },
  { slug: 'sgimf', file: 'sgimf.html' },
];

const BG = {
  detail_bg_light: 'detail_bg_light',
  detail_bg_dark: 'detail_bg_dark',
  detail_bg_grey: 'detail_bg_grey',
  detail_bg_tbvp_dark: 'detail_bg_tbvp_dark',
  detail_bg_tbvp_grey: 'detail_bg_tbvp_grey',
  detail_bg_versionai_grey: 'detail_bg_versionai_grey',
  detail_bg_tbweb_grey: 'detail_bg_tbweb_grey',
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

/** Keep <br> as newlines (e.g. Design Team two-line value). */
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

function pickVideoSrc(chunk) {
  const sources = [...chunk.matchAll(/<source\b[^>]*>/gi)].map((m) => {
    const src = m[0].match(/data-src="([^"]+)"/i)?.[1] || m[0].match(/src="([^"]+)"/i)?.[1];
    const type = m[0].match(/type="([^"]+)"/i)?.[1] || '';
    return src ? { src, type } : null;
  }).filter(Boolean);
  if (!sources.length) {
    const src =
      chunk.match(/<video\b[^>]*data-src="([^"]+)"/i)?.[1] ||
      chunk.match(/<video\b[^>]*src="([^"]+)"/i)?.[1];
    return src || null;
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
        results.push({ type: 'list', ordered: true, bare: true, muted, items: lines });
        continue;
      }
    }

    /*
     * Important (black / default) + secondary (#666/#999) — same as Taobao Vision.
     * e.g. <span style="color: black;">Lead.</span><span style="color: #666;">…</span>
     * or   Lead text. <span style="color: #666;">secondary…</span>
     */
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

    const dual = [...inner.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi)];
    if (dual.length >= 2) {
      const texts = dual.map((s) => stripTags(s[2]));
      const firstMuted = hasMutedColor(dual[0][1] + dual[0][2]);
      const restMuted = hasMutedColor(dual.slice(1).map((s) => s[1] + s[2]).join(' '));
      /* black/default lead + muted body */
      if (!firstMuted && restMuted) {
        results.push({
          lead: texts[0],
          body: texts.slice(1).join(' ').replace(/^\s+/, ''),
          bodyMuted: true,
        });
        continue;
      }
      if (/\.$/.test(texts[0])) {
        results.push({
          lead: texts[0],
          body: texts.slice(1).join(' ').replace(/^\s+/, ''),
          bodyMuted: restMuted,
        });
        continue;
      }
    }

    /* Mixed: unstyled lead text + muted span already handled above.
     * Only mark whole block muted when every coloured span is muted
     * and there is no unstyled/black lead text before a muted span. */
    const hasPrimarySpan = /style="[^"]*(?:black|#111|#000)[^"]*"/i.test(inner);
    const wholeMuted = muted && !hasPrimarySpan && !/^[^<]+<span\b[^>]*#(?:666|999)/i.test(inner);
    results.push({ body: stripTags(inner), muted: wholeMuted });
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

function extractOrphan(html, startIdx) {
  const end = html.indexOf('</div>', startIdx);
  return html.slice(startIdx, end + 6);
}

function resolveBg(classes) {
  const bgKey = Object.keys(BG).find((k) => classes.includes(k));
  if (bgKey) return BG[bgKey];
  if (/\bdark_mode\b/.test(classes)) return 'detail_bg_dark';
  return 'detail_bg_light';
}

function parseBlocks(inner, { skipAbstractMeta = false } = {}) {
  const blocks = [];

  const coverImg = inner.match(
    /<div class="detail_cover"[^>]*>\s*<img\b[^>]*(?:src|data-src)="([^"]+)"[^>]*>/i,
  );
  if (coverImg) {
    blocks.push({ type: 'detail_cover', kind: 'image', src: coverImg[1], alt: '' });
  } else {
    const coverVid = inner.match(/<div class="detail_cover"[^>]*>([\s\S]*?)<\/div>/i);
    if (coverVid) {
      const src = pickVideoSrc(coverVid[1]);
      if (src) blocks.push({ type: 'detail_cover', kind: 'video', src, alt: '' });
    }
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
      const media = videos[0] || imgs[0];
      if (imgs[0]?.spacing?.length) spacing = [...new Set([...spacing, ...imgs[0].spacing])];
      if (media) {
        blocks.push({
          type: 'detail_line_image',
          spacing,
          kind: media.kind,
          src: media.src,
          layout: 'content',
        });
      }
      continue;
    }

    if (classAttr.startsWith('detail_line')) {
      if (skipAbstractMeta) {
        if (/<h1\b/i.test(chunk)) continue;
        /* category + summary row: annotation + body, no h5 */
        if (
          /line_annotation/.test(chunk) &&
          /line_text_en/.test(chunk) &&
          !/<h5\b/i.test(chunk) &&
          !/line_img_annotation|line_research_img/.test(chunk)
        ) {
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
      /* Awards → right chrome only */
      if (line.text.h5 === 'Awards' || /award\.png/i.test(line.aside.media?.src || '')) {
        continue;
      }
      blocks.push(line);
    }
  }

  return blocks;
}

function extractMeta(html) {
  const h1 = stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  const abstractStart = html.search(/<div class="detail_abstract\b/);
  const abstract =
    abstractStart >= 0 ? extractDivInner(html, abstractStart).inner : '';

  const annotations = [...abstract.matchAll(/<div class="line_annotation"[^>]*>([\s\S]*?)<\/div>/gi)].map(
    (m) =>
      [...m[1].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((p) => stripTags(p[1])).filter(Boolean),
  );
  const textBlocks = [...abstract.matchAll(/<div class="line_text_en"[^>]*>([\s\S]*?)<\/div>/gi)].map(
    (m) => m[1],
  );

  const period = annotations[0]?.[0] || '';
  const category = annotations[1]?.[0] || annotations[0]?.[1] || '';
  let summary = '';
  /** Optional published URL from abstract (own paragraph under the copy). */
  let summaryLink = null;
  for (const tb of textBlocks) {
    if (/<h1\b/i.test(tb)) continue;
    /* Principle / section rows belong in the feed, not chrome summary */
    if (/<h5\b/i.test(tb)) continue;
    const paragraphs = [];
    for (const pm of tb.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
      const inner = pm[1];
      const linkMatch = inner.match(
        /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i,
      );
      const withoutLink = stripTags(inner.replace(/<a\b[\s\S]*?<\/a>/gi, '')).trim();
      if (linkMatch && !withoutLink) {
        summaryLink = {
          href: linkMatch[1],
          label: stripTags(linkMatch[2]).replace(/\s+/g, ' ').trim(),
        };
        continue;
      }
      const text = stripTags(inner);
      if (text) paragraphs.push(text);
    }
    if (paragraphs.length || summaryLink) {
      summary = paragraphs.join('\n\n');
      break;
    }
  }

  const roles = [
    ...html.matchAll(
      /<div class="end_role"[^>]*>\s*<h4[^>]*>([\s\S]*?)<\/h4>\s*<p\b[^>]*>([\s\S]*?)<\/p>/gi,
    ),
  ].map((m) => ({
    label: stripTags(m[1]),
    value: stripTagsKeepBreaks(m[2]),
  }));

  let designLead = '';
  let team = '';
  for (const role of roles) {
    if (/design\s*lead|designer|researcher/i.test(role.label) && !designLead) {
      designLead = role.value;
    } else if (/team/i.test(role.label)) {
      team = role.value;
    }
    /* skip Published / Honor / Tutor etc. — not chrome team */
  }

  const copyrightBlock =
    html.match(/<div class="end_copyright"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || '';
  const disclaimer = [...copyrightBlock.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((p) => stripTags(p[1]))
    .filter(Boolean)
    .join(' ');

  /* Awards for right meta (feed Awards module is dropped) — keep href + → */
  const awardsChunk =
    html.match(/<h5[^>]*>\s*Awards\s*<\/h5>([\s\S]*?)(?=<div class="detail_|$)/i)?.[1] || '';
  const awardLinks = [
    ...awardsChunk.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi),
  ].map((a) => {
    let label = stripTags(a[2]).replace(/\s+/g, ' ').trim();
    if (label && !/→/.test(label)) label = `${label} →`;
    return { href: a[1], label };
  });
  const award = awardLinks.length
    ? awardLinks.map((l) => l.label.replace(/\s*→\s*$/, '').trim()).join('\n')
    : stripTags(
        awardsChunk.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)?.slice(1).join(' ') || '',
      );

  const localeTriple = (value) => ({ en: value, zh: value, ja: value });

  return {
    displayTitle: localeTriple(h1 || 'Project'),
    summary: localeTriple(summary),
    ...(summaryLink ? { summaryLink } : {}),
    period: localeTriple(period),
    category: localeTriple(category),
    designLead: localeTriple(designLead || 'Keke LE'),
    team: localeTriple(team),
    award: localeTriple(award),
    ...(awardLinks.length ? { awardLinks } : {}),
    disclaimer: localeTriple(disclaimer),
  };
}

function parseProject(html, slug) {
  const meta = extractMeta(html);
  const markers = [];
  const containerRe = /<div class="detail_container(?:\s+([^"]*))?"/g;
  let m;
  while ((m = containerRe.exec(html))) {
    markers.push({ kind: 'container', index: m.index, classes: m[1] || '' });
  }
  const orphanRe = /<div class="detail_line_image">/g;
  while ((m = orphanRe.exec(html))) {
    const lineStart = html.lastIndexOf('\n', m.index) + 1;
    const indent = html.slice(lineStart, m.index);
    if (indent === '        ') markers.push({ kind: 'orphan', index: m.index });
  }
  markers.sort((a, b) => a.index - b.index);

  function nextContainerBg(afterIndex) {
    for (const marker of markers) {
      if (marker.kind !== 'container' || marker.index <= afterIndex) continue;
      return resolveBg(marker.classes);
    }
    return 'detail_bg_light';
  }

  const sections = [];
  let skipFirstAbstract = true;

  for (const marker of markers) {
    if (marker.kind === 'orphan') {
      const chunk = extractOrphan(html, marker.index);
      const { videos, imgs } = mediaFrom(chunk);
      const media = videos[0] || imgs[0];
      if (!media) continue;
      sections.push({
        bg: nextContainerBg(marker.index),
        blocks: [
          {
            type: 'detail_line_image',
            spacing: [],
            kind: media.kind,
            src: media.src,
            layout: 'bleed',
          },
        ],
      });
      continue;
    }

    const bg = resolveBg(marker.classes);
    const { inner } = extractDivInner(html, marker.index);
    const isFirstWithCover = skipFirstAbstract && /detail_cover/.test(inner);
    const blocks = parseBlocks(inner, { skipAbstractMeta: isFirstWithCover });
    if (isFirstWithCover) skipFirstAbstract = false;
    if (!blocks.length) continue;
    sections.push({ bg, blocks });
  }

  /* Chrome polish already shipped for Taobao Vision */
  if (slug === 'taobaovp') {
    meta.displayTitle = { en: 'Taobao Vision', zh: 'Taobao Vision', ja: 'Taobao Vision' };
    meta.period = { en: '2024-2025', zh: '2024-2025', ja: '2024-2025' };
    meta.category = { en: 'XR, UX Design', zh: 'XR, UX Design', ja: 'XR, UX Design' };
  }

  return { slug, meta, sections };
}

fs.mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const targets = args.length
  ? PROJECTS.filter((p) => args.includes(p.slug))
  : PROJECTS;

for (const project of targets) {
  const htmlPath = path.join(workDir, project.file);
  if (!fs.existsSync(htmlPath)) {
    console.warn(`skip ${project.slug}: missing ${project.file}`);
    continue;
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const data = parseProject(html, project.slug);
  const outPath = path.join(outDir, `${project.slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  const blocks = data.sections.reduce((n, s) => n + s.blocks.length, 0);
  console.log(
    `${project.slug}: ${data.sections.length} sections, ${blocks} blocks → ${path.relative(process.cwd(), outPath)}`,
  );
  console.log(
    `  title: ${data.meta.displayTitle.en.slice(0, 60)} | period: ${data.meta.period.en} | cat: ${data.meta.category.en}`,
  );
}
