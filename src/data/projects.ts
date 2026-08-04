import type { Locale } from '@i18n/index';

export type ProjectCategory = 'work' | 'research';

export interface Project {
  slug: string;
  category: ProjectCategory;
  /** When true, listed but not linkable (matches old-site locked cards). */
  locked?: boolean;
  title: Record<Locale, string>;
}

/**
 * Placeholder covers for P1 grid rhythm (4 per row @ 1440).
 * Replaced with real projects / assets in later phases.
 */
export const projects: Project[] = Array.from({ length: 12 }, (_, index) => {
  const n = index + 1;
  return {
    slug: `placeholder-${n}`,
    category: 'work' as const,
    title: {
      en: `Project ${n}`,
      zh: `项目 ${n}`,
      ja: `プロジェクト ${n}`,
    },
  };
});

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
