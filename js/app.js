// app.js — state machine, views, routing, storage. The only module that
// touches the DOM or localStorage. All rule decisions are delegated to rules.js.

import {
  TILE_TYPES, getTileType, hydrate, sortRack, addTile, removeTile,
  countByType, makeInstance, describeTile
} from './data.js';

import {
  validateRackSize, validateCopyCounts, classifyGroup, isJokerAllowedInGroup,
  canCallDiscard, validateJokerExchange, validateCharlestonPass,
  detectIllegalState, validateAgainstUserPattern, validateExposure,
  RESULT_CODES, RULE_CLASS, TABLE_CONVENTIONS
} from './rules.js';

import { ALL_SCENARIOS, scenariosForMode, MODES } from './scenarios.js';

/* ------------------ storage facade (never throws) ------------------ */

const memory = new Map();
let storageWorks = true;

const safeStorage = {
  get(key) {
    try {
      if (!storageWorks) return memory.has(key) ? memory.get(key) : null;
      return window.localStorage.getItem(key);
    } catch (e) { storageWorks = false; return memory.has(key) ? memory.get(key) : null; }
  },
  set(key, value) {
    memory.set(key, value);
    try { window.localStorage.setItem(key, value); }
    catch (e) { storageWorks = false; }
  },
  remove(key) {
    memory.delete(key);
    try { window.localStorage.removeItem(key); }
    catch (e) { storageWorks = false; }
  }
};

(function probeStorage() {
  try {
    const k = '__mjprobe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
  } catch (e) { storageWorks = false; }
})();

const SETTINGS_KEY = 'mjp.settings.v1';
const PATTERNS_KEY = 'mjp.patterns.v1';

function loadSettings() {
  const raw = safeStorage.get(SETTINGS_KEY);
  const base = { largeText: false, highContrast: false, showTileNames: true, showHints: true };
  if (!raw) return base;
  try { return Object.assign(base, JSON.parse(raw)); } catch (e) { return base; }
}
function saveSettings(s) { safeStorage.set(SETTINGS_KEY, JSON.stringify(s)); }

function loadPatterns() {
  const raw = safeStorage.get(PATTERNS_KEY);
  if (!raw) return [];
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch (e) { return []; }
}
function savePatterns(p) { safeStorage.set(PATTERNS_KEY, JSON.stringify(p)); }

/* ------------------ app state ------------------ */

const state = {
  route: '#/home',
  settings: loadSettings(),
  patterns: loadPatterns(),
  index: 0,            // scenario index within the current mode
  selected: [],        // selected instanceIds
  answered: false,
  rackBuilder: [],     // Build a Rack mode
  patternDraft: [],    // Personal pattern mode
  practiceRack: []
};

const viewEl = document.getElementById('view');
const liveEl = document.getElementById('live');
const noticeEl = document.getElementById('storage-notice');

function announce(msg) { liveEl.textContent = msg; }

function applySettings() {
  document.documentElement.setAttribute('data-text', state.settings.largeText ? 'large' : 'normal');
  document.documentElement.setAttribute('data-contrast', state.settings.highContrast ? 'high' : 'normal');
}

/* ------------------ small DOM helpers ------------------ */

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of [].concat(children)) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

const SUIT_GLYPH = { dots: '\u25C9', bams: '\u2503', craks: '\u4E07' };
const OTHER_GLYPH = {
  'wind-east': 'E', 'wind-south': 'S', 'wind-west': 'W', 'wind-north': 'N',
  'dragon-red': '\u4E2D', 'dragon-green': '\u767C', 'dragon-white': '\u25AF',
  'flower': '\u2740', 'joker': '\u2605'
};

