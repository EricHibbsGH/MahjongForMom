// tiles.js — Realistic tile faces drawn as inline SVG (60 x 80 viewBox).
// Pure string builders; app.js decides where they go. The accessible name
// always comes from data.js, never from the drawing.

import { getTileType } from './data.js';

const INK = { blue: '#1d4f91', red: '#b3261e', green: '#1f7a4d', dark: '#1f2328', gold: '#b8862b', pink: '#c9486f' };
const CN_NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const WIND = {
  'wind-east': { ch: '東', letter: 'E' },
  'wind-south': { ch: '南', letter: 'S' },
  'wind-west': { ch: '西', letter: 'W' },
  'wind-north': { ch: '北', letter: 'N' }
};
const CJK = "'Hiragino Mincho ProN','Songti SC','Noto Serif CJK SC','Noto Serif SC','SimSun','MS Mincho',serif";
const INDEX_FONT = "'Iowan Old Style','Palatino Linotype',Palatino,Georgia,serif";

// Art area inside the tile face.
const AX = 10, AY = 16, AW = 40, AH = 58;
const px = (u) => AX + u * AW;
const py = (u) => AY + u * AH;

function index(text, color = INK.dark) {
  return `<text x="6.5" y="13" font-family="${INDEX_FONT}" font-size="10.5" font-weight="700" fill="${color}">${text}</text>`;
}

/* ---- Dots ---- */

const DOT_LAYOUT = {
  1: { r: 14, pts: [[0.5, 0.5]] },
  2: { r: 8.5, pts: [[0.5, 0.24], [0.5, 0.76]] },
  3: { r: 7.5, pts: [[0.2, 0.16], [0.5, 0.5], [0.8, 0.84]] },
  4: { r: 7.5, pts: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.75], [0.73, 0.75]] },
  5: { r: 6.8, pts: [[0.24, 0.2], [0.76, 0.2], [0.5, 0.5], [0.24, 0.8], [0.76, 0.8]] },
  6: { r: 6.4, pts: [[0.28, 0.17], [0.72, 0.17], [0.28, 0.5], [0.72, 0.5], [0.28, 0.83], [0.72, 0.83]] },
  7: { r: 5.4, pts: [[0.18, 0.1], [0.5, 0.24], [0.82, 0.38], [0.3, 0.64], [0.7, 0.64], [0.3, 0.9], [0.7, 0.9]] },
  8: { r: 5.4, pts: [[0.28, 0.11], [0.72, 0.11], [0.28, 0.37], [0.72, 0.37], [0.28, 0.63], [0.72, 0.63], [0.28, 0.89], [0.72, 0.89]] },
  9: { r: 5.4, pts: [[0.18, 0.16], [0.5, 0.16], [0.82, 0.16], [0.18, 0.5], [0.5, 0.5], [0.82, 0.5], [0.18, 0.84], [0.5, 0.84], [0.82, 0.84]] }
};
const DOT_COLORS = [INK.blue, INK.green, INK.red];

function dot(cx, cy, r, color) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${(r * 0.62).toFixed(2)}" fill="none" stroke="#fff" stroke-width="${r > 10 ? 1.6 : 1}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${(r * 0.24).toFixed(2)}" fill="#fff"/>`;
}

function dotsFace(rank) {
  const { r, pts } = DOT_LAYOUT[rank];
  let s = '';
  if (rank === 1) {
    s += `<circle cx="30" cy="${py(0.5)}" r="17" fill="none" stroke="${INK.green}" stroke-width="2"/>`;
    s += dot(30, py(0.5), r, INK.red);
  } else {
    pts.forEach(([u, v], i) => {
      const color = rank === 5 && i === 2 ? INK.red : DOT_COLORS[(i + rank) % 3];
      s += dot(px(u).toFixed(2), py(v).toFixed(2), r, color);
    });
  }
  return index(rank) + s;
}

/* ---- Bams ---- */

const BAM_LAYOUT = {
  2: { h: 19, pts: [[0.5, 0.26], [0.5, 0.74]] },
  3: { h: 19, pts: [[0.5, 0.26], [0.28, 0.74], [0.72, 0.74]] },
  4: { h: 19, pts: [[0.3, 0.26], [0.7, 0.26], [0.3, 0.74], [0.7, 0.74]] },
  5: { h: 17, pts: [[0.22, 0.24], [0.78, 0.24], [0.5, 0.5], [0.22, 0.76], [0.78, 0.76]] },
  6: { h: 19, pts: [[0.2, 0.26], [0.5, 0.26], [0.8, 0.26], [0.2, 0.74], [0.5, 0.74], [0.8, 0.74]] },
  7: { h: 14.5, pts: [[0.5, 0.15], [0.2, 0.5], [0.5, 0.5], [0.8, 0.5], [0.2, 0.85], [0.5, 0.85], [0.8, 0.85]] },
  8: { h: 19, pts: [[0.14, 0.26], [0.38, 0.26], [0.62, 0.26], [0.86, 0.26], [0.14, 0.74], [0.38, 0.74], [0.62, 0.74], [0.86, 0.74]] },
  9: { h: 14.5, pts: [[0.2, 0.15], [0.5, 0.15], [0.8, 0.15], [0.2, 0.5], [0.5, 0.5], [0.8, 0.5], [0.2, 0.85], [0.5, 0.85], [0.8, 0.85]] }
};

