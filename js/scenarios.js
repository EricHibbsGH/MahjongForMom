// scenarios.js — Original teaching scenarios. EDUCATIONAL content only.
// No annual card hands are reproduced here. Validation logic lives in rules.js.
// Every scenario is deep-frozen so a mode cannot mutate a fixture.

function deepFreeze(obj) {
  if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    for (const k of Object.keys(obj)) deepFreeze(obj[k]);
  }
  return obj;
}

const SCENARIOS = [
  /* ---------------- Learn the Tiles ---------------- */
  {
    id: 'TILE-001', mode: 'tiles', difficulty: 1,
    objective: 'Recognize a numbered Dot tile.',
    ruleTags: ['tile-identity'],
    state: { tile: 'dots-5' },
    prompt: 'Which tile is this?',
    answer: { kind: 'identify', correct: ['dots-5'], choices: ['dots-5', 'bams-5', 'craks-5', 'dots-6'], judgeStrategy: false },
    explanation: 'This is the 5 of Dots. Dots show round circles, and the number of circles is the rank.',
    hint: 'Count the circles.'
  },
  {
    id: 'TILE-002', mode: 'tiles', difficulty: 1,
    objective: 'Recognize the White Dragon, also called Soap.',
    ruleTags: ['tile-identity', 'dragons'],
    state: { tile: 'dragon-white' },
    prompt: 'Which tile is this?',
    answer: { kind: 'identify', correct: ['dragon-white'], choices: ['dragon-white', 'dragon-green', 'flower', 'wind-west'], judgeStrategy: false },
    explanation: 'This is the White Dragon, often called Soap. In many hands it also stands in as a zero.',
    hint: 'It is one of the three Dragons, and it is the plain one.'
  },
  {
    id: 'TILE-003', mode: 'tiles', difficulty: 1,
    objective: 'Tell a Joker apart from a Flower.',
    ruleTags: ['tile-identity', 'joker'],
    state: { tile: 'joker' },
    prompt: 'Which tile is this?',
    answer: { kind: 'identify', correct: ['joker'], choices: ['joker', 'flower', 'dragon-red', 'wind-north'], judgeStrategy: false },
    explanation: 'This is a Joker. A set has eight of them. A Joker can stand in for a tile only inside a group of three or more identical tiles.',
    hint: 'Jokers and Flowers are easy to mix up. This one is the wild tile.'
  },
  {
    id: 'TILE-004', mode: 'tiles', difficulty: 2,
    objective: 'Recognize a Wind tile.',
    ruleTags: ['tile-identity', 'winds'],
    state: { tile: 'wind-south' },
    prompt: 'Which tile is this?',
    answer: { kind: 'identify', correct: ['wind-south'], choices: ['wind-south', 'wind-east', 'wind-west', 'wind-north'], judgeStrategy: false },
    explanation: 'This is the South Wind. There are four Winds — East, South, West and North — and four copies of each.',
    hint: 'Look at the letter on the tile face.'
  },
  {
    id: 'TILE-005', mode: 'tiles', difficulty: 2,
    objective: 'Recognize a Crak tile by suit name.',
    ruleTags: ['tile-identity'],
    state: { tile: 'craks-9' },
    prompt: 'Which tile is this?',
    answer: { kind: 'identify', correct: ['craks-9'], choices: ['craks-9', 'craks-6', 'bams-9', 'dots-9'], judgeStrategy: false },
    explanation: 'This is the 9 of Craks. Craks are the character suit, and they also run from 1 to 9.',
    hint: 'Check both the number and the suit name.'
  },

  /* ---------------- Build a Rack ---------------- */
  {
    id: 'RACK-001', mode: 'rack', difficulty: 1,
    objective: 'Know that a resting rack holds thirteen tiles.',
    ruleTags: ['rack-size'],
    state: { rack: ['dots-1','dots-1','dots-2','bams-3','bams-3','bams-4','craks-5','craks-5','wind-east','dragon-red','flower','joker'], phase: 'resting' },
    prompt: 'This rack has 12 tiles and it is not this player\u2019s turn. Is the rack the right size?',
    answer: { kind: 'legality', correct: false, judgeStrategy: false },
    explanation: 'No. Between turns every player holds thirteen tiles. Only while you are holding a tile you just drew or called do you have fourteen.',
    hint: 'Count the tiles, then compare with thirteen.'
  },
  {
    id: 'RACK-002', mode: 'rack', difficulty: 1,
    objective: 'Know that East starts with fourteen tiles.',
    ruleTags: ['rack-size', 'deal'],
    state: { rack: ['dots-1','dots-1','dots-2','dots-3','bams-3','bams-4','bams-5','craks-5','craks-6','wind-east','wind-east','dragon-red','flower','joker'], phase: 'deal', isEast: true },
    prompt: 'This is East at the very start of the game, holding 14 tiles. Is that correct?',
    answer: { kind: 'legality', correct: true, judgeStrategy: false },
    explanation: 'Yes. East is dealt fourteen tiles and everyone else is dealt thirteen. East discards first, which brings East back down to thirteen.',
    hint: 'East goes first, so East needs a tile to throw.'
  },
  {
    id: 'RACK-003', mode: 'rack', difficulty: 2,
    objective: 'Detect more copies of a tile than the set contains.',
    ruleTags: ['set-integrity'],
    state: { rack: ['bams-3','bams-3','bams-3','bams-3','bams-3','dots-2','dots-4','craks-6','craks-7','wind-north','dragon-green','flower','joker'], phase: 'resting' },
    prompt: 'This rack shows five 3 Bams. Is that possible?',
    answer: { kind: 'legality', correct: false, judgeStrategy: false },
    explanation: 'No. A set contains only four copies of each numbered tile, each Wind and each Dragon. A fifth copy cannot exist.',
    hint: 'How many copies of each numbered tile are in a set?'
  },
  {
    id: 'RACK-004', mode: 'rack', difficulty: 2,
    objective: 'Know how many Flowers and Jokers exist.',
    ruleTags: ['set-integrity'],
    state: { rack: ['flower','flower','flower','flower','flower','flower','dots-2','dots-4','craks-6','craks-7','wind-north','dragon-green','joker'], phase: 'resting' },
    prompt: 'This rack holds six Flowers. Is that possible?',
    answer: { kind: 'legality', correct: true, judgeStrategy: false },
    explanation: 'Yes, it is possible. A set contains eight Flowers and eight Jokers, so six Flowers on one rack is unusual but legal.',
    hint: 'Flowers and Jokers are the two families with eight copies.'
  },

  /* ---------------- Charleston ---------------- */
  {
    id: 'CHAR-001', mode: 'charleston', difficulty: 1,
    objective: 'Pass exactly three tiles.',
    ruleTags: ['charleston'],
    state: { rack: ['dots-1','dots-9','bams-2','bams-2','bams-7','craks-1','craks-4','craks-4','craks-5','wind-west','wind-north','dragon-green','flower'], passIndex: 1, passDirection: 'right' },
    prompt: 'This is the first pass, to your right. Choose exactly three tiles to pass.',
    answer: { kind: 'selection', count: 3, judgeStrategy: false, strategyNote: 'Lone Winds and unconnected high-low singles are common early passes. Many different choices are reasonable here.' },
    explanation: 'Every Charleston pass is exactly three tiles, no more and no fewer. Which three you choose is a matter of strategy, and several answers can be equally sensible.',
    hint: 'Look for tiles that do not connect to anything else on your rack.'
  },
  {
    id: 'CHAR-002', mode: 'charleston', difficulty: 2,
    objective: 'Never pass a Joker.',
    ruleTags: ['charleston', 'joker-restriction'],
    state: { rack: ['joker','dots-3','dots-8','bams-1','bams-6','bams-6','craks-2','craks-2','craks-9','wind-south','wind-south','dragon-white','flower'], passIndex: 2, passDirection: 'across' },
    prompt: 'This is the second pass, across. Choose three tiles to pass. Watch what you pick up.',
    answer: { kind: 'selection', count: 3, forbidden: ['joker'], judgeStrategy: false, strategyNote: 'Single suit tiles at the far ends of a suit are often passed early.' },
    explanation: 'A Joker is never passed during any Charleston pass or courtesy pass. Everything else on your rack may be passed freely.',
    hint: 'One tile on this rack can never leave your hand during the Charleston.'
  },
  {
    id: 'CHAR-003', mode: 'charleston', difficulty: 2,
    objective: 'Understand that keeping pairs is usually wise but is strategy, not law.',
    ruleTags: ['charleston', 'strategy'],
    state: { rack: ['dots-5','dots-5','dots-6','bams-5','bams-5','bams-8','craks-3','craks-7','wind-east','wind-west','dragon-red','dragon-red','flower'], passIndex: 3, passDirection: 'left' },
    prompt: 'This is the third pass, to your left. Choose three tiles to pass.',
    answer: { kind: 'selection', count: 3, judgeStrategy: false, strategyNote: 'Many players protect pairs during the Charleston because a Joker can never fill a pair. Passing a lone Wind or an isolated number is a common choice.' },
    explanation: 'Any three tiles other than a Joker are a legal pass. Breaking a pair is not against the rules — it is simply a choice most experienced players avoid early on.',
    hint: 'Which tiles on this rack are not part of any pair?'
  },
  {
    id: 'CHAR-004', mode: 'charleston', difficulty: 3,
    objective: 'Know when a blind pass is available.',
    ruleTags: ['charleston', 'convention'],
    state: { rack: ['dots-2','dots-2','dots-2','bams-4','bams-4','bams-4','craks-6','craks-6','craks-6','wind-north','wind-north','dragon-green','flower'], passIndex: 3, passDirection: 'left', blindAvailable: true },
    prompt: 'You have almost nothing safe to give away on the last pass of the first Charleston. Choose three tiles to pass.',
    answer: { kind: 'selection', count: 3, judgeStrategy: false, strategyNote: 'This is the pass where a blind pass is available at most tables: you may push along one, two or three of the tiles coming to you without looking at them.' },
    explanation: 'On the last pass of each Charleston round, most tables allow a blind pass. Table customs differ, so confirm with your group before you rely on it.',
    hint: 'This rack is full of useful triples. There is a special option on this particular pass.'
  },

  /* ---------------- Call or Pass ---------------- */
  {
    id: 'CALL-001', mode: 'call', difficulty: 1,
    objective: 'Call a discard to complete a pung.',
    ruleTags: ['calling', 'exposure'],
    state: { rack: ['bams-7','bams-7','dots-1','dots-3','craks-2','craks-5','craks-8','wind-east','wind-south','dragon-red','flower','joker','dots-9'], discard: 'bams-7', targetGroupSize: 3, handIsConcealed: false, cardAllowsJoker: true },
    prompt: 'A player discards the 7 Bam. You hold two 7 Bams. May you call it?',
    answer: { kind: 'legality', correct: true, judgeStrategy: false },
    explanation: 'Yes. You hold two matching tiles, so the discard completes a pung of three. You take the tile and expose all three on top of your rack.',
    hint: 'Count how many 7 Bams you already hold.'
  },
  {
    id: 'CALL-002', mode: 'call', difficulty: 1,
    objective: 'You may not call a discard to make a pair.',
    ruleTags: ['calling'],
    state: { rack: ['craks-4','dots-1','dots-3','bams-2','bams-5','bams-8','craks-8','wind-east','wind-west','dragon-green','dragon-white','flower','joker'], discard: 'craks-4', targetGroupSize: 2, handIsConcealed: false, cardAllowsJoker: true },
    prompt: 'The 4 Crak is discarded and you hold one. You would like to make a pair. May you call it?',
    answer: { kind: 'legality', correct: false, judgeStrategy: false },
    explanation: 'No. A discard may only be called to complete a group of three or more. You can never call a tile to make a pair or a single, though you may call the very tile that finishes your whole hand for Mahjong.',
    hint: 'What is the smallest group you may expose?'
  },
  {
    id: 'CALL-003', mode: 'call', difficulty: 2,
    objective: 'A discarded Joker is dead.',
    ruleTags: ['calling', 'joker-restriction'],
    state: { rack: ['joker','joker','dots-2','dots-2','dots-2','bams-6','bams-6','craks-1','craks-1','wind-north','dragon-red','flower','bams-9'], discard: 'joker', targetGroupSize: 3, handIsConcealed: false, cardAllowsJoker: true },
    prompt: 'A player throws a Joker. May you call it?',
    answer: { kind: 'legality', correct: false, judgeStrategy: false },
    explanation: 'No. A discarded Joker is dead. Nobody may claim it for any reason, not even to complete a hand.',
    hint: 'Think about what happens to a Joker once it hits the table.'
  },
  {
    id: 'CALL-004', mode: 'call', difficulty: 2,
    objective: 'A concealed hand cannot make exposures.',
    ruleTags: ['calling', 'concealed-hand'],
    state: { rack: ['dots-4','dots-4','bams-4','bams-4','craks-4','craks-4','dots-7','dots-7','bams-7','bams-7','craks-7','wind-east','wind-east'], discard: 'craks-7', targetGroupSize: 3, handIsConcealed: true, cardAllowsJoker: false, forMahjong: false },
    prompt: 'Your hand must be kept concealed. The 7 Crak is discarded and you hold one. May you call it to make an exposure?',
    answer: { kind: 'legality', correct: false, judgeStrategy: false },
    explanation: 'No. A concealed hand stays on your rack until you win. You may still call the final tile that completes the whole hand and declare Mahjong, but you may not put exposures up along the way.',
    hint: 'What is the one call a concealed hand is still allowed to make?'
  },
  {
    id: 'CALL-005', mode: 'call', difficulty: 3,
    objective: 'A Joker in hand cannot claim a discard on its own.',
    ruleTags: ['calling', 'joker-restriction'],
    state: { rack: ['joker','joker','dots-5','bams-1','bams-3','bams-9','craks-2','craks-6','wind-south','wind-west','dragon-white','flower','dots-8'], discard: 'dots-5', targetGroupSize: 3, handIsConcealed: false, cardAllowsJoker: true },
    prompt: 'The 5 Dot is discarded. You hold one 5 Dot and two Jokers. May you call it to expose a pung?',
    answer: { kind: 'legality', correct: true, judgeStrategy: false },
    explanation: 'Yes. You hold one real 5 Dot and two Jokers, which together with the discard makes a group of three. You must always hold at least one real copy — Jokers alone can never claim a discard.',
    hint: 'A Joker can fill a spot in a group of three or more, but it cannot be the only thing you hold.'
  },
  {
    id: 'CALL-006', mode: 'call', difficulty: 3,
    objective: 'You need enough tiles in hand to complete the group you claim.',
    ruleTags: ['calling'],
    state: { rack: ['wind-north','dots-1','dots-6','bams-2','bams-5','bams-8','craks-3','craks-7','craks-9','dragon-red','dragon-green','flower','flower'], discard: 'wind-north', targetGroupSize: 3, handIsConcealed: false, cardAllowsJoker: true },
    prompt: 'The North Wind is discarded and you hold exactly one North Wind and no Jokers. May you call it?',
    answer: { kind: 'legality', correct: false, judgeStrategy: false },
    explanation: 'No. To expose a pung you need two matching tiles already on your rack. With only one North Wind, the discard would make a pair, and you may never call for a pair.',
    hint: 'How many tiles must already be on your rack before you call?'
  },

  /* ---------------- Joker Practice ---------------- */
  {
    id: 'JOK-001', mode: 'joker', difficulty: 1,
    objective: 'A Joker cannot be used in a pair.',
    ruleTags: ['joker-restriction'],
    state: { group: ['dots-3','joker'], cardAllowsJoker: true, groupSize: 2 },
    prompt: 'A player wants to use a Joker as the second tile of a pair of 3 Dots. Is that legal?',
    answer: { kind: 'legality', correct: false, judgeStrategy: false },
    explanation: 'No. A Joker may only stand in for a tile inside a group of three or more identical tiles. Both tiles of a pair must be real tiles.',
    hint: 'What is the smallest group a Joker may join?'
  },
  {
    id: 'JOK-002', mode: 'joker', difficulty: 1,
    objective: 'A Joker cannot be used as a single.',
    ruleTags: ['joker-restriction'],
    state: { group: ['joker'], cardAllowsJoker: true, groupSize: 1 },
    prompt: 'A hand needs one single 8 Bam. May a Joker fill that spot?',
    answer: { kind: 'legality', correct: false, judgeStrategy: false },
    explanation: 'No. A single must always be the real tile. This is why hands built from singles and pairs cannot use Jokers anywhere.',
    hint: 'Singles and pairs are the two places a Joker can never go.'
  },
  {
    id: 'JOK-003', mode: 'joker', difficulty: 2,
    objective: 'A Joker may fill a kong.',
    ruleTags: ['joker-restriction'],
    state: { group: ['craks-6','craks-6','craks-6','joker'], cardAllowsJoker: true, groupSize: 4 },
    prompt: 'A player exposes three 6 Craks and a Joker as a kong. Is that legal?',
    answer: { kind: 'legality', correct: true, judgeStrategy: false },
    explanation: 'Yes, provided the hand permits Jokers. A kong is four identical tiles, which is a group of three or more, so a Joker may stand in.',
    hint: 'Count the tiles in the group.'
  },
  {
    id: 'JOK-004', mode: 'joker', difficulty: 2,
    objective: 'Exchange a matching tile for an exposed Joker.',
    ruleTags: ['joker-exchange'],
    state: { exposure: ['bams-2','bams-2','joker'], offered: 'bams-2', turnPhase: 'your-turn' },
    prompt: 'Another player has exposed two 2 Bams and a Joker. On your turn you offer a real 2 Bam. May you take the Joker?',
    answer: { kind: 'legality', correct: true, judgeStrategy: false },
    explanation: 'Yes. On your turn you may swap the real tile for a Joker showing in any exposure, including your own. Tables differ slightly on exactly when in your turn this happens, so confirm with your group.',
    hint: 'Does the tile you are offering match what the Joker stands for?'
  },
  {
    id: 'JOK-005', mode: 'joker', difficulty: 3,
    objective: 'The exchanged tile must match the tile the Joker represents.',
    ruleTags: ['joker-exchange'],
    state: { exposure: ['dragon-green','dragon-green','dragon-green','joker'], offered: 'dragon-red', turnPhase: 'your-turn' },
    prompt: 'An exposure shows three Green Dragons and a Joker. You offer a Red Dragon. May you take the Joker?',
    answer: { kind: 'legality', correct: false, judgeStrategy: false },
    explanation: 'No. The Joker is standing in for a Green Dragon, so only a Green Dragon may replace it. A Red Dragon is a different tile.',
    hint: 'What tile is that particular Joker pretending to be?'
  },
  {
    id: 'JOK-006', mode: 'joker', difficulty: 3,
    objective: 'A Joker in a quint is legal when the hand permits Jokers.',
    ruleTags: ['joker-restriction'],
    state: { group: ['dots-7','dots-7','dots-7','joker','joker'], cardAllowsJoker: true, groupSize: 5 },
    prompt: 'A hand calls for a quint — five identical tiles. A player uses three 7 Dots and two Jokers. Is that legal?',
    answer: { kind: 'legality', correct: true, judgeStrategy: false },
    explanation: 'Yes. A quint is five identical tiles, and only four real copies exist, so quints always need Jokers. The rule is simply that the group must be three or more.',
    hint: 'How many real copies of a numbered tile exist in the set?'
  },
  {
    id: 'JOK-007', mode: 'joker', difficulty: 3,
    objective: 'Some hands forbid Jokers entirely.',
    ruleTags: ['joker-restriction', 'card-dependent'],
    state: { group: ['bams-5','bams-5','bams-5','joker'], cardAllowsJoker: false, groupSize: 4 },
    prompt: 'The hand being played does not permit Jokers at all. A player adds a Joker to three 5 Bams. Is that legal?',
    answer: { kind: 'legality', correct: false, judgeStrategy: false },
    explanation: 'No. Group size is not the only test. Some hands on the card forbid Jokers completely, and then every tile must be real. Your current card is the authority on which hands those are.',
    hint: 'The group size is fine. Something else rules this out.'
  },

  /* ---------------- Find the Error ---------------- */
  {
    id: 'ERR-001', mode: 'error', difficulty: 1,
    objective: 'Spot a rack with too many tiles.',
    ruleTags: ['rack-size'],
    state: { rack: ['dots-1','dots-2','dots-3','bams-1','bams-2','bams-3','craks-1','craks-2','craks-3','wind-east','wind-south','dragon-red','flower','joker','dots-9'], phase: 'resting', exposures: [] },
    prompt: 'Something is wrong with this player\u2019s state. What is it?',
    answer: { kind: 'identify', correct: ['RACK_TOO_MANY'], choices: ['RACK_TOO_MANY', 'EXCESS_COPIES', 'JOKER_IN_PAIR', 'CALL_FOR_PAIR_ILLEGAL'], judgeStrategy: false },
    explanation: 'The rack holds fifteen tiles while resting between turns. It should hold thirteen.',
    hint: 'Count the tiles.'
  },
  {
    id: 'ERR-002', mode: 'error', difficulty: 2,
    objective: 'Spot a fifth copy of a tile.',
    ruleTags: ['set-integrity'],
    state: { rack: ['craks-2','craks-2','craks-2','craks-2','craks-2','dots-4','bams-6','bams-7','wind-west','wind-west','dragon-white','flower','joker'], phase: 'resting', exposures: [] },
    prompt: 'Something is wrong with this player\u2019s state. What is it?',
    answer: { kind: 'identify', correct: ['EXCESS_COPIES'], choices: ['EXCESS_COPIES', 'RACK_TOO_FEW', 'JOKER_IN_SINGLE', 'JOKER_DISCARD_DEAD'], judgeStrategy: false },
    explanation: 'There are five 2 Craks. A set contains only four copies of any numbered tile, so a fifth cannot exist.',
    hint: 'Look for a tile that appears more often than it possibly could.'
  },
  {
    id: 'ERR-003', mode: 'error', difficulty: 2,
    objective: 'Spot an illegal Joker in an exposed pair.',
    ruleTags: ['joker-restriction', 'exposure'],
    state: { rack: ['dots-1','dots-3','dots-8','bams-2','bams-5','bams-9','craks-4','craks-7','wind-north','dragon-green','flower'], exposures: [{ tiles: ['dots-6','joker'], cardAllowsJoker: true }], phase: 'resting' },
    prompt: 'Something is wrong with this player\u2019s state. What is it?',
    answer: { kind: 'identify', correct: ['JOKER_IN_PAIR'], choices: ['JOKER_IN_PAIR', 'EXCESS_COPIES', 'RACK_TOO_MANY', 'EXCHANGE_TILE_MISMATCH'], judgeStrategy: false },
    explanation: 'The exposure is a pair made of one 6 Dot and one Joker. A Joker can never stand in for either tile of a pair, and a pair is never exposed in the first place.',
    hint: 'Look at the exposure, not the rack.'
  },
  {
    id: 'ERR-004', mode: 'error', difficulty: 3,
    objective: 'Spot an exposure made of mismatched tiles.',
    ruleTags: ['exposure'],
    state: { rack: ['dots-1','dots-3','dots-8','bams-2','bams-5','bams-9','craks-4','craks-7','wind-north','dragon-green'], exposures: [{ tiles: ['bams-3','bams-3','bams-4'], cardAllowsJoker: true }], phase: 'resting' },
    prompt: 'Something is wrong with this player\u2019s state. What is it?',
    answer: { kind: 'identify', correct: ['GROUP_MIXED_TYPES'], choices: ['GROUP_MIXED_TYPES', 'JOKER_IN_SINGLE', 'RACK_TOO_FEW', 'EXCESS_COPIES'], judgeStrategy: false },
    explanation: 'The exposure shows two 3 Bams and a 4 Bam. An exposure must be the same tile repeated, plus Jokers where the hand allows them.',
    hint: 'Are all three exposed tiles actually identical?'
  },
  {
    id: 'ERR-005', mode: 'error', difficulty: 3,
    objective: 'Spot a claimed Joker discard.',
    ruleTags: ['joker-restriction', 'calling'],
    state: { rack: ['dots-1','dots-3','dots-8','bams-2','bams-5','bams-9','craks-4','craks-7','wind-north','dragon-green'], exposures: [{ tiles: ['craks-5','craks-5','joker'], cardAllowsJoker: true }], discards: ['joker'], jokerWasClaimed: true, phase: 'resting' },
    prompt: 'A player picked up a discarded Joker to complete that exposure. What is wrong here?',
    answer: { kind: 'identify', correct: ['JOKER_DISCARD_DEAD'], choices: ['JOKER_DISCARD_DEAD', 'GROUP_MIXED_TYPES', 'RACK_TOO_MANY', 'PATTERN_NOT_MATCHED'], judgeStrategy: false },
    explanation: 'Once a Joker is discarded it is dead. No player may claim it, even when it would complete a legal group.',
    hint: 'Where did that Joker come from?'
  }
];

export const ALL_SCENARIOS = deepFreeze(SCENARIOS);

export function scenariosForMode(mode) {
  return ALL_SCENARIOS.filter((s) => s.mode === mode);
}

export function getScenario(id) {
  return ALL_SCENARIOS.find((s) => s.id === id) || null;
}

export const MODES = Object.freeze([
  { key: 'tiles', title: 'Learn the Tiles', blurb: 'See one tile at a time and name it.' },
  { key: 'rack', title: 'Build a Rack', blurb: 'Add and remove tiles and watch the count.' },
  { key: 'charleston', title: 'Charleston Practice', blurb: 'Choose exactly three tiles to pass.' },
  { key: 'call', title: 'Call or Pass', blurb: 'Decide whether a discard may be called.' },
  { key: 'joker', title: 'Joker Practice', blurb: 'Where a Joker may and may not go.' },
  { key: 'error', title: 'Find the Error', blurb: 'Spot what is wrong at the table.' },
  { key: 'pattern', title: 'My Own Pattern', blurb: 'Type in a hand from your own card and practise it.' }
]);
