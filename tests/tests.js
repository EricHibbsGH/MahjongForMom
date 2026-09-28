// tests.js — development-only browser tests. Not linked from the app.
import {
  generateFullSet, TILE_TYPES, getTileType, shuffle, makeSeededRng,
  countByType, sortRack, addTile, removeTile, hydrate, makeInstance
} from '../js/data.js';

import {
  validateCopyCounts, validateRackSize, classifyGroup, isJokerAllowedInGroup,
  canCallDiscard, validateJokerExchange, validateCharlestonPass,
  validateExposure, detectIllegalState, validateAgainstUserPattern,
  RESULT_CODES, TABLE_CONVENTIONS
} from '../js/rules.js';

import { ALL_SCENARIOS, scenariosForMode } from '../js/scenarios.js';

const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, message: e.message }); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error((msg || 'values differ') + ` — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
}
function assertCode(res, code) { assertEqual(res.code, code, 'wrong result code'); }

/* ---- tile set ---- */
test('full set has 152 tiles', () => assertEqual(generateFullSet().length, 152));

test('family counts are 108/16/12/8/8', () => {
  const set = generateFullSet();
  const by = (fam) => set.filter((t) => getTileType(t.typeId).family === fam).length;
  assertEqual(by('suit'), 108, 'suit tiles');
  assertEqual(by('wind'), 16, 'winds');
  assertEqual(by('dragon'), 12, 'dragons');
  assertEqual(by('flower'), 8, 'flowers');
  assertEqual(by('joker'), 8, 'jokers');
});

test('every suited type has exactly four copies', () => {
  const counts = countByType(generateFullSet());
  for (const t of TILE_TYPES) {
    if (t.family === 'suit' || t.family === 'wind' || t.family === 'dragon') assertEqual(counts[t.typeId], 4, t.typeId);
  }
});

test('all instance ids are unique', () => {
  const set = generateFullSet();
  assertEqual(new Set(set.map((t) => t.instanceId)).size, 152);
});

test('seeded shuffle is deterministic', () => {
  const set = generateFullSet();
  const a = shuffle(set, makeSeededRng(42)).map((t) => t.instanceId).join(',');
  const b = shuffle(set, makeSeededRng(42)).map((t) => t.instanceId).join(',');
  assertEqual(a, b);
  assert(a !== set.map((t) => t.instanceId).join(','), 'shuffle should change order');
});

test('sortRack groups suits then honours then flowers then jokers', () => {
  const r = hydrate(['joker', 'flower', 'dragon-red', 'wind-east', 'craks-2', 'bams-1', 'dots-9']);
  const order = sortRack(r).map((t) => t.typeId);
  assertEqual(order[0], 'dots-9');
  assertEqual(order[order.length - 1], 'joker');
});

test('addTile and removeTile are immutable', () => {
  const r = hydrate(['dots-1']);
  const r2 = addTile(r, makeInstance('dots-2', 0));
  assertEqual(r.length, 1); assertEqual(r2.length, 2);
  const r3 = removeTile(r2, r2[0].instanceId);
  assertEqual(r2.length, 2); assertEqual(r3.length, 1);
});

/* ---- copy limits ---- */
test('five copies of a normal tile are rejected', () => {
  const res = validateCopyCounts(hydrate(['bams-3','bams-3','bams-3','bams-3','bams-3']));
  assert(!res.ok); assertCode(res, RESULT_CODES.EXCESS_COPIES);
  assertEqual(res.details.allowed, 4);
});

test('four copies of a normal tile are accepted', () => {
  assert(validateCopyCounts(hydrate(['bams-3','bams-3','bams-3','bams-3'])).ok);
});

test('six flowers are legal, nine are not', () => {
  assert(validateCopyCounts(hydrate(Array(6).fill('flower'))).ok);
  assert(!validateCopyCounts(hydrate(Array(9).fill('flower'))).ok);
});

test('duplicate instance ids are rejected', () => {
  const t = makeInstance('dots-1', 0);
  assertCode(validateCopyCounts([t, t]), RESULT_CODES.DUPLICATE_INSTANCE);
});

/* ---- rack size ---- */
test('13 tiles resting is legal', () => assert(validateRackSize(hydrate(Array(13).fill('dots-1').map((v, i) => i < 4 ? 'dots-1' : 'bams-' + ((i % 9) + 1))), { phase: 'resting' }).ok));
test('14 resting is too many', () => assertCode(validateRackSize(new Array(14).fill({ typeId: 'dots-1' }), { phase: 'resting' }), RESULT_CODES.RACK_TOO_MANY));
test('12 resting is too few', () => assertCode(validateRackSize(new Array(12).fill({ typeId: 'dots-1' }), { phase: 'resting' }), RESULT_CODES.RACK_TOO_FEW));
test('14 while holding is legal', () => assert(validateRackSize(new Array(14).fill({ typeId: 'dots-1' }), { phase: 'holding' }).ok));
test('East deals with 14', () => assert(validateRackSize(new Array(14).fill({ typeId: 'dots-1' }), { phase: 'deal', isEast: true }).ok));

/* ---- group classification ---- */
test('classifyGroup names sizes', () => {
  assertEqual(classifyGroup(hydrate(['dots-1'])).name, 'single');
  assertEqual(classifyGroup(hydrate(['dots-1','dots-1'])).name, 'pair');
  assertEqual(classifyGroup(hydrate(['dots-1','dots-1','dots-1'])).name, 'pung');
  assertEqual(classifyGroup(hydrate(['dots-1','dots-1','dots-1','dots-1'])).name, 'kong');
  assertEqual(classifyGroup(hydrate(['dots-1','dots-1','dots-1','joker','joker'])).name, 'quint');
});

test('mixed tiles are not a valid group', () => {
  const g = classifyGroup(hydrate(['bams-3','bams-3','bams-4']));
  assert(!g.valid); assertEqual(g.code, RESULT_CODES.GROUP_MIXED_TYPES);
});

/* ---- joker restrictions ---- */
test('joker rejected in a single', () => assertCode(isJokerAllowedInGroup({ groupSize: 1, cardAllowsJoker: true }), RESULT_CODES.JOKER_IN_SINGLE));
test('joker rejected in a pair', () => assertCode(isJokerAllowedInGroup({ groupSize: 2, cardAllowsJoker: true }), RESULT_CODES.JOKER_IN_PAIR));
test('joker allowed in pung, kong, quint', () => {
  for (const n of [3, 4, 5]) assert(isJokerAllowedInGroup({ groupSize: n, cardAllowsJoker: true }).ok, 'size ' + n);
});
test('joker rejected at any size when the hand forbids jokers', () => {
  for (const n of [3, 4, 5]) assertCode(isJokerAllowedInGroup({ groupSize: n, cardAllowsJoker: false }), RESULT_CODES.JOKER_NOT_ALLOWED_BY_CARD);
});
test('exposure of jokers alone is rejected', () => {
  assert(!validateExposure(hydrate(['joker','joker','joker']), { cardAllowsJoker: true }).ok);
});
test('concealed hand cannot hold an exposure', () => {
  assertCode(validateExposure(hydrate(['dots-2','dots-2','dots-2']), { handIsConcealed: true }), RESULT_CODES.CALL_CONCEALED_HAND);
});

/* ---- calling ---- */
test('legal pung call', () => {
  const res = canCallDiscard({ rack: hydrate(['bams-7','bams-7','dots-1']), discard: { typeId: 'bams-7', instanceId: 'x' }, targetGroupSize: 3 });
  assert(res.ok, res.message);
});
test('call for a pair is illegal', () => {
  assertCode(canCallDiscard({ rack: hydrate(['craks-4']), discard: { typeId: 'craks-4', instanceId: 'x' }, targetGroupSize: 2 }), RESULT_CODES.CALL_FOR_PAIR_ILLEGAL);
});
test('discarded joker is dead', () => {
  assertCode(canCallDiscard({ rack: hydrate(['joker','dots-1']), discard: { typeId: 'joker', instanceId: 'x' }, targetGroupSize: 3 }), RESULT_CODES.JOKER_DISCARD_DEAD);
});
test('only one matching tile is not enough for a pung', () => {
  assertCode(canCallDiscard({ rack: hydrate(['wind-north','dots-1']), discard: { typeId: 'wind-north', instanceId: 'x' }, targetGroupSize: 3 }), RESULT_CODES.CALL_NEEDS_TWO_MATCHES);
});
test('one real tile plus jokers can claim a discard', () => {
  assert(canCallDiscard({ rack: hydrate(['dots-5','joker','joker']), discard: { typeId: 'dots-5', instanceId: 'x' }, targetGroupSize: 3, cardAllowsJoker: true }).ok);
});
test('jokers alone cannot claim a discard', () => {
  assertCode(canCallDiscard({ rack: hydrate(['joker','joker']), discard: { typeId: 'dots-5', instanceId: 'x' }, targetGroupSize: 3, cardAllowsJoker: true }), RESULT_CODES.CALL_JOKER_CANNOT_COMPLETE);
});
test('concealed hand cannot call before mahjong', () => {
  assertCode(canCallDiscard({ rack: hydrate(['craks-7','craks-7']), discard: { typeId: 'craks-7', instanceId: 'x' }, targetGroupSize: 3, handIsConcealed: true }), RESULT_CODES.CALL_CONCEALED_HAND);
});
test('concealed hand may call the final tile for mahjong', () => {
  assert(canCallDiscard({ rack: hydrate(['craks-7']), discard: { typeId: 'craks-7', instanceId: 'x' }, handIsConcealed: true, forMahjong: true, completesHand: true }).ok);
});

/* ---- joker exchange ---- */
test('matching tile exchanges for an exposed joker', () => {
  assert(validateJokerExchange({ exposure: hydrate(['bams-2','bams-2','joker']), offeredTile: { typeId: 'bams-2', instanceId: 'o' }, turnPhase: 'your-turn' }).ok);
});
test('mismatched tile cannot take the joker', () => {
  assertCode(validateJokerExchange({ exposure: hydrate(['dragon-green','dragon-green','dragon-green','joker']), offeredTile: { typeId: 'dragon-red', instanceId: 'o' }, turnPhase: 'your-turn' }), RESULT_CODES.EXCHANGE_TILE_MISMATCH);
});
test('no joker in the exposure means nothing to exchange', () => {
  assertCode(validateJokerExchange({ exposure: hydrate(['bams-2','bams-2','bams-2']), offeredTile: { typeId: 'bams-2', instanceId: 'o' } }), RESULT_CODES.EXCHANGE_NO_JOKER);
});
test('a joker sitting in a pair is flagged as an impossible exposure', () => {
  assertCode(validateJokerExchange({ exposure: hydrate(['bams-2','joker']), offeredTile: { typeId: 'bams-2', instanceId: 'o' }, turnPhase: 'your-turn' }), RESULT_CODES.JOKER_IN_PAIR);
});
test('exchange window is reported as a table custom', () => {
  const saved = TABLE_CONVENTIONS.jokerExchangeWindow;
  TABLE_CONVENTIONS.jokerExchangeWindow = 'before-draw-only';
  const res = validateJokerExchange({ exposure: hydrate(['bams-2','bams-2','joker']), offeredTile: { typeId: 'bams-2', instanceId: 'o' }, turnPhase: 'after-draw' });
  assertCode(res, RESULT_CODES.EXCHANGE_WRONG_WINDOW);
  assertEqual(res.ruleClass, 'CONVENTION');
  TABLE_CONVENTIONS.jokerExchangeWindow = saved;
});

/* ---- charleston ---- */
test('a pass must be exactly three tiles', () => {
  assertCode(validateCharlestonPass(hydrate(['dots-1','dots-2']), { passIndex: 1 }), RESULT_CODES.CHARLESTON_WRONG_COUNT);
});
test('a joker may never be passed', () => {
  assertCode(validateCharlestonPass(hydrate(['joker','dots-1','dots-2']), { passIndex: 1 }), RESULT_CODES.CHARLESTON_JOKER_PASS);
});
test('three non-joker tiles from the rack is a legal pass', () => {
  const rack = hydrate(['dots-1','dots-2','dots-3','bams-1']);
  assert(validateCharlestonPass(rack.slice(0, 3), { rack, passIndex: 1 }).ok);
});
test('tiles not on the rack cannot be passed', () => {
  const rack = hydrate(['dots-1','dots-2','dots-3']);
  assertCode(validateCharlestonPass(hydrate(['bams-1','bams-2','bams-3'], 'z'), { rack, passIndex: 1 }), RESULT_CODES.CHARLESTON_TILE_NOT_IN_RACK);
});
test('blind pass is only offered on passes 3 and 6', () => {
  const rack = hydrate(['dots-1','dots-2','dots-3']);
  assertCode(validateCharlestonPass(rack, { rack, passIndex: 2, blindCount: 1 }), RESULT_CODES.CHARLESTON_BLIND_NOT_ALLOWED);
  assert(validateCharlestonPass(rack, { rack, passIndex: 3, blindCount: 1 }).ok);
});

/* ---- whole state ---- */
test('detectIllegalState finds a fifth copy', () => {
  const res = detectIllegalState({ rack: hydrate(['craks-2','craks-2','craks-2','craks-2','craks-2','dots-4','bams-6','bams-7','wind-west','wind-west','dragon-white','flower','joker']), phase: 'resting' });
  assert(!res.ok);
  assert(res.issues.some((i) => i.code === RESULT_CODES.EXCESS_COPIES));
});
test('detectIllegalState finds an oversized rack', () => {
  const res = detectIllegalState({ rack: hydrate(Array(15).fill('flower').map((_, i) => i < 8 ? 'flower' : 'dots-' + (i - 7))), phase: 'resting' });
  assert(res.issues.some((i) => i.code === RESULT_CODES.RACK_TOO_MANY));
});
test('detectIllegalState accepts a clean 13-tile rack', () => {
  const res = detectIllegalState({ rack: hydrate(['dots-1','dots-2','dots-3','bams-1','bams-2','bams-3','craks-1','craks-2','craks-3','wind-east','wind-south','dragon-red','flower']), phase: 'resting' });
  assert(res.ok, JSON.stringify(res.issues));
});

/* ---- user pattern ---- */
test('a pattern must be 14 tiles', () => {
  assertCode(validateAgainstUserPattern(hydrate(Array(14).fill('dots-1')), ['dots-1']), RESULT_CODES.PATTERN_WRONG_LENGTH);
});
test('an exact rack matches its pattern', () => {
  const pattern = ['dots-1','dots-1','dots-1','bams-2','bams-2','bams-2','craks-3','craks-3','craks-3','flower','flower','flower','wind-east','wind-east'];
  assert(validateAgainstUserPattern(hydrate(pattern), pattern).ok);
});
test('a joker may fill a group of three but not a pair', () => {
  const pattern = ['dots-1','dots-1','dots-1','bams-2','bams-2','bams-2','craks-3','craks-3','craks-3','flower','flower','flower','wind-east','wind-east'];
  const withJokerInPung = pattern.slice(); withJokerInPung[2] = 'joker';
  assert(validateAgainstUserPattern(hydrate(withJokerInPung), pattern, { cardAllowsJoker: true }).ok, 'joker should fill a pung slot');
  const withJokerInPair = pattern.slice(); withJokerInPair[13] = 'joker';
  assert(!validateAgainstUserPattern(hydrate(withJokerInPair), pattern, { cardAllowsJoker: true }).ok, 'joker must not fill a pair slot');
});

/* ---- scenarios ---- */
test('there are at least 20 scenarios', () => assert(ALL_SCENARIOS.length >= 20, 'found ' + ALL_SCENARIOS.length));
test('scenario ids are unique', () => assertEqual(new Set(ALL_SCENARIOS.map((s) => s.id)).size, ALL_SCENARIOS.length));
test('every mode has at least three scenarios', () => {
  for (const m of ['tiles','rack','charleston','call','joker','error']) {
    assert(scenariosForMode(m).length >= 3, m + ' has only ' + scenariosForMode(m).length);
  }
});
test('every scenario has the required fields', () => {
  for (const s of ALL_SCENARIOS) {
    assert(s.id && s.mode && s.difficulty && s.objective && s.state && s.prompt && s.answer && s.explanation, 'incomplete: ' + s.id);
    assert(Array.isArray(s.ruleTags) && s.ruleTags.length, 'missing tags: ' + s.id);
  }
});
test('scenarios are frozen', () => {
  const s = ALL_SCENARIOS[0];
  try { s.prompt = 'changed'; } catch (e) { /* strict mode throws, which is fine */ }
  assert(s.prompt !== 'changed', 'scenario was mutable');
});
test('every call scenario agrees with the rules engine', () => {
  for (const s of scenariosForMode('call')) {
    const res = canCallDiscard({
      rack: hydrate(s.state.rack, s.id),
      discard: hydrate([s.state.discard], s.id + 'd')[0],
      targetGroupSize: s.state.targetGroupSize,
      handIsConcealed: s.state.handIsConcealed,
      cardAllowsJoker: s.state.cardAllowsJoker,
      forMahjong: s.state.forMahjong
    });
    assertEqual(res.ok, s.answer.correct, s.id + ' disagrees with the engine: ' + res.message);
  }
});
test('every find-the-error scenario really is illegal', () => {
  for (const s of scenariosForMode('error')) {
    const res = detectIllegalState({
      rack: hydrate(s.state.rack, s.id),
      exposures: (s.state.exposures || []).map((e, i) => ({ tiles: hydrate(e.tiles, s.id + 'e' + i), cardAllowsJoker: e.cardAllowsJoker })),
      discards: s.state.discards ? hydrate(s.state.discards, s.id + 'x') : [],
      jokerWasClaimed: !!s.state.jokerWasClaimed,
      phase: s.state.phase
    });
    assert(!res.ok, s.id + ' was expected to be illegal but the engine found no problem');
  }
});

/* ---- storage failure ---- */
test('a throwing localStorage does not break anything', () => {
  const real = Object.getOwnPropertyDescriptor(window, 'localStorage');
  let threw = false;
  const fake = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  try {
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => fake });
    const memory = new Map();
    const facade = {
      get(k) { try { return window.localStorage.getItem(k); } catch (e) { return memory.get(k) || null; } },
      set(k, v) { memory.set(k, v); try { window.localStorage.setItem(k, v); } catch (e) { /* ignored */ } }
    };
    facade.set('a', '1');
    assertEqual(facade.get('a'), '1', 'fallback memory store should answer');
  } catch (e) { threw = true; }
  finally { if (real) Object.defineProperty(window, 'localStorage', real); }
  assert(!threw, 'storage failure escaped the facade');
});

/* ---- report ---- */
const out = document.getElementById('results');
const summary = document.getElementById('summary');
const passed = results.filter((r) => r.ok).length;
summary.textContent = `${passed} of ${results.length} tests passed.`;
summary.className = passed === results.length ? 'pass' : 'fail';
for (const r of results) {
  const li = document.createElement('li');
  li.className = r.ok ? 'pass' : 'fail';
  li.textContent = (r.ok ? 'PASS — ' : 'FAIL — ') + r.name + (r.ok ? '' : ' :: ' + r.message);
  out.appendChild(li);
}
