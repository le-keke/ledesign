/**
 * Mirrors src/styles/tokens.css for LEDESIGN.
 * Run: node scripts/verify-grid.mjs
 */

export function resolve(w) {
  const rem = w > 1440 ? (16 / 1440) * Math.min(w, 2560) : 16;
  const px = (v) => v * rem;

  const t = {
    margin: px(4.375),
    columns: 12,
    gutter: px(4.375),
    main: 8,
    coverSpan: 2,
    infoStart: 10,
    bleed: -px(4.375),
    band: 'desktop',
  };

  if (w <= 1240) {
    t.margin = px(3.75); /* 60 */
    t.columns = 4;
    t.main = 4;
    t.coverSpan = 1;
    t.infoStart = 1;
    t.bleed = 0;
    const columnMin = px(2.5); /* 40 */
    t.gutter = Math.min(px(3.75), (w - 2 * px(3.75) - 4 * columnMin) / 3);
    t.band = 'tablet-4up';
  }

  if (w <= 750) {
    const coverMax = px(22.5); /* 360 */
    t.margin = Math.max(w * 0.05, (w - coverMax) / 2);
    t.gutter = t.margin;
    t.columns = 1;
    t.main = 1;
    t.coverSpan = 1;
    t.band = 'phone-1up';
  }

  const content = w - 2 * t.margin;
  const column = (content - (t.columns - 1) * t.gutter) / t.columns;
  const cover = t.coverSpan * column + (t.coverSpan - 1) * t.gutter;

  return {
    ...t,
    rem,
    content,
    column,
    cover,
    perRow: Math.floor(t.main / t.coverSpan),
    info:
      t.band === 'desktop'
        ? (t.columns - t.infoStart + 1) * column + (t.columns - t.infoStart) * t.gutter - t.bleed
        : 0,
  };
}

const n = (v) => v.toFixed(1).padStart(6);

if (process.argv[1]?.endsWith('verify-grid.mjs')) {
  const frames = [
    { w: 1440, column: 44.1667, cover: 158.3333, perRow: 4, margin: 70, gutter: 70, info: 342.5 },
    { w: 1240, cover: 235, perRow: 4, margin: 60, gutter: 60 },
  ];

  console.log('LEDESIGN 断点复现（1440 已锁定；1240 平板锚点）');
  let ok = true;
  for (const f of frames) {
    const r = resolve(f.w);
    const rows = Object.entries(f)
      .filter(([k]) => k !== 'w')
      .map(([k, want]) => {
        const pass = Math.abs(r[k] - want) < 0.15;
        if (!pass) ok = false;
        return `${k} ${n(r[k])}/${want}${pass ? '' : ' ✗'}`;
      });
    console.log(`  ${String(f.w).padStart(4)}  ${rows.join('  ')}`);
  }
  console.log(ok ? '  锚点一致 ✓\n' : '  有偏差 ✗\n');

  console.log('骨架约定');
  console.log('  >1240          12 列 · 右栏 · 4 排');
  console.log('  ≤1240 → >750   4 列满宽 · margin/gutter 60 · 无右栏 · 4 排');
  console.log('  ≤750           1 排列表 · 左 Logo · 右菜单占位\n');

  console.log('全区间扫描（视口 / 外边距 / 间距 / 列宽(=封面) / 排数 / 信息列 / 档）');
  for (const w of [2560, 1440, 1241, 1240, 1100, 900, 751, 750, 440, 390]) {
    const r = resolve(w);
    console.log(
      `  ${String(w).padStart(4)}  m${n(r.margin)}  g${n(r.gutter)}  cover${n(r.cover)}  ×${r.perRow}  info${n(r.info)}  ${r.band}`,
    );
  }
}
