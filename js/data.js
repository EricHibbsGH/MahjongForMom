// data.js — Canonical tile catalog and immutable tile utilities.
// RULE CLASS: STABLE (set composition is not annual-card dependent).
// This module never touches the DOM, localStorage, or scenario text.

const SUITS = [
  { suit: 'dots', label: 'Dots', short: 'D' },
  { suit: 'bams', label: 'Bams', short: 'B' },
  { suit: 'craks', label: 'Craks', short: 'C' }
];

const WINDS = [
  { key: 'east', label: 'East Wind', short: 'E' },
  { key: 'south', label: 'South Wind', short: 'S' },
  { key: 'west', label: 'West Wind', short: 'W' },
  { key: 'north', label: 'North Wind', short: 'N' }
];

const DRAGONS = [
  { key: 'red', label: 'Red Dragon', short: 'R' },
  { key: 'green', label: 'Green Dragon', short: 'G' },
  { key: 'white', label: 'White Dragon (Soap)', short: '0' }
];

function makeType(t) {
  return Object.freeze({
    typeId: t.typeId,
    family: t.family,
    suit: t.suit === undefined ? null : t.suit,
    rank: t.rank === undefined ? null : t.rank,
    displayName: t.displayName,
    shortLabel: t.shortLabel,
    accessibleLabel: t.accessibleLabel,
    isJoker: !!t.isJoker,
    isFlower: !!t.isFlower,
    maxCopies: t.maxCopies
  });
}

const typeList = [];

for (const s of SUITS) {
  for (let r = 1; r <= 9; r++) {
    typeList.push(makeType({
      typeId: `${s.suit}-${r}`,
      family: 'suit',
      suit: s.suit,
      rank: r,
      displayName: `${r} ${s.label}`,
      shortLabel: `${r}${s.short}`,
      accessibleLabel: `${r} of ${s.label}`,
      maxCopies: 4
    }));
  }
}

for (const w of WINDS) {
  typeList.push(makeType({
    typeId: `wind-${w.key}`,
    family: 'wind',
    displayName: w.label,
    shortLabel: w.short,
    accessibleLabel: w.label,
    maxCopies: 4
  }));
}

for (const d of DRAGONS) {
  typeList.push(makeType({
    typeId: `dragon-${d.key}`,
    family: 'dragon',
    displayName: d.label,
    shortLabel: d.short,
    accessibleLabel: d.label,
    maxCopies: 4
  }));
}

typeList.push(makeType({
  typeId: 'flower',
  family: 'flower',
  displayName: 'Flower',
  shortLabel: 'F',
  accessibleLabel: 'Flower tile',
  isFlower: true,
  maxCopies: 8
}));

typeList.push(makeType({
  typeId: 'joker',
  family: 'joker',
  displayName: 'Joker',
  shortLabel: 'J',
  accessibleLabel: 'Joker tile',
  isJoker: true,
  maxCopies: 8
}));

export const TILE_TYPES = Object.freeze(typeList);

const TYPE_INDEX = new Map(TILE_TYPES.map((t) => [t.typeId, t]));

export function getTileType(typeId) {
  return TYPE_INDEX.get(typeId) || null;
}

export function describeTile(typeId) {
  const t = getTileType(typeId);
  return t ? t.accessibleLabel : 'Unknown tile';
}

// Every physical copy gets a unique instanceId but shares its typeId.
export function makeInstance(typeId, copyIndex) {
  return Object.freeze({ instanceId: `${typeId}#${copyIndex}`, typeId });
}

export function generateFullSet() {
  const tiles = [];
  for (const t of TILE_TYPES) {
    for (let i = 0; i < t.maxCopies; i++) tiles.push(makeInstance(t.typeId, i));
  }
  return tiles;
}

// Deterministic when given a seeded rng. Returns a new array.
export function shuffle(tiles, rng = Math.random) {
  const out = tiles.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// Small deterministic generator for fixtures and tests.
export function makeSeededRng(seed) {
  let s = seed >>> 0 || 1;
  return function rng() {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export function countByType(tiles) {
  const counts = Object.create(null);
  for (const t of tiles) counts[t.typeId] = (counts[t.typeId] || 0) + 1;
  return counts;
}

export function groupByType(tiles) {
  const groups = new Map();
  for (const t of tiles) {
    if (!groups.has(t.typeId)) groups.set(t.typeId, []);
    groups.get(t.typeId).push(t);
  }
  return groups;
}

const FAMILY_ORDER = { suit: 0, wind: 1, dragon: 2, flower: 3, joker: 4 };
const SUIT_ORDER = { dots: 0, bams: 1, craks: 2 };

export function sortRack(tiles) {
  return tiles.slice().sort((a, b) => {
    const ta = getTileType(a.typeId);
    const tb = getTileType(b.typeId);
    if (!ta || !tb) return 0;
    if (FAMILY_ORDER[ta.family] !== FAMILY_ORDER[tb.family]) {
      return FAMILY_ORDER[ta.family] - FAMILY_ORDER[tb.family];
    }
    if (ta.family === 'suit') {
      if (SUIT_ORDER[ta.suit] !== SUIT_ORDER[tb.suit]) return SUIT_ORDER[ta.suit] - SUIT_ORDER[tb.suit];
      return ta.rank - tb.rank;
    }
    if (ta.typeId !== tb.typeId) return ta.typeId < tb.typeId ? -1 : 1;
    return a.instanceId < b.instanceId ? -1 : 1;
  });
}

export function addTile(tiles, tile) {
  return tiles.concat([tile]);
}

export function removeTile(tiles, instanceId) {
  const i = tiles.findIndex((t) => t.instanceId === instanceId);
  if (i === -1) return tiles.slice();
  return tiles.slice(0, i).concat(tiles.slice(i + 1));
}

// Hydrate a scenario fixture (array of typeIds) into unique instances.
export function hydrate(typeIds, salt = 'fx') {
  const used = Object.create(null);
  return typeIds.map((typeId) => {
    const n = used[typeId] || 0;
    used[typeId] = n + 1;
    return Object.freeze({ instanceId: `${typeId}#${salt}${n}`, typeId });
  });
}
