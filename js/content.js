// content.js — Original teaching content: lessons, hand families, tips, glossary.
// EDUCATIONAL content only. No annual card hands are reproduced here: every
// example hand is invented for teaching and is labelled that way in the app.
// This module never touches the DOM or localStorage.

import { getTileType } from './data.js';

/* ------------------ hand groups ------------------ */

// A group spec is either [typeId, size, displayJokers?] for identical tiles,
// or { run: [typeId, ...] } for a block of singles shown side by side.
// normalizeGroups flattens specs into { typeId, size } for the rules engine.
export function normalizeGroups(specs) {
  const out = [];
  for (const g of specs) {
    if (Array.isArray(g)) out.push({ typeId: g[0], size: g[1] });
    else for (const typeId of g.run) out.push({ typeId, size: 1 });
  }
  return out;
}

// Tiles to draw for one group, with any display Jokers at the end.
export function groupTiles(g) {
  if (!Array.isArray(g)) return g.run.slice();
  const [typeId, size, jokers = 0] = g;
  return Array(size - jokers).fill(typeId).concat(Array(jokers).fill('joker'));
}

export function handSize(specs) {
  return normalizeGroups(specs).reduce((n, g) => n + g.size, 0);
}

/* ------------------ the year hand ------------------ */

export const CURRENT_YEAR = new Date().getFullYear();

// An invented year-style hand: Flowers plus a pung for each digit of the year,
// with Soap (the White Dragon) standing in for zero.
export function yearExampleGroups(year = CURRENT_YEAR) {
  const suits = ['dots', 'bams', 'craks', 'bams'];
  const groups = [['flower', 2]];
  String(year).split('').forEach((ch, i) => {
    const d = Number(ch);
    const typeId = d === 0 ? 'dragon-white' : `${suits[i]}-${d}`;
    const existing = groups.find((g) => g[0] === typeId);
    if (existing) {
      const room = 4 - existing[1];
      existing[1] += Math.min(3, room);
      if (room < 3) groups[0][1] += 3 - room;
    } else {
      groups.push([typeId, 3]);
    }
  });
  return groups;
}

function yearDigits(year = CURRENT_YEAR) {
  return new Set(String(year).split('').map(Number).filter((d) => d > 0));
}

/* ------------------ family classifier ------------------ */

// Used by tests and quizzes so every family example provably fits its family.
// Order matters: structure first (quints, singles and pairs), then tiles.
export function identifyFamily(specs) {
  const groups = normalizeGroups(specs);
  const types = groups.map((g) => getTileType(g.typeId)).filter(Boolean);
  const suitTypes = types.filter((t) => t.family === 'suit');
  const ranks = [...new Set(suitTypes.map((t) => t.rank))].sort((a, b) => a - b);
  const hasSoap = groups.some((g) => g.typeId === 'dragon-white');

  if (groups.some((g) => g.size === 5)) return 'quints';
  if (groups.every((g) => g.size <= 2)) return 'singles-pairs';
  if (suitTypes.length === 0) return 'winds-dragons';
  const digits = yearDigits();
  if (hasSoap && ranks.every((r) => digits.has(r))) return 'year';
  if (ranks.length === 1) return 'like';
  if (ranks.every((r) => r % 3 === 0)) return '369';
  if (ranks.every((r) => r % 2 === 0)) return '2468';
  if (ranks.every((r) => r % 2 === 1)) return '13579';
  if (ranks.length === 3 && ranks[0] + ranks[1] === ranks[2]) return 'addition';
  const consecutive = ranks.length >= 3 && ranks.every((r, i) => i === 0 || r === ranks[i - 1] + 1);
  if (consecutive) return 'consecutive';
  return null;
}

/* ------------------ rack leanings (strategy helper) ------------------ */

// Counts how many tiles on a rack support each broad family. This is a
// teaching aid for choosing a direction, not a judgement of any card hand.
export function rackLeanings(rack) {
  const types = rack.map((t) => getTileType(t.typeId)).filter(Boolean);
  const suit = types.filter((t) => t.family === 'suit');
  const counts = Object.create(null);
  for (const t of rack) counts[t.typeId] = (counts[t.typeId] || 0) + 1;
  const byRank = Object.create(null);
  for (const t of suit) byRank[t.rank] = (byRank[t.rank] || 0) + 1;
  const bestRank = Object.keys(byRank).sort((a, b) => byRank[b] - byRank[a])[0];
  const pairs = Object.keys(counts).filter((k) => k !== 'joker' && counts[k] >= 2).length;
  const leanings = [
    { id: '2468', label: 'Even numbers (2468)', count: suit.filter((t) => t.rank % 2 === 0).length },
    { id: '13579', label: 'Odd numbers (13579)', count: suit.filter((t) => t.rank % 2 === 1).length },
    { id: '369', label: '3s, 6s and 9s (369)', count: suit.filter((t) => t.rank % 3 === 0).length },
    { id: 'like', label: bestRank ? `Like numbers (${bestRank}s)` : 'Like numbers', count: bestRank ? byRank[bestRank] : 0 },
    { id: 'winds-dragons', label: 'Winds & Dragons', count: types.filter((t) => t.family === 'wind' || t.family === 'dragon').length }
  ].sort((a, b) => b.count - a.count);
  return {
    leanings,
    pairs,
    jokers: counts.joker || 0,
    flowers: counts.flower || 0
  };
}

/* ------------------ hand families ------------------ */

