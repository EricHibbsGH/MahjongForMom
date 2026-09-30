# Mah Jongg Practice

A calm, accessible app for learning American Mah Jongg: short lessons, a guide to the
hand families, strategy drills and rules practice, with progress saved on the device.
It is a teaching tool, not an online game. Plain HTML, CSS and vanilla JavaScript —
no framework, no build step, no server, no accounts, no network calls.

**This app is not affiliated with, sponsored by, or endorsed by the National Mah Jongg League.**
No annual card is reproduced, quoted, scanned or listed anywhere in this project.
Your current official card and official rulings are always the final authority.

---

## Running it

Because the app uses ES modules, it must be served over HTTP. Opening `index.html`
directly from the file system will not work.

```
cd mahjongg-practice
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

## Deploying to GitHub Pages

1. Push this folder to a repository (for example `mahjongg-practice`) on the `main` branch.
2. Keep the empty `.nojekyll` file at the repository root so Pages serves the `js/` folder untouched.
3. In the repository go to **Settings → Pages**, set **Source** to *Deploy from a branch*,
   branch `main`, folder `/ (root)`, and save.
4. The site appears at `https://<your-username>.github.io/mahjongg-practice/`.

All paths are relative, so the project sub-path works with no extra configuration.
GitHub Pages serves `.js` with the correct MIME type, so `type="module"` works as-is.
After an update, bump the `?v=` number on the stylesheet and entry script in `index.html`
if a browser seems to be holding an old copy.

## File tree

```
index.html          app shell: top bar, tab bar, live region, confirmation dialog
styles.css          design tokens, felt table, tile faces, large-text and high-contrast themes
js/data.js          tile catalog, 152-tile set generation, immutable tile utilities
js/rules.js         stable validators, tilesAway(), table conventions, result codes
js/content.js       lessons, hand families, tips, glossary (original teaching content)
js/scenarios.js     63 original practice questions across nine modes (no card hands)
js/tiles.js         realistic tile faces drawn as inline SVG
js/icons.js         one consistent outline icon set
js/app.js           routing, views, quiz engine, progress, storage facade
tests/test.html     developer test page (not linked from the app)
tests/tests.js      assertions over the engine, content and scenarios
.nojekyll           tells GitHub Pages to skip Jekyll processing
```

## What's in the app

The app has five tabs: **Home**, **Learn**, **Practice**, **Hands** and **Settings**.
On phones they sit in a bottom tab bar; on wider screens they move into the top bar.

**Learn** — 15 lessons in four sections (Getting Started, The Card, Playing the Game,
Strategy), plus a searchable glossary. Each lesson links to the practice that goes with it.

**Hands** — a guide to ten hand families (Year, 2468, Like Numbers, Addition, Quints,
Consecutive Run, 13579, Winds & Dragons, 369, Singles & Pairs), each with an invented
example hand, how to spot it on your rack, strategy tips and Joker friendliness.

**Practice**

| Mode | What it does |
|---|---|
| Mixed Review | Ten questions from every topic, favoring ones not yet answered correctly |
| Name the Tile | One large tile, four choices |
| Tiles & Racks | Set counts and rack sizes |
| Call or Pass | Rack plus one discard; may it be called? |
| Joker Rules | Singles, pairs, pungs, kongs, quints, forbidden hands, exchanges |
| Spot the Mistake | An intentionally invalid table state; identify the problem |
| Charleston Passes | Choose exactly three tiles to pass; graded on legality only |
| Name the Family | Identify the family of an invented 14-tile hand |
| Tiles Away | Count how many tiles a rack needs to finish a hand (Jokers included) |
| Best Move | Strategy: choosing a hand, Charleston passes, discards, defense, Joker exchanges |
| Rack Builder | Build or deal a rack and see which families it leans toward |
| My Own Hands | Enter hands from your own card; deal practice racks and see tiles away |

Answer order is shuffled once per session, and every answer is followed by an explanation.

## How rules are classified

