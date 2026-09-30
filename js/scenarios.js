// scenarios.js — Original teaching scenarios. EDUCATIONAL content only.
// No annual card hands are reproduced here. Validation logic lives in rules.js.
// Every scenario is deep-frozen so a mode cannot mutate a fixture.

import { yearExampleGroups, CURRENT_YEAR } from './content.js';

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
    explanation: 'This is the White Dragon, often called Soap. It looks like an empty blue frame, and on the card it also stands in as a zero.',
    hint: 'It is one of the three Dragons, and it has no character in the middle.'
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
    explanation: 'This is the 9 of Craks. Craks are the character suit: the Chinese number sits on top, the red character below, and the number is in the corner.',
    hint: 'Look at the corner number, then at the red character underneath.'
  },
  {
    id: 'TILE-006', mode: 'tiles', difficulty: 2,
    objective: 'Recognize the 1 Bam, which is drawn as a bird.',
    ruleTags: ['tile-identity'],
    state: { tile: 'bams-1' },
    prompt: 'Which tile is this?',
    answer: { kind: 'identify', correct: ['bams-1'], choices: ['bams-1', 'flower', 'dots-1', 'craks-1'], judgeStrategy: false },
    explanation: 'This is the 1 Bam. Instead of a single bamboo stick, most sets draw it as a bird. The corner number tells you it is a 1.',
    hint: 'It is a suit tile, even though it does not look like the other Bams.'
  },
  {
    id: 'TILE-007', mode: 'tiles', difficulty: 1,
    objective: 'Recognize the Green Dragon.',
    ruleTags: ['tile-identity', 'dragons'],
    state: { tile: 'dragon-green' },
    prompt: 'Which tile is this?',
    answer: { kind: 'identify', correct: ['dragon-green'], choices: ['dragon-green', 'dragon-red', 'dragon-white', 'bams-9'], judgeStrategy: false },
    explanation: 'This is the Green Dragon. It is the partner of the Bams suit, so on the card a green “D” next to Bams means this tile.',
    hint: 'Its color is the giveaway.'
  },
  {
    id: 'TILE-008', mode: 'tiles', difficulty: 1,
    objective: 'Recognize a Flower.',
    ruleTags: ['tile-identity'],
    state: { tile: 'flower' },
    prompt: 'Which tile is this?',
    answer: { kind: 'identify', correct: ['flower'], choices: ['flower', 'joker', 'dragon-red', 'bams-1'], judgeStrategy: false },
    explanation: 'This is a Flower. A set has eight of them, and they are all interchangeable — any Flower counts as “F” on the card.',
    hint: 'There are eight of these in a set, and they are all treated the same.'
  },
  {
    id: 'TILE-009', mode: 'tiles', difficulty: 2,
    objective: 'Recognize a Wind by its character.',
    ruleTags: ['tile-identity', 'winds'],
    state: { tile: 'wind-north' },
    prompt: 'Which tile is this?',
    answer: { kind: 'identify', correct: ['wind-north'], choices: ['wind-north', 'wind-south', 'wind-east', 'wind-west'], judgeStrategy: false },
    explanation: 'This is the North Wind. American sets print the letter in the corner, so you never need to read the character.',
    hint: 'Check the letter in the corner.'
  },
  {
    id: 'TILE-010', mode: 'tiles', difficulty: 2,
    objective: 'Count a high Dot tile.',
    ruleTags: ['tile-identity'],
    state: { tile: 'dots-8' },
    prompt: 'Which tile is this?',
    answer: { kind: 'identify', correct: ['dots-8'], choices: ['dots-8', 'dots-6', 'dots-9', 'bams-8'], judgeStrategy: false },
    explanation: 'This is the 8 of Dots: two columns of four circles.',
    hint: 'Count one column and double it.'
  },
  {
    id: 'TILE-011', mode: 'tiles', difficulty: 3,
    objective: 'Read a Crak tile.',
    ruleTags: ['tile-identity'],
    state: { tile: 'craks-3' },
    prompt: 'Which tile is this?',
    answer: { kind: 'identify', correct: ['craks-3'], choices: ['craks-3', 'craks-2', 'bams-3', 'dots-3'], judgeStrategy: false },
    explanation: 'This is the 3 Crak. The Chinese number three is three short lines, which is easy to remember.',
    hint: 'Count the lines at the top, or read the corner.'
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
  },

  /* ---------------- Name the Family ----------------
     Every hand below is invented for teaching. None is copied from any card.
     Tests confirm identifyFamily() agrees with each answer. */
  {
    id: 'FAM-001', mode: 'family', difficulty: 1,
    objective: 'Recognize an all-even hand.',
    ruleTags: ['families'],
    state: { groups: [['flower', 2], ['bams-2', 3], ['bams-4', 3], ['craks-6', 4], ['craks-8', 2]] },
    prompt: 'Which family does this hand belong to?',
    answer: { kind: 'choice', correct: '2468', choices: ['2468', '13579', '369', 'consecutive'] },
    explanation: 'Every number here is even — 2, 4, 6 and 8 — so this is a 2468 hand.',
    hint: 'Are the numbers odd or even?'
  },
  {
    id: 'FAM-002', mode: 'family', difficulty: 1,
    objective: 'Recognize an all-odd hand.',
    ruleTags: ['families'],
    state: { groups: [['dots-1', 3], ['dots-3', 3], ['bams-5', 4], ['bams-7', 2], ['craks-9', 2]] },
    prompt: 'Which family does this hand belong to?',
    answer: { kind: 'choice', correct: '13579', choices: ['13579', '2468', 'like', 'winds-dragons'] },
    explanation: 'Every number is odd — 1, 3, 5, 7 and 9 — which makes this a 13579 hand.',
    hint: 'Look at whether the numbers are odd or even.'
  },
  {
    id: 'FAM-003', mode: 'family', difficulty: 1,
    objective: 'Recognize a like-numbers hand.',
    ruleTags: ['families'],
    state: { groups: [['flower', 2], ['dots-7', 4], ['bams-7', 4], ['craks-7', 4]] },
    prompt: 'Which family does this hand belong to?',
    answer: { kind: 'choice', correct: 'like', choices: ['like', 'consecutive', 'addition', '13579'] },
    explanation: 'Only one number appears — 7 — in all three suits. That is the Like Numbers family. It is odd, too, but a single repeated number is the stronger clue.',
    hint: 'How many different numbers do you see?'
  },
  {
    id: 'FAM-004', mode: 'family', difficulty: 1,
    objective: 'Recognize an honors hand.',
    ruleTags: ['families'],
    state: { groups: [['wind-north', 4], ['dragon-red', 3], ['dragon-green', 3], ['wind-south', 4]] },
    prompt: 'Which family does this hand belong to?',
    answer: { kind: 'choice', correct: 'winds-dragons', choices: ['winds-dragons', 'singles-pairs', 'quints', 'year'] },
    explanation: 'There are no number tiles at all — only Winds and Dragons. That is the Winds & Dragons family.',
    hint: 'Are there any number tiles?'
  },
  {
    id: 'FAM-005', mode: 'family', difficulty: 2,
    objective: 'Recognize a 369 hand.',
    ruleTags: ['families'],
    state: { groups: [['flower', 2], ['dots-3', 4], ['dots-6', 4], ['craks-9', 4]] },
    prompt: 'Which family does this hand belong to?',
    answer: { kind: 'choice', correct: '369', choices: ['369', 'addition', '13579', '2468'] },
    explanation: 'The numbers are 3, 6 and 9 only, so this is a 369 hand. (3 + 6 does make 9, but 369 is its own family on the card.)',
    hint: 'Which three numbers appear?'
  },
  {
    id: 'FAM-006', mode: 'family', difficulty: 2,
    objective: 'Recognize a consecutive run.',
    ruleTags: ['families'],
    state: { groups: [['bams-4', 2], ['bams-5', 3], ['bams-6', 4], ['bams-7', 3], ['dragon-green', 2]] },
    prompt: 'Which family does this hand belong to?',
    answer: { kind: 'choice', correct: 'consecutive', choices: ['consecutive', '2468', 'like', 'addition'] },
    explanation: 'The numbers run 4, 5, 6, 7 in a row. Numbers in sequence make a Consecutive Run. The Green Dragon matches the Bams suit.',
    hint: 'Put the numbers in order. Do they follow each other?'
  },
  {
    id: 'FAM-007', mode: 'family', difficulty: 2,
    objective: 'Recognize a quint hand.',
    ruleTags: ['families', 'joker'],
    state: { groups: [['dots-2', 5, 1], ['dots-3', 5, 2], ['flower', 4]] },
    prompt: 'Which family does this hand belong to?',
    answer: { kind: 'choice', correct: 'quints', choices: ['quints', 'like', 'consecutive', 'singles-pairs'] },
    explanation: 'Two groups of five identical tiles — quints. Only four real copies of a tile exist, so each quint uses Jokers.',
    hint: 'Count the tiles in each group.'
  },
  {
    id: 'FAM-008', mode: 'family', difficulty: 2,
    objective: 'Recognize a singles-and-pairs hand.',
    ruleTags: ['families', 'joker'],
    state: { groups: [['wind-north', 2], ['wind-east', 2], ['wind-west', 2], ['wind-south', 2], ['dots-1', 2], ['bams-1', 2], ['craks-1', 2]] },
    prompt: 'Which family does this hand belong to?',
    answer: { kind: 'choice', correct: 'singles-pairs', choices: ['singles-pairs', 'winds-dragons', 'like', '13579'] },
    explanation: 'Every group is a pair. A hand made only of singles and pairs belongs to Singles & Pairs — and it can never use Jokers.',
    hint: 'Look at the size of every group, not the tiles.'
  },
  {
    id: 'FAM-009', mode: 'family', difficulty: 3,
    objective: 'Recognize an addition hand.',
    ruleTags: ['families'],
    state: { groups: [['flower', 2], ['bams-2', 3], ['bams-5', 3], ['bams-7', 4], ['dragon-green', 2]] },
    prompt: 'Which family does this hand belong to?',
    answer: { kind: 'choice', correct: 'addition', choices: ['addition', 'consecutive', '13579', 'like'] },
    explanation: '2 + 5 = 7. Three numbers where the first two add up to the third make an Addition hand.',
    hint: 'Try adding the two smaller numbers.'
  },
  {
    id: 'FAM-010', mode: 'family', difficulty: 3,
    objective: 'Recognize a year hand.',
    ruleTags: ['families'],
    state: { groups: yearExampleGroups() },
    prompt: 'Which family does this hand belong to?',
    answer: { kind: 'choice', correct: 'year', choices: ['year', 'like', 'winds-dragons', 'quints'] },
    explanation: `The numbers spell out ${CURRENT_YEAR}, with Soap (the White Dragon) standing in for the zero. That is a Year hand.`,
    hint: 'Read the numbers left to right. Soap can mean zero.'
  },

  /* ---------------- Tiles Away ----------------
     Tests confirm tilesAway() in rules.js agrees with every answer. */
  {
    id: 'AWAY-001', mode: 'away', difficulty: 1,
    objective: 'Count missing tiles with no Jokers.',
    ruleTags: ['strategy', 'tiles-away'],
    state: {
      target: [['flower', 2], ['dots-2', 3], ['dots-4', 3], ['bams-6', 4], ['bams-8', 2]],
      rack: ['flower', 'flower', 'dots-2', 'dots-2', 'dots-2', 'dots-4', 'dots-4', 'bams-6', 'bams-6', 'bams-6', 'bams-8', 'craks-9', 'wind-north'],
      cardAllowsJoker: true
    },
    prompt: 'How many tiles away from this hand are you?',
    answer: { kind: 'choice', choices: ['1', '2', '3', '4', '5'] },
    explanation: 'Match your rack against the hand one group at a time. The 9 Crak and North Wind don’t fit at all, so they will be your next discards.',
    hint: 'Go group by group: Flowers, 2s, 4s, 6s, 8s.'
  },
  {
    id: 'AWAY-002', mode: 'away', difficulty: 2,
    objective: 'Let Jokers fill pungs and kongs.',
    ruleTags: ['strategy', 'tiles-away', 'joker'],
    state: {
      target: [['flower', 2], ['dots-2', 3], ['dots-4', 3], ['bams-6', 4], ['bams-8', 2]],
      rack: ['flower', 'flower', 'dots-2', 'dots-2', 'joker', 'dots-4', 'dots-4', 'dots-4', 'bams-6', 'bams-6', 'joker', 'bams-8', 'bams-8'],
      cardAllowsJoker: true
    },
    prompt: 'You hold two Jokers. How many tiles away from this hand are you?',
    answer: { kind: 'choice', choices: ['1', '2', '3', '4', '5'] },
    explanation: 'Your two Jokers can each fill a spot in a pung or kong, which closes most of the gap.',
    hint: 'Jokers can fill the 2s pung and the 6s kong.'
  },
  {
    id: 'AWAY-003', mode: 'away', difficulty: 2,
    objective: 'Remember that Jokers cannot fill a pair.',
    ruleTags: ['strategy', 'tiles-away', 'joker'],
    state: {
      target: [['flower', 2], ['dots-5', 4], ['bams-5', 4], ['craks-5', 4]],
      rack: ['joker', 'joker', 'joker', 'dots-5', 'dots-5', 'dots-5', 'bams-5', 'bams-5', 'bams-5', 'craks-5', 'craks-5', 'craks-5', 'wind-north'],
      cardAllowsJoker: true
    },
    prompt: 'Three Jokers and nine 5s! How many tiles away are you?',
    answer: { kind: 'choice', choices: ['0', '1', '2', '3', '4'] },
    explanation: 'The Jokers complete all three kongs, but the hand also needs a pair of Flowers — and a Joker can never be used in a pair.',
    hint: 'Which group can a Joker never help with?'
  },
  {
    id: 'AWAY-004', mode: 'away', difficulty: 3,
    objective: 'Count a hand that allows no Jokers.',
    ruleTags: ['strategy', 'tiles-away', 'joker'],
    state: {
      target: [['wind-north', 2], ['wind-east', 2], ['wind-west', 2], ['wind-south', 2], ['dots-1', 2], ['bams-1', 2], ['craks-1', 2]],
      rack: ['wind-north', 'wind-north', 'wind-east', 'wind-west', 'wind-west', 'wind-south', 'wind-south', 'dots-1', 'dots-1', 'bams-1', 'joker', 'joker', 'craks-3'],
      cardAllowsJoker: false
    },
    prompt: 'This Singles & Pairs hand allows no Jokers. How many tiles away are you?',
    answer: { kind: 'choice', choices: ['2', '3', '4', '5', '6'] },
    explanation: 'In a hand made of pairs, your Jokers are no help at all. Count only real tiles.',
    hint: 'Ignore the Jokers completely.'
  },
  {
    id: 'AWAY-005', mode: 'away', difficulty: 3,
    objective: 'Count a quint hand.',
    ruleTags: ['strategy', 'tiles-away', 'joker'],
    state: {
      target: [['dots-2', 5], ['dots-3', 5], ['flower', 4]],
      rack: ['dots-2', 'dots-2', 'dots-2', 'joker', 'dots-3', 'dots-3', 'dots-3', 'dots-3', 'flower', 'flower', 'flower', 'joker', 'bams-9'],
      cardAllowsJoker: true
    },
    prompt: 'How many tiles away from this quint hand are you?',
    answer: { kind: 'choice', choices: ['1', '2', '3', '4', '5'] },
    explanation: 'Every group here is three or more tiles, so each Joker can fill any gap. Count the gaps, then subtract your Jokers.',
    hint: 'Count what’s missing from each group, then use your Jokers.'
  },
  {
    id: 'AWAY-006', mode: 'away', difficulty: 3,
    objective: 'Combine pairs, pungs and a Joker.',
    ruleTags: ['strategy', 'tiles-away', 'joker'],
    state: {
      target: [['bams-4', 2], ['bams-5', 3], ['bams-6', 4], ['bams-7', 3], ['dragon-green', 2]],
      rack: ['bams-4', 'bams-5', 'bams-5', 'bams-6', 'bams-6', 'bams-6', 'bams-7', 'bams-7', 'bams-7', 'dragon-green', 'joker', 'craks-9', 'dots-1'],
      cardAllowsJoker: true
    },
    prompt: 'How many tiles away from this run are you?',
    answer: { kind: 'choice', choices: ['1', '2', '3', '4', '5'] },
    explanation: 'Your Joker can help the 5s or the 6s, but not the pair of 4s or the pair of Green Dragons.',
    hint: 'Two of the missing tiles belong to pairs.'
  },

  /* ---------------- Best Move (strategy) ----------------
     Strategy has judgement in it. Each question has one clearly best answer,
     and every option explains its reasoning. */
  {
    id: 'STRAT-001', mode: 'strategy', difficulty: 1,
    objective: 'Choose a direction right after the deal.',
    ruleTags: ['strategy', 'choosing'],
    state: {
      situation: 'You have just been dealt this rack. The Charleston hasn’t started yet.',
      rack: ['dots-2', 'dots-2', 'dots-4', 'bams-4', 'bams-4', 'bams-6', 'craks-6', 'craks-8', 'craks-8', 'flower', 'flower', 'joker', 'wind-north']
    },
    prompt: 'Which family should you lean toward?',
    answer: { kind: 'choice', correct: 'a', options: [
      { id: 'a', label: '2468 — even numbers', why: 'Nine of your number tiles are even, you have three even pairs, plus two Flowers and a Joker. This rack is practically asking for 2468.' },
      { id: 'b', label: '13579 — odd numbers', why: 'You don’t hold a single odd number. You’d be starting from scratch.' },
      { id: 'c', label: 'Winds & Dragons', why: 'One North Wind isn’t much of a start, and you’d be throwing away all your good pairs.' },
      { id: 'd', label: 'Singles & Pairs', why: 'You do have pairs, but Singles & Pairs can’t use your Joker, and your even-number pungs are a better fit.' }
    ] },
    explanation: 'Look for the strongest pattern first. Here the numbers are all even, so 2468 is the natural choice — keep one or two backup hands in mind.',
    hint: 'Are your numbers mostly odd or even?'
  },
  {
    id: 'STRAT-002', mode: 'strategy', difficulty: 2,
    objective: 'Spot a Singles & Pairs rack.',
    ruleTags: ['strategy', 'choosing'],
    state: {
      situation: 'You have just been dealt this rack. You have no Jokers.',
      rack: ['wind-north', 'wind-north', 'dots-2', 'dots-2', 'bams-5', 'bams-5', 'craks-7', 'craks-7', 'dots-9', 'dots-9', 'wind-east', 'bams-1', 'flower']
    },
    prompt: 'Which direction is most promising?',
    answer: { kind: 'choice', correct: 'a', options: [
      { id: 'a', label: 'Singles & Pairs', why: 'Five pairs already, no Jokers to waste, and numbers with no common pattern. This is the classic Singles & Pairs rack.' },
      { id: 'b', label: 'Quints', why: 'Quints need Jokers — at least one for every quint — and you have none.' },
      { id: 'c', label: 'Like Numbers', why: 'Your pairs are all different numbers, so no single number stands out.' },
      { id: 'd', label: '369', why: 'Only your 9s fit. The rest would need replacing.' }
    ] },
    explanation: 'Five or more pairs with no Jokers is the signal for Singles & Pairs. It is harder to finish, but it is usually worth more.',
    hint: 'Count your pairs and your Jokers.'
  },
  {
    id: 'STRAT-003', mode: 'strategy', difficulty: 2,
    objective: 'Put a pile of Jokers to work.',
    ruleTags: ['strategy', 'choosing', 'joker'],
    state: {
      situation: 'You were dealt three Jokers — lucky you.',
      rack: ['joker', 'joker', 'joker', 'dots-7', 'dots-7', 'bams-7', 'bams-7', 'craks-7', 'flower', 'flower', 'bams-2', 'craks-9', 'wind-north']
    },
    prompt: 'Which kind of hand makes the best use of this rack?',
    answer: { kind: 'choice', correct: 'a', options: [
      { id: 'a', label: 'Like Numbers — 7s in every suit', why: 'Five 7s across three suits and three Jokers to fill kongs. Big groups are exactly where Jokers shine.' },
      { id: 'b', label: 'Singles & Pairs', why: 'This would waste all three Jokers. Singles & Pairs never uses them.' },
      { id: 'c', label: 'Winds & Dragons', why: 'One North Wind is a weak start, and you’d be passing away your 7s.' },
      { id: 'd', label: '2468', why: 'Your 7s are odd. You hold only one even tile.' }
    ] },
    explanation: 'Jokers are most powerful in hands with kongs and quints. With three Jokers, pick a hand full of big groups.',
    hint: 'Where do Jokers do the most good?'
  },
  {
    id: 'STRAT-004', mode: 'strategy', difficulty: 1,
    objective: 'Pass loners in the Charleston.',
    ruleTags: ['strategy', 'charleston'],
    state: {
      situation: 'First Charleston, first pass, to your right. You’re thinking about a Consecutive Run in Dots.',
      rack: ['bams-1', 'craks-9', 'wind-north', 'wind-west', 'dots-3', 'dots-3', 'dots-4', 'dots-5', 'flower', 'flower', 'bams-6', 'bams-6', 'joker']
    },
    prompt: 'Which three tiles should you pass?',
    answer: { kind: 'choice', correct: 'c', options: [
      { id: 'a', label: 'Joker, 1 Bam and 9 Crak', tiles: ['joker', 'bams-1', 'craks-9'], why: 'Not allowed. A Joker may never be passed in the Charleston.' },
      { id: 'b', label: 'Both Flowers and a 3 Dot', tiles: ['flower', 'flower', 'dots-3'], why: 'This breaks up two pairs. Pairs are precious, because a Joker can never fill them.' },
      { id: 'c', label: '1 Bam, 9 Crak and West Wind', tiles: ['bams-1', 'craks-9', 'wind-west'], why: 'These are loners — they connect to nothing on your rack. Passing the North instead of one of them would be just as good.' },
      { id: 'd', label: 'Both 6 Bams and the 4 Dot', tiles: ['bams-6', 'bams-6', 'dots-4'], why: 'This breaks a pair and a tile from the middle of your run.' }
    ] },
    explanation: 'Early passes should be loners — tiles that fit none of your plans. Keep your pairs and the heart of your hand.',
    hint: 'Which tiles don’t connect to anything?'
  },
  {
    id: 'STRAT-005', mode: 'strategy', difficulty: 2,
    objective: 'Discard the tile that keeps you closest.',
    ruleTags: ['strategy', 'discarding', 'tiles-away'],
    state: {
      situation: 'You just drew a tile and now hold 14. You’re playing this hand:',
      target: [['flower', 2], ['dots-2', 3], ['dots-4', 3], ['bams-6', 4], ['bams-8', 2]],
      rack: ['flower', 'flower', 'dots-2', 'dots-2', 'dots-2', 'dots-4', 'dots-4', 'bams-6', 'bams-6', 'bams-6', 'bams-8', 'bams-8', 'craks-7', 'joker'],
      discardEval: true,
      cardAllowsJoker: true
    },
    prompt: 'Which tile should you discard?',
    answer: { kind: 'choice', correct: 'a', options: [
      { id: 'a', label: '7 Crak', tiles: ['craks-7'], why: 'It isn’t part of your hand at all. Throwing it leaves you just one tile away.' },
      { id: 'b', label: '8 Bam', tiles: ['bams-8'], why: 'That breaks your finished pair of 8s — and a Joker can’t replace half a pair.' },
      { id: 'c', label: '4 Dot', tiles: ['dots-4'], why: 'You need three 4 Dots. Throwing one moves you further away.' },
      { id: 'd', label: 'Joker', tiles: ['joker'], why: 'Your Joker is filling a spot in your hand. Never throw a working Joker.' }
    ] },
    explanation: 'When you’re unsure, count tiles away for each choice. The best discard is the one that keeps that number lowest.',
    hint: 'Which tile isn’t in your hand at all?'
  },
  {
    id: 'STRAT-006', mode: 'strategy', difficulty: 3,
    objective: 'Pick a safe discard.',
    ruleTags: ['strategy', 'defense'],
    state: {
      situation: 'Late in the game. The player on your left has three exposures. Three 3 Bams have already been discarded.',
      exposures: [
        { label: 'Player on your left', tiles: ['dots-2', 'dots-2', 'dots-2'] },
        { label: '', tiles: ['dots-4', 'dots-4', 'joker'] },
        { label: '', tiles: ['dots-6', 'dots-6', 'dots-6'] }
      ],
      discards: ['bams-3', 'bams-3', 'bams-3', 'wind-east', 'craks-1'],
      rack: ['dots-8', 'bams-3', 'wind-west', 'dots-6', 'craks-2', 'craks-2', 'craks-5', 'craks-5', 'craks-5', 'bams-7', 'bams-7', 'flower', 'flower', 'joker']
    },
    prompt: 'You must discard. Which tile is safest?',
    answer: { kind: 'choice', correct: 'b', options: [
      { id: 'a', label: '8 Dot', tiles: ['dots-8'], why: 'Dangerous. Their exposures are all even Dots, so an 8 Dot could be exactly what they need.' },
      { id: 'b', label: '3 Bam', tiles: ['bams-3'], why: 'Completely safe. Three 3 Bams are already discarded and you hold the fourth, so nobody can use it for anything.' },
      { id: 'c', label: 'West Wind', tiles: ['wind-west'], why: 'Probably safe, but not certain. Someone could still be holding a pair of Wests.' },
      { id: 'd', label: '6 Dot', tiles: ['dots-6'], why: 'Risky. They are clearly collecting even Dots and might want a kong of 6s.' }
    ] },
    explanation: 'A tile whose other copies are all visible — a dead tile — is the safest discard in the game. Read exposures, then look at the discards.',
    hint: 'How many 3 Bams are left in the game?'
  },
  {
    id: 'STRAT-007', mode: 'strategy', difficulty: 2,
    objective: 'Don’t expose too early.',
    ruleTags: ['strategy', 'calling'],
    state: {
      situation: 'Third turn of the game. Someone discards a North Wind. You hold two Norths, but most of your rack is even numbers.',
      discard: 'wind-north',
      rack: ['wind-north', 'wind-north', 'wind-east', 'dots-2', 'dots-2', 'dots-4', 'bams-4', 'bams-6', 'bams-6', 'craks-8', 'craks-8', 'flower', 'joker']
    },
    prompt: 'What should you do?',
    answer: { kind: 'choice', correct: 'b', options: [
      { id: 'a', label: 'Call it and expose three Norths', why: 'Legal, but it commits you to a Winds hand when your rack clearly leans 2468 — and it tells everyone your plan.' },
      { id: 'b', label: 'Let it go and stay with 2468', why: 'Your rack is mostly even pairs. Calling a Wind now would pull you toward your weaker option.' },
      { id: 'c', label: 'Call it and add your Joker to make a kong', why: 'That exposes even more, and spends your Joker on a hand you probably won’t play.' }
    ] },
    explanation: 'Calling is a commitment, and exposures tell other players what you’re collecting. Early in the game, call only for the hand you actually intend to play.',
    hint: 'Which hand does most of your rack support?'
  },
  {
    id: 'STRAT-008', mode: 'strategy', difficulty: 2,
    objective: 'Take a free Joker.',
    ruleTags: ['strategy', 'joker-exchange'],
    state: {
      situation: 'It’s your turn and you’ve drawn a tile. The player across has this exposure. Your hand has no use for the 5 Bam you’re holding.',
      exposures: [{ label: 'Player across', tiles: ['bams-5', 'bams-5', 'joker'] }],
      rack: ['bams-5', 'dots-2', 'dots-2', 'dots-4', 'dots-4', 'dots-4', 'bams-6', 'bams-6', 'bams-8', 'bams-8', 'flower', 'flower', 'craks-1', 'wind-north']
    },
    prompt: 'What’s your best move?',
    answer: { kind: 'choice', correct: 'a', options: [
      { id: 'a', label: 'Swap your 5 Bam for their Joker', why: 'Free Joker! You turn a useless tile into the most valuable tile in the game, and you never have to discard the 5 Bam.' },
      { id: 'b', label: 'Discard the 5 Bam', why: 'You’d throw away a tile that could have become a Joker — and a 5 Bam might help someone.' },
      { id: 'c', label: 'Keep the 5 Bam just in case', why: 'It doesn’t fit your hand. Holding it gains nothing when it could be a Joker.' }
    ] },
    explanation: 'Check every exposure for Jokers on every turn. Exchanging a tile you don’t need for a Joker is one of the best moves in the game.',
    hint: 'Look at what the Joker in that exposure is standing in for.'
  },
  {
    id: 'STRAT-009', mode: 'strategy', difficulty: 3,
    objective: 'Stop the second Charleston when you’re close.',
    ruleTags: ['strategy', 'charleston'],
    state: {
      situation: 'The first Charleston is done. You’re playing the hand below and are only two tiles away, with two Jokers.',
      target: [['flower', 2], ['dots-2', 3], ['dots-4', 3], ['bams-6', 4], ['bams-8', 2]],
      rack: ['flower', 'flower', 'dots-2', 'dots-2', 'dots-4', 'dots-4', 'bams-6', 'bams-6', 'bams-8', 'bams-8', 'joker', 'joker', 'craks-1'],
      cardAllowsJoker: true
    },
    prompt: 'Someone asks, “Shall we do the second Charleston?”',
    answer: { kind: 'choice', correct: 'a', options: [
      { id: 'a', label: 'Say no — stop the second Charleston', why: 'Any player may stop it. Your hand is nearly ready, and three more passes would force you to give away useful tiles.' },
      { id: 'b', label: 'Agree and keep passing', why: 'You’d have to pass three tiles three more times. With only one loner, you’d be breaking up your own hand.' },
      { id: 'c', label: 'Pass your Jokers to keep things fair', why: 'Never allowed — and never a good idea.' }
    ] },
    explanation: 'The second Charleston is optional, and a single “no” stops it. When your rack is already close, protect it.',
    hint: 'How many tiles could you spare for three more passes?'
  },
  {
    id: 'STRAT-010', mode: 'strategy', difficulty: 3,
    objective: 'Play defense late in the game.',
    ruleTags: ['strategy', 'defense'],
    state: {
      situation: 'Only a few tiles are left in the wall. You’re four tiles away. The player across has three exposures. You just drew a 7 Dot. Two North Winds have been discarded.',
      exposures: [
        { label: 'Player across', tiles: ['bams-7', 'bams-7', 'bams-7'] },
        { label: '', tiles: ['craks-7', 'craks-7', 'craks-7', 'joker'] },
        { label: '', tiles: ['flower', 'flower', 'flower'] }
      ],
      discards: ['wind-north', 'wind-north', 'dots-1', 'bams-2'],
      rack: ['dots-7', 'wind-north', 'dots-2', 'dots-3', 'dots-3', 'bams-4', 'bams-5', 'craks-8', 'craks-8', 'dragon-red', 'wind-east', 'wind-east', 'bams-9', 'joker']
    },
    prompt: 'What should you discard?',
    answer: { kind: 'choice', correct: 'b', options: [
      { id: 'a', label: 'The 7 Dot you just drew', tiles: ['dots-7'], why: 'Very dangerous. They are showing 7s in two suits — a 7 Dot could hand them Mahjong, and the discarder pays double.' },
      { id: 'b', label: 'Your North Wind', tiles: ['wind-north'], why: 'Safe. Two Norths are already out and nobody called them. You’re four away, so defense matters more than your hand now.' },
      { id: 'c', label: 'Your Joker', tiles: ['joker'], why: 'Also safe, but wasteful. You have a safe tile you don’t need, so keep the Joker.' }
    ] },
    explanation: 'When someone else is close and you’re not, switch to defense: hold the tiles they want and throw tiles that are already out.',
    hint: 'What are their exposures telling you?'
  }
];