function tileFace(typeId, opts = {}) {
  const t = getTileType(typeId);
  const kids = [];
  if (!t) return el('span', { text: 'Unknown tile' });
  if (t.family === 'suit') {
    kids.push(el('span', { class: 'rank', 'aria-hidden': 'true', text: String(t.rank) }));
    kids.push(el('span', { class: 'glyph', 'aria-hidden': 'true', text: SUIT_GLYPH[t.suit] }));
    kids.push(el('span', { class: 'suit', 'aria-hidden': 'true', text: t.suit }));
  } else {
    kids.push(el('span', { class: 'glyph', 'aria-hidden': 'true', text: OTHER_GLYPH[t.typeId] || t.shortLabel }));
    kids.push(el('span', { class: 'suit', 'aria-hidden': 'true', text: t.family }));
  }
  if (state.settings.showTileNames && !opts.hideName) {
    kids.push(el('span', { class: 'name', 'aria-hidden': 'true', text: t.displayName }));
  }
  const classes = 'tile' + (opts.big ? ' big' : '') + (opts.onClick ? '' : ' static');
  if (opts.onClick) {
    return el('button', {
      type: 'button', class: classes, 'aria-label': t.accessibleLabel,
      'aria-pressed': opts.pressed ? 'true' : 'false',
      'data-instance': opts.instanceId || '', onclick: opts.onClick
    }, kids);
  }
  return el('div', { class: classes, role: 'img', 'aria-label': t.accessibleLabel }, kids);
}

function tileRow(tiles, opts = {}) {
  const list = el('ul', { class: 'tile-row' });
  tiles.forEach((tile) => {
    const li = el('li');
    li.appendChild(tileFace(tile.typeId, {
      big: opts.big,
      instanceId: tile.instanceId,
      pressed: opts.selected && opts.selected.includes(tile.instanceId),
      onClick: opts.onTileClick ? () => opts.onTileClick(tile) : null
    }));
    list.appendChild(li);
  });
  return list;
}

function feedback(ok, headline, body, ruleClass) {
  const box = el('div', { class: 'feedback ' + (ok ? 'correct' : 'incorrect'), role: 'group', 'aria-label': 'Answer explanation' });
  box.appendChild(el('span', { class: 'verdict', text: (ok ? '\u2713 ' : '\u2715 ') + headline }));
  box.appendChild(el('p', { text: body }));
  if (ruleClass === RULE_CLASS.CONVENTION) {
    box.appendChild(el('p', {}, [
      el('span', { class: 'badge', text: 'Table custom' }),
      ' This one varies between tables. Ask your group how they play it.'
    ]));
  }
  return box;
}

function pageHeading(text) {
  const h = el('h2', { tabindex: '-1', text: text });
  return h;
}

/* ------------------ scenario runner shared bits ------------------ */

function scenarioNav(mode, list) {
  const row = el('div', { class: 'answer-row' });
  row.appendChild(el('button', {
    type: 'button', class: 'btn', text: '\u2190 Previous',
    onclick: () => { state.index = (state.index - 1 + list.length) % list.length; reset(); render(); }
  }));
  row.appendChild(el('button', {
    type: 'button', class: 'btn btn-primary', text: 'Next question \u2192',
    onclick: () => { state.index = (state.index + 1) % list.length; reset(); render(); }
  }));
  row.appendChild(el('button', {
    type: 'button', class: 'btn', text: 'Start this question over',
    onclick: () => { reset(); render(); announce('The question has been reset.'); }
  }));
  return row;
}

function reset() { state.selected = []; state.answered = false; state.lastResult = null; }

function hintBlock(scn) {
  if (!scn.hint) return null;
  const wrap = el('div');
  const btn = el('button', {
    type: 'button', class: 'btn', text: 'Show a hint',
    onclick: () => {
      wrap.appendChild(el('p', { text: 'Hint: ' + scn.hint }));
      btn.remove();
      announce('Hint: ' + scn.hint);
    }
  });
  wrap.appendChild(btn);
  return wrap;
}

function progressLine(list) {
  return el('p', { class: 'progress', text: `Question ${state.index + 1} of ${list.length}. Take as long as you like — there is no timer.` });
}

/* ------------------ views ------------------ */

const MODE_ICONS = {
  tiles: '🀄', rack: '🀫', charleston: '🔄', call: '🗣️', joker: '🃏', error: '🔍', pattern: '✏️'
};

function viewHome() {
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHeading('Choose something to practise'));
  frag.appendChild(el('p', { text: 'Pick any activity below. Nothing is timed, and you can leave and come back whenever you like.' }));
  const ul = el('ul', { class: 'mode-grid' });
  for (const m of MODES) {
    ul.appendChild(el('li', {}, [
      el('a', { class: 'mode-card', href: '#/' + m.key }, [
        el('span', { class: 'mode-icon', 'aria-hidden': 'true', text: MODE_ICONS[m.key] || '•' }),
        el('span', { class: 'mode-text' }, [el('strong', { text: m.title }), el('span', { class: 'blurb', text: m.blurb })])
      ])
    ]));
  }
  frag.appendChild(ul);
  return frag;
}

