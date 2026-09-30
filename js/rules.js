// rules.js — Stable NMJL-style validators. Pure functions only.
// Never reads the DOM. Never string-matches display labels.
// Every result carries a ruleClass so conventions are never shown as absolutes.
//
// UNRESOLVED U1: exact penalty/recovery semantics after an illegal call or
//   exposure vary by table and by tournament vs. social play. We detect and
//   explain the illegal state; we do not assert a single penalty outcome.
// UNRESOLVED U2: the precise turn window for a Joker exchange is described
//   differently by different sources. Exposed as a convention below.
// UNRESOLVED U3: sextets exist in some rulebooks but are card-dependent.
//   Group sizes 1-6 are classified generically; scenarios only use 1-5.
// UNRESOLVED U4: calling the final discard for Mahjong on a concealed hand is
//   permitted, while pre-Mahjong calls are not. Implemented exactly that way.

import { getTileType, countByType } from './data.js';

export const RULE_CLASS = Object.freeze({
  STABLE: 'STABLE',
  CONVENTION: 'CONVENTION'
});

// CONFIGURABLE TABLE CONVENTIONS — not stable rules. One documented object.
export const TABLE_CONVENTIONS = {
  // U2: 'anytime-on-your-turn' | 'before-draw-only' | 'after-draw-only'
  jokerExchangeWindow: 'anytime-on-your-turn',
  // Blind passing taught only on the last pass of each Charleston round.
  allowBlindPass: true,
  // Second Charleston runs only if every player agrees.
  secondCharlestonRequiresUnanimity: true,
  // U1: how an illegal state is reported to the learner.
  illegalStatePenalty: 'explain-only'
};

export const RESULT_CODES = Object.freeze({
  OK: 'OK',
  EXCESS_COPIES: 'EXCESS_COPIES',
  DUPLICATE_INSTANCE: 'DUPLICATE_INSTANCE',
  RACK_TOO_FEW: 'RACK_TOO_FEW',
  RACK_TOO_MANY: 'RACK_TOO_MANY',
  JOKER_IN_SINGLE: 'JOKER_IN_SINGLE',
  JOKER_IN_PAIR: 'JOKER_IN_PAIR',
  JOKER_NOT_ALLOWED_BY_CARD: 'JOKER_NOT_ALLOWED_BY_CARD',
  JOKER_DISCARD_DEAD: 'JOKER_DISCARD_DEAD',
  GROUP_INVALID: 'GROUP_INVALID',
  GROUP_MIXED_TYPES: 'GROUP_MIXED_TYPES',
  CALL_NEEDS_TWO_MATCHES: 'CALL_NEEDS_TWO_MATCHES',
  CALL_FOR_PAIR_ILLEGAL: 'CALL_FOR_PAIR_ILLEGAL',
  CALL_CONCEALED_HAND: 'CALL_CONCEALED_HAND',
  CALL_JOKER_CANNOT_COMPLETE: 'CALL_JOKER_CANNOT_COMPLETE',
  EXCHANGE_TILE_MISMATCH: 'EXCHANGE_TILE_MISMATCH',
  EXCHANGE_NO_JOKER: 'EXCHANGE_NO_JOKER',
  EXCHANGE_WRONG_WINDOW: 'EXCHANGE_WRONG_WINDOW',
  CHARLESTON_WRONG_COUNT: 'CHARLESTON_WRONG_COUNT',
  CHARLESTON_JOKER_PASS: 'CHARLESTON_JOKER_PASS',
  CHARLESTON_TILE_NOT_IN_RACK: 'CHARLESTON_TILE_NOT_IN_RACK',
  CHARLESTON_BLIND_NOT_ALLOWED: 'CHARLESTON_BLIND_NOT_ALLOWED',
  PATTERN_WRONG_LENGTH: 'PATTERN_WRONG_LENGTH',
  PATTERN_NOT_MATCHED: 'PATTERN_NOT_MATCHED'
});