// Colors in notation mirror how a card uses color: c1, c2, c3 are three
// different suits of your choosing; c0 is neutral (Flowers, Winds).
export const FAMILIES = Object.freeze([
  {
    id: 'year',
    name: 'Year Hands',
    short: 'Built from the digits of the current year.',
    numbers: `The digits of the year — for ${CURRENT_YEAR}, that is ${String(CURRENT_YEAR).split('').join(', ')}`,
    jokers: 2,
    difficulty: 'Moderate',
    summary: 'Every card has a section built around the current year. The zero is played with Soap, the White Dragon, which is why Soap is worth watching for all year long.',
    recognize: [
      'You hold several tiles that match the digits of the year.',
      'You have two or more White Dragons (Soap) to use as zeros.',
      'Flowers often round these hands out.'
    ],
    tips: [
      'Soap is scarce — only four exist — so hold onto yours if you are leaning this way.',
      'Year hands change every year, so the new card always brings new ones to learn.',
      'Runs of single year digits cannot use Jokers; groups of three or more can.'
    ],
    watch: 'If you see two or three Soaps discarded early, a year hand that needs a group of zeros gets much harder.',
    example: {
      groups: yearExampleGroups(),
      notation: null // built at render time from the groups
    }
  },
  {
    id: '2468',
    name: '2468',
    short: 'Even numbers only: 2, 4, 6 and 8.',
    numbers: '2, 4, 6 and 8',
    jokers: 3,
    difficulty: 'Friendly',
    summary: 'One of the most popular sections, and a great place for a new player to start. Any hand here uses only even numbers, often with Flowers or Dragons alongside.',
    recognize: [
      'Most of your number tiles are even.',
      'You have pairs or pungs of 2s, 4s, 6s or 8s.',
      'Your odd tiles are few and scattered — easy to pass in the Charleston.'
    ],
    tips: [
      'These hands are full of pungs and kongs, so Jokers are very useful here.',
      'Because it is popular, other players may be collecting evens too. Watch their exposures.',
      'Pass your odd numbers early in the Charleston.'
    ],
    watch: 'When a player exposes even-numbered groups, be careful discarding even tiles late in the game.',
    example: {
      groups: [['flower', 2], ['dots-2', 3], ['dots-4', 3], ['bams-6', 4], ['bams-8', 2]],
      notation: [['FF', 'c0'], ['222', 'c1'], ['444', 'c1'], ['6666', 'c2'], ['88', 'c2']]
    }
  },
  {
    id: 'like',
    name: 'Any Like Numbers',
    short: 'The same number repeated across suits.',
    numbers: 'Any single number, 1 through 9, in two or three suits',
    jokers: 3,
    difficulty: 'Friendly',
    summary: 'Pick one number and collect it in different suits — all 5s, for example. You choose the number, which makes these hands flexible early on.',
    recognize: [
      'You hold the same number in two or three suits.',
      'You have three or more of one number overall.',
      'You have Jokers to fill big groups.'
    ],
    tips: [
      'Decide on your number once you see which one you hold most of.',
      'Kongs are common here, so Jokers carry a lot of weight.',
      'Only four of each tile exist. If two 5 Bams are discarded, 5s get harder.'
    ],
    watch: 'Exposures of one number in two suits tell everyone which number you are collecting.',
    example: {
      groups: [['flower', 2], ['dots-5', 4], ['bams-5', 4], ['craks-5', 4]],
      notation: [['FF', 'c0'], ['5555', 'c1'], ['5555', 'c2'], ['5555', 'c3']]
    }
  },
  {
    id: 'addition',
    name: 'Addition Hands',
    short: 'Numbers that form a little sum, like 3 + 4 = 7.',
    numbers: 'Three numbers where the first two add up to the third',
    jokers: 3,
    difficulty: 'Moderate',
    summary: 'These hands spell out a sum on your rack. The plus and equals signs on the card are only decoration — you collect the numbers.',
    recognize: [
      'You hold three numbers that add up, such as 1, 5 and 6, or 3, 4 and 7.',
      'Those numbers come mostly from one suit.',
      'Flowers are often part of the hand.'
    ],
    tips: [
      'Look for the largest number first — it is often the big group.',
      'Addition hands are often in a single suit, so a rack heavy in one suit fits well.',
      'Groups are pungs and kongs, so Jokers help.'
    ],
    watch: 'The numbers in these hands do not follow an odd or even pattern, so they are harder for others to read.',
    example: {
      groups: [['flower', 4], ['bams-3', 3], ['bams-4', 3], ['bams-7', 4]],
      notation: [['FFFF', 'c0'], ['333', 'c1'], ['+', 'op'], ['444', 'c1'], ['=', 'op'], ['7777', 'c1']]
    }
  },
  {
    id: 'quints',
    name: 'Quints',
    short: 'Groups of five identical tiles.',
    numbers: 'Varies — the defining feature is the five-tile groups',
    jokers: 3,
    difficulty: 'Needs Jokers',
    summary: 'A quint is five of the same tile. Since only four real copies of any tile exist, every quint needs at least one Joker. Quint hands are the natural home for a rack full of Jokers.',
    recognize: [
      'You were dealt two, three or more Jokers.',
      'You already hold three or four of the same tile.',
      'You have several kongs or near-kongs.'
    ],
    tips: [
      'Count your Jokers first. With fewer than two, quints are a long shot.',
      'Watch every exposure for Jokers you can win back with an exchange.',
      'Quint hands are usually worth more points because they are harder.'
    ],
    watch: 'Never discard a Joker while you are going for quints — every one of them counts.',
    example: {
      groups: [['dots-2', 5, 1], ['bams-3', 5, 1], ['flower', 4]],
      notation: [['22222', 'c1'], ['33333', 'c2'], ['FFFF', 'c0']]
    }
  },
  {
    id: 'consecutive',
    name: 'Consecutive Run',
    short: 'Numbers in a row, like 3-4-5 or 1-2-3-4-5.',
    numbers: 'Any numbers in a row',
    jokers: 3,
    difficulty: 'Friendly',
    summary: 'Collect numbers that follow each other. The card usually says you may start the run at any number, which makes this one of the most flexible sections.',
    recognize: [
      'You hold several numbers in a row in one suit.',
      'You have pairs or pungs spread along a run.',
      'Your rack does not lean strongly odd or even.'
    ],
    tips: [
      'Because you often choose where the run starts, stay open until the Charleston is done.',
      'Some runs are in one suit, others in two or three — read each line carefully.',
      'Middle numbers (3 to 7) fit more runs than 1s and 9s.'
    ],
    watch: 'A run is easy to spot once exposed. Keep it concealed as long as you can.',
    example: {
      groups: [['dots-1', 2], ['dots-2', 3], ['dots-3', 4], ['dots-4', 3], ['dots-5', 2]],
      notation: [['11', 'c1'], ['222', 'c1'], ['3333', 'c1'], ['444', 'c1'], ['55', 'c1']]
    }
  },
  {
    id: '13579',
    name: '13579',
    short: 'Odd numbers only: 1, 3, 5, 7 and 9.',
    numbers: '1, 3, 5, 7 and 9',
    jokers: 3,
    difficulty: 'Friendly',
    summary: 'The odd-number twin of 2468. Hands here use only odd numbers, usually as pungs and kongs across one, two or three suits.',
    recognize: [
      'Most of your number tiles are odd.',
      'You hold pairs of 1s, 3s, 5s, 7s or 9s.',
      'Your even tiles are few.'
    ],
    tips: [
      'Pass even numbers early in the Charleston.',
      'Lots of pungs and kongs means Jokers are valuable here.',
      '1s and 9s are often only useful to odd hands — a helpful clue about others.'
    ],
    watch: 'If a neighbor keeps passing you odd tiles, they probably are not playing odds. That can be good news for you.',
    example: {
      groups: [['bams-1', 2], ['bams-3', 3], ['bams-5', 4], ['craks-7', 3], ['craks-9', 2]],
      notation: [['11', 'c1'], ['333', 'c1'], ['5555', 'c1'], ['777', 'c2'], ['99', 'c2']]
    }
  },
  {
    id: 'winds-dragons',
    name: 'Winds & Dragons',
    short: 'Honor tiles: Winds and Dragons, few or no numbers.',
    numbers: 'Few or none — mostly Winds and Dragons',
    jokers: 2,
    difficulty: 'Moderate',
    summary: 'Hands built from North, East, West and South Winds and the three Dragons. Some include a few number tiles, but the honors are the heart of it.',
    recognize: [
      'You were dealt several Winds or Dragons.',
      'You have pairs or pungs of the same Wind.',
      'Your number tiles are scattered with no pattern.'
    ],
    tips: [
      'Many players pass Winds early, so you may receive more in the Charleston.',
      'Some lines here spell NEWS with single Winds — singles cannot use Jokers.',
      'Remember which Dragon matches which suit if a line mixes numbers in.'
    ],
    watch: 'Winds are often thrown early. If you are the only one saving them, you can collect quickly.',
    example: {
      groups: [['wind-north', 3], ['wind-east', 3], ['wind-west', 3], ['wind-south', 3], ['dragon-green', 2]],
      notation: [['NNN', 'c0'], ['EEE', 'c0'], ['WWW', 'c0'], ['SSS', 'c0'], ['GG', 'c1']]
    }
  },
  {
    id: '369',
    name: '369',
    short: 'Only 3s, 6s and 9s.',
    numbers: '3, 6 and 9',
    jokers: 3,
    difficulty: 'Friendly',
    summary: 'Hands built from 3s, 6s and 9s, often with Dragons that match the suits. A good choice when your rack is full of those three numbers.',
    recognize: [
      'You hold several 3s, 6s and 9s.',
      'Those tiles fall in one or two suits.',
      'You have a Dragon that matches one of those suits.'
    ],
    tips: [
      'The 6 is shared with 2468 hands, so 6s are in demand — hold yours.',
      'Remember the matching Dragons: Red with Craks, Green with Bams, Soap with Dots.',
      'Pungs and kongs mean Jokers help a lot here.'
    ],
    watch: 'A player exposing 3s and 9s is almost certainly on a 369 hand.',
    example: {
      groups: [['flower', 2], ['craks-3', 3], ['craks-6', 3], ['craks-9', 4], ['dragon-red', 2]],
      notation: [['FF', 'c0'], ['333', 'c2'], ['666', 'c2'], ['9999', 'c2'], ['DD', 'c2']]
    }
  },
  {
    id: 'singles-pairs',
    name: 'Singles & Pairs',
    short: 'Only singles and pairs. No Jokers at all.',
    numbers: 'Varies — the defining feature is that every group is a single or a pair',
    jokers: 0,
    difficulty: 'Challenging',
    summary: 'Every tile is a single or part of a pair. Because a Joker can never fill a single or a pair, these hands never use Jokers — and they are always concealed. They are hard, which is why they are usually worth the most.',
    recognize: [
      'You were dealt five or more pairs.',
      'You have no Jokers, or only one.',
      'Your pairs do not share an obvious number pattern.'
    ],
    tips: [
      'Jokers are useless here. If you hold several, choose another hand.',
      'You cannot call discards except the final tile for Mahjong, so everything comes from the wall.',
      'A pair becomes impossible once three of that tile are gone. Watch the discards.'
    ],
    watch: 'Because you never expose, others cannot read your hand — but you also cannot speed it up by calling.',
    example: {
      groups: [['wind-north', 2], ['wind-south', 2], { run: ['dots-2', 'dots-4', 'dots-6', 'dots-8'] }, { run: ['bams-2', 'bams-4', 'bams-6', 'bams-8'] }, ['dragon-red', 2]],
      notation: [['NN', 'c0'], ['SS', 'c0'], ['2468', 'c1'], ['2468', 'c2'], ['DD', 'c3']]
    }
  }
]);