function viewTiles() {
  const list = scenariosForMode('tiles');
  const scn = list[state.index % list.length];
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHeading('Learn the Tiles'));
  frag.appendChild(progressLine(list));
  frag.appendChild(el('p', { text: scn.prompt }));

  const holder = el('div', { class: 'card' });
  holder.appendChild(tileFace(scn.state.tile, { big: true, hideName: !state.settings.showTileNames }));
  frag.appendChild(holder);

  const row = el('div', { class: 'answer-row' });
  for (const choice of scn.answer.choices) {
    row.appendChild(el('button', {
      type: 'button', class: 'btn', text: describeTile(choice),
      onclick: () => {
        const ok = scn.answer.correct.includes(choice);
        state.answered = true;
        state.lastResult = { ok, headline: ok ? 'Correct.' : 'Not quite.', body: scn.explanation };
        render();
        announce((ok ? 'Correct. ' : 'Not quite. ') + scn.explanation);
      }
    }));
  }
  frag.appendChild(row);
  if (state.settings.showHints) { const h = hintBlock(scn); if (h) frag.appendChild(h); }
  if (state.answered) frag.appendChild(feedback(state.lastResult.ok, state.lastResult.headline, state.lastResult.body));
  frag.appendChild(scenarioNav('tiles', list));
  return frag;
}

function viewRack() {
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHeading('Build a Rack'));
  frag.appendChild(el('p', { text: 'Add tiles to the rack and watch the count. The app will stop you from adding more copies of a tile than the set contains.' }));

  const rack = state.rackBuilder;
  const sizeResult = validateRackSize(rack, { phase: 'resting' });
  const counts = countByType(rack);

  const status = el('div', { class: 'card' });
  status.appendChild(el('p', { class: 'count-display', text: `Tiles on the rack: ${rack.length} of 13` }));
  status.appendChild(el('p', { text: sizeResult.ok ? '\u2713 ' + sizeResult.message : '\u2139 ' + sizeResult.message }));
  frag.appendChild(status);

  frag.appendChild(el('h3', { text: 'Your rack' }));
  if (rack.length === 0) {
    frag.appendChild(el('p', { text: 'The rack is empty. Choose tiles from the list below to add them.' }));
  } else {
    frag.appendChild(tileRow(sortRack(rack), {
      onTileClick: (tile) => {
        state.rackBuilder = removeTile(state.rackBuilder, tile.instanceId);
        render();
        announce(describeTile(tile.typeId) + ' removed. ' + state.rackBuilder.length + ' tiles on the rack.');
      }
    }));
    frag.appendChild(el('p', { text: 'Select any tile on the rack to take it off again.' }));
  }

  frag.appendChild(el('h3', { text: 'Add a tile' }));
  const picker = el('div', { class: 'answer-row' });
  const select = el('select', { id: 'tile-picker', 'aria-label': 'Choose a tile to add' });
  for (const t of TILE_TYPES) select.appendChild(el('option', { value: t.typeId, text: t.displayName }));
  const addBtn = el('button', {
    type: 'button', class: 'btn btn-primary', text: 'Add this tile',
    onclick: () => {
      const typeId = select.value;
      const type = getTileType(typeId);
      const have = counts[typeId] || 0;
      if (have >= type.maxCopies) {
        announce(`You cannot add another ${type.displayName}. The set only contains ${type.maxCopies}.`);
        state.rackMessage = `You cannot add another ${type.displayName}. The set only contains ${type.maxCopies}, and you already have ${have}.`;
        render();
        return;
      }
      if (state.rackBuilder.length >= 14) {
        state.rackMessage = 'A rack never holds more than fourteen tiles, and that is only while you are holding a tile you just picked up.';
        announce(state.rackMessage);
        render();
        return;
      }
      state.rackBuilder = addTile(state.rackBuilder, makeInstance(typeId, have));
      state.rackMessage = `${type.displayName} added. There are now ${state.rackBuilder.length} tiles on the rack.`;
      render();
      announce(state.rackMessage);
    }
  });
  picker.appendChild(select);
  picker.appendChild(addBtn);
  frag.appendChild(picker);

  if (state.rackMessage) frag.appendChild(el('p', { class: 'notice', text: state.rackMessage }));

  frag.appendChild(el('div', { class: 'answer-row' }, [
    el('button', {
      type: 'button', class: 'btn', text: 'Clear the rack',
      onclick: () => { state.rackBuilder = []; state.rackMessage = 'The rack is now empty.'; render(); announce('The rack is now empty.'); }
    })
  ]));

  frag.appendChild(el('h3', { text: 'Questions about rack size' }));
  const list = scenariosForMode('rack');
  const scn = list[state.index % list.length];
  frag.appendChild(progressLine(list));
  frag.appendChild(el('p', { text: scn.prompt }));
  frag.appendChild(tileRow(hydrate(scn.state.rack, scn.id)));
  frag.appendChild(legalityButtons(scn));
  if (state.settings.showHints) { const h = hintBlock(scn); if (h) frag.appendChild(h); }
  if (state.answered) frag.appendChild(feedback(state.lastResult.ok, state.lastResult.headline, state.lastResult.body));
  frag.appendChild(scenarioNav('rack', list));
  return frag;
}

