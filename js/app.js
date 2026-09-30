// app.js — routing, views, quiz engine, storage. The only module that touches
// the DOM or localStorage. Rule decisions are delegated to rules.js; teaching
// text lives in content.js and scenarios.js.

import {
  TILE_TYPES, getTileType, hydrate, sortRack, countByType, makeInstance,
  describeTile, generateFullSet, shuffle
} from './data.js';

import {
  validateRackSize, classifyGroup, isJokerAllowedInGroup, canCallDiscard,
  validateJokerExchange, validateCharlestonPass, detectIllegalState,
  validateExposure, tilesAway, RESULT_CODES, RULE_CLASS, TABLE_CONVENTIONS
} from './rules.js';

import { ALL_SCENARIOS, scenariosForMode, MODES, REVIEW_MODES, getMode } from './scenarios.js';

import {
  LESSONS, LESSON_SECTIONS, getLesson, FAMILIES, getFamily, GROUP_NAMES,
  GLOSSARY, tipOfTheDay, normalizeGroups, groupTiles, rackLeanings
} from './content.js';

import { tileSVG } from './tiles.js';
import { icon } from './icons.js';

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
const PROGRESS_KEY = 'mjp.progress.v1';

function readJSON(key, fallback) {
  const raw = safeStorage.get(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch (e) { return fallback; }
}

function loadSettings() {
  return Object.assign({ largeText: false, highContrast: false, showTileNames: true, showHints: true }, readJSON(SETTINGS_KEY, {}));
}
function saveSettings(s) { safeStorage.set(SETTINGS_KEY, JSON.stringify(s)); }

function loadPatterns() {
  const v = readJSON(PATTERNS_KEY, []);
  return Array.isArray(v) ? v : [];
}
function savePatterns(p) { safeStorage.set(PATTERNS_KEY, JSON.stringify(p)); }

function loadProgress() {
  const v = readJSON(PROGRESS_KEY, {});
  return { answers: Object.assign({}, v.answers), lessons: Object.assign({}, v.lessons) };
}
function saveProgress() { safeStorage.set(PROGRESS_KEY, JSON.stringify(state.progress)); }

/* ------------------ app state ------------------ */

const state = {
  route: null,
  settings: loadSettings(),
  patterns: loadPatterns(),
  progress: loadProgress(),
  quiz: null,            // current quiz session
  sandbox: [],           // Rack Builder tiles
  patternDraft: [],      // My Own Hands builder (typeIds)
  patternDeals: {},      // index -> dealt practice rack
  message: ''
};

let seq = 0;
const viewEl = document.getElementById('view');
const mainEl = document.getElementById('main');
const liveEl = document.getElementById('live');

function announce(msg) {
  liveEl.textContent = '';
  window.setTimeout(() => { liveEl.textContent = msg; }, 30);
}

function applySettings() {
  document.documentElement.setAttribute('data-text', state.settings.largeText ? 'large' : 'normal');
  document.documentElement.setAttribute('data-contrast', state.settings.highContrast ? 'high' : 'normal');
}

const reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------ DOM helpers ------------------ */

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
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function ic(name, cls) {
  return el('span', { class: 'ic' + (cls ? ' ' + cls : ''), html: icon(name) });
}

// Inline **bold** and *italic* for teaching text. Builds nodes, never HTML.
function rich(text) {
  const frag = document.createDocumentFragment();
  String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).forEach((part) => {
    if (!part) return;
    if (part.startsWith('**')) frag.appendChild(el('strong', { text: part.slice(2, -2) }));
    else if (part.startsWith('*') && part.length > 2) frag.appendChild(el('em', { text: part.slice(1, -1) }));
    else frag.appendChild(document.createTextNode(part));
  });
  return frag;
}

function pageHead(eyebrow, title, lede) {
  return el('header', { class: 'page-head' }, [
    eyebrow ? el('p', { class: 'eyebrow', text: eyebrow }) : null,
    el('h1', { tabindex: '-1', text: title }),
    lede ? el('p', { class: 'lede' }, [rich(lede)]) : null
  ]);
}

function sectionHead(title, link) {
  return el('div', { class: 'section-head' }, [
    el('h2', { text: title }),
    link ? el('a', { class: 'text-link', href: link.href }, [link.label, ic('chevron', 'ic-sm')]) : null
  ]);
}

function btn(label, opts = {}) {
  const cls = 'btn ' + (opts.variant ? 'btn-' + opts.variant : 'btn-secondary') + (opts.block ? ' btn-block' : '');
  const kids = [opts.icon && !opts.iconAfter ? ic(opts.icon) : null, el('span', { text: label }), opts.icon && opts.iconAfter ? ic(opts.icon) : null];
  if (opts.href) return el('a', { class: cls, href: opts.href, 'data-key': opts.key }, kids);
  return el('button', { type: 'button', class: cls, onclick: opts.onClick, disabled: opts.disabled, 'data-key': opts.key, 'aria-label': opts.ariaLabel }, kids);
}

function meter(value, max, label) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return el('div', { class: 'meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(max), 'aria-valuenow': String(value), 'aria-label': label }, [
    el('span', { style: `width:${pct}%` })
  ]);
}

function callout(tone, title, text) {
  const icons = { tip: 'bulb', rule: 'shield', custom: 'users', warn: 'alert', info: 'info' };
  return el('aside', { class: 'callout callout-' + tone }, [
    ic(icons[tone] || 'info', 'callout-icon'),
    el('div', {}, [
      title ? el('p', { class: 'callout-title', text: title }) : null,
      el('p', {}, [rich(text)])
    ])
  ]);
}

function fineprint() {
  return el('p', { class: 'fineprint', text: 'An independent practice tool. Not affiliated with, sponsored by, or endorsed by the National Mah Jongg League. No annual card is reproduced here — your current official card and your table’s rulings are always the final authority.' });
}

/* ------------------ tiles ------------------ */

function shortName(typeId) {
  const t = getTileType(typeId);
  if (!t) return '';
  if (t.family === 'suit') return `${t.rank} ${t.suit === 'dots' ? 'Dot' : t.suit === 'bams' ? 'Bam' : 'Crak'}`;
  if (t.typeId === 'dragon-white') return 'Soap';
  return t.displayName.replace(' Wind', '').replace(' Dragon', '');
}

// size: xs | sm | md | lg | xl (sm/md follow the surrounding row's sizing)
function tileEl(typeId, opts = {}) {
  const t = getTileType(typeId);
  const label = t ? t.accessibleLabel : 'Unknown tile';
  const cls = 'tile' + (opts.size ? ' tile-' + opts.size : '') + (opts.pressed ? ' is-pressed' : '') + (opts.onClick ? ' is-button' : '');
  const face = el('span', { class: 'tile-face', html: tileSVG(typeId) });
  let node;
  if (opts.onClick) {
    node = el('button', {
      type: 'button', class: cls, 'aria-label': opts.ariaLabel || label,
      'aria-pressed': opts.toggle ? (opts.pressed ? 'true' : 'false') : null,
      disabled: opts.disabled, 'data-key': opts.key, onclick: opts.onClick
    }, [face, opts.badge != null ? el('span', { class: 'tile-badge', 'aria-hidden': 'true', text: String(opts.badge) }) : null]);
  } else {
    node = el('span', { class: cls, role: 'img', 'aria-label': label }, [face]);
  }
  const showCap = opts.caption === true || (opts.caption !== false && opts.caption !== 'never' && state.settings.showTileNames && opts.caption === 'auto');
  if (!showCap) return node;
  return el('span', { class: 'tile-wrap' }, [node, el('span', { class: 'tile-cap', 'aria-hidden': 'true', text: shortName(typeId) })]);
}

function tileRow(tiles, opts = {}) {
  const list = el('ul', { class: 'tile-row' + (opts.className ? ' ' + opts.className : ''), 'aria-label': opts.label || null });
  tiles.forEach((tile) => {
    const typeId = typeof tile === 'string' ? tile : tile.typeId;
    const instanceId = typeof tile === 'string' ? null : tile.instanceId;
    list.appendChild(el('li', {}, [tileEl(typeId, {
      size: opts.size,
      caption: opts.caption || 'auto',
      pressed: opts.selected && opts.selected.includes(instanceId),
      toggle: opts.toggle,
      disabled: opts.disabled,
      key: opts.onTileClick ? 'tile-' + (instanceId || typeId) : null,
      ariaLabel: opts.ariaLabelFor ? opts.ariaLabelFor(typeId) : null,
      onClick: opts.onTileClick ? () => opts.onTileClick(tile) : null
    })]));
  });
  return list;
}

function describeGroups(specs) {
  return normalizeGroups(specs).map((g) => g.size > 1 ? `${g.size} × ${describeTile(g.typeId)}` : describeTile(g.typeId)).join(', ');
}

