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
      zh: '构建面向 AIGUI 的 AI 友好设计系统',
      ja: 'AIGUIのためのAI親和デザインシステムの構築',
    },
    kind: {
      en: 'Article, Alibaba Design',
      zh: '文章，阿里巴巴设计',
      ja: '記事、Alibaba Design',
    },
    date: '2026.2',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'xr',
    title: {
      en: 'Efficiency-Oriented XR Design Principle for E-Retail Scenario',
      zh: '效率导向的 XR 设计原则',
      ja: '効率志向のXRデザイン原則',
    },
    kind: {
      en: 'Article, Alibaba Design',
      zh: '文章，阿里巴巴设计',
      ja: '記事、Alibaba Design',
    },
    date: '2023.2',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'course',
    title: {
      en: 'Information and Interaction Design Theory and Practice',
      zh: '信息与交互设计理论与实践',
      ja: '情報とインタラクションデザインの理論と実践',
    },
    kind: {
      en: 'Course, Zhejiang University, China Academy of Art',
      zh: '课程，浙江大学、中国美术学院',
      ja: 'コース、浙江大学・中国美術学院',
    },
    date: '2022.5',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'vr',
    title: {
      en: 'VR-Video Interaction and Technology Application in E-Retail Field',
      zh: '电商领域的 VR 视频交互与技术应用',
      ja: 'EC領域におけるVR動画インタラクションと技術応用',
    },
    kind: {
      en: 'Article, Alibaba Design',
      zh: '文章，阿里巴巴设计',
      ja: '記事、Alibaba Design',
    },
    date: '2022.2',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'connotation',
    title: {
      en: 'A Discussion on the Connotation of Design and Aesthetic Cognition',
      zh: '设计内涵与审美认知刍议',
      ja: 'デザインの内包と美的認知についての考察',
    },
    kind: {
      en: 'Article',
      zh: '文章',
      ja: '記事',
    },
    date: '2020.7',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'proactive',
    title: {
      en: 'The Theoretical Explanation of Proactive Interaction',
      zh: '主动前摄性交互的理论阐释',
      ja: 'プロアクティブ・インタラクションの理論的説明',
    },
    kind: {
      en: 'Article',
      zh: '文章',
      ja: '記事',
    },
    date: '2018.4',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'aipl',
    title: {
      en: "The Design Method of Brand's Customer Growth Based on AIPL Theory",
      zh: '基于 AIPL 理论的品牌客户增长产品设计方法',
      ja: 'AIPL理論に基づくブランド顧客成長製品のデザイン方法',
    },
    kind: {
      en: 'Article, Alibaba Design',
      zh: '文章，阿里巴巴设计',
      ja: '記事、Alibaba Design',
    },
    date: '2018.1',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'interaction',
    title: {
      en: 'Review of the Basic Concepts of Interaction Design',
      zh: '交互设计基本概念梳理',
      ja: 'インタラクションデザインの基本概念の整理',
    },
    kind: {
      en: 'Article',
      zh: '文章',
      ja: '記事',
    },
    date: '2017.8',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'effectiveness',
    title: {
      en: 'Research on The Evolvement of Theory and Method of Design Effectiveness Evaluation',
      zh: '设计实效评价理论与方法演进研究',
      ja: 'デザイン実効評価の理論と方法の展開研究',
    },
    kind: {
      en: 'Dissertation, Tongji University D&I',
      zh: '学位论文，同济大学设计创意学院',
      ja: '学位論文、同済大学デザイン創意学院',
    },
    date: '2017.6',
    hoverCover: researchHoverDemo,
  },
  {
    slug: 'ugc',
    title: {
      en: 'UGC Product Design Philosophy behind the Great Design Iteration of Instagram',
      zh: 'Instagram 重大设计迭代背后的 UGC 产品设计哲学',
      ja: 'Instagramの大規模デザイン反復の背後にあるUGC製品デザイン哲学',
    },
    kind: {
      en: 'Article',
      zh: '文章',
      ja: '記事',
    },
    date: '2016.5',
    hoverCover: researchHoverDemo,
  },
];
