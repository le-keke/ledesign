import type { Locale } from '@i18n/index';

import coverLocal from '@assets/projects/taobaovp/cover.png?url';
import taobaovpSections from './taobaovp-sections.json';

/**
 * Background band — same names as old `detail_bg_*` classes.
 * Values live in `src/styles/detail.css`.
 */
export type DetailBg =
  | 'detail_bg_light'
  | 'detail_bg_dark'
  | 'detail_bg_tbvp_dark'
  | 'detail_bg_tbvp_grey';

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
  summary: Record<Locale, string>;
  period: Record<Locale, string>;
  category: Record<Locale, string>;
  designLead: Record<Locale, string>;
  team: Record<Locale, string>;
  award: Record<Locale, string>;
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

const summary =
  'Taobao is an online shopping platform product that brings a high-quality online shopping experience to morethan hundreds of milions of users. Taobao Vision provides complete shoppingfunctionality and fuly applies Vision Pro spatial computing, shared space, 3D, eye movement and bare handsfeatures to bring users a more intuitive, immersive, open and enjoyable shopping experience.';

const team =
  'MPID Multi-platforms Innovation Design Taobao Design Sub-unit, Alibaba Group';

const award =
  'iF Design Award - User Experience (UX)\nRed Dot Award - User Experience Design\nApple Design Award - Interaction';

const disclaimer =
  'Alibaba Group © All rights reserved. The certain content or data have been hidden due to the undisclosure agreement.';

const taobaovpParsed = (taobaovpSections as DetailSection[]).map((section) => ({
  ...section,
  blocks: section.blocks.map((block) => {
    if (block.type === 'detail_cover' && block.src === BLOB_COVER) {
      return { ...block, src: coverLocal, alt: 'Taobao Vision spatial shopping cover' };
    }
    return block;
  }),
}));

export const projectDetails: ProjectDetail[] = [
  {
    slug: 'taobaovp',
    meta: {
      displayTitle: {
        en: 'Taobao Vision',
        zh: 'Taobao Vision',
        ja: 'Taobao Vision',
      },
      summary: { en: summary, zh: summary, ja: summary },
      period: { en: '2024-2025', zh: '2024-2025', ja: '2024-2025' },
      category: { en: 'XR, UX Design', zh: 'XR, UX Design', ja: 'XR, UX Design' },
      designLead: { en: 'Keke LE', zh: 'Keke LE', ja: 'Keke LE' },
      team: { en: team, zh: team, ja: team },
      award: { en: award, zh: award, ja: award },
      disclaimer: { en: disclaimer, zh: disclaimer, ja: disclaimer },
    },
    sections: taobaovpParsed,
  },
];

export function getProjectDetail(slug: string) {
  return projectDetails.find((detail) => detail.slug === slug);
}