function handEl(specs, opts = {}) {
  const wrap = el('div', { class: 'hand' + (opts.size ? ' hand-' + opts.size : ''), role: 'img', 'aria-label': opts.label || ('Hand: ' + describeGroups(specs)) });
  for (const g of specs) {
    const group = el('span', { class: 'group', 'aria-hidden': 'true' });
    for (const typeId of groupTiles(g)) group.appendChild(tileEl(typeId, { caption: 'never' }));
    wrap.appendChild(group);
  }
  return wrap;
}

function notationEl(segments) {
  return el('p', { class: 'notation', 'aria-label': 'Card-style notation: ' + segments.map((s) => s[0]).join(' ') },
    segments.map(([text, color]) => el('span', { class: 'n-' + color, 'aria-hidden': 'true', text })));
}

function felt(children, opts = {}) {
  return el('div', { class: 'felt' + (opts.className ? ' ' + opts.className : '') }, children);
}

function zone(label, content, extra) {
  return el('section', { class: 'zone' }, [
    label ? el('h3', { class: 'zone-label' }, [label, extra ? el('span', { class: 'zone-extra', text: extra }) : null]) : null,
    content
  ]);
}

/* ------------------ progress ------------------ */

function recordAnswer(id, ok) {
  state.progress.answers[id] = ok;
  saveProgress();
}

function modeStats(modeKey) {
  const list = scenariosForMode(modeKey);
  const right = list.filter((s) => state.progress.answers[s.id] === true).length;
  const tried = list.filter((s) => s.id in state.progress.answers).length;
  return { total: list.length, right, tried };
}

function overallStats() {
  const quizIds = ALL_SCENARIOS.map((s) => s.id);
  const right = quizIds.filter((id) => state.progress.answers[id] === true).length;
  const tried = quizIds.filter((id) => id in state.progress.answers).length;
  const lessons = LESSONS.filter((l) => state.progress.lessons[l.id]).length;
  return { right, tried, total: quizIds.length, lessons, lessonTotal: LESSONS.length };
}

function nextLesson() {
  return LESSONS.find((l) => !state.progress.lessons[l.id]) || null;
}

/* ------------------ routing ------------------ */

const LEGACY = {
  tiles: '#/practice/tiles', rack: '#/practice/rack', charleston: '#/practice/charleston',
  call: '#/practice/call', joker: '#/practice/joker', error: '#/practice/error', pattern: '#/hands/mine'
};

function parseRoute(hash) {
  const parts = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  const [a, b] = parts;
  if (a && LEGACY[a] && !b) return { redirect: LEGACY[a] };
  switch (a) {
    case undefined:
    case 'home': return { name: 'home', tab: 'home', width: 'wide' };
    case 'learn':
      if (b && getLesson(b)) return { name: 'lesson', tab: 'learn', param: b, parent: { href: '#/learn', label: 'Learn' } };
      return { name: 'learn', tab: 'learn', width: 'wide' };
    case 'glossary': return { name: 'glossary', tab: 'learn', parent: { href: '#/learn', label: 'Learn' } };
    case 'practice':
      if (b === 'sandbox') return { name: 'sandbox', tab: 'practice', parent: { href: '#/practice', label: 'Practice' } };
      if (b === 'mixed' || (b && getMode(b))) return { name: 'quiz', tab: 'practice', param: b, parent: { href: '#/practice', label: 'Practice' } };
      return { name: 'practice', tab: 'practice', width: 'wide' };
    case 'hands':
      if (b === 'mine') return { name: 'mine', tab: 'hands', parent: { href: '#/hands', label: 'Hands' } };
      if (b && getFamily(b)) return { name: 'family', tab: 'hands', param: b, parent: { href: '#/hands', label: 'Hands' } };
      return { name: 'hands', tab: 'hands', width: 'wide' };
    case 'settings': return { name: 'settings', tab: 'settings' };
    default: return { redirect: '#/home' };
  }
}

const VIEWS = {
  home: viewHome, learn: viewLearn, lesson: viewLesson, glossary: viewGlossary,
  practice: viewPractice, quiz: viewQuiz, sandbox: viewSandbox,
  hands: viewHands, family: viewFamily, mine: viewMine, settings: viewSettings
};