function result(ok, code, message, details = {}, ruleClass = RULE_CLASS.STABLE) {
  return { ok, code, severity: ok ? 'info' : 'error', ruleClass, message, details };
}

/* ---------- Set integrity ---------- */

// STABLE: no more physical copies than legally exist in a 152-tile set.
export function validateCopyCounts(tiles) {
  const seen = new Set();
  for (const t of tiles) {
    if (seen.has(t.instanceId)) {
      return result(false, RESULT_CODES.DUPLICATE_INSTANCE,
        'The same physical tile appears twice. Each tile in the set is one object and can only be in one place.',
        { instanceId: t.instanceId });
    }
    seen.add(t.instanceId);
  }
  const counts = countByType(tiles);
  for (const typeId of Object.keys(counts)) {
    const type = getTileType(typeId);
    if (!type) continue;
    if (counts[typeId] > type.maxCopies) {
      return result(false, RESULT_CODES.EXCESS_COPIES,
        `There are ${counts[typeId]} copies of ${type.displayName}, but a set only contains ${type.maxCopies}.`,
        { typeId, found: counts[typeId], allowed: type.maxCopies });
    }
  }
  return result(true, RESULT_CODES.OK, 'Tile counts are legal.');
}

/* ---------- Rack size ---------- */

// STABLE: 13 tiles on the rack; East begins with 14; 14 while holding a drawn
// or just-called tile, before discarding.
export function validateRackSize(rack, opts = {}) {
  const isEast = !!opts.isEast;
  const phase = opts.phase || 'resting'; // 'resting' | 'holding'
  const n = rack.length;
  const expected = (phase === 'holding' || (isEast && phase === 'deal')) ? 14 : 13;
  if (n === expected) {
    return result(true, RESULT_CODES.OK, `The rack has the correct ${expected} tiles.`, { count: n, expected });
  }
  if (n < expected) {
    return result(false, RESULT_CODES.RACK_TOO_FEW,
      `The rack has ${n} tiles but should have ${expected} right now.`, { count: n, expected });
  }
  return result(false, RESULT_CODES.RACK_TOO_MANY,
    `The rack has ${n} tiles but should have ${expected} right now.`, { count: n, expected });
}

/* ---------- Group classification ---------- */

const SIZE_NAMES = { 1: 'single', 2: 'pair', 3: 'pung', 4: 'kong', 5: 'quint', 6: 'sextet' };

// STABLE: a grouping is identical tiles; jokers may stand in for them.
export function classifyGroup(tiles) {
  const jokers = tiles.filter((t) => t.typeId === 'joker');
  const naturals = tiles.filter((t) => t.typeId !== 'joker');
  const naturalTypes = new Set(naturals.map((t) => t.typeId));
  const size = tiles.length;
  const name = SIZE_NAMES[size] || 'invalid';
  const base = {
    size,
    name,
    jokerCount: jokers.length,
    naturalCount: naturals.length,
    typeId: naturalTypes.size === 1 ? naturals[0].typeId : null,
    mixed: naturalTypes.size > 1
  };
  if (naturalTypes.size > 1) {
    return Object.assign(base, { valid: false, code: RESULT_CODES.GROUP_MIXED_TYPES });
  }
  if (size < 1 || size > 6) {
    return Object.assign(base, { valid: false, code: RESULT_CODES.GROUP_INVALID });
  }
  return Object.assign(base, { valid: true, code: RESULT_CODES.OK });
}

/* ---------- Joker legality ---------- */