function legalityButtons(scn, judge) {
  const row = el('div', { class: 'answer-row' });
  const decide = (choice) => {
    const outcome = judge ? judge(choice) : { ok: choice === scn.answer.correct, body: scn.explanation };
    state.answered = true;
    state.lastResult = {
      ok: outcome.ok,
      headline: outcome.ok ? 'Correct.' : 'Not quite.',
      body: outcome.body || scn.explanation,
      ruleClass: outcome.ruleClass
    };
    render();
    announce((outcome.ok ? 'Correct. ' : 'Not quite. ') + state.lastResult.body);
  };
  row.appendChild(el('button', { type: 'button', class: 'btn', text: 'Yes, it is allowed', onclick: () => decide(true) }));
  row.appendChild(el('button', { type: 'button', class: 'btn', text: 'No, it is not allowed', onclick: () => decide(false) }));
  return row;
}

function viewCharleston() {
  const list = scenariosForMode('charleston');
  const scn = list[state.index % list.length];
  const rack = hydrate(scn.state.rack, scn.id);
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHeading('Charleston Practice'));
  frag.appendChild(progressLine(list));
  frag.appendChild(el('p', { text: `Pass ${scn.state.passIndex}, going ${scn.state.passDirection}. ${scn.prompt}` }));
  frag.appendChild(el('p', { class: 'count-display', text: `Chosen: ${state.selected.length} of 3` }));
  frag.appendChild(tileRow(sortRack(rack), {
    selected: state.selected,
    onTileClick: (tile) => {
      const i = state.selected.indexOf(tile.instanceId);
      if (i >= 0) state.selected.splice(i, 1);
      else if (state.selected.length < 3) state.selected.push(tile.instanceId);
      else { announce('You already have three tiles chosen. Unselect one first.'); return; }
      render();
      announce(`${describeTile(tile.typeId)} ${i >= 0 ? 'unselected' : 'selected'}. ${state.selected.length} of 3 chosen.`);
    }
  }));

  frag.appendChild(el('div', { class: 'answer-row' }, [
    el('button', {
      type: 'button', class: 'btn btn-primary', text: 'Check this pass',
      onclick: () => {
        const chosen = rack.filter((t) => state.selected.includes(t.instanceId));
        const res = validateCharlestonPass(chosen, { rack, passIndex: scn.state.passIndex });
        state.answered = true;
        state.lastResult = {
          ok: res.ok,
          headline: res.ok ? 'That is a legal pass.' : 'That pass is not legal.',
          body: res.message + (res.ok && scn.answer.strategyNote ? ' ' + scn.answer.strategyNote : ''),
          ruleClass: res.ruleClass
        };
        render();
        announce(state.lastResult.headline + ' ' + state.lastResult.body);
      }
    })
  ]));

  frag.appendChild(el('p', { text: 'This activity grades legality only. There is usually more than one sensible set of three tiles to pass, so a different choice is not a mistake.' }));
  if (state.settings.showHints) { const h = hintBlock(scn); if (h) frag.appendChild(h); }
  if (state.answered) {
    frag.appendChild(feedback(state.lastResult.ok, state.lastResult.headline, state.lastResult.body, state.lastResult.ruleClass));
    frag.appendChild(el('p', { text: scn.explanation }));
  }
  frag.appendChild(scenarioNav('charleston', list));
  return frag;
}