function updateShell(route, title) {
  document.querySelectorAll('.tab').forEach((a) => {
    if (a.dataset.tab === route.tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  const back = document.getElementById('back-link');
  const brand = document.getElementById('brand');
  if (route.parent) {
    back.hidden = false;
    back.href = route.parent.href;
    back.querySelector('.back-label').textContent = route.parent.label;
    brand.classList.add('is-secondary');
  } else {
    back.hidden = true;
    brand.classList.remove('is-secondary');
  }
  mainEl.dataset.width = route.width || 'narrow';
  document.title = title ? `${title} · Mah Jongg Practice` : 'Mah Jongg Practice';
}

// Re-render the current view. `focusKey` restores focus to a matching control.
function render(opts = {}) {
  const route = state.route;
  const node = VIEWS[route.name](route.param);
  viewEl.textContent = '';
  viewEl.appendChild(node);
  const h1 = viewEl.querySelector('h1');
  updateShell(route, h1 ? h1.textContent : '');
  if (opts.focusKey) {
    const target = viewEl.querySelector(`[data-key="${opts.focusKey}"]`);
    if (target) {
      target.focus({ preventScroll: !opts.scroll });
      if (opts.scroll) target.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  }
}

function navigate(hash) {
  if (window.location.hash === hash) onRouteChange(false);
  else window.location.hash = hash;
}

function onRouteChange(initial) {
  const route = parseRoute(window.location.hash);
  if (route.redirect) { window.location.replace(route.redirect); return; }
  const changed = !state.route || state.route.name !== route.name || state.route.param !== route.param;
  if (changed) state.message = '';
  state.route = route;
  render();
  if (changed && !initial) {
    window.scrollTo(0, 0);
    viewEl.classList.remove('view-enter');
    void viewEl.offsetWidth;
    viewEl.classList.add('view-enter');
    const h = viewEl.querySelector('h1');
    if (h) h.focus({ preventScroll: true });
  }
}

/* ------------------ Home ------------------ */

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function viewHome() {
  const s = overallStats();
  const next = nextLesson();
  const frag = document.createDocumentFragment();

  const nextNum = next ? LESSONS.indexOf(next) + 1 : 0;
  const cta = next
    ? el('a', { class: 'hero-cta', href: '#/learn/' + next.id }, [
      el('span', { class: 'hero-cta-text' }, [
        el('span', { class: 'hero-cta-kicker', text: nextNum === 1 ? 'Start here · Lesson 1' : `Up next · Lesson ${nextNum}` }),
        el('span', { class: 'hero-cta-title', text: next.title })
      ]),
      el('span', { class: 'hero-cta-arrow', 'aria-hidden': 'true' }, [ic('arrowRight')])
    ])
    : btn('Start a mixed review', { variant: 'light', href: '#/practice/mixed', icon: 'arrowRight', iconAfter: true });

  frag.appendChild(el('section', { class: 'hero' }, [
    el('div', { class: 'hero-tiles', 'aria-hidden': 'true' }, [
      tileEl('dragon-red', { caption: 'never' }), tileEl('dots-5', { caption: 'never' }), tileEl('joker', { caption: 'never' })
    ]),
    el('div', { class: 'hero-text' }, [
      el('p', { class: 'hero-eyebrow', text: greeting() }),
      el('h1', { tabindex: '-1', text: 'Ready for a little Mah Jongg?' }),
      el('p', { class: 'hero-lede', text: 'Learn the game one short lesson at a time, then practice at your own pace. Nothing is timed.' }),
      cta
    ])
  ]));

  frag.appendChild(el('div', { class: 'stats' }, [
    stat(`${s.lessons}/${s.lessonTotal}`, 'Lessons done'),
    stat(String(s.right), 'Questions right'),
    stat(s.tried ? Math.round((s.right / s.tried) * 100) + '%' : '—', 'Accuracy')
  ]));

  const upcoming = LESSONS.filter((l) => !state.progress.lessons[l.id]).slice(0, 3);
  frag.appendChild(sectionHead(upcoming.length ? 'Your next lessons' : 'Lessons', { href: '#/learn', label: 'All lessons' }));
  if (upcoming.length) {
    frag.appendChild(el('ul', { class: 'list-card' }, upcoming.map((l) => lessonRow(l))));
  } else {
    frag.appendChild(callout('tip', 'Every lesson complete!', 'Wonderful work. Keep your skills sharp with a **Mixed Review** or the **Best Move** strategy drills.'));
  }

  frag.appendChild(sectionHead('Quick practice', { href: '#/practice', label: 'All practice' }));
  frag.appendChild(el('ul', { class: 'card-grid' }, [
    modeCard({ key: 'mixed', icon: 'shuffle', title: 'Mixed Review', blurb: 'Ten questions from everything you’ve learned.' }, '#/practice/mixed', true),
    modeCard(getMode('strategy')),
    modeCard(getMode('family')),
    modeCard(getMode('away'))
  ]));

  frag.appendChild(sectionHead('Tip of the day'));
  frag.appendChild(callout('tip', null, tipOfTheDay()));
  frag.appendChild(fineprint());
  return frag;
}

function stat(num, label) {
  return el('div', { class: 'stat' }, [el('span', { class: 'stat-num', text: num }), el('span', { class: 'stat-label', text: label })]);
}

/* ------------------ Learn ------------------ */

function lessonRow(l) {
  const n = LESSONS.indexOf(l) + 1;
  const done = !!state.progress.lessons[l.id];
  return el('li', {}, [
    el('a', { class: 'row-link', href: '#/learn/' + l.id }, [
      el('span', { class: 'row-badge' + (done ? ' is-done' : ''), 'aria-hidden': 'true' }, [done ? ic('check') : String(n)]),
      el('span', { class: 'row-text' }, [
        el('span', { class: 'row-title', text: l.title }),
        el('span', { class: 'row-meta', text: `${l.minutes} min · ${done ? 'Completed' : l.summary}` })
      ]),
      ic('chevron', 'row-chevron'),
      done ? el('span', { class: 'visually-hidden', text: ' (completed)' }) : null
    ])
  ]);
}

function viewLearn() {
  const s = overallStats();
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHead('Learn', 'Lessons', 'Short lessons that build on each other. Start at the top, or jump to whatever you’re curious about.'));
  frag.appendChild(el('div', { class: 'progress-card' }, [
    el('div', { class: 'progress-card-top' }, [
      el('span', { text: 'Your course progress' }),
      el('strong', { text: `${s.lessons} of ${s.lessonTotal}` })
    ]),
    meter(s.lessons, s.lessonTotal, 'Lessons completed')
  ]));
  for (const sec of LESSON_SECTIONS) {
    frag.appendChild(sectionHead(sec.title));
    frag.appendChild(el('ul', { class: 'list-card' }, LESSONS.filter((l) => l.section === sec.id).map(lessonRow)));
  }
  frag.appendChild(sectionHead('Reference'));
  frag.appendChild(el('ul', { class: 'list-card' }, [
    linkRow('#/glossary', 'book', 'Glossary', 'Every Mah Jongg term in plain English'),
    linkRow('#/hands', 'layers', 'Hand families guide', 'What each section of the card is about')
  ]));
  return frag;
}

function linkRow(href, iconName, title, meta) {
  return el('li', {}, [
    el('a', { class: 'row-link', href }, [
      el('span', { class: 'row-badge row-badge-icon', 'aria-hidden': 'true' }, [ic(iconName)]),
      el('span', { class: 'row-text' }, [el('span', { class: 'row-title', text: title }), el('span', { class: 'row-meta', text: meta })]),
      ic('chevron', 'row-chevron')
    ])
  ]);
}

function renderBlock(b) {
  switch (b.type) {
    case 'p': return el('p', {}, [rich(b.text)]);
    case 'h': return el('h2', { text: b.text });
    case 'list': return el('ul', { class: 'bullets' }, b.items.map((t) => el('li', {}, [rich(t)])));
    case 'steps': return el('ol', { class: 'steps' }, b.items.map((t) => el('li', {}, [rich(t)])));
    case 'tiles': return felt([tileRow(b.tiles, { caption: true })], { className: 'felt-compact' });
    case 'hand': return el('figure', { class: 'figure' }, [
      felt([handEl(b.groups)]),
      b.caption ? el('figcaption', { text: b.caption }) : null
    ]);
    case 'notation': return el('figure', { class: 'figure' }, [
      notationEl(b.segments),
      b.caption ? el('figcaption', { text: b.caption }) : null
    ]);
    case 'callout': return callout(b.tone, b.title, b.text);
    case 'table': return el('div', { class: 'table-wrap' }, [
      el('table', {}, [
        el('thead', {}, [el('tr', {}, b.head.map((h) => el('th', { scope: 'col', text: h })))]),
        el('tbody', {}, b.rows.map((r) => el('tr', { class: r[1] === '' ? 'table-sub' : null }, r.map((c, i) => el('td', { colspan: r[1] === '' && i === 0 ? '2' : null }, [rich(c)])).filter((_, i) => !(r[1] === '' && i === 1)))))
      ])
    ]);
    case 'dodont': return el('div', { class: 'dodont' }, [
      el('div', { class: 'dd dd-do' }, [el('p', { class: 'dd-title' }, [ic('check'), 'Do']), el('ul', {}, b.do.map((t) => el('li', {}, [rich(t)])))]),
      el('div', { class: 'dd dd-dont' }, [el('p', { class: 'dd-title' }, [ic('x'), 'Avoid']), el('ul', {}, b.dont.map((t) => el('li', {}, [rich(t)])))])
    ]);
    case 'families': return el('ul', { class: 'family-chips' }, FAMILIES.map((f) => el('li', {}, [
      el('a', { href: '#/hands/' + f.id, class: 'family-chip' }, [el('strong', { text: f.name }), el('span', { text: f.short })])
    ])));
    case 'groups': return el('ul', { class: 'group-list' }, GROUP_NAMES.map((g) => el('li', { class: 'group-item' }, [
      el('div', { class: 'group-item-head' }, [
        el('strong', { text: g.name }),
        el('span', { class: 'chip ' + (g.jokers ? 'chip-ok' : 'chip-bad') }, [ic(g.jokers ? 'check' : 'x', 'ic-sm'), g.jokers ? 'Jokers OK' : 'No Jokers'])
      ]),
      felt([tileRow(g.tiles, { caption: 'never' })], { className: 'felt-compact' }),
      el('p', { text: g.note })
    ])));
    default: return null;
  }
}

function viewLesson(id) {
  const lesson = getLesson(id);
  const i = LESSONS.indexOf(lesson);
  const done = !!state.progress.lessons[id];
  const next = LESSONS[i + 1];
  const prev = LESSONS[i - 1];
  const frag = document.createDocumentFragment();
  const article = el('article', { class: 'lesson' });
  article.appendChild(pageHead(`Lesson ${i + 1} of ${LESSONS.length} · ${lesson.minutes} min`, lesson.title, lesson.summary));
  for (const b of lesson.blocks) { const n = renderBlock(b); if (n) article.appendChild(n); }

  const practiceMode = lesson.practice ? getMode(lesson.practice) : null;
  const finish = () => {
    state.progress.lessons[id] = true;
    saveProgress();
    announce(`Lesson complete: ${lesson.title}.`);
    navigate(next ? '#/learn/' + next.id : '#/learn');
  };
  article.appendChild(el('div', { class: 'lesson-end' }, [
    el('p', { class: 'lesson-end-title', text: done ? 'You’ve completed this lesson.' : 'Finished reading?' }),
    el('div', { class: 'actions' }, [
      practiceMode ? btn(`Practice: ${practiceMode.title}`, { href: '#/practice/' + practiceMode.key, icon: practiceMode.icon }) : null,
      done
        ? btn(next ? 'Next lesson' : 'Back to lessons', { variant: 'primary', href: next ? '#/learn/' + next.id : '#/learn', icon: 'arrowRight', iconAfter: true })
        : btn(next ? 'Mark complete & continue' : 'Mark complete', { variant: 'primary', onClick: finish, icon: 'check' })
    ])
  ]));
  article.appendChild(el('nav', { class: 'pager', 'aria-label': 'Lessons' }, [
    prev ? el('a', { class: 'pager-link', href: '#/learn/' + prev.id }, [ic('back'), el('span', {}, [el('small', { text: 'Previous' }), prev.title])]) : el('span'),
    next ? el('a', { class: 'pager-link pager-next', href: '#/learn/' + next.id }, [el('span', {}, [el('small', { text: 'Next' }), next.title]), ic('chevron')]) : el('span')
  ]));
  frag.appendChild(article);
  return frag;
}

function viewGlossary() {
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHead('Reference', 'Glossary', 'Every term you’ll hear at the table, in plain English.'));
  const list = el('dl', { class: 'glossary' });
  const items = GLOSSARY.map(([term, def]) => {
    const item = el('div', { class: 'gloss-item' }, [el('dt', { text: term }), el('dd', { text: def })]);
    item.dataset.search = (term + ' ' + def).toLowerCase();
    list.appendChild(item);
    return item;
  });
  const empty = el('p', { class: 'empty', text: 'No terms match that search.', hidden: true });
  const input = el('input', {
    type: 'search', id: 'gloss-search', class: 'input', placeholder: 'Try “pung” or “Joker”', autocomplete: 'off',
    oninput: (e) => {
      const q = e.target.value.trim().toLowerCase();
      let shown = 0;
      for (const it of items) { const hit = !q || it.dataset.search.includes(q); it.hidden = !hit; if (hit) shown++; }
      empty.hidden = shown > 0;
    }
  });
  frag.appendChild(el('div', { class: 'search' }, [el('label', { for: 'gloss-search', class: 'field-label', text: 'Search terms' }), el('div', { class: 'search-box' }, [ic('search'), input])]));
  frag.appendChild(list);
  frag.appendChild(empty);
  return frag;
}

/* ------------------ Practice hub ------------------ */

function modeCard(mode, href, featured) {
  const s = mode.key === 'mixed' ? null : modeStats(mode.key);
  return el('li', {}, [
    el('a', { class: 'mode-card' + (featured ? ' is-featured' : ''), href: href || '#/practice/' + mode.key }, [
      el('span', { class: 'mode-icon', 'aria-hidden': 'true' }, [ic(mode.icon)]),
      el('span', { class: 'mode-body' }, [
        el('span', { class: 'mode-title', text: mode.title }),
        el('span', { class: 'mode-blurb', text: mode.blurb }),
        s ? el('span', { class: 'mode-progress' }, [
          meter(s.right, s.total, `${mode.title}: ${s.right} of ${s.total} correct`),
          el('span', { class: 'mode-count', text: `${s.right}/${s.total}` })
        ]) : null
      ]),
      ic('chevron', 'mode-chevron')
    ])
  ]);
}

function viewPractice() {
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHead('Practice', 'Practice', 'Short sets of questions with an explanation after every answer. Take as long as you like.'));
  frag.appendChild(el('ul', { class: 'card-grid card-grid-single' }, [
    modeCard({ key: 'mixed', icon: 'shuffle', title: 'Mixed Review', blurb: 'Ten questions drawn from every topic, favoring ones you haven’t mastered yet.' }, '#/practice/mixed', true)
  ]));
  frag.appendChild(sectionHead('Rules'));
  frag.appendChild(el('ul', { class: 'card-grid' }, MODES.filter((m) => m.group === 'rules').map((m) => modeCard(m))));
  frag.appendChild(sectionHead('Strategy'));
  frag.appendChild(el('ul', { class: 'card-grid' }, MODES.filter((m) => m.group === 'strategy').map((m) => modeCard(m))));
  frag.appendChild(sectionHead('Tools'));
  frag.appendChild(el('ul', { class: 'card-grid' }, [
    modeCard({ key: 'mixed', icon: 'grid', title: 'Rack Builder', blurb: 'Build or deal a rack and see which families it leans toward.' }, '#/practice/sandbox'),
    modeCard({ key: 'mixed', icon: 'pencil', title: 'My Own Hands', blurb: 'Enter hands from your own card and practice them.' }, '#/hands/mine')
  ]));
  return frag;
}

/* ------------------ Quiz engine ------------------ */

const DIFFICULTY = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function scenarioById(id) { return ALL_SCENARIOS.find((s) => s.id === id); }

function startQuiz(modeKey) {
  let ids;
  if (modeKey === 'mixed') {
    const pool = ALL_SCENARIOS.filter((s) => REVIEW_MODES.includes(s.mode));
    const weighted = pool.map((s) => ({ id: s.id, w: (state.progress.answers[s.id] === true ? 1 : 0) + Math.random() }));
    ids = weighted.sort((a, b) => a.w - b.w).slice(0, 10).map((x) => x.id);
  } else {
    ids = scenariosForMode(modeKey).map((s) => s.id);
  }
  state.quiz = { mode: modeKey, ids, index: 0, responses: {}, hints: {}, order: {}, selected: [], done: false };
}

function yesNo(correctYes) {
  return {
    options: [
      { id: 'yes', label: 'Yes, that’s allowed' },
      { id: 'no', label: 'No, it’s not allowed' }
    ],
    correctId: correctYes ? 'yes' : 'no',
    ordered: true
  };
}

// Each builder returns { context, options, correctId, judge(choiceId) }.
const BUILDERS = {
  tiles(scn) {
    return {
      context: [felt([el('div', { class: 'solo-tile' }, [tileEl(scn.state.tile, { size: 'xl', caption: 'never' })])])],
      options: scn.answer.choices.map((c) => ({ id: c, label: getTileType(c).displayName })),
      correctId: scn.answer.correct[0],
      judge: (c) => ({ ok: scn.answer.correct.includes(c), body: scn.explanation })
    };
  },
  rack(scn) {
    const yn = yesNo(scn.answer.correct);
    return {
      context: [felt([zone('The rack', tileRow(hydrate(scn.state.rack, scn.id)), `${scn.state.rack.length} tiles`)])],
      ...yn,
      judge: (c) => ({ ok: c === yn.correctId, body: scn.explanation })
    };
  },
  call(scn) {
    const rack = hydrate(scn.state.rack, scn.id);
    const discard = hydrate([scn.state.discard], scn.id + 'd')[0];
    const res = canCallDiscard({
      rack, discard, targetGroupSize: scn.state.targetGroupSize, handIsConcealed: scn.state.handIsConcealed,
      cardAllowsJoker: scn.state.cardAllowsJoker, forMahjong: scn.state.forMahjong
    });
    const yn = yesNo(res.ok);
    return {
      context: [
        felt([
          zone('Just discarded', el('div', { class: 'solo-tile' }, [tileEl(discard.typeId, { size: 'lg', caption: 'auto' })])),
          zone('Your rack', tileRow(sortRack(rack)))
        ]),
        scn.state.handIsConcealed ? callout('info', null, 'This hand must be kept **concealed**.') : null
      ],
      ...yn,
      judge: (c) => ({ ok: c === yn.correctId, lead: res.message, body: scn.explanation, ruleClass: res.ruleClass })
    };
  },
  joker(scn) {
    const isExchange = !!scn.state.exposure;
    const tiles = hydrate(isExchange ? scn.state.exposure : scn.state.group, scn.id);
    let res;
    if (isExchange) {
      res = validateJokerExchange({ exposure: tiles, offeredTile: hydrate([scn.state.offered], scn.id + 'o')[0], turnPhase: scn.state.turnPhase });
    } else {
      const g = classifyGroup(tiles);
      res = g.jokerCount > 0
        ? isJokerAllowedInGroup({ groupSize: g.size, cardAllowsJoker: scn.state.cardAllowsJoker })
        : validateExposure(tiles, { cardAllowsJoker: scn.state.cardAllowsJoker });
    }
    const yn = yesNo(res.ok);
    const zones = [zone(isExchange ? 'The exposure on the table' : 'The group', tileRow(tiles))];
    if (isExchange) zones.push(zone('The tile you offer', tileRow([scn.state.offered])));
    return {
      context: [
        felt(zones),
        !isExchange && scn.state.cardAllowsJoker === false ? callout('info', null, 'The hand being played **does not permit Jokers** at all.') : null
      ],
      ...yn,
      judge: (c) => ({ ok: c === yn.correctId, lead: res.message, body: scn.explanation, ruleClass: res.ruleClass })
    };
  },
  error(scn) {
    const exposures = (scn.state.exposures || []).map((e, i) => ({ tiles: hydrate(e.tiles, scn.id + 'e' + i), cardAllowsJoker: e.cardAllowsJoker }));
    const zones = [];
    exposures.forEach((e, i) => zones.push(zone(i === 0 ? 'Exposures' : null, tileRow(e.tiles, { className: 'is-exposure' }))));
    zones.push(zone('The rack', tileRow(sortRack(hydrate(scn.state.rack, scn.id))), `${scn.state.rack.length} tiles`));
    if (scn.state.discards) zones.push(zone('Discarded', tileRow(scn.state.discards)));
    const engine = detectIllegalState({
      rack: hydrate(scn.state.rack, scn.id), exposures,
      discards: scn.state.discards ? hydrate(scn.state.discards, scn.id + 'x') : [],
      jokerWasClaimed: !!scn.state.jokerWasClaimed, phase: scn.state.phase
    });
    return {
      context: [felt(zones)],
      options: scn.answer.choices.map((code) => ({ id: code, label: ERROR_LABELS[code] || code })),
      correctId: scn.answer.correct[0],
      judge: (c) => ({ ok: scn.answer.correct.includes(c), body: scn.explanation, details: engine.issues.map((i) => i.message) })
    };
  },
  family(scn) {
    return {
      context: [felt([handEl(scn.state.groups)])],
      options: scn.answer.choices.map((id) => ({ id, label: getFamily(id).name })),
      correctId: scn.answer.correct,
      judge: (c) => ({ ok: c === scn.answer.correct, body: scn.explanation, link: { href: '#/hands/' + scn.answer.correct, label: `Read about ${getFamily(scn.answer.correct).name}` } })
    };
  },
  away(scn) {
    const rack = hydrate(scn.state.rack, scn.id);
    const res = tilesAway(rack, normalizeGroups(scn.state.target), { cardAllowsJoker: scn.state.cardAllowsJoker });
    const needs = res.missing.map((m) => `${m.count} × ${describeTile(m.typeId)}`);
    const summary = res.away === 0
      ? 'You already have every tile.'
      : `You still need: ${needs.join('; ')}.` + (res.jokersUsed ? ` Your ${res.jokersUsed === 1 ? 'Joker covers' : res.jokersUsed + ' Jokers cover'} ${res.jokersUsed} of those, so you are ${res.away} away.` : '');
    return {
      context: [felt([
        zone('The hand you’re playing', handEl(scn.state.target), scn.state.cardAllowsJoker === false ? 'No Jokers' : 'Jokers allowed'),
        zone('Your rack', tileRow(sortRack(rack)), `${rack.length} tiles`)
      ])],
      options: scn.answer.choices.map((n) => ({ id: n, label: n === '1' ? '1 tile away' : n === '0' ? 'Complete — 0 away' : `${n} tiles away` })),
      correctId: String(res.away),
      ordered: true,
      judge: (c) => ({ ok: c === String(res.away), lead: summary, body: scn.explanation })
    };
  },
  strategy(scn) {
    const st = scn.state;
    const zones = [];
    if (st.target) zones.push(zone('The hand you’re playing', handEl(st.target)));
    if (st.exposures) {
      st.exposures.forEach((e) => zones.push(zone(e.label || null, tileRow(e.tiles, { className: 'is-exposure' }))));
    }
    if (st.discards) zones.push(zone('Already discarded', tileRow(st.discards)));
    if (st.discard) zones.push(zone('Just discarded', el('div', { class: 'solo-tile' }, [tileEl(st.discard, { size: 'lg', caption: 'auto' })])));
    if (st.rack) zones.push(zone('Your rack', tileRow(sortRack(hydrate(st.rack, scn.id))), `${st.rack.length} tiles`));
    const opts = scn.answer.options;
    const best = opts.find((o) => o.id === scn.answer.correct);
    return {
      situation: st.situation,
      context: [felt(zones)],
      options: opts.map((o) => ({ id: o.id, label: o.label, tiles: o.tiles })),
      correctId: scn.answer.correct,
      judge: (c) => {
        const chosen = opts.find((o) => o.id === c);
        return {
          ok: c === scn.answer.correct,
          lead: chosen.why,
          body: scn.explanation,
          best: c === scn.answer.correct ? null : `The best answer: ${best.label}. ${best.why}`
        };
      }
    };
  }
};

const ERROR_LABELS = {
  RACK_TOO_MANY: 'There are too many tiles.',
  RACK_TOO_FEW: 'There are too few tiles.',
  EXCESS_COPIES: 'There are more copies of a tile than the set contains.',
  JOKER_IN_PAIR: 'A Joker is being used in a pair.',
  JOKER_IN_SINGLE: 'A Joker is being used as a single.',
  GROUP_MIXED_TYPES: 'An exposure has tiles that aren’t all the same.',
  JOKER_DISCARD_DEAD: 'A discarded Joker was picked up.',
  CALL_FOR_PAIR_ILLEGAL: 'A discard was called to make a pair.',
  EXCHANGE_TILE_MISMATCH: 'A Joker was exchanged for the wrong tile.',
  PATTERN_NOT_MATCHED: 'The hand doesn’t match the pattern.'
};

function answerQuestion(scn, choiceId, result) {
  const q = state.quiz;
  q.responses[scn.id] = { choice: choiceId, ...result };
  recordAnswer(scn.id, result.ok);
  render({ focusKey: 'feedback', scroll: true });
  announce((result.ok ? 'Correct. ' : 'Not quite. ') + [result.lead, result.body].filter(Boolean).join(' '));
}

function viewQuiz(modeKey) {
  if (!state.quiz || state.quiz.mode !== modeKey) startQuiz(modeKey);
  const q = state.quiz;
  if (q.done) return viewQuizSummary();
  const scn = scenarioById(q.ids[q.index]);
  const mode = getMode(scn.mode);
  const title = modeKey === 'mixed' ? 'Mixed Review' : mode.title;
  const resp = q.responses[scn.id];
  const frag = document.createDocumentFragment();

  frag.appendChild(el('header', { class: 'quiz-head' }, [
    el('div', { class: 'quiz-head-row' }, [
      el('h1', { tabindex: '-1', class: 'quiz-title', text: title }),
      el('span', { class: 'quiz-count', text: `${q.index + 1} of ${q.ids.length}` })
    ]),
    el('div', { class: 'qprogress', 'aria-hidden': 'true' }, q.ids.map((id, i) => {
      const r = q.responses[id];
      return el('span', { class: r ? (r.ok ? 'is-ok' : 'is-bad') : i === q.index ? 'is-current' : '' });
    }))
  ]));

  const meta = el('div', { class: 'q-meta' }, [
    el('span', { class: 'chip', text: DIFFICULTY[scn.difficulty] || 'Practice' }),
    modeKey === 'mixed' ? el('span', { class: 'chip chip-soft' }, [ic(mode.icon, 'ic-sm'), mode.title]) : null
  ]);

  if (scn.mode === 'charleston') {
    frag.appendChild(viewCharlestonQuestion(scn, meta, resp));
  } else {
    const built = BUILDERS[scn.mode](scn);
    const section = el('section', { class: 'question', 'aria-labelledby': 'q-prompt' }, [
      meta,
      built.situation ? el('p', { class: 'situation', text: built.situation }) : null,
      el('h2', { class: 'q-prompt', id: 'q-prompt', text: scn.prompt }),
      ...built.context
    ]);
    frag.appendChild(section);

    // Shuffle answer order once per session so the answer isn't always first.
    if (!built.ordered) {
      if (!q.order[scn.id]) q.order[scn.id] = shuffle(built.options.map((o) => o.id));
      built.options.sort((a, b) => q.order[scn.id].indexOf(a.id) - q.order[scn.id].indexOf(b.id));
    }
    const two = built.options.every((o) => !o.tiles && o.label.length < 34);
    const opts = el('div', { class: 'options' + (two ? ' options-two' : ''), role: 'group', 'aria-label': 'Answer choices' });
    built.options.forEach((o, i) => {
      let cls = 'option';
      if (resp) {
        if (o.id === built.correctId) cls += ' is-correct';
        else if (o.id === resp.choice) cls += ' is-wrong';
        else cls += ' is-dim';
      }
      opts.appendChild(el('button', {
        type: 'button', class: cls, disabled: !!resp, 'data-key': 'opt-' + o.id,
        onclick: () => answerQuestion(scn, o.id, built.judge(o.id))
      }, [
        el('span', { class: 'option-letter', 'aria-hidden': 'true' }, [
          resp && o.id === built.correctId ? ic('check') : resp && o.id === resp.choice ? ic('x') : LETTERS[i]
        ]),
        el('span', { class: 'option-body' }, [
          el('span', { class: 'option-label', text: o.label }),
          o.tiles ? el('span', { class: 'option-tiles', 'aria-hidden': 'true' }, o.tiles.map((t) => tileEl(t, { size: 'xs', caption: 'never' }))) : null
        ]),
        resp && o.id === built.correctId ? el('span', { class: 'visually-hidden', text: ' (correct answer)' }) : null,
        resp && o.id === resp.choice && o.id !== built.correctId ? el('span', { class: 'visually-hidden', text: ' (your answer)' }) : null
      ]));
    });
    frag.appendChild(opts);
  }

  if (!resp && state.settings.showHints && scn.hint) {
    if (q.hints[scn.id]) frag.appendChild(callout('tip', 'Hint', scn.hint));
    else frag.appendChild(el('div', { class: 'hint-row' }, [btn('Show a hint', {
      variant: 'ghost', icon: 'bulb', key: 'hint',
      onClick: () => { q.hints[scn.id] = true; render(); announce('Hint: ' + scn.hint); }
    })]));
  }

  if (resp) frag.appendChild(feedbackPanel(scn, resp));
  frag.appendChild(quizNav(q, resp));
  return frag;
}

function feedbackPanel(scn, r) {
  const q = state.quiz;
  return el('section', { class: 'feedback ' + (r.ok ? 'is-ok' : 'is-bad'), tabindex: '-1', 'data-key': 'feedback', 'aria-labelledby': 'fb-title' }, [
    el('div', { class: 'feedback-head' }, [
      el('span', { class: 'feedback-icon', 'aria-hidden': 'true' }, [ic(r.ok ? 'check' : 'x')]),
      el('h2', { id: 'fb-title', text: r.ok ? 'Correct!' : 'Not quite' })
    ]),
    r.lead ? el('p', { class: 'feedback-lead' }, [rich(r.lead)]) : null,
    r.best ? el('p', { class: 'feedback-best' }, [rich(r.best)]) : null,
    el('p', {}, [rich(r.body)]),
    r.details && r.details.length ? el('div', { class: 'feedback-details' }, [
      el('p', { class: 'feedback-details-title', text: 'What the rules checker found:' }),
      el('ul', {}, r.details.map((d) => el('li', { text: d })))
    ]) : null,
    r.strategyNote ? callout('tip', 'Strategy note', r.strategyNote) : null,
    r.ruleClass === RULE_CLASS.CONVENTION ? callout('custom', 'This varies by table', 'Ask your group how they play this point.') : null,
    el('div', { class: 'feedback-actions' }, [
      r.link ? el('a', { class: 'text-link', href: r.link.href }, [r.link.label, ic('chevron', 'ic-sm')]) : null,
      el('button', {
        type: 'button', class: 'text-link', 'data-key': 'retry',
        onclick: () => {
          delete q.responses[scn.id];
          q.selected = [];
          render();
          window.scrollTo(0, 0);
          const h = viewEl.querySelector('h1');
          if (h) h.focus({ preventScroll: true });
          announce('Try the question again.');
        }
      }, [ic('refresh', 'ic-sm'), 'Try this one again'])
    ])
  ]);
}

function quizNav(q, resp) {
  const last = q.index === q.ids.length - 1;
  const go = (delta) => {
    q.index = Math.max(0, Math.min(q.ids.length - 1, q.index + delta));
    q.selected = [];
    render();
    window.scrollTo(0, 0);
    const h = viewEl.querySelector('h1');
    if (h) h.focus({ preventScroll: true });
  };
  return el('nav', { class: 'quiz-nav' + (resp ? ' is-sticky' : ''), 'aria-label': 'Question navigation' }, [
    btn('Previous', { icon: 'back', disabled: q.index === 0, onClick: () => go(-1), key: 'prev' }),
    last
      ? btn('See results', { variant: 'primary', icon: 'award', onClick: () => { q.done = true; render(); window.scrollTo(0, 0); }, key: 'finish' })
      : btn(resp ? 'Next question' : 'Skip', { variant: resp ? 'primary' : 'secondary', icon: 'arrowRight', iconAfter: true, onClick: () => go(1), key: 'next' })
  ]);
}

function viewQuizSummary() {
  const q = state.quiz;
  const answered = q.ids.filter((id) => q.responses[id]);
  const right = answered.filter((id) => q.responses[id].ok).length;
  const pct = answered.length ? Math.round((right / answered.length) * 100) : 0;
  const title = q.mode === 'mixed' ? 'Mixed Review' : getMode(q.mode).title;
  const message = !answered.length ? 'You skipped every question — come back any time.'
    : pct === 100 ? 'A perfect score. Beautifully done!'
    : pct >= 70 ? 'Very good work. Review the ones you missed below.'
    : 'Good practice. Every mistake here is one you won’t make at the table.';
  const frag = document.createDocumentFragment();
  frag.appendChild(el('section', { class: 'summary' }, [
    el('div', { class: 'score-ring', style: `--pct:${pct}`, role: 'img', 'aria-label': `${right} of ${answered.length} correct` }, [
      el('span', { class: 'score-num', text: `${right}/${answered.length || 0}` }),
      el('span', { class: 'score-label', text: 'correct' })
    ]),
    el('p', { class: 'eyebrow', text: title }),
    el('h1', { tabindex: '-1', text: 'Set complete' }),
    el('p', { class: 'lede', text: message })
  ]));
  frag.appendChild(el('ul', { class: 'list-card' }, q.ids.map((id, i) => {
    const s = scenarioById(id);
    const r = q.responses[id];
    return el('li', {}, [el('button', {
      type: 'button', class: 'row-link',
      onclick: () => { q.done = false; q.index = i; render(); window.scrollTo(0, 0); }
    }, [
      el('span', { class: 'row-badge ' + (r ? (r.ok ? 'is-done' : 'is-miss') : ''), 'aria-hidden': 'true' }, [r ? ic(r.ok ? 'check' : 'x') : String(i + 1)]),
      el('span', { class: 'row-text' }, [
        el('span', { class: 'row-title', text: s.objective }),
        el('span', { class: 'row-meta', text: r ? (r.ok ? 'Correct' : 'Missed — tap to review') : 'Skipped' })
      ]),
      ic('chevron', 'row-chevron')
    ])]);
  })));
  frag.appendChild(el('div', { class: 'actions actions-center' }, [
    btn('Back to Practice', { href: '#/practice', icon: 'back' }),
    btn('Practice again', { variant: 'primary', icon: 'refresh', onClick: () => { startQuiz(q.mode); render(); window.scrollTo(0, 0); } })
  ]));
  return frag;
}

function viewCharlestonQuestion(scn, meta, resp) {
  const q = state.quiz;
  const rack = sortRack(hydrate(scn.state.rack, scn.id));
  const dirLabel = { right: 'to your right', across: 'across', left: 'to your left' }[scn.state.passDirection];
  meta.appendChild(el('span', { class: 'chip chip-soft' }, [ic('repeat', 'ic-sm'), `Pass ${scn.state.passIndex} · ${dirLabel}`]));
  const section = el('section', { class: 'question', 'aria-labelledby': 'q-prompt' }, [
    meta,
    el('h2', { class: 'q-prompt', id: 'q-prompt', text: scn.prompt }),
    felt([zone('Your rack — tap three tiles', tileRow(rack, {
      selected: resp ? resp.selected : q.selected,
      toggle: true,
      disabled: !!resp,
      className: 'is-selectable',
      onTileClick: (tile) => {
        const i = q.selected.indexOf(tile.instanceId);
        if (i >= 0) q.selected.splice(i, 1);
        else if (q.selected.length < 3) q.selected.push(tile.instanceId);
        else { announce('You already have three tiles chosen. Tap one to unselect it first.'); return; }
        render({ focusKey: 'tile-' + tile.instanceId });
        announce(`${describeTile(tile.typeId)} ${i >= 0 ? 'unselected' : 'selected'}. ${q.selected.length} of 3 chosen.`);
      }
    }), `${(resp ? resp.selected : q.selected).length} of 3 chosen`)])
  ]);
  const frag = document.createDocumentFragment();
  frag.appendChild(section);
  if (!resp) {
    frag.appendChild(el('div', { class: 'actions' }, [btn('Check this pass', {
      variant: 'primary', icon: 'check', key: 'check',
      onClick: () => {
        const chosen = rack.filter((t) => q.selected.includes(t.instanceId));
        const res = validateCharlestonPass(chosen, { rack, passIndex: scn.state.passIndex });
        answerQuestion(scn, 'pass', {
          ok: res.ok, selected: q.selected.slice(), lead: res.message, body: scn.explanation,
          ruleClass: res.ruleClass, strategyNote: res.ok ? scn.answer.strategyNote : null
        });
      }
    })]));
    frag.appendChild(el('p', { class: 'note', text: 'This question grades whether your pass is legal. There’s usually more than one sensible set of three to pass.' }));
  }
  return frag;
}

/* ------------------ Rack Builder ------------------ */

const PALETTE = [
  { title: 'Dots', filter: (t) => t.suit === 'dots' },
  { title: 'Bams', filter: (t) => t.suit === 'bams' },
  { title: 'Craks', filter: (t) => t.suit === 'craks' },
  { title: 'Winds & Dragons', filter: (t) => t.family === 'wind' || t.family === 'dragon' },
  { title: 'Flowers & Jokers', filter: (t) => t.family === 'flower' || t.family === 'joker' }
];

function palette(opts) {
  const wrap = el('div', { class: 'palette-wrap' });
  for (const sec of PALETTE) {
    const types = TILE_TYPES.filter(sec.filter).filter((t) => !(opts.noJokers && t.isJoker));
    if (!types.length) continue;
    wrap.appendChild(el('h3', { class: 'palette-title', text: sec.title }));
    wrap.appendChild(el('ul', { class: 'palette' }, types.map((t) => {
      const left = opts.remaining(t);
      return el('li', {}, [tileEl(t.typeId, {
        caption: 'auto', badge: opts.showBadge ? left : null,
        disabled: left <= 0 || opts.full,
        key: 'pal-' + t.typeId,
        ariaLabel: `Add ${t.accessibleLabel}` + (opts.showBadge ? `, ${left} left` : ''),
        onClick: () => opts.onAdd(t)
      })]);
    })));
  }
  return wrap;
}

function viewSandbox() {
  const rack = state.sandbox;
  const counts = countByType(rack);
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHead('Tool', 'Rack Builder', 'Build a rack tile by tile, or deal a random one, and see which hand families it leans toward.'));

  const size = validateRackSize(rack, { phase: rack.length === 14 ? 'holding' : 'resting' });
  frag.appendChild(felt([
    zone('Your rack', rack.length
      ? tileRow(sortRack(rack), {
        ariaLabelFor: (typeId) => `Remove ${describeTile(typeId)}`,
        onTileClick: (tile) => {
          state.sandbox = state.sandbox.filter((t) => t.instanceId !== tile.instanceId);
          render();
          announce(`${describeTile(tile.typeId)} removed. ${state.sandbox.length} tiles on the rack.`);
        }
      })
      : el('p', { class: 'felt-empty', text: 'Your rack is empty. Tap tiles below to add them, or deal a random rack.' }),
    `${rack.length} of 13`)
  ]));
  if (rack.length) frag.appendChild(el('p', { class: 'note note-center', text: 'Tap a tile on the rack to remove it.' }));

  frag.appendChild(el('div', { class: 'actions' }, [
    btn('Deal a random rack', {
      variant: 'primary', icon: 'dice', key: 'deal',
      onClick: () => {
        state.sandbox = shuffle(generateFullSet()).slice(0, 13);
        render({ focusKey: 'deal' });
        announce('Dealt a new rack of 13 tiles.');
      }
    }),
    btn('Clear', { icon: 'trash', disabled: !rack.length, key: 'clear', onClick: () => { state.sandbox = []; render({ focusKey: 'deal' }); announce('The rack is empty.'); } })
  ]));

  if (rack.length === 13 || rack.length === 14) frag.appendChild(callout('rule', null, size.message));

  if (rack.length >= 5) {
    const L = rackLeanings(rack);
    const top = L.leanings[0];
    const card = el('section', { class: 'card' }, [
      el('h2', { class: 'card-title', text: 'What this rack leans toward' }),
      el('ul', { class: 'bars' }, L.leanings.map((x) => el('li', { class: 'bar-row' }, [
        el('span', { class: 'bar-label', text: x.label }),
        el('span', { class: 'bar-track', 'aria-hidden': 'true' }, [el('span', { class: 'bar-fill', style: `width:${Math.round((x.count / Math.max(rack.length, 1)) * 100)}%` })]),
        el('span', { class: 'bar-count', text: `${x.count} tile${x.count === 1 ? '' : 's'}` })
      ]))),
      el('div', { class: 'chips' }, [
        el('span', { class: 'chip', text: `${L.pairs} pair${L.pairs === 1 ? '' : 's'}` }),
        el('span', { class: 'chip', text: `${L.jokers} Joker${L.jokers === 1 ? '' : 's'}` }),
        el('span', { class: 'chip', text: `${L.flowers} Flower${L.flowers === 1 ? '' : 's'}` })
      ]),
      el('p', { class: 'card-note' }, [rich(leaningAdvice(L, top))])
    ]);
    frag.appendChild(card);
  }

  frag.appendChild(sectionHead('Add tiles'));
  frag.appendChild(palette({
    showBadge: true,
    full: rack.length >= 14,
    remaining: (t) => t.maxCopies - (counts[t.typeId] || 0),
    onAdd: (t) => {
      state.sandbox = state.sandbox.concat([makeInstance(t.typeId, 'b' + (++seq))]);
      render({ focusKey: 'pal-' + t.typeId });
      announce(`${t.displayName} added. ${state.sandbox.length} tiles on the rack.`);
    }
  }));
  if (rack.length >= 14) frag.appendChild(el('p', { class: 'note note-center', text: 'A rack never holds more than 14 tiles — and 14 only while you’re about to discard.' }));
  return frag;
}