Every rule this app touches falls into one of four buckets, and they are kept apart
on purpose.

**1. Verified stable — implemented in `js/rules.js`**

- The playing set is 152 tiles: 108 suit tiles (Dots, Bams, Craks, 1–9, four of each),
  16 Winds, 12 Dragons, 8 Flowers, 8 Jokers.
- Four copies exist of each numbered tile, each Wind and each Dragon. A fifth cannot exist.
- East is dealt 14 tiles; everyone else is dealt 13. A resting rack holds 13.
- A Joker may stand in only inside a grouping of three or more identical tiles
  (pung, kong, quint). Never a single, never either tile of a pair.
- A discarded Joker is dead and may never be claimed.
- A discard may be called only to complete a group of three or more, and you must
  already hold at least one real copy of the tile.
- A concealed hand makes no exposures; it may still call the final tile that
  completes the hand, for Mahjong.
- Every Charleston pass is exactly three tiles, and a Joker is never passed.
- A Joker showing in an exposure may be exchanged for the matching real tile on your turn.

**2. Table conventions — one documented object, `TABLE_CONVENTIONS` in `js/rules.js`**

- `jokerExchangeWindow` — when during your turn the exchange happens.
- `allowBlindPass` — blind passing, offered on the last pass of each Charleston round.
- `secondCharlestonRequiresUnanimity` — whether one refusal cancels the second Charleston.
- `illegalStatePenalty` — how the app reports an illegal state (it explains rather than penalises).

Whenever a result depends on one of these, the app shows a **Table custom** badge
and says the point varies between groups.

**3. Annual-card dependent — deliberately not implemented**

Which 14-tile patterns win, whether a hand is concealed or exposed, whether a hand
permits Jokers at all, point values, and suit-colour relationships. The engine never
guesses these: `cardAllowsJoker` and `handIsConcealed` must be supplied by the caller.
The only winning patterns the app can check are the ones you type in yourself.

**4. Original educational content — `js/content.js` and `js/scenarios.js`**

Lessons, family guides, prompts, hints and explanations. These are written for this
project and are never consulted by the validators. Every example hand is invented and
labelled as such; tests confirm each one is a legal 14-tile hand that belongs to its
family, and that every Tiles Away and Best Move answer agrees with the engine.

## Unresolved accuracy questions

These are flagged with `// UNRESOLVED` comments in `js/rules.js` rather than guessed at.

- **U1 — Penalties.** What exactly happens after an illegal call or exposure varies
  by table and between social and tournament play. The app detects and explains the
  illegal state; it does not assert a single penalty outcome.
- **U2 — Joker exchange timing.** The general rule is stable, but the precise moment
  within your turn is described differently in different places. Configurable.
- **U3 — Sextets.** Groups larger than a quint appear in some rulebooks but are
  card-dependent. The engine classifies sizes 1–6 generically; no scenario uses 6.
- **U4 — Calling for Mahjong on a concealed hand.** Implemented as: no exposures at
  any point, but the final completing discard may be called.

## Source notes

Rule behaviour was checked against publicly available explanations of American Mah
Jongg play — general rulebooks and teaching sites covering tile-set composition,
Joker restrictions, the Charleston sequence and the deal. Nothing was copied: all
wording here and in the app is original, and no annual card content of any kind is
included. Where sources disagreed or were silent, the point was left unresolved
above rather than invented.

## Data model

A **tile type** is the identity of a tile:

```
{ typeId, family, suit, rank, displayName, shortLabel,
  accessibleLabel, isJoker, isFlower, maxCopies }
```

A **tile instance** is one physical copy: `{ instanceId, typeId }`, where
`instanceId` is `typeId#copyIndex`. Racks, exposures and discards hold instances
only. This is what makes "five copies of the 3 Bam" structurally detectable rather
than something inferred from a label.

Validators return both machine-readable and human-readable output:

```
{ ok, code, severity, ruleClass, message, details }
```