function stick(cx, cy, h, color) {
  const w = 5.4;
  const x = (cx - w / 2).toFixed(2);
  const y = (cy - h / 2).toFixed(2);
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.6" fill="${color}"/>` +
    `<path d="M${(cx - w / 2).toFixed(2)} ${cy.toFixed(2)}h${w}" stroke="#fff" stroke-width="0.9"/>` +
    `<path d="M${cx.toFixed(2)} ${(cy - h / 2 + 2.5).toFixed(2)}v${(h / 2 - 4).toFixed(2)}" stroke="rgba(255,255,255,.45)" stroke-width="0.8"/>`;
}

function bird() {
  return `<path d="M17 58c3-10 9-17 17-18 6 0 9 5 7 11-3 9-13 13-24 7z" fill="${INK.green}"/>` +
    `<path d="M21 55c5-1 10-5 13-11" stroke="#fff" stroke-width="1" fill="none"/>` +
    `<path d="M18 57c-4 2-7 7-7 12 3-3 5-4 9-5zM20 60c-2 4-2 8 0 11 1-4 3-6 5-8z" fill="${INK.blue}"/>` +
    `<circle cx="38" cy="33" r="6.5" fill="${INK.red}"/>` +
    `<circle cx="39.5" cy="31.5" r="1.4" fill="#fff"/>` +
    `<path d="M44 33l6 1.5-6 1.8z" fill="${INK.gold}"/>` +
    `<path d="M35 27c1-4 4-6 7-6-1 2-2 4-4 6z" fill="${INK.blue}"/>` +
    `<path d="M29 62v8M34 61v9" stroke="${INK.dark}" stroke-width="1.3"/>`;
}

function bamsFace(rank) {
  if (rank === 1) return index(1) + bird();
  const { h, pts } = BAM_LAYOUT[rank];
  let s = '';
  pts.forEach(([u, v], i) => {
    const red = (rank === 5 && i === 2) || (rank === 7 && i === 0) || (rank === 9 && i % 3 === 1);
    s += stick(px(u), py(v), h, red ? INK.red : INK.green);
  });
  return index(rank) + s;
}

/* ---- Craks ---- */

function craksFace(rank) {
  return index(rank) +
    `<text x="30" y="41" text-anchor="middle" font-family="${CJK}" font-size="21" font-weight="700" fill="${INK.dark}">${CN_NUM[rank]}</text>` +
    `<text x="30" y="70" text-anchor="middle" font-family="${CJK}" font-size="23" font-weight="700" fill="${INK.red}">萬</text>`;
}

/* ---- Honors, Flowers, Jokers ---- */

function windFace(typeId) {
  const w = WIND[typeId];
  return index(w.letter, INK.blue) +
    `<text x="30" y="60" text-anchor="middle" font-family="${CJK}" font-size="33" font-weight="700" fill="${INK.dark}">${w.ch}</text>`;
}

function dragonFace(typeId) {
  if (typeId === 'dragon-red') {
    return `<text x="30" y="58" text-anchor="middle" font-family="${CJK}" font-size="38" font-weight="700" fill="${INK.red}">中</text>`;
  }
  if (typeId === 'dragon-green') {
    return `<text x="30" y="57" text-anchor="middle" font-family="${CJK}" font-size="33" font-weight="700" fill="${INK.green}">發</text>`;
  }
  return `<rect x="13" y="16" width="34" height="50" rx="3" fill="none" stroke="${INK.blue}" stroke-width="3.2"/>` +
    `<rect x="18.5" y="21.5" width="23" height="39" rx="1.5" fill="none" stroke="${INK.blue}" stroke-width="1.2"/>`;
}

function flowerFace() {
  let petals = '';
  for (let i = 0; i < 5; i++) {
    petals += `<ellipse cx="30" cy="27" rx="5.6" ry="9" fill="${INK.pink}" transform="rotate(${i * 72} 30 36)"/>`;
  }
  return `<path d="M30 45c0 8-1 14-3 22" stroke="${INK.green}" stroke-width="2" fill="none"/>` +
    `<path d="M29 58c-6-1-10-5-11-9 5 0 9 3 11 9z" fill="${INK.green}"/>` +
    `<path d="M29 62c5-2 9-1 12 2-5 2-9 1-12-2z" fill="${INK.green}"/>` +
    petals +
    `<circle cx="30" cy="36" r="4.2" fill="${INK.gold}"/>`;
}

function jokerFace() {
  return `<path d="m30 17 4.4 9 9.9 1.4-7.2 7 1.7 9.8L30 39.6 21.2 44.2l1.7-9.8-7.2-7 9.9-1.4z" fill="${INK.gold}" stroke="${INK.red}" stroke-width="1.2" stroke-linejoin="round"/>` +
    `<text x="30" y="61" text-anchor="middle" font-family="${INDEX_FONT}" font-size="11.5" font-weight="800" letter-spacing="0.6" fill="${INK.red}">JOKER</text>` +
    `<path d="M16 67h28" stroke="${INK.blue}" stroke-width="1.4"/>`;
}

const cache = new Map();

export function tileSVG(typeId) {
  if (cache.has(typeId)) return cache.get(typeId);
  const t = getTileType(typeId);
  let art = '';
  if (!t) art = '<text x="30" y="48" text-anchor="middle" font-size="20">?</text>';
  else if (t.family === 'suit' && t.suit === 'dots') art = dotsFace(t.rank);
  else if (t.family === 'suit' && t.suit === 'bams') art = bamsFace(t.rank);
  else if (t.family === 'suit') art = craksFace(t.rank);
  else if (t.family === 'wind') art = windFace(typeId);
  else if (t.family === 'dragon') art = dragonFace(typeId);
  else if (t.family === 'flower') art = flowerFace();
  else art = jokerFace();
  const svg = `<svg class="tile-art" viewBox="0 0 60 80" aria-hidden="true" focusable="false">${art}</svg>`;
  cache.set(typeId, svg);
  return svg;
}