function leaningAdvice(L, top) {
  if (L.pairs >= 5 && L.jokers === 0) return `With **${L.pairs} pairs and no Jokers**, take a close look at **Singles & Pairs**.`;
  if (L.jokers >= 3) return `**${L.jokers} Jokers!** Favor hands with kongs and quints, where Jokers do the most good.`;
  if (top.count >= 6) return `This rack leans clearly toward **${top.label}** — ${top.count} tiles already fit.`;
  return `No strong direction yet. **${top.label}** leads with ${top.count} tiles; keep two or three hands in mind.`;
}

/* ------------------ Hands ------------------ */

function jokerMeter(level) {
  const words = ['Never used', 'Rarely help', 'Helpful', 'Very useful'];
  return el('span', { class: 'joker-meter', title: 'Jokers: ' + words[level] }, [
    el('span', { class: 'jm-dots', 'aria-hidden': 'true' }, [0, 1, 2].map((i) => el('span', { class: i < level ? 'on' : '' }))),
    el('span', { text: 'Jokers: ' + words[level] })
  ]);
}

function viewHands() {
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHead('Hands', 'Hand Families', 'Every card groups its hands into families. Learn what each family looks like and when to aim for it.'));
  frag.appendChild(callout('info', 'About the examples', 'Every example hand in this app is **invented for learning**. None is copied from any card — check your own card for the real hands.'));
  frag.appendChild(el('ul', { class: 'card-grid' }, FAMILIES.map((f) => el('li', {}, [
    el('a', { class: 'family-card', href: '#/hands/' + f.id }, [
      el('span', { class: 'family-card-top' }, [
        el('span', { class: 'family-name', text: f.name }),
        el('span', { class: 'chip chip-soft', text: f.difficulty })
      ]),
      el('span', { class: 'family-short', text: f.short }),
      notationEl(f.example.notation),
      jokerMeter(f.jokers)
    ])
  ]))));
  frag.appendChild(sectionHead('Your own card'));
  frag.appendChild(el('ul', { class: 'card-grid card-grid-single' }, [
    modeCard({ key: 'mixed', icon: 'pencil', title: 'My Own Hands', blurb: 'Enter hands from the card you own, then deal practice racks against them.' }, '#/hands/mine')
  ]));
  frag.appendChild(fineprint());
  return frag;
}