function viewCall() {
  const list = scenariosForMode('call');
  const scn = list[state.index % list.length];
  const rack = hydrate(scn.state.rack, scn.id);
  const discard = hydrate([scn.state.discard], scn.id + 'd')[0];
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHeading('Call or Pass'));
  frag.appendChild(progressLine(list));

  frag.appendChild(el('h3', { text: 'The discarded tile' }));
  frag.appendChild(tileRow([discard], { big: true }));

  if (scn.state.handIsConcealed) {
    frag.appendChild(el('p', { class: 'notice', text: 'Note: this hand must be kept concealed.' }));
  }
  frag.appendChild(el('h3', { text: 'Your rack' }));
  frag.appendChild(tileRow(sortRack(rack)));
  frag.appendChild(el('p', { text: scn.prompt }));

  frag.appendChild(legalityButtons(scn, (choice) => {
    const res = canCallDiscard({
      rack, discard,
      targetGroupSize: scn.state.targetGroupSize,
      handIsConcealed: scn.state.handIsConcealed,
      cardAllowsJoker: scn.state.cardAllowsJoker,
      forMahjong: scn.state.forMahjong
    });
    return { ok: choice === res.ok, body: res.message + ' ' + scn.explanation, ruleClass: res.ruleClass };
  }));

  if (state.settings.showHints) { const h = hintBlock(scn); if (h) frag.appendChild(h); }
  if (state.answered) frag.appendChild(feedback(state.lastResult.ok, state.lastResult.headline, state.lastResult.body, state.lastResult.ruleClass));
  frag.appendChild(scenarioNav('call', list));
  return frag;
}

function viewJoker() {
  const list = scenariosForMode('joker');
  const scn = list[state.index % list.length];
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHeading('Joker Practice'));
  frag.appendChild(progressLine(list));

  const isExchange = !!scn.state.exposure;
  const tiles = hydrate(isExchange ? scn.state.exposure : scn.state.group, scn.id);
  frag.appendChild(el('h3', { text: isExchange ? 'The exposure on the table' : 'The grouping' }));
  const wrap = el('div', { class: 'exposure' });
  wrap.appendChild(tileRow(tiles));
  frag.appendChild(wrap);

  if (isExchange) {
    frag.appendChild(el('h3', { text: 'The tile you are offering' }));
    frag.appendChild(tileRow(hydrate([scn.state.offered], scn.id + 'o')));
  } else if (scn.state.cardAllowsJoker === false) {
    frag.appendChild(el('p', { class: 'notice', text: 'Note: the hand being played does not permit Jokers at all.' }));
  }

  frag.appendChild(el('p', { text: scn.prompt }));
  frag.appendChild(legalityButtons(scn, (choice) => {
    let res;
    if (isExchange) {
      res = validateJokerExchange({
        exposure: tiles,
        offeredTile: hydrate([scn.state.offered], scn.id + 'o')[0],
        turnPhase: scn.state.turnPhase
      });
    } else {
      const g = classifyGroup(tiles);
      res = g.jokerCount > 0
        ? isJokerAllowedInGroup({ groupSize: g.size, cardAllowsJoker: scn.state.cardAllowsJoker })
        : validateExposure(tiles, { cardAllowsJoker: scn.state.cardAllowsJoker });
    }
    return { ok: choice === res.ok, body: res.message + ' ' + scn.explanation, ruleClass: res.ruleClass };
  }));

  if (state.settings.showHints) { const h = hintBlock(scn); if (h) frag.appendChild(h); }
  if (state.answered) frag.appendChild(feedback(state.lastResult.ok, state.lastResult.headline, state.lastResult.body, state.lastResult.ruleClass));
  frag.appendChild(scenarioNav('joker', list));
  return frag;
}