// Year notation is derived so it stays correct every year.
(function buildYearNotation() {
  const y = FAMILIES.find((f) => f.id === 'year');
  const colors = { dots: 'c1', bams: 'c2', craks: 'c3' };
  y.example.notation = y.example.groups.map((g) => {
    const t = getTileType(g[0]);
    if (t.family === 'flower') return ['F'.repeat(g[1]), 'c0'];
    if (t.typeId === 'dragon-white') return ['0'.repeat(g[1]), 'c0'];
    return [String(t.rank).repeat(g[1]), colors[t.suit]];
  });
})();

export function getFamily(id) {
  return FAMILIES.find((f) => f.id === id) || null;
}

/* ------------------ lessons ------------------ */

// Block types: p, h, list, steps, tiles, hand, notation, callout, table, dodont.
// Inline **bold** is supported inside text.
export const LESSON_SECTIONS = Object.freeze([
  { id: 'start', title: 'Getting Started' },
  { id: 'card', title: 'The Card' },
  { id: 'play', title: 'Playing the Game' },
  { id: 'strategy', title: 'Strategy' }
]);

export const LESSONS = Object.freeze([
  {
    id: 'welcome', section: 'start', minutes: 3,
    title: 'Welcome to the table',
    summary: 'What American Mah Jongg is, and how this app will help you learn it.',
    practice: null,
    blocks: [
      { type: 'p', text: 'American Mah Jongg is played by **four players** with a set of **152 tiles**. Each year the National Mah Jongg League publishes a new card listing that year’s winning hands. Your goal is simple to say: be the first to collect **14 tiles that exactly match one hand on the card**.' },
      { type: 'p', text: 'Luck plays a part, but good players win more often because they choose their hand wisely, pass smartly in the Charleston, and avoid handing others the tile they need.' },
      { type: 'h', text: 'A game at a glance' },
      { type: 'steps', items: [
        '**Build the wall and deal.** Everyone gets 13 tiles; the dealer, called East, gets 14.',
        '**The Charleston.** Players trade unwanted tiles in a set pattern of passes.',
        '**Play.** Take turns drawing a tile and discarding one, working toward a hand on the card.',
        '**Mahjong!** The first player to complete a hand calls “Mahjong” and wins.'
      ] },
      { type: 'callout', tone: 'tip', title: 'How to use this app', text: 'Read a lesson, then try the practice that goes with it. Nothing is timed. Your progress is saved on this device, so you can stop and pick up again whenever you like.' },
      { type: 'callout', tone: 'custom', title: 'Keep your card handy', text: 'This app never reproduces the official card. When a question depends on the card, it says so. Your current card and your table’s rules always have the final word.' }
    ]
  },
  {
    id: 'tiles', section: 'start', minutes: 5,
    title: 'Meet the tiles',
    summary: 'The three suits, the honor tiles, Flowers and Jokers.',
    practice: 'tiles',
    blocks: [
      { type: 'p', text: 'The set has three **suits**, each numbered 1 to 9, with four copies of every tile.' },
      { type: 'h', text: 'Dots' },
      { type: 'p', text: 'Circles. Count the circles to know the number. The number also appears in the corner of most American sets.' },
      { type: 'tiles', tiles: ['dots-1', 'dots-3', 'dots-5', 'dots-9'] },
      { type: 'h', text: 'Bams' },
      { type: 'p', text: 'Bamboo sticks. The 1 Bam is often drawn as a bird instead of a stick, which surprises many beginners.' },
      { type: 'tiles', tiles: ['bams-1', 'bams-2', 'bams-6', 'bams-8'] },
      { type: 'h', text: 'Craks' },
      { type: 'p', text: 'Short for “characters.” The Chinese number sits on top and a red character meaning “ten thousand” sits below. Use the corner number if you don’t read the characters.' },
      { type: 'tiles', tiles: ['craks-2', 'craks-4', 'craks-7', 'craks-9'] },
      { type: 'h', text: 'Winds and Dragons' },
      { type: 'p', text: 'Four **Winds** — North, East, West and South — and three **Dragons**: Red, Green and White. The White Dragon is nicknamed **Soap**, and on the card it doubles as a **zero**.' },
      { type: 'tiles', tiles: ['wind-north', 'wind-east', 'wind-west', 'wind-south'] },
      { type: 'tiles', tiles: ['dragon-red', 'dragon-green', 'dragon-white'] },
      { type: 'callout', tone: 'rule', title: 'Each Dragon has a partner suit', text: '**Red** goes with **Craks**, **Green** goes with **Bams**, and **Soap** goes with **Dots**. When the card shows a Dragon in the same color as a suit, it means that suit’s Dragon.' },
      { type: 'h', text: 'Flowers and Jokers' },
      { type: 'p', text: 'There are **8 Flowers** (all interchangeable) and **8 Jokers**. Jokers are wild, with some firm limits you’ll learn in the Jokers lesson.' },
      { type: 'tiles', tiles: ['flower', 'joker'] },
      { type: 'table', head: ['Tiles', 'How many'], rows: [
        ['Suit tiles (Dots, Bams, Craks, 1–9, four of each)', '108'],
        ['Winds (four of each)', '16'],
        ['Dragons (four of each)', '12'],
        ['Flowers', '8'],
        ['Jokers', '8'],
        ['**Total**', '**152**']
      ] }
    ]
  },
  {
    id: 'setup', section: 'start', minutes: 3,
    title: 'Setting up and the deal',
    summary: 'Building the wall, who goes first, and how many tiles everyone holds.',
    practice: 'rack',
    blocks: [
      { type: 'p', text: 'Tiles are shuffled face down. Each player builds a wall **19 tiles long and two tiles high** — 38 tiles each, 152 in all — and the four walls are pushed together into a square.' },
      { type: 'p', text: 'The dealer is called **East**. East breaks the wall and the tiles are dealt so that **East holds 14 tiles and everyone else holds 13**.' },
      { type: 'callout', tone: 'rule', title: 'The magic numbers', text: 'Between turns every player holds **13** tiles. You briefly hold **14** right after you pick up a tile, until you discard. East starts with 14 because East discards first.' },
      { type: 'p', text: 'Arrange your tiles on your rack however helps you think. Most players group them by suit and put Winds, Dragons, Flowers and Jokers together at one end.' }
    ]
  },
  {
    id: 'turn', section: 'start', minutes: 4,
    title: 'How a turn works',
    summary: 'Draw, discard, and say it out loud.',
    practice: 'call',
    blocks: [
      { type: 'p', text: 'After the Charleston, East starts by discarding one tile. Play then moves **to the right** (counterclockwise) around the table.' },
      { type: 'steps', items: [
        '**Pick a tile** from the wall.',
        '**Exchange for a Joker** if you can and want to (you’ll learn how later).',
        '**Discard** one tile face up in the middle of the table, and **say its name** aloud, such as “4 Bam.”'
      ] },
      { type: 'p', text: 'When someone discards, any other player may **call** it if it completes a group they need. Calling lets you skip ahead — play continues from you, to your right.' },
      { type: 'callout', tone: 'tip', title: 'Say it clearly', text: 'Naming every discard is part of the game. It gives others a fair chance to call it, and it helps you remember what has been thrown.' },
      { type: 'p', text: 'If the wall runs out and nobody has won, the game is a **wall game** — nobody wins, and you shuffle and play again.' }
    ]
  },
  {
    id: 'card', section: 'card', minutes: 5,
    title: 'Reading the card',
    summary: 'Colors, letters, X and C, and point values.',
    practice: 'family',
    blocks: [
      { type: 'p', text: 'The card lists every winning hand, grouped into **sections** (we call them families). Each line is one hand of exactly 14 tiles. Spaces on the card separate the groups within a hand.' },
      { type: 'h', text: 'Colors mean suits' },
      { type: 'p', text: 'The card prints numbers in three colors. The colors don’t mean particular suits — they show **how many suits** to use and which groups share a suit.' },
      { type: 'list', items: [
        '**One color** in a line: the whole hand is in one suit (any suit you choose).',
        '**Two colors**: two different suits.',
        '**Three colors**: all three suits.'
      ] },
      { type: 'notation', segments: [['FF', 'c0'], ['222', 'c1'], ['444', 'c1'], ['6666', 'c2'], ['88', 'c2']], caption: 'An invented example line. The 2s and 4s share one suit; the 6s and 8s are a different suit.' },
      { type: 'hand', groups: [['flower', 2], ['dots-2', 3], ['dots-4', 3], ['bams-6', 4], ['bams-8', 2]], caption: 'One way to play it: 2s and 4s in Dots, 6s and 8s in Bams.' },
      { type: 'h', text: 'Letters on the card' },
      { type: 'table', head: ['Letter', 'Meaning'], rows: [
        ['**F**', 'Flower'],
        ['**N E W S**', 'North, East, West, South Winds'],
        ['**D**', 'A Dragon — the one that matches the color it is printed in'],
        ['**R G**', 'Red or Green Dragon specifically'],
        ['**0**', 'Soap (the White Dragon) used as a zero']
      ] },
      { type: 'h', text: 'X, C and points' },
      { type: 'list', items: [
        '**X** after a hand means it may be **exposed** — you may call discards to build it.',
        '**C** means it must stay **concealed** on your rack until you win.',
        'The number beside each hand is its **value** — harder hands are worth more.'
      ] },
      { type: 'callout', tone: 'custom', title: 'Your card is the authority', text: 'Cards change every year. Always check the exact hand, colors and values on your current card.' }
    ]
  },
  {
    id: 'families', section: 'card', minutes: 4,
    title: 'The hand families',
    summary: 'The sections of the card and what makes each one different.',
    practice: 'family',
    blocks: [
      { type: 'p', text: 'Most cards organize hands into the same families each year. Learning the families lets you glance at your rack and know which part of the card to study.' },
      { type: 'families' },
      { type: 'callout', tone: 'tip', title: 'Start with the friendly ones', text: '**2468**, **13579**, **369**, **Like Numbers** and **Consecutive Run** use pungs and kongs, so Jokers help a lot. They are the easiest to learn on.' },
      { type: 'p', text: 'Open the **Hands** tab for a full guide to each family, with an invented example hand and strategy tips.' }
    ]
  },
  {
    id: 'groups', section: 'card', minutes: 4,
    title: 'Pungs, kongs and friends',
    summary: 'The names for groups of tiles, and where Jokers may go.',
    practice: 'joker',
    blocks: [
      { type: 'p', text: 'Every hand is made of groups of identical tiles. You’ll hear these names at every table:' },
      { type: 'groups' },
      { type: 'callout', tone: 'rule', title: 'The most important Joker rule', text: 'A Joker may only be used in a group of **three or more** identical tiles — a pung, kong or quint. **Never** in a single or a pair.' },
      { type: 'p', text: 'Some hands also use **runs of singles**, like N-E-W-S or the digits of the year. Each tile in a run is a single, so Jokers can’t be used there either.' }
    ]
  },
  {
    id: 'charleston', section: 'play', minutes: 5,
    title: 'The Charleston',
    summary: 'The passing ritual that happens before play begins.',
    practice: 'charleston',
    blocks: [
      { type: 'p', text: 'Before play starts, everyone trades unwanted tiles in a fixed pattern of passes called the **Charleston**. It is your best chance to shape your hand.' },
      { type: 'table', head: ['Pass', 'Direction'], rows: [
        ['**First Charleston** (required)', ''],
        ['1', 'To your right'],
        ['2', 'Across'],
        ['3', 'To your left (a blind pass is allowed)'],
        ['**Second Charleston** (optional)', ''],
        ['4', 'To your left'],
        ['5', 'Across'],
        ['6', 'To your right (a blind pass is allowed)'],
        ['**Courtesy pass** (optional)', 'Across, 0 to 3 tiles, by agreement']
      ] },
      { type: 'callout', tone: 'rule', title: 'Charleston rules', text: 'Every pass is **exactly three tiles**. A **Joker is never passed**. Any player may choose to **stop the second Charleston**.' },
      { type: 'h', text: 'The blind pass' },
      { type: 'p', text: 'On the last pass of each Charleston you may pass along one, two or all three of the tiles coming to you **without looking at them**, making up the rest from your own rack. It is handy when you can’t spare anything.' },
      { type: 'callout', tone: 'custom', title: 'Table custom', text: 'Groups differ on small points of the Charleston. Ask how your table handles the blind pass and the courtesy pass.' }
    ]
  },
  {
    id: 'calling', section: 'play', minutes: 5,
    title: 'Calling and exposing',
    summary: 'When you may claim a discard, and what happens next.',
    practice: 'call',
    blocks: [
      { type: 'p', text: 'When a tile is discarded, you may **call** it if it completes a **pung, kong or quint** you need. Say “Call!”, take the tile, and place the whole group **face up** on top of your rack. That is an **exposure**. Then discard, and play continues to your right.' },
      { type: 'dodont', do: [
        'Call when the tile completes a group of three or more.',
        'Hold at least one real matching tile — Jokers can fill the rest.',
        'Call the very last tile you need for Mahjong, even for a pair or single.'
      ], dont: [
        'Call a tile to make a pair or a single (except for Mahjong).',
        'Call a discarded Joker. It is dead.',
        'Call to make an exposure when your hand must stay concealed.'
      ] },
      { type: 'h', text: 'Who gets the tile?' },
      { type: 'p', text: 'A call for **Mahjong** beats a call for an exposure. If two players call for the same reason, the player whose turn comes **next** gets it.' },
      { type: 'callout', tone: 'tip', title: 'Exposing tells a story', text: 'Once your tiles are face up, everyone can guess your hand — and will stop discarding what you need. Call when it clearly helps.' }
    ]
  },
  {
    id: 'jokers', section: 'play', minutes: 4,
    title: 'All about Jokers',
    summary: 'What Jokers can and can’t do, and how to win them back.',
    practice: 'joker',
    blocks: [
      { type: 'p', text: 'Jokers are the most valuable tiles in the set. A Joker can stand in for any tile — but only inside a group of **three or more** identical tiles.' },
      { type: 'hand', groups: [['craks-6', 4, 1], ['dots-7', 5, 2]], caption: 'Legal: a Joker in a kong, and two Jokers in a quint.' },
      { type: 'list', items: [
        '**Never** in a single or a pair.',
        '**Never** passed in the Charleston.',
        'A **discarded** Joker is dead — nobody may call it.',
        'Some hands allow **no Jokers at all**, such as Singles & Pairs.'
      ] },
      { type: 'h', text: 'The Joker exchange' },
      { type: 'p', text: 'On your turn, if any exposure on the table (yours or anyone’s) contains a Joker, and you hold the **real tile** it stands for, you may swap your tile for the Joker.' },
      { type: 'hand', groups: [['bams-2', 3, 1]], caption: 'Hold a real 2 Bam? You may trade it for this Joker on your turn.' },
      { type: 'callout', tone: 'tip', title: 'Scan every exposure, every turn', text: 'Exchanges are free Jokers. Get in the habit of checking every exposure on the table before you discard.' },
      { type: 'callout', tone: 'custom', title: 'Table custom', text: 'Tables vary on exactly when during your turn the exchange happens. Ask your group.' }
    ]
  },
  {
    id: 'winning', section: 'play', minutes: 5,
    title: 'Mahjong, scoring and dead hands',
    summary: 'Declaring a win, who pays, and what makes a hand dead.',
    practice: 'error',
    blocks: [
      { type: 'p', text: 'When your 14 tiles match a hand on the card, call **“Mahjong!”** and lay all your tiles face up so the table can check them.' },
      { type: 'h', text: 'Scoring' },
      { type: 'p', text: 'The winner is paid the hand’s value from the card. Most tables play these standard adjustments:' },
      { type: 'list', items: [
        'The player who **discarded the winning tile** pays **double**; the others pay the single value.',
        'If the winner **picked the winning tile from the wall**, everyone pays **double**.',
        'A hand won **without any Jokers** (jokerless) is often worth **double** — except hands that never allow Jokers, such as Singles & Pairs.'
      ] },
      { type: 'callout', tone: 'custom', title: 'Check with your table', text: 'Scoring details and stakes vary from group to group. Many social games play for small change or just for points.' },
      { type: 'h', text: 'Dead hands' },
      { type: 'p', text: 'A hand becomes **dead** when it can no longer legally win. The player stops trying to win but usually keeps playing tiles until the game ends. Common causes:' },
      { type: 'list', items: [
        'Too many or too few tiles.',
        'An exposure that matches no hand on the card.',
        'Declaring Mahjong by mistake.'
      ] }
    ]
  },
  {
    id: 'choose', section: 'strategy', minutes: 5,
    title: 'Choosing your hand',
    summary: 'How to read your rack right after the deal.',
    practice: 'strategy',
    blocks: [
      { type: 'p', text: 'The first minute after the deal is the most important thinking you’ll do all game. Before the Charleston begins, take stock:' },
      { type: 'steps', items: [
        '**Sort** your tiles by suit, then honors, Flowers and Jokers.',
        '**Count your Jokers.** Two or more favor hands with kongs and quints. None at all? Singles & Pairs becomes possible.',
        '**Count your pairs.** Five or more pairs with no Jokers points to Singles & Pairs.',
        '**Look at the numbers.** Mostly even? Mostly odd? Lots of 3s, 6s and 9s? One number in several suits?',
        '**Pick two or three candidate hands**, not just one.'
      ] },
      { type: 'callout', tone: 'tip', title: 'Stay flexible', text: 'Keep two or three hands in mind through the Charleston. Commit to one once your rack takes shape — usually by the end of the Charleston or a few turns after.' },
      { type: 'p', text: 'Try the **Rack Builder** in Practice: deal yourself random racks and it will show which families each rack leans toward.' }
    ]
  },
  {
    id: 'charleston-strategy', section: 'strategy', minutes: 4,
    title: 'Charleston strategy',
    summary: 'What to pass, what to keep, and when to stop.',
    practice: 'charleston',
    blocks: [
      { type: 'dodont', do: [
        'Pass **loners** first — tiles that fit none of your candidate hands.',
        'Keep **pairs**. A Joker can never replace half a pair.',
        'Keep Flowers if your candidate hands use them.',
        'Use the **blind pass** when you can’t spare anything.',
        '**Stop the second Charleston** if your hand is already close.'
      ], dont: [
        'Pass a Joker — it is never allowed.',
        'Break up pairs early without a good reason.',
        'Commit to one hand too soon.'
      ] },
      { type: 'callout', tone: 'tip', title: 'Read what comes back', text: 'The tiles passed to you tell you what others are *not* collecting. If you keep receiving even numbers, your neighbors aren’t playing 2468 — which makes evens easier for you.' },
      { type: 'p', text: 'On the optional **courtesy pass**, it is perfectly fine to ask for zero tiles if you are happy with your rack.' }
    ]
  },
  {
    id: 'play-strategy', section: 'strategy', minutes: 5,
    title: 'Playing your hand',
    summary: 'Discarding well, counting tiles and knowing when to switch.',
    practice: 'away',
    blocks: [
      { type: 'h', text: 'Count tiles away' },
      { type: 'p', text: 'Get in the habit of counting how many tiles you still need — your hand is “three away” or “one away.” It tells you how close you are, and it makes choosing a discard easy: throw the tile that keeps you closest.' },
      { type: 'h', text: 'Watch for dead tiles' },
      { type: 'p', text: 'Only four of each tile exist. If you need a pair of 8 Bams and three are already discarded or exposed, that pair is impossible. **Switch hands early** rather than waiting for a tile that can’t come.' },
      { type: 'h', text: 'Expose only when it helps' },
      { type: 'p', text: 'Every exposure commits you and tells others your plan. Early in the game, stay flexible. Call when the tile is hard to get, or when you’re close to Mahjong.' },
      { type: 'callout', tone: 'tip', title: 'Jokers are gold', text: 'Keep your Jokers. The only good reason to throw one is defense late in the game — nobody can call a discarded Joker, so it is always safe.' }
    ]
  },
  {
    id: 'defense', section: 'strategy', minutes: 4,
    title: 'Defense: don’t hand out Mahjong',
    summary: 'Reading exposures and picking safe discards.',
    practice: 'strategy',
    blocks: [
      { type: 'p', text: 'Throwing another player’s winning tile usually costs you **double**. Good defense is just paying attention.' },
      { type: 'steps', items: [
        '**Read exposures.** Exposed 2s, 4s and 6s? That player is on 2468. Be careful with even tiles.',
        '**Count what’s left.** Late in the game, with only a few tiles in the wall, danger rises.',
        '**Prefer safe tiles.** A tile already discarded, or one whose other copies are all visible, is the safest throw.',
        '**Break your hand if you must.** If you’re far from Mahjong and someone else is close, don’t feed them.'
      ] },
      { type: 'callout', tone: 'rule', title: 'The always-safe discard', text: 'A discarded Joker can never be called. It is a painful throw, but it is completely safe.' }
    ]
  }
]);

