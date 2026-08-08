import type { Locale } from '@i18n/index';

import researchHoverDemo from '@assets/covers/research-hover-demo.png?url';

export interface ResearchItem {
  slug: string;
  title: Record<Locale, string>;
  /** Grey line: type + source, e.g. "Article, Alibaba Design". */
  kind: Record<Locale, string>;
  date: string;
  /**
   * Shown on hover in place of the title card.
   * Demo image for now — replace per slug when real research covers land.
   */
  hoverCover: string;
}

/**
 * Home Research feed — order matches old-site `research.html` (newest first).
 * Card layout from Figma `home-research` (1332:2): title + kind + date.
 */
export const researchItems: ResearchItem[] = [
  {
    slug: 'aigui',
    title: {
      en: 'Building an AI-Friendly Design System for AIGUI',
      zh: 'Building an AI-Friendly Design System for AIGUI',
      ja: 'Building an AI-Friendly Design System for AIGUI',
    },
    kind: {
      en: 'Article, Alibaba Design',
      zh: 'Article, Alibaba Design',
      ja: 'Article, Alibaba Design',
    },
    date: '2026.2',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'xr',
    title: {
      en: 'Efficiency-Oriented XR Design Principle for E-Retail Scenario',
      zh: 'Efficiency-Oriented XR Design Principle for E-Retail Scenario',
      ja: 'Efficiency-Oriented XR Design Principle for E-Retail Scenario',
    },
    kind: {
      en: 'Article, Alibaba Design',
      zh: 'Article, Alibaba Design',
      ja: 'Article, Alibaba Design',
    },
    date: '2023.2',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'course',
    title: {
      en: 'Information and Interaction Design Theory and Practice',
      zh: 'Information and Interaction Design Theory and Practice',
      ja: 'Information and Interaction Design Theory and Practice',
    },
    kind: {
      en: 'Course, Zhejiang University, China Academy of Art',
      zh: 'Course, Zhejiang University, China Academy of Art',
      ja: 'Course, Zhejiang University, China Academy of Art',
    },
    date: '2022.5',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'vr',
    title: {
      en: 'VR-Video Interaction and Technology Application in E-Retail Field',
      zh: 'VR-Video Interaction and Technology Application in E-Retail Field',
      ja: 'VR-Video Interaction and Technology Application in E-Retail Field',
    },
    kind: {
      en: 'Article, Alibaba Design',
      zh: 'Article, Alibaba Design',
      ja: 'Article, Alibaba Design',
    },
    date: '2022.2',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'connotation',
    title: {
      en: 'A Discussion on the Connotation of Design and Aesthetic Cognition',
      zh: 'A Discussion on the Connotation of Design and Aesthetic Cognition',
      ja: 'A Discussion on the Connotation of Design and Aesthetic Cognition',
    },
    kind: {
      en: 'Article',
      zh: 'Article',
      ja: 'Article',
    },
    date: '2020.7',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'proactive',
    title: {
      en: 'The Theoretical Explanation of Proactive Interaction',
      zh: 'The Theoretical Explanation of Proactive Interaction',
      ja: 'The Theoretical Explanation of Proactive Interaction',
    },
    kind: {
      en: 'Article',
      zh: 'Article',
      ja: 'Article',
    },
    date: '2018.4',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'aipl',
    title: {
      en: "The Design Method of Brand's Customer Growth Based on AIPL Theory",
      zh: "The Design Method of Brand's Customer Growth Based on AIPL Theory",
      ja: "The Design Method of Brand's Customer Growth Based on AIPL Theory",
    },
    kind: {
      en: 'Article, Alibaba Design',
      zh: 'Article, Alibaba Design',
      ja: 'Article, Alibaba Design',
    },
    date: '2018.1',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'interaction',
    title: {
      en: 'Review of the Basic Concepts of Interaction Design',
      zh: 'Review of the Basic Concepts of Interaction Design',
      ja: 'Review of the Basic Concepts of Interaction Design',
    },
    kind: {
      en: 'Article',
      zh: 'Article',
      ja: 'Article',
    },
    date: '2017.8',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'effectiveness',
    title: {
      en: 'Research on The Evolvement of Theory and Method of Design Effectiveness Evaluation',
      zh: 'Research on The Evolvement of Theory and Method of Design Effectiveness Evaluation',
      ja: 'Research on The Evolvement of Theory and Method of Design Effectiveness Evaluation',
    },
    kind: {
      en: 'Dissertation, Tongji University D&I',
      zh: 'Dissertation, Tongji University D&I',
      ja: 'Dissertation, Tongji University D&I',
    },
    date: '2017.6',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'ugc',
    title: {
      en: 'UGC Product Design Philosophy behind the Great Design Iteration of Instagram',
      zh: 'UGC Product Design Philosophy behind the Great Design Iteration of Instagram',
      ja: 'UGC Product Design Philosophy behind the Great Design Iteration of Instagram',
    },
    kind: {
      en: 'Article',
      zh: 'Article',
      ja: 'Article',
    },
    date: '2016.5',
    hoverCover: researchHoverDemo,
  },
];