function viewError() {
  const list = scenariosForMode('error');
  const scn = list[state.index % list.length];
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHeading('Find the Error'));
  frag.appendChild(progressLine(list));
  frag.appendChild(el('p', { text: scn.prompt }));

  const exposures = (scn.state.exposures || []).map((e, i) => ({
    tiles: hydrate(e.tiles, scn.id + 'e' + i),
    cardAllowsJoker: e.cardAllowsJoker
  }));
  if (exposures.length) {
    frag.appendChild(el('h3', { text: 'Exposures on the table' }));
    for (const e of exposures) {
      const box = el('div', { class: 'exposure' });
      box.appendChild(tileRow(e.tiles));
      frag.appendChild(box);
    }
  }
  frag.appendChild(el('h3', { text: 'The rack' }));
  frag.appendChild(tileRow(sortRack(hydrate(scn.state.rack, scn.id))));

  if (scn.state.discards) {
    frag.appendChild(el('h3', { text: 'Recently discarded' }));
    frag.appendChild(tileRow(hydrate(scn.state.discards, scn.id + 'x')));
  }

  const ERROR_LABELS = {
    RACK_TOO_MANY: 'There are too many tiles.',
    RACK_TOO_FEW: 'There are too few tiles.',
    EXCESS_COPIES: 'There are more copies of a tile than the set contains.',
    JOKER_IN_PAIR: 'A Joker is being used in a pair.',
    JOKER_IN_SINGLE: 'A Joker is being used as a single.',
    GROUP_MIXED_TYPES: 'An exposure contains tiles that are not all the same.',
    JOKER_DISCARD_DEAD: 'A discarded Joker was picked up.',
    CALL_FOR_PAIR_ILLEGAL: 'A discard was called to make a pair.',
    EXCHANGE_TILE_MISMATCH: 'A Joker was exchanged for the wrong tile.',
    PATTERN_NOT_MATCHED: 'The hand does not match the pattern.'
  };

  const row = el('div', { class: 'answer-row' });
  for (const code of scn.answer.choices) {
    row.appendChild(el('button', {
      type: 'button', class: 'btn', text: ERROR_LABELS[code] || code,
      onclick: () => {
        const ok = scn.answer.correct.includes(code);
        // Cross-check against the engine so the teaching text and the
        // validator can never drift apart.
        const engine = detectIllegalState({
          rack: hydrate(scn.state.rack, scn.id),
          exposures: exposures,
          discards: scn.state.discards ? hydrate(scn.state.discards, scn.id + 'x') : [],
          jokerWasClaimed: !!scn.state.jokerWasClaimed,
          phase: scn.state.phase
        });
        const detail = engine.issues.length ? ' ' + engine.issues.map((i) => i.message).join(' ') : '';
        state.answered = true;
        state.lastResult = {
          ok,
          headline: ok ? 'Correct.' : 'Not quite.',
          body: scn.explanation + detail
        };
        render();
        announce(state.lastResult.headline + ' ' + state.lastResult.body);
      }
    }));
  }
  frag.appendChild(row);
  if (state.settings.showHints) { const h = hintBlock(scn); if (h) frag.appendChild(h); }
  if (state.answered) frag.appendChild(feedback(state.lastResult.ok, state.lastResult.headline, state.lastResult.body));
  frag.appendChild(scenarioNav('error', list));
  return frag;
}