`code` is what the tests assert on; `message` is the only string shown to a player;
`ruleClass` is `STABLE` or `CONVENTION`. No validator reads the DOM or matches on
display text.

## Testing

Serve the project and open <http://localhost:8000/tests/test.html>. The page runs
66 assertions and prints a pass/fail list. It is not linked from the app.

Covered: set total and family counts, unique instance IDs, deterministic seeded
shuffling, immutable add and remove, the five-copies rule, rack sizes including
East's 14 and the holding phase, group classification, every Joker restriction,
Joker exchange including the mismatched-tile case and the convention window,
legal and illegal calls, the dead discarded Joker, concealed-hand behaviour,
Charleston count and Joker-pass rules, blind-pass availability, whole-state
detection, user-pattern matching including Jokers in pungs but not pairs,
scenario integrity, cross-checks that each Call and Find-the-Error scenario
agrees with the engine, and a `localStorage` that throws on every call.

### Keyboard checklist (manual)

1. `Tab` from the top reaches the Skip link first, and it becomes visible.
2. Skip link moves focus to the main region.
3. Every button and link shows a thick blue focus ring.
4. Home is reachable from every screen.
5. All seven modes are reachable from Home by keyboard alone.
6. Tiles are buttons: `Tab` reaches them, `Space` and `Enter` select them.
7. Selecting a Charleston tile updates the "n of 3 chosen" count and announces it.
8. Answer buttons announce the verdict and explanation through the live region.
9. "Show a hint" works by keyboard and announces the hint.
10. Previous, Next and Start-over work by keyboard.
11. The delete confirmation dialog opens with Cancel focused and traps focus.
12. `Escape` closes the dialog without deleting anything.
13. Settings toggles report their on/off state via `aria-pressed`.
14. At 200% browser zoom and at a 320px-wide window nothing is clipped or overlapping.

## Accessibility

Base text 19px with a 24px large-text option, high-contrast theme, 48px minimum
interactive targets, semantic landmarks and headings, focus moved to the page
heading on navigation, `aria-live` feedback after every answer, screen-reader
labels on every tile and control, correct/incorrect signalled by icon and word as
well as colour, `prefers-reduced-motion` respected, and no timers or audio anywhere.

## Privacy

Nothing leaves your device. Settings, progress and saved hands are stored in this
browser's `localStorage` only. The app loads no fonts, scripts or images from other sites. If the browser blocks storage, the app still works fully and
says so — it simply forgets your choices when the page closes. Settings has a
two-step **Delete all my saved information** button.

## Decision log

| # | Decision | Why |
|---|---|---|
| D1 | ES modules, no bundler | Works natively on GitHub Pages; files stay readable |
| D2 | Instance IDs separate from type IDs | Makes illegal copy counts structurally detectable |
| D3 | `cardAllowsJoker` must be supplied by the caller | Keeps card-dependent rules out of the engine |
| D4 | Charleston graded on legality only | Strategy is genuinely not unique; grading it would mislead |
| D5 | Every result carries `ruleClass` | Table customs are never presented as absolute rules |
| D6 | Storage facade with in-memory fallback | Must survive private browsing and blocked storage |
| D7 | 48px targets, 19px base text | Comfortably exceeds WCAG 2.2 AA for the intended user |
| D8 | Tests as a plain HTML page | No runner dependency, and invisible to the player |
| D9 | Flowers are one type with eight copies | Matches how Flowers are used in American play |
| D10 | Four open questions documented, not guessed | Accuracy over completeness |
| D11 | 31 scenarios shipped rather than the 20 planned | Every mode needed real edge cases and negative tests |
| D12 | System fonts (Iowan Old Style, SF) instead of web fonts | Keeps the no-network privacy promise and looks native on iPhone |
| D13 | Strategy questions have one clearly best answer, with reasoning for every option | Strategy has judgement in it; explaining each option teaches more than a verdict |
| D14 | Tile faces drawn as SVG in code | Crisp at every size, no image files, accessible names come from data.js |