export const ALL_SCENARIOS = deepFreeze(SCENARIOS);

export function scenariosForMode(mode) {
  return ALL_SCENARIOS.filter((s) => s.mode === mode);
}

export function getScenario(id) {
  return ALL_SCENARIOS.find((s) => s.id === id) || null;
}

// Quiz modes, grouped for the Practice screen. `icon` names come from icons.js.
export const MODES = Object.freeze([
  { key: 'tiles', group: 'rules', icon: 'tile', title: 'Name the Tile', blurb: 'Recognize every tile at a glance.' },
  { key: 'rack', group: 'rules', icon: 'rows', title: 'Tiles & Racks', blurb: 'How many tiles exist, and how many you hold.' },
  { key: 'call', group: 'rules', icon: 'hand', title: 'Call or Pass', blurb: 'May you claim that discard?' },
  { key: 'joker', group: 'rules', icon: 'sparkle', title: 'Joker Rules', blurb: 'Where a Joker may and may not go.' },
  { key: 'error', group: 'rules', icon: 'search', title: 'Spot the Mistake', blurb: 'Find what’s wrong at the table.' },
  { key: 'charleston', group: 'strategy', icon: 'repeat', title: 'Charleston Passes', blurb: 'Choose three tiles to pass.' },
  { key: 'family', group: 'strategy', icon: 'layers', title: 'Name the Family', blurb: 'Which section of the card is this hand?' },
  { key: 'away', group: 'strategy', icon: 'flag', title: 'Tiles Away', blurb: 'How close is this rack to the hand?' },
  { key: 'strategy', group: 'strategy', icon: 'compass', title: 'Best Move', blurb: 'Choose the smartest play at the table.' }
]);

// Modes whose questions can be mixed into a review session.
export const REVIEW_MODES = Object.freeze(['tiles', 'rack', 'call', 'joker', 'error', 'family', 'away', 'strategy']);

export function getMode(key) {
  return MODES.find((m) => m.key === key) || null;
}