function viewPattern() {
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHeading('My Own Pattern'));
  frag.appendChild(el('p', { class: 'notice', text: 'This app does not contain any hands from the official card. Type in a hand from the card you own, and it will be saved only in this browser on this device.' }));

  frag.appendChild(el('h3', { text: 'Build your 14-tile pattern' }));
  frag.appendChild(el('p', { class: 'count-display', text: `Tiles chosen: ${state.patternDraft.length} of 14` }));
  if (state.patternDraft.length) {
    frag.appendChild(tileRow(state.patternDraft.map((typeId, i) => ({ typeId, instanceId: typeId + '#p' + i })), {
      onTileClick: (tile) => {
        const i = state.patternDraft.findIndex((tid, idx) => tid + '#p' + idx === tile.instanceId);
        if (i >= 0) state.patternDraft.splice(i, 1);
        render();
        announce(describeTile(tile.typeId) + ' removed from the pattern.');
      }
    }));
    frag.appendChild(el('p', { text: 'Select a tile above to take it out of the pattern.' }));
  }

  const select = el('select', { 'aria-label': 'Choose a tile to add to your pattern' });
  for (const t of TILE_TYPES) {
    if (t.isJoker) continue; // a pattern describes real tiles; Jokers substitute at play time
    select.appendChild(el('option', { value: t.typeId, text: t.displayName }));
  }
  const nameInput = el('input', { type: 'text', id: 'pattern-name', placeholder: 'For example: my practice hand 1' });

  frag.appendChild(el('div', { class: 'answer-row' }, [
    select,
    el('button', {
      type: 'button', class: 'btn btn-primary', text: 'Add this tile',
      onclick: () => {
        if (state.patternDraft.length >= 14) { announce('The pattern already has fourteen tiles.'); return; }
        state.patternDraft.push(select.value);
        render();
        announce(describeTile(select.value) + ' added. ' + state.patternDraft.length + ' of 14.');
      }
    })
  ]));

  frag.appendChild(el('label', { for: 'pattern-name', text: 'Give this pattern a name' }));
  frag.appendChild(nameInput);
  frag.appendChild(el('div', { class: 'answer-row' }, [
    el('button', {
      type: 'button', class: 'btn btn-primary', text: 'Save this pattern',
      onclick: () => {
        if (state.patternDraft.length !== 14) {
          announce('A pattern must have exactly fourteen tiles before it can be saved.');
          state.patternMessage = 'A pattern must have exactly fourteen tiles before it can be saved.';
          render(); return;
        }
        const name = (nameInput.value || '').trim() || ('Pattern ' + (state.patterns.length + 1));
        state.patterns = state.patterns.concat([{ name, tiles: state.patternDraft.slice() }]);
        savePatterns(state.patterns);
        state.patternDraft = [];
        state.patternMessage = `Saved as "${name}".` + (storageWorks ? '' : ' Note: this browser is not letting the app save, so it will be lost when you close the page.');
        render();
        announce(state.patternMessage);
      }
    }),
    el('button', {
      type: 'button', class: 'btn', text: 'Clear what I am building',
      onclick: () => { state.patternDraft = []; render(); announce('Cleared.'); }
    })
  ]));
  if (state.patternMessage) frag.appendChild(el('p', { class: 'notice', text: state.patternMessage }));

  frag.appendChild(el('h3', { text: 'Your saved patterns' }));
  if (!state.patterns.length) {
    frag.appendChild(el('p', { text: 'You have not saved any patterns yet.' }));
  } else {
    for (let i = 0; i < state.patterns.length; i++) {
      const p = state.patterns[i];
      const box = el('div', { class: 'card' });
      box.appendChild(el('h4', { text: p.name }));
      box.appendChild(tileRow(p.tiles.map((tid, j) => ({ typeId: tid, instanceId: tid + '#s' + j }))));
      box.appendChild(el('div', { class: 'answer-row' }, [
        el('button', {
          type: 'button', class: 'btn', text: 'Practise this pattern',
          onclick: () => {
            state.practiceRack = p.tiles.map((tid, j) => ({ typeId: tid, instanceId: tid + '#r' + j }));
            const res = validateAgainstUserPattern(state.practiceRack, p.tiles);
            state.patternMessage = res.message;
            render();
            announce(res.message);
          }
        }),
        el('button', {
          type: 'button', class: 'btn btn-danger', text: 'Delete this pattern',
          onclick: () => {
            confirmDialog(`Delete the pattern "${p.name}"?`, 'This removes only this one pattern.', () => {
              state.patterns = state.patterns.filter((_, k) => k !== i);
              savePatterns(state.patterns);
              render();
              announce('Pattern deleted.');
            });
          }
        })
      ]));
      frag.appendChild(box);
    }
  }
  return frag;
}