// STABLE: a Joker may only stand in for a tile inside a grouping of three or
// more identical tiles. Never a single, never either half of a pair.
// CARD-DEPENDENT: whether the line permits jokers at all must be supplied by
// the caller as cardAllowsJoker. The engine never infers it.
export function isJokerAllowedInGroup(opts = {}) {
  const groupSize = opts.groupSize;
  const cardAllowsJoker = opts.cardAllowsJoker !== false;
  if (groupSize === 1) {
    return result(false, RESULT_CODES.JOKER_IN_SINGLE,
      'A Joker can never stand in for a single tile. Singles must be the real tile.', { groupSize });
  }
  if (groupSize === 2) {
    return result(false, RESULT_CODES.JOKER_IN_PAIR,
      'A Joker can never be used in a pair. Both tiles of a pair must be real tiles.', { groupSize });
  }
  if (!cardAllowsJoker) {
    return result(false, RESULT_CODES.JOKER_NOT_ALLOWED_BY_CARD,
      'This hand does not permit Jokers, so every tile must be a real tile. Check your current card.',
      { groupSize }, RULE_CLASS.STABLE);
  }
  if (groupSize >= 3 && groupSize <= 6) {
    return result(true, RESULT_CODES.OK,
      `A Joker is allowed here, because a ${SIZE_NAMES[groupSize]} is a group of three or more identical tiles.`,
      { groupSize });
  }
  return result(false, RESULT_CODES.GROUP_INVALID, 'That is not a valid size for a grouping.', { groupSize });
}

/* ---------- Exposures ---------- */

// STABLE: an exposure is the called tile plus matching tiles from your rack.
// Jokers may fill a group of 3+ only.
export function validateExposure(exposure, opts = {}) {
  const g = classifyGroup(exposure);
  if (g.mixed) {
    return result(false, RESULT_CODES.GROUP_MIXED_TYPES,
      'An exposure must be the same tile repeated, plus Jokers if allowed. These tiles are not all the same.', g);
  }
  if (!g.valid) {
    return result(false, RESULT_CODES.GROUP_INVALID, 'That is not a valid exposure.', g);
  }
  if (g.jokerCount > 0) {
    const jr = isJokerAllowedInGroup({ groupSize: g.size, cardAllowsJoker: opts.cardAllowsJoker !== false });
    if (!jr.ok) return Object.assign({}, jr, { details: Object.assign({}, jr.details, g) });
  }
  if (g.naturalCount === 0) {
    return result(false, RESULT_CODES.GROUP_INVALID,
      'An exposure cannot be made of Jokers alone. It needs the real tile it stands for.', g);
  }
  if (opts.handIsConcealed && !opts.isMahjongDeclaration) {
    return result(false, RESULT_CODES.CALL_CONCEALED_HAND,
      'This hand must stay concealed, so you cannot put an exposure on your rack.', g);
  }
  return result(true, RESULT_CODES.OK, `That is a legal ${g.name}.`, g);
}

/* ---------- Calling a discard ---------- */

