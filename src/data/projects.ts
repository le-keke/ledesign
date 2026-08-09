import type { Locale } from '@i18n/index';

import cover360 from '@assets/covers/360.png?url';
import coverAutomarket from '@assets/covers/automarket.jpg?url';
import coverAvp from '@assets/covers/avp.gif?url';
import coverBr from '@assets/covers/br.gif?url';
import coverDscafe from '@assets/covers/dscafe.png?url';
import coverFss from '@assets/covers/fss.png?url';
import coverSgimf from '@assets/covers/sgimf.jpg?url';
import coverSwap from '@assets/covers/swap.png?url';
import coverTaoweb from '@assets/covers/taoweb.jpg?url';
import coverTisland from '@assets/covers/tisland.png?url';
import coverVersionai from '@assets/covers/versionai_tmall.jpg?url';
import coverWine from '@assets/covers/wine.png?url';
import coverZermattern from '@assets/covers/zermattern.png?url';

export type ProjectCategory = 'work' | 'research';
export type CoverKind = 'image' | 'video';

export interface Project {
  slug: string;
  category: ProjectCategory;
  /** When true, listed but not linkable (matches old-site locked cards). */
  locked?: boolean;
  title: Record<Locale, string>;
  cover: string;
  coverKind: CoverKind;
}

/**
 * Home feed — reading order from Figma `home-work` (1294:3), row by row L→R.
 *
 * 1 avp · 2 versionai · 3 360 · 4 zermattern
 * 5 taoweb · 6 tisland · 7 fss · 8 swap
 * 9 automarket · 10 dscafe · 11 br · 12 wine
 * 13 sgimf
 */
export const projects: Project[] = [
  {
    slug: 'taobaovp',
    category: 'work',
    title: {
      en: 'Taobao on Apple Vision Pro',
      zh: '淘宝 Apple Vision Pro',
      ja: 'Taobao on Apple Vision Pro',
    },
    cover: coverAvp,
    coverKind: 'image',
  },
  {
    slug: 'versionai',
    category: 'work',
    title: {
      en: 'VersionAI Tmall',
      zh: 'VersionAI 天猫',
      ja: 'VersionAI 天猫',
    },
    cover: coverVersionai,
    coverKind: 'image',
  },
  {
    slug: 'vr-video',
    category: 'work',
    locked: true,
    title: {
      en: 'VR-Video UX for Spatial Commodity Shopping',
      zh: '空间商品购物 VR 视频体验',
      ja: '空間商品購買向け VR 動画体験',
    },
    cover: cover360,
    coverKind: 'image',
  },
  {
    slug: 'zermattern',
    category: 'work',
    locked: true,
    title: {
      en: 'Zermattern® Ski Equipment & Club',
      zh: 'Zermattern® 滑雪装备与俱乐部',
      ja: 'Zermattern® スキー用具とクラブ',
    },
    cover: coverZermattern,
    coverKind: 'image',
  },
  {
    slug: 'taoweb',
    category: 'work',
    title: {
      en: 'Taobao Design Official Website',
      zh: '淘宝设计官网',
      ja: '淘宝デザイン公式サイト',
    },
    cover: coverTaoweb,
    coverKind: 'image',
  },
  {
    slug: 'tisland',
    category: 'work',
    title: {
      en: 'A Consumption Experience Driven by Community',
      zh: '社区驱动的消费体验',
      ja: 'コミュニティが駆動する消費体験',
    },
    cover: coverTisland,
    coverKind: 'image',
  },
  {
    slug: 'fss',
    category: 'work',
    title: {
      en: 'New Steering Experience on Autonomous Driving',
      zh: '自动驾驶新转向体验',
      ja: '自動運転における新たなステアリング体験',
    },
    cover: coverFss,
    coverKind: 'image',
  },
  {
    slug: 'swap',
    category: 'work',
    title: {
      en: 'Swap Web3 Chatting Brand',
      zh: 'Swap Web3 聊天品牌',
      ja: 'Swap Web3 チャットブランド',
    },
    cover: coverSwap,
    coverKind: 'image',
  },
  {
    slug: 'automarket',
    category: 'work',
    title: {
      en: 'Aftermarket Experience Based on Telematics',
      zh: '基于车联网的售后体验',
      ja: 'テレマティクスに基づくアフターサービス体験',
    },
    cover: coverAutomarket,
    coverKind: 'image',
  },
  {
    slug: 'dscafe',
    category: 'work',
    title: {
      en: 'Shanghai DASHENG CAFE Brand',
      zh: '上海大生咖啡品牌',
      ja: '上海大生カフェ・ブランド',
    },
    cover: coverDscafe,
    coverKind: 'image',
  },
  {
    slug: 'sgmc',
    category: 'work',
    title: {
      en: 'The Sino-Germany Music Competition',
      zh: '中德音乐大赛',
      ja: '中独音楽コンクール',
    },
    cover: coverBr,
    coverKind: 'image',
  },
  {
    slug: 'wine',
    category: 'work',
    title: {
      en: 'DongJiHuang Ice Fruit Wine Package',
      zh: '东吉黄冰果酒包装',
      ja: '東吉黄アイスフルーツワイン包装',
    },
    cover: coverWine,
    coverKind: 'image',
  },
  {
    slug: 'sgimf',
    category: 'work',
    title: {
      en: 'The Belt & Road Sino-Germany Music Festival',
      zh: '一带一路中德国际音乐节',
      ja: '一帯一路・中独国際音楽祭',
    },
    cover: coverSgimf,
    coverKind: 'image',
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