function viewFamily(id) {
  const f = getFamily(id);
  const i = FAMILIES.indexOf(f);
  const prev = FAMILIES[i - 1];
  const next = FAMILIES[i + 1];
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHead('Hand family', f.name, f.summary));
  frag.appendChild(el('figure', { class: 'figure' }, [
    felt([handEl(f.example.groups)]),
    notationEl(f.example.notation),
    el('figcaption', { text: 'An invented example for learning — not a hand from any card.' })
  ]));
  frag.appendChild(el('dl', { class: 'facts' }, [
    el('div', {}, [el('dt', { text: 'Numbers' }), el('dd', { text: f.numbers })]),
    el('div', {}, [el('dt', { text: 'Jokers' }), el('dd', {}, [jokerMeter(f.jokers)])]),
    el('div', {}, [el('dt', { text: 'Difficulty' }), el('dd', { text: f.difficulty })])
  ]));
  frag.appendChild(el('h2', { class: 'h2', text: 'How to spot it on your rack' }));
  frag.appendChild(el('ul', { class: 'bullets' }, f.recognize.map((t) => el('li', {}, [rich(t)]))));
  frag.appendChild(el('h2', { class: 'h2', text: 'Strategy tips' }));
  frag.appendChild(el('ul', { class: 'bullets' }, f.tips.map((t) => el('li', {}, [rich(t)]))));
  frag.appendChild(callout('warn', 'Watch out', f.watch));
  frag.appendChild(el('div', { class: 'actions' }, [btn('Quiz: Name the Family', { variant: 'primary', href: '#/practice/family', icon: 'layers' })]));
  frag.appendChild(el('nav', { class: 'pager', 'aria-label': 'Hand families' }, [
    prev ? el('a', { class: 'pager-link', href: '#/hands/' + prev.id }, [ic('back'), el('span', {}, [el('small', { text: 'Previous' }), prev.name])]) : el('span'),
    next ? el('a', { class: 'pager-link pager-next', href: '#/hands/' + next.id }, [el('span', {}, [el('small', { text: 'Next' }), next.name]), ic('chevron')]) : el('span')
  ]));
  return frag;
}