// STABLE: you may call a discard only to complete a grouping of three or more,
// using the discarded tile plus at least two matching tiles already in hand
// (Jokers may help reach the group size). A discarded Joker is dead.
// You may never call for a pair or single, except that the final tile that
// completes your hand may be called for Mahjong (U4).
export function canCallDiscard(state = {}) {
  const discard = state.discard;
  const rack = state.rack || [];
  const targetSize = state.targetGroupSize || 3;
  const forMahjong = !!state.forMahjong;
  const handIsConcealed = !!state.handIsConcealed;
  const cardAllowsJoker = state.cardAllowsJoker !== false;

  if (!discard) {
    return result(false, RESULT_CODES.GROUP_INVALID, 'There is no discarded tile to call.');
  }
  if (discard.typeId === 'joker') {
    return result(false, RESULT_CODES.JOKER_DISCARD_DEAD,
      'A discarded Joker is dead. No one may pick it up for any reason.', { typeId: 'joker' });
  }
  if (handIsConcealed && !forMahjong) {
    return result(false, RESULT_CODES.CALL_CONCEALED_HAND,
      'This hand must stay concealed. You may only call a discard if it is the very tile that completes your hand for Mahjong.',
      { handIsConcealed: true });
  }
  if (!forMahjong && targetSize < 3) {
    return result(false, RESULT_CODES.CALL_FOR_PAIR_ILLEGAL,
      'You cannot call a discard to make a pair or a single. Calling is only for a group of three or more.',
      { targetSize });
  }

  const matches = rack.filter((t) => t.typeId === discard.typeId).length;
  const jokersInRack = rack.filter((t) => t.typeId === 'joker').length;

  if (forMahjong) {
    // The scenario must supply whether the tile truly completes the hand.
    if (state.completesHand === true) {
      return result(true, RESULT_CODES.OK,
        'Yes. This discard completes the hand, so it may be called for Mahjong.', { matches });
    }
    if (state.completesHand === false) {
      return result(false, RESULT_CODES.PATTERN_NOT_MATCHED,
        'This tile does not finish the hand, so it cannot be called for Mahjong.', { matches });
    }
  }

  const needFromRack = targetSize - 1;
  const jokersUsable = cardAllowsJoker && targetSize >= 3 ? jokersInRack : 0;
  if (matches + jokersUsable < needFromRack) {
    return result(false, RESULT_CODES.CALL_NEEDS_TWO_MATCHES,
      `You need ${needFromRack} more matching tiles on your rack to make that group, and you have ${matches}${jokersUsable ? ` plus ${jokersUsable} Joker(s)` : ''}.`,
      { matches, jokersUsable, needFromRack });
  }
  if (matches < 1) {
    return result(false, RESULT_CODES.CALL_JOKER_CANNOT_COMPLETE,
      'You must already hold at least one real copy of the tile. Jokers alone cannot claim a discard.',
      { matches, jokersUsable });
  }
  return result(true, RESULT_CODES.OK,
    `Yes. You may call it and expose a ${SIZE_NAMES[targetSize]}.`, { matches, jokersUsable, targetSize });
}

/* ---------- Joker exchange ---------- */

// STABLE: on your turn you may swap the matching real tile from your rack for
// a Joker showing in any exposure. The tile offered must match the tile the
// Joker stands for.
// CONVENTION (U2): the exact turn window varies; see TABLE_CONVENTIONS.
export function validateJokerExchange(opts = {}) {
  const exposure = opts.exposure || [];
  const offered = opts.offeredTile;
  const turnPhase = opts.turnPhase || 'your-turn';
  const g = classifyGroup(exposure);

  if (g.jokerCount === 0) {
    return result(false, RESULT_CODES.EXCHANGE_NO_JOKER,
      'There is no Joker in that exposure, so there is nothing to exchange.', g);
  }
  if (!offered) {
    return result(false, RESULT_CODES.EXCHANGE_TILE_MISMATCH, 'You did not offer a tile.', g);
  }
  if (offered.typeId === 'joker') {
    return result(false, RESULT_CODES.EXCHANGE_TILE_MISMATCH,
      'You cannot trade a Joker for a Joker. You must give the real tile.', g);
  }
  if (g.typeId && offered.typeId !== g.typeId) {
    const want = getTileType(g.typeId);
    const have = getTileType(offered.typeId);
    return result(false, RESULT_CODES.EXCHANGE_TILE_MISMATCH,
      `That Joker stands for ${want ? want.displayName : 'another tile'}, so you must give a ${want ? want.displayName : 'matching tile'} — not a ${have ? have.displayName : 'different tile'}.`,
      { expected: g.typeId, offered: offered.typeId });
  }
  if (g.size < 3) {
    return result(false, RESULT_CODES.JOKER_IN_PAIR,
      'A Joker cannot legally be in a group smaller than three, so this exposure is not valid to begin with.', g);
  }
  const window = TABLE_CONVENTIONS.jokerExchangeWindow;
  const windowOk = window === 'anytime-on-your-turn'
    ? turnPhase === 'your-turn' || turnPhase === 'before-draw' || turnPhase === 'after-draw'
    : turnPhase === window.replace('-only', '');
  if (!windowOk) {
    return Object.assign(
      result(false, RESULT_CODES.EXCHANGE_WRONG_WINDOW,
        'At this table, the exchange happens at a different point in your turn. Tables vary on this, so confirm with your group.',
        { turnPhase, window }, RULE_CLASS.CONVENTION),
      { severity: 'warning' }
    );
  }
  return result(true, RESULT_CODES.OK,
    'Yes. You may take the Joker and put your matching tile in its place.', g);
}