export function getLesson(id) {
  return LESSONS.find((l) => l.id === id) || null;
}

/* ------------------ group names (for the "groups" lesson block) ------------------ */

export const GROUP_NAMES = Object.freeze([
  { name: 'Single', size: 1, tiles: ['wind-north'], jokers: false, note: 'One tile.' },
  { name: 'Pair', size: 2, tiles: ['dots-3', 'dots-3'], jokers: false, note: 'Two identical tiles.' },
  { name: 'Pung', size: 3, tiles: ['bams-5', 'bams-5', 'bams-5'], jokers: true, note: 'Three identical tiles.' },
  { name: 'Kong', size: 4, tiles: ['craks-8', 'craks-8', 'craks-8', 'craks-8'], jokers: true, note: 'Four identical tiles.' },
  { name: 'Quint', size: 5, tiles: ['dots-2', 'dots-2', 'dots-2', 'dots-2', 'joker'], jokers: true, note: 'Five identical tiles. Only four exist, so a quint always needs a Joker.' }
]);

/* ------------------ tips ------------------ */

export const TIPS = Object.freeze([
  'Pick two or three candidate hands right after the deal, not just one.',
  'A Joker can never be part of a pair. Protect your pairs during the Charleston.',
  'Check every exposure for a Joker you can win back before you discard.',
  'Count your Jokers first. Two or more is a nudge toward kongs and quints.',
  'Five pairs and no Jokers? Take a good look at Singles & Pairs.',
  'Say every discard out loud. It keeps the game fair and helps you remember.',
  'Only four of each tile exist. If three are gone, stop waiting for a pair of it.',
  'Exposing early tells everyone your hand. Stay concealed while you can.',
  'Late in the game, discard tiles that have already been thrown.',
  'Red Dragon goes with Craks, Green with Bams, and Soap with Dots.',
  'It is fine to ask for zero tiles on the courtesy pass.',
  'You may stop the second Charleston if your hand is already close.',
  'Middle numbers (3 to 7) fit more hands than 1s and 9s.',
  'A discarded Joker is dead — and that makes it the one discard that is always safe.',
  'Count how many tiles away you are. Discard the tile that keeps that number lowest.'
]);