function viewSettings() {
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHeading('Settings'));

  const toggle = (key, label, description) => {
    const id = 'set-' + key;
    const wrap = el('div', { class: 'card' });
    const btn = el('button', {
      type: 'button', class: 'btn', id,
      'aria-pressed': state.settings[key] ? 'true' : 'false',
      text: `${label}: ${state.settings[key] ? 'On' : 'Off'}`,
      onclick: () => {
        state.settings[key] = !state.settings[key];
        saveSettings(state.settings);
        applySettings();
        render();
        announce(`${label} is now ${state.settings[key] ? 'on' : 'off'}.`);
      }
    });
    wrap.appendChild(btn);
    wrap.appendChild(el('p', { text: description }));
    return wrap;
  };

  frag.appendChild(toggle('largeText', 'Larger text', 'Makes all text and tiles noticeably bigger.'));
  frag.appendChild(toggle('highContrast', 'High contrast', 'Uses pure black on white with heavier outlines.'));
  frag.appendChild(toggle('showTileNames', 'Show tile names on tiles', 'Prints the name of each tile underneath its face.'));
  frag.appendChild(toggle('showHints', 'Offer hints', 'Shows a "Show a hint" button on each question.'));

  frag.appendChild(el('h3', { text: 'Table customs' }));
  frag.appendChild(el('p', { text: 'Some points of play differ from table to table. This app currently assumes: a Joker may be exchanged at any point on your turn; a blind pass is offered only on the last pass of each Charleston round; and the second Charleston runs only if everyone agrees. When the app relies on one of these, it says so.' }));

  frag.appendChild(el('h3', { text: 'Saved information' }));
  frag.appendChild(el('p', { text: storageWorks
    ? 'Your settings and patterns are saved in this browser only. Nothing is sent anywhere.'
    : 'This browser is not allowing the app to save anything. Everything still works, but your settings and patterns will be forgotten when you close the page.' }));
  frag.appendChild(el('button', {
    type: 'button', class: 'btn btn-danger', text: 'Delete all my saved information',
    onclick: () => confirmDialog('Delete everything you have saved?',
      'This removes your settings and every pattern you typed in. It cannot be undone.',
      () => {
        safeStorage.remove(SETTINGS_KEY);
        safeStorage.remove(PATTERNS_KEY);
        state.patterns = [];
        state.patternDraft = [];
        state.settings = loadSettings();
        applySettings();
        render();
        announce('All saved information has been deleted.');
      })
  }));
  return frag;
}

/* ------------------ confirmation dialog ------------------ */

const dialog = document.getElementById('confirm-dialog');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');
let pendingAction = null;

function confirmDialog(title, text, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-text').textContent = text;
  pendingAction = onConfirm;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else if (window.confirm(title + '\n' + text)) { onConfirm(); pendingAction = null; }
  confirmCancel.focus();
}

confirmOk.addEventListener('click', () => {
  const action = pendingAction;
  pendingAction = null;
  if (dialog.open) dialog.close();
  if (action) action();
});
confirmCancel.addEventListener('click', () => {
  pendingAction = null;
  if (dialog.open) dialog.close();
  announce('Nothing was deleted.');
});

/* ------------------ routing ------------------ */

const ROUTES = {
  '#/home': viewHome,
  '#/tiles': viewTiles,
  '#/rack': viewRack,
  '#/charleston': viewCharleston,
  '#/call': viewCall,
  '#/joker': viewJoker,
  '#/error': viewError,
  '#/pattern': viewPattern,
  '#/settings': viewSettings
};

function render() {
  const fn = ROUTES[state.route] || viewHome;
  viewEl.textContent = '';
  viewEl.appendChild(fn());
}

function onRouteChange(initial) {
  const next = ROUTES[window.location.hash] ? window.location.hash : '#/home';
  if (next !== state.route) { state.route = next; state.index = 0; reset(); state.rackMessage = ''; state.patternMessage = ''; }
  render();
  if (!initial) {
    const h = viewEl.querySelector('h2');
    if (h) h.focus();
  }
}

window.addEventListener('hashchange', () => onRouteChange(false));

applySettings();
if (!storageWorks) {
  noticeEl.hidden = false;
  noticeEl.textContent = 'This browser is not letting the app remember your settings. Everything still works — your choices will simply be forgotten when you close the page.';
}
onRouteChange(true);

// Exposed for the development test page only.
window.__mjp = { state, TABLE_CONVENTIONS, RESULT_CODES, ALL_SCENARIOS, validateCopyCounts, detectIllegalState };
