import type { Locale } from '@i18n/index';
import type { DetailSection } from '@data/project-details';

import aigui from './details/research/aigui.json';
import aipl from './details/research/aipl.json';
import connotation from './details/research/connotation.json';
import course from './details/research/course.json';
import effectiveness from './details/research/effectiveness.json';
import interaction from './details/research/interaction.json';
import proactive from './details/research/proactive.json';
import ugc from './details/research/ugc.json';
import vr from './details/research/vr.json';
import xr from './details/research/xr.json';

export interface ResearchRole {
  label: string | Record<Locale, string>;
  value: string | Record<Locale, string>;
  href?: string;
}

export interface ResearchDetailMeta {
  displayTitle: Record<Locale, string>;
  /** Abstract / Summary paragraphs (`\n\n`). Empty when body holds the abstract. */
  summary: Record<Locale, string>;
  keywords: Record<Locale, string>;
  period: Record<Locale, string>;
  category: Record<Locale, string>;
  institution?: Record<Locale, string>;
  roles: ResearchRole[];
  disclaimer: Record<Locale, string>;
}

export interface ResearchDetail {
  slug: string;
  meta: ResearchDetailMeta;
  /** Per-locale feed trees (media shared by copy; prose localized). */
  sections: Record<Locale, DetailSection[]>;
}

export const researchDetails: ResearchDetail[] = [
  aigui,
  xr,
  course,
  vr,
  connotation,
  proactive,
  aipl,
  interaction,
  effectiveness,
  ugc,
] as ResearchDetail[];

export function getResearchDetail(slug: string) {
  return researchDetails.find((detail) => detail.slug === slug);
}

export function getResearchSections(detail: ResearchDetail, locale: Locale): DetailSection[] {
  return detail.sections[locale] ?? detail.sections.en ?? [];
}

export function localizeRoleField(
  value: string | Record<Locale, string> | undefined,
  locale: Locale,
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] || value.en || '';
}