// A saved pattern is 14 typeIds; identical tiles form one group.
function patternGroups(tiles) {
  const counts = countByType(tiles.map((typeId) => ({ typeId })));
  return sortRack(Object.keys(counts).map((typeId) => ({ typeId, instanceId: typeId }))).map((t) => [t.typeId, counts[t.typeId]]);
}

function viewMine() {
  const draft = state.patternDraft;
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHead('Your card', 'My Own Hands', 'Enter a hand from the card you own. It is saved only on this device.'));

  frag.appendChild(el('section', { class: 'card' }, [
    el('h2', { class: 'card-title', text: 'Build a hand' }),
    felt([zone('Your hand', draft.length
      ? tileRow(draft.map((typeId, i) => ({ typeId, instanceId: typeId + '#p' + i })), {
        ariaLabelFor: (typeId) => `Remove ${describeTile(typeId)}`,
        onTileClick: (tile) => {
          const idx = Number(tile.instanceId.split('#p')[1]);
          state.patternDraft.splice(idx, 1);
          render();
          announce(describeTile(tile.typeId) + ' removed.');
        }
      })
      : el('p', { class: 'felt-empty', text: 'Tap tiles below to add them, in the order they appear on your card.' }),
    `${draft.length} of 14`)]),
    el('label', { class: 'field-label', for: 'pattern-name', text: 'Name this hand' }),
    el('input', { type: 'text', id: 'pattern-name', class: 'input', placeholder: 'For example: 2468, line 1', value: state.patternName || '', oninput: (e) => { state.patternName = e.target.value; } }),
    el('div', { class: 'actions' }, [
      btn('Save this hand', {
        variant: 'primary', icon: 'check', key: 'save-pattern',
        onClick: () => {
          if (state.patternDraft.length !== 14) {
            state.message = `A hand needs exactly 14 tiles. This one has ${state.patternDraft.length}.`;
            render({ focusKey: 'save-pattern' });
            announce(state.message);
            return;
          }
          const name = (state.patternName || '').trim() || ('My hand ' + (state.patterns.length + 1));
          state.patterns = state.patterns.concat([{ name, tiles: state.patternDraft.slice() }]);
          savePatterns(state.patterns);
          state.patternDraft = [];
          state.patternName = '';
          state.message = `Saved “${name}”.` + (storageWorks ? '' : ' This browser isn’t allowing saving, so it will be forgotten when you close the page.');
          render({ focusKey: 'save-pattern' });
          announce(state.message);
        }
      }),
      btn('Clear', { icon: 'trash', disabled: !draft.length, onClick: () => { state.patternDraft = []; render(); announce('Cleared.'); } })
    ]),
    state.message ? el('p', { class: 'form-message', role: 'status', text: state.message }) : null,
    el('details', { class: 'disclosure', open: true }, [
      el('summary', {}, ['Add tiles', ic('chevron', 'disclosure-icon')]),
      palette({
        noJokers: true,
        full: draft.length >= 14,
        remaining: () => 1,
        onAdd: (t) => {
          state.patternDraft.push(t.typeId);
          render({ focusKey: 'pal-' + t.typeId });
          announce(`${t.displayName} added. ${state.patternDraft.length} of 14.`);
        }
      }),
      el('p', { class: 'note', text: 'Enter real tiles only. Jokers are applied automatically when you practice: they may fill any group of three or more.' })
    ])
  ]));

  frag.appendChild(sectionHead('Saved hands'));
  if (!state.patterns.length) {
    frag.appendChild(el('p', { class: 'empty', text: 'You haven’t saved any hands yet.' }));
  }
  state.patterns.forEach((p, i) => {
    const groups = patternGroups(p.tiles);
    const deal = state.patternDeals[i];
    const card = el('section', { class: 'card' }, [
      el('h3', { class: 'card-title', text: p.name }),
      felt([handEl(groups)])
    ]);
    if (deal) {
      const res = tilesAway(deal, normalizeGroups(groups));
      card.appendChild(felt([zone('A practice deal', tileRow(sortRack(deal)), `${res.away} away`)], { className: 'felt-soft' }));
      card.appendChild(el('p', { class: 'card-note' }, [rich(res.away === 0
        ? 'This deal completes the hand already!'
        : `This deal is **${res.away} tiles away**. You’d need: ${res.missing.map((m) => `${m.count} × ${shortName(m.typeId)}`).join(', ')}` + (res.jokersUsed ? ` — with ${res.jokersUsed} Joker${res.jokersUsed > 1 ? 's' : ''} already helping.` : '.'))]));
    }
    card.appendChild(el('div', { class: 'actions' }, [
      btn(deal ? 'Deal again' : 'Deal a practice rack', {
        variant: 'primary', icon: 'dice', key: 'deal-' + i,
        onClick: () => { state.patternDeals[i] = shuffle(generateFullSet()).slice(0, 13); render({ focusKey: 'deal-' + i }); announce('Dealt a practice rack.'); }
      }),
      btn('Delete', {
        variant: 'danger-ghost', icon: 'trash',
        onClick: () => confirmDialog(`Delete “${p.name}”?`, 'This removes only this one hand.', 'Delete hand', () => {
          state.patterns = state.patterns.filter((_, k) => k !== i);
          state.patternDeals = {};
          savePatterns(state.patterns);
          render();
          announce('Hand deleted.');
        })
      })
    ]));
    frag.appendChild(card);
  });
  return frag;
}