export function tipOfTheDay(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  return TIPS[day % TIPS.length];
}

/* ------------------ glossary ------------------ */

export const GLOSSARY = Object.freeze([
  ['Bams', 'The bamboo suit, numbered 1 to 9. The 1 Bam is often drawn as a bird.'],
  ['Blind pass', 'On the last pass of a Charleston, passing along tiles you received without looking at them.'],
  ['Call', 'Claiming a discarded tile to complete a group of three or more, or to win.'],
  ['Card', 'The yearly list of winning hands published by the National Mah Jongg League.'],
  ['Charleston', 'The ritual of passing tiles between players before play begins.'],
  ['Concealed (C)', 'A hand that must stay hidden on your rack. You may only call the last tile, for Mahjong.'],
  ['Courtesy pass', 'An optional final pass of 0 to 3 tiles with the player across from you.'],
  ['Craks', 'The character suit, numbered 1 to 9, marked with a red character below the number.'],
  ['Dead hand', 'A hand that can no longer legally win, for example because of a wrong tile count.'],
  ['Dead tile', 'A tile you can no longer get because every copy is already discarded or exposed.'],
  ['Discard', 'The tile you throw face up at the end of your turn, naming it aloud.'],
  ['Dots', 'The circle suit, numbered 1 to 9.'],
  ['Dragons', 'Red, Green and White. Each partners with a suit: Red–Craks, Green–Bams, White–Dots.'],
  ['East', 'The dealer. East starts with 14 tiles and discards first.'],
  ['Exposed (X)', 'A hand you may build by calling discards and placing groups face up.'],
  ['Exposure', 'A group placed face up on your rack after calling a discard.'],
  ['Flower', 'A bonus-style tile with eight interchangeable copies, used in many hands.'],
  ['Hot tile', 'A tile likely to give another player Mahjong. Hold it late in the game.'],
  ['Joker', 'A wild tile usable only in groups of three or more identical tiles.'],
  ['Joker exchange', 'Swapping a real tile from your rack for a Joker in any exposure, on your turn.'],
  ['Jokerless', 'A winning hand with no Jokers. Many tables double its value.'],
  ['Kong', 'Four identical tiles.'],
  ['Mahjong', 'A completed 14-tile hand that matches the card — and what you call out to win.'],
  ['Pair', 'Two identical tiles. Jokers may never be used in a pair.'],
  ['Pung', 'Three identical tiles.'],
  ['Quint', 'Five identical tiles. Always needs at least one Joker.'],
  ['Rack', 'The stand that holds your tiles. Between turns it holds 13.'],
  ['Self-pick', 'Winning with a tile you drew from the wall yourself.'],
  ['Sextet', 'Six identical tiles. Rare, and only when the card calls for one.'],
  ['Single', 'One tile standing on its own. Jokers may never be used as a single.'],
  ['Soap', 'Nickname for the White Dragon, which also serves as zero on the card.'],
  ['Tiles away', 'How many more tiles you need to complete a hand.'],
  ['Wall', 'The rows of face-down tiles you draw from.'],
  ['Wall game', 'A game that ends with no winner because the wall ran out.'],
  ['Winds', 'North, East, West and South. Four copies of each.']
]);