/* ---------- Charleston ---------- */

// STABLE: exactly three tiles every pass; a Joker is never passed.
// CONVENTION: blind passing allowed only on the last pass of each round.
export function validateCharlestonPass(selected, opts = {}) {
  const rack = opts.rack || [];
  const passIndex = opts.passIndex || 1; // 1..6
  if (selected.length !== 3) {
    return result(false, RESULT_CODES.CHARLESTON_WRONG_COUNT,
      `Every Charleston pass is exactly three tiles. You chose ${selected.length}.`,
      { count: selected.length });
  }
  const joker = selected.find((t) => t.typeId === 'joker');
  if (joker) {
    return result(false, RESULT_CODES.CHARLESTON_JOKER_PASS,
      'A Joker may never be passed during the Charleston. Keep it on your rack.', { typeId: 'joker' });
  }
  if (rack.length) {
    const ids = new Set(rack.map((t) => t.instanceId));
    const stray = selected.find((t) => !ids.has(t.instanceId));
    if (stray) {
      return result(false, RESULT_CODES.CHARLESTON_TILE_NOT_IN_RACK,
        'One of the chosen tiles is not on your rack.', { instanceId: stray.instanceId });
    }
  }
  if (opts.blindCount > 0) {
    const blindAllowed = TABLE_CONVENTIONS.allowBlindPass && (passIndex === 3 || passIndex === 6);
    if (!blindAllowed) {
      return Object.assign(
        result(false, RESULT_CODES.CHARLESTON_BLIND_NOT_ALLOWED,
          'A blind pass is only made on the last pass of a Charleston round.',
          { passIndex }, RULE_CLASS.CONVENTION),
        { severity: 'warning' }
      );
    }
  }
  return result(true, RESULT_CODES.OK,
    'This is a legal pass: three tiles, and no Joker among them.', { passIndex });
}

/* ---------- Whole-state check ---------- */

export function detectIllegalState(gameState = {}) {
  const issues = [];
  const rack = gameState.rack || [];
  const exposures = gameState.exposures || [];
  const flat = rack.concat(...exposures.map((e) => e.tiles || e));
  const all = flat.concat(gameState.discards || []);

  const copies = validateCopyCounts(all);
  if (!copies.ok) issues.push(copies);

  const sizeTotal = rack.length + exposures.reduce((n, e) => n + ((e.tiles || e).length), 0);
  const expected = gameState.phase === 'holding' || (gameState.isEast && gameState.phase === 'deal') ? 14 : 13;
  if (sizeTotal !== expected) {
    issues.push(result(sizeTotal === expected, sizeTotal < expected ? RESULT_CODES.RACK_TOO_FEW : RESULT_CODES.RACK_TOO_MANY,
      `Counting the rack and every exposure, this player has ${sizeTotal} tiles but should have ${expected}.`,
      { found: sizeTotal, expected }));
  }

  for (const e of exposures) {
    const tiles = e.tiles || e;
    const v = validateExposure(tiles, {
      cardAllowsJoker: e.cardAllowsJoker !== false,
      handIsConcealed: !!gameState.handIsConcealed
    });
    if (!v.ok) issues.push(v);
  }

  if ((gameState.discards || []).some((t) => t.typeId === 'joker') && gameState.jokerWasClaimed) {
    issues.push(result(false, RESULT_CODES.JOKER_DISCARD_DEAD,
      'A discarded Joker was picked up. A discarded Joker is dead and can never be claimed.'));
  }

  return {
    ok: issues.length === 0,
    issues,
    message: issues.length === 0
      ? 'This looks like a legal table state.'
      : `There ${issues.length === 1 ? 'is 1 problem' : `are ${issues.length} problems`} with this state.`
  };
}