/* ------------------ Settings ------------------ */

function switchRow(key, label, description) {
  const on = !!state.settings[key];
  return el('li', {}, [el('button', {
    type: 'button', class: 'switch-row', role: 'switch', 'aria-checked': on ? 'true' : 'false', 'data-key': 'set-' + key,
    onclick: () => {
      state.settings[key] = !state.settings[key];
      saveSettings(state.settings);
      applySettings();
      render({ focusKey: 'set-' + key });
      announce(`${label} ${state.settings[key] ? 'on' : 'off'}.`);
    }
  }, [
    el('span', { class: 'switch-text' }, [el('span', { class: 'switch-label', text: label }), el('span', { class: 'switch-desc', text: description })]),
    el('span', { class: 'switch', 'aria-hidden': 'true' })
  ])]);
}

function viewSettings() {
  const frag = document.createDocumentFragment();
  frag.appendChild(pageHead('Settings', 'Settings', 'Make the app comfortable for you. Changes save automatically.'));
  frag.appendChild(el('h2', { class: 'group-title', text: 'Display' }));
  frag.appendChild(el('ul', { class: 'list-card' }, [
    switchRow('largeText', 'Larger text', 'Makes all the writing bigger and easier to read.'),
    switchRow('highContrast', 'High contrast', 'Pure black on white with heavier outlines.'),
    switchRow('showTileNames', 'Show tile names', 'Prints a short name under tiles while you’re learning.')
  ]));
  frag.appendChild(el('h2', { class: 'group-title', text: 'Practice' }));
  frag.appendChild(el('ul', { class: 'list-card' }, [
    switchRow('showHints', 'Offer hints', 'Shows a “Show a hint” button on each question.')
  ]));
  frag.appendChild(el('h2', { class: 'group-title', text: 'Table customs' }));
  frag.appendChild(el('div', { class: 'card' }, [el('p', { class: 'card-note', text: 'Some points of play differ between groups. This app assumes a Joker may be exchanged at any point during your turn, a blind pass is offered only on the last pass of each Charleston, and the second Charleston happens only if everyone agrees. Whenever an answer depends on one of these, the app says so.' })]));

  frag.appendChild(el('h2', { class: 'group-title', text: 'Your information' }));
  const s = overallStats();
  frag.appendChild(el('div', { class: 'card' }, [
    el('p', { class: 'card-note', text: storageWorks
      ? `Your progress (${s.lessons} lessons, ${s.tried} questions answered), settings and hands are saved in this browser only. Nothing is ever sent anywhere.`
      : 'This browser isn’t allowing the app to save anything. Everything still works, but your progress and settings will be forgotten when you close the page.' }),
    el('div', { class: 'actions' }, [
      btn('Reset my progress', {
        icon: 'refresh',
        onClick: () => confirmDialog('Reset your progress?', 'This clears completed lessons and question scores. Your settings and saved hands stay.', 'Reset progress', () => {
          state.progress = { answers: {}, lessons: {} };
          state.quiz = null;
          safeStorage.remove(PROGRESS_KEY);
          render();
          announce('Progress reset.');
        })
      }),
      btn('Delete everything', {
        variant: 'danger-ghost', icon: 'trash',
        onClick: () => confirmDialog('Delete everything you’ve saved?', 'This removes your progress, settings and every hand you entered. It can’t be undone.', 'Delete everything', () => {
          [SETTINGS_KEY, PATTERNS_KEY, PROGRESS_KEY].forEach((k) => safeStorage.remove(k));
          state.patterns = [];
          state.patternDraft = [];
          state.progress = { answers: {}, lessons: {} };
          state.quiz = null;
          state.settings = loadSettings();
          applySettings();
          render();
          announce('All saved information has been deleted.');
        })
      })
    ])
  ]));
  frag.appendChild(fineprint());
  return frag;
}

