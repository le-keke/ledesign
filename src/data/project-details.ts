import type { Locale } from '@i18n/index';

import coverLocal from '@assets/projects/taobaovp/cover.png?url';

import automarket from './details/automarket.json';
import dscafe from './details/dscafe.json';
import fss from './details/fss.json';
import sgimf from './details/sgimf.json';
import sgmc from './details/sgmc.json';
import swap from './details/swap.json';
import taobaovp from './details/taobaovp.json';
import taoweb from './details/taoweb.json';
import tisland from './details/tisland.json';
import versionai from './details/versionai.json';
import wine from './details/wine.json';

/**
 * Background band — same names as old `detail_bg_*` classes.
 * Values live in `src/styles/detail.css`.
 */
export type DetailBg =
  | 'detail_bg_light'
  | 'detail_bg_dark'
  | 'detail_bg_grey'
  | 'detail_bg_tbvp_dark'
  | 'detail_bg_tbvp_grey'
  | 'detail_bg_versionai_grey'
  | 'detail_bg_tbweb_grey';

export type DetailSpacing =
  | 'spacing_bottom_lg'
  | 'spacing_bottom_md'
  | 'spacing_bottom_min'
  | 'spacing_top_xlg'
  | 'spacing_top_lg'
  | 'spacing_top_md'
  | 'spacing_top_min';

export interface ProjectDetailMeta {
  displayTitle: Record<Locale, string>;
  /** Paragraphs joined with blank lines (`\n\n`). */
  summary: Record<Locale, string>;
  /** Published URL under the summary (e.g. tmall-design.com →). */
  summaryLink?: { href: string; label: string };
  period: Record<Locale, string>;
  category: Record<Locale, string>;
  designLead: Record<Locale, string>;
  team: Record<Locale, string>;
  /** Plain award lines (fallback when no links). */
  award: Record<Locale, string>;
  /** Clickable awards for chrome (href + label with →). */
  awardLinks?: { href: string; label: string }[];
  disclaimer: Record<Locale, string>;
}

export type DetailMedia = {
  kind: 'image' | 'video';
  src: string;
  alt?: string;
};

export type DetailParagraph =
  | {
      lead?: string;
      body: string;
      /** whole block muted (#666/#999 in old HTML) */
      muted?: boolean;
      /** body span muted while lead stays primary */
      bodyMuted?: boolean;
    }
  | { type: 'links'; links: { href: string; label: string }[]; muted?: boolean }
  | {
      type: 'list';
      ordered?: boolean;
      /** true = numbers already in item text (old <br> captions); hide markers */
      bare?: boolean;
      muted?: boolean;
      items: string[];
    };

/**
 * Block types mirror old HTML classes 1:1 so other projects can port by structure.
 * New layout only changes CSS values (gutter, type, feed width for former bleeds).
 */
export type DetailBlock =
  | {
      type: 'detail_cover';
      kind?: 'image' | 'video';
      src: string;
      alt?: string;
    }
  | {
      type: 'detail_line_image';
      kind: 'image' | 'video';
      src: string;
      /** old full-window vs in-content — both render feed-width now */
      layout?: 'bleed' | 'content';
      spacing?: DetailSpacing[];
    }
  | {
      type: 'detail_line_image_double';
      left: DetailMedia;
      right: DetailMedia;
      spacing?: DetailSpacing[];
    }
  | {
      type: 'detail_line';
      aside: {
        role: 'line_annotation' | 'line_img_annotation' | 'line_research_img';
        text?: string;
        media?: DetailMedia;
      };
      text: {
        h5?: string;
        paragraphs: DetailParagraph[];
      };
      spacing?: DetailSpacing[];
    };

export interface DetailSection {
  bg: DetailBg;
  blocks: DetailBlock[];
}

export interface ProjectDetail {
  slug: string;
  meta: ProjectDetailMeta;
  sections: DetailSection[];
}

const BLOB_COVER =
  'https://fwzntx71hl6v6inl.public.blob.vercel-storage.com/taobaovp/cover.png';

function asDetail(raw: ProjectDetail): ProjectDetail {
  if (raw.slug !== 'taobaovp') return raw;
  return {
    ...raw,
    sections: raw.sections.map((section) => ({
      ...section,
      blocks: section.blocks.map((block) => {
        if (block.type === 'detail_cover' && block.src === BLOB_COVER) {
          return { ...block, src: coverLocal, alt: 'Taobao Vision spatial shopping cover' };
        }
        return block;
      }),
    })),
  };
}

export const projectDetails: ProjectDetail[] = [
  taobaovp,
  versionai,
  taoweb,
  tisland,
  fss,
  swap,
  automarket,
  dscafe,
  sgmc,
  wine,
  sgimf,
].map((raw) => asDetail(raw as ProjectDetail));

export function getProjectDetail(slug: string) {
  return projectDetails.find((detail) => detail.slug === slug);
}