/* ---------- Distance to a target hand ---------- */

// STABLE: how many more tiles a rack needs to complete a target hand.
// `groups` is a list of { typeId, size } that together make 14 tiles.
// Jokers fill only slots in groups of three or more, and only when the hand
// permits Jokers. Real tiles are spent on pairs and singles first, because a
// Joker can never fill those slots.
export function tilesAway(rack, groups, opts = {}) {
  const cardAllowsJoker = opts.cardAllowsJoker !== false;
  const have = countByType(rack.filter((t) => t.typeId !== 'joker'));
  const jokers = cardAllowsJoker ? rack.filter((t) => t.typeId === 'joker').length : 0;
  const need = Object.create(null);
  for (const g of groups) {
    const n = need[g.typeId] || (need[g.typeId] = { small: 0, large: 0 });
    if (g.size >= 3) n.large += g.size; else n.small += g.size;
  }
  let missingSmall = 0;
  let missingLarge = 0;
  const missing = [];
  for (const typeId of Object.keys(need)) {
    const n = need[typeId];
    let h = have[typeId] || 0;
    const gapSmall = Math.max(0, n.small - h);
    h = Math.max(0, h - n.small);
    const gapLarge = Math.max(0, n.large - h);
    missingSmall += gapSmall;
    missingLarge += gapLarge;
    if (gapSmall + gapLarge > 0) missing.push({ typeId, count: gapSmall + gapLarge, jokerEligible: gapLarge });
  }
  const jokersUsed = Math.min(jokers, missingLarge);
  return {
    away: missingSmall + missingLarge - jokersUsed,
    missing,
    jokersUsed,
    jokersUnused: jokers - jokersUsed,
    missingSmall,
    missingLarge
  };
}

/* ---------- User-entered pattern (never annual card data) ---------- */

// The pattern is a list of 14 typeIds the user typed in from their own card.
// Jokers in the rack may substitute only inside groups of 3+ of the same type.
export function validateAgainstUserPattern(rack, pattern, opts = {}) {
  if (!pattern || pattern.length !== 14) {
    return result(false, RESULT_CODES.PATTERN_WRONG_LENGTH,
      'A winning pattern must be exactly 14 tiles.', { length: pattern ? pattern.length : 0 });
  }
  if (rack.length !== 14) {
    return result(false, RESULT_CODES.RACK_TOO_MANY,
      `To declare Mahjong you need exactly 14 tiles. You have ${rack.length}.`, { count: rack.length });
  }
  const needCounts = countByType(pattern.map((typeId) => ({ typeId })));
  const haveCounts = countByType(rack);
  let jokers = haveCounts.joker || 0;
  const missing = [];
  for (const typeId of Object.keys(needCounts)) {
    const need = needCounts[typeId];
    const have = Math.min(haveCounts[typeId] || 0, need);
    let gap = need - have;
    if (gap > 0) {
      // Jokers may only fill a slot belonging to a group of three or more.
      const jokerEligible = need >= 3 && opts.cardAllowsJoker !== false;
      if (jokerEligible && jokers >= gap) {
        jokers -= gap;
        gap = 0;
      }
    }
    if (gap > 0) missing.push({ typeId, need, have });
  }
  if (missing.length) {
    return result(false, RESULT_CODES.PATTERN_NOT_MATCHED,
      'This hand does not match your saved pattern yet.', { missing });
  }
  return result(true, RESULT_CODES.OK,
    'This hand matches the pattern you saved. Check it against your current card before declaring Mahjong.');
}