/* ------------------ confirmation dialog ------------------ */

const dialog = document.getElementById('confirm-dialog');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');
let pendingAction = null;
let returnFocus = null;

function confirmDialog(title, text, okLabel, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-text').textContent = text;
  confirmOk.textContent = okLabel;
  pendingAction = onConfirm;
  returnFocus = document.activeElement;
  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
    confirmCancel.focus();
  } else {
    pendingAction = null;
    if (window.confirm(title + '\n' + text)) onConfirm();
  }
}

function closeDialog() {
  if (dialog.open) dialog.close();
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
}

confirmOk.addEventListener('click', () => {
  const action = pendingAction;
  pendingAction = null;
  closeDialog();
  if (action) action();
});
confirmCancel.addEventListener('click', () => {
  pendingAction = null;
  closeDialog();
  announce('Nothing was changed.');
});
dialog.addEventListener('cancel', () => { pendingAction = null; announce('Nothing was changed.'); });

/* ------------------ start ------------------ */

window.addEventListener('hashchange', () => onRouteChange(false));

applySettings();
if (!storageWorks) {
  const notice = document.getElementById('storage-notice');
  notice.hidden = false;
  notice.textContent = 'This browser isn’t letting the app remember anything. Everything still works — your progress will simply be forgotten when you close the page.';
}
onRouteChange(true);

// Exposed for the development test page only.
window.__mjp = { state, TABLE_CONVENTIONS, RESULT_CODES, ALL_SCENARIOS, detectIllegalState };
