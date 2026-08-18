# Endoscopic Sinus Surgery (ESS) & Complications of ESS

A glassmorphism redesign of the 111-slide lecture deck
*"ESS and complications from ESS"* (Nichana S.), rebuilt as a single
self-contained, offline-capable HTML presentation.

Two builds, same deck:

- **`ess-complications-standalone.html`** (12.9 MB) — one file, every image and
  font inlined. Download it, double-click it, works offline with nothing else
  alongside. Use this one to share or hand around.
- **`index.html`** (428 KB) — the same deck reading its images from `assets/`.
  Lighter to load and to diff; keep the folder together.

No build step, no server, no dependencies.

## The design

- **Chapter identity.** Each of the 15 chapters carries its own accent hue,
  which drives the aurora background, the header tab, rules, chips, the
  progress bar and the chapter rail.
- **Header.** A chapter tab, a progress bar showing where the slide sits
  *within* its chapter, and the slide number. Procedure steps ("3. Middle
  Meatal Antrostomy") get the numeral promoted to a badge beside the title,
  with the digits kept in the heading text for search and screen readers.
- **Two tiers of glass.** Prose panels are tinted and carry an accent spine;
  figure plates are lighter, so photographs sit forward of the text.
- **Section beats.** Moving into a new chapter blurs the deck for a moment
  behind a chapter card — the reading rhythm the original PowerPoint lacked.
  It only fires on sequential navigation, never on a jump.
- **Nothing goes to waste.** Prose scales up as well as down: the auto-fit
  searches for the *largest* type that still fits, so a sparse slide fills the
  stage instead of floating in a half-empty sheet. Figures are laid out as
  justified rows — each card is cut to its own image's aspect and every row is
  stretched to the full block width, so there is no letterboxing and no empty
  grid cells. In a gallery the figures claim the height they can actually use
  and hand the remainder back to the prose panel above them.
- **Contents on the cover.** All 15 chapters with their slide ranges, each
  row clickable.
- **Five motion families**, cycled across the deck so no two neighbouring
  slides arrive the same way: lift, split (text from the left, figures from the
  right), focus (a soft zoom out of blur), wipe, and fan. Each moves the
  header, the panel and the figures on its own curve and delay, and the
  horizontal families mirror themselves when you go backwards.
- A faint plotting grid behind the glass. All motion respects
  `prefers-reduced-motion` and is disabled in print.

## Telegraphic wording

Bullets, figure captions, transcribed panels and table cells are written in
clinical shorthand: articles and copulas dropped, passives collapsed to the
participle, padding phrases cut, comparisons and measures set as symbols
(`≥`, `>`, `~`, `30°`, `55–70 mmHg`, `bpm`).

Nothing is paraphrased and no fact is removed. Every compressed line keeps its
original sentence on the element, and **`W`** (or the ¶ button in the dock)
swaps the whole deck between telegraphic and the full lecture wording — the
choice is remembered. Editing a line drops its pairing, so your words are never
swapped out from under you.

## What's in it

| | |
| --- | --- |
| Slides | 111 (1:1 with the source deck, same order and numbering) |
| Figures | 195 (every image from the PPTX, re-encoded to WebP) |
| Chapters | 15, each with its own accent hue |
| Speaker notes | preserved verbatim, Thai included |
| Citations | preserved per slide as source chips |

Nothing from the original was dropped. Every text run, table, image and
speaker note is present — as slide prose, a figure caption, an annotation
chip, a source chip, or in the notes drawer.

Three slides that carried a flat *image of text* in the original (2 — Key
Points, 21 — Risk of mucosal bleeding, 92 — Box 44.5) were additionally
transcribed into real, searchable text; the original image is still shown
next to it.

## Interaction

| Key | Action |
| --- | --- |
| `→` `Space` `PgDn` / `←` `PgUp` | next / previous slide |
| `Home` `End` | first / last slide |
| digits then `Enter` | jump to a slide number |
| `G` | overview grid (filter by chapter, click to jump) |
| `/` or `S` | search titles, bullets, captions, sources and notes |
| `N` | speaker-notes drawer (also lists every source on the slide) |
| `P` | presenter timer (double-click the dock button to reset) |
| `T` | light / dark glass |
| `F` | fullscreen |
| `W` | telegraphic / full wording |
| `E` | real-time edit mode (see below) |
| `?` | shortcut reference |
| `Esc` | close any overlay |

Click any figure to open it full-screen: wheel or `+` / `−` to zoom, drag to
pan, `←` / `→` to step through the other figures on that slide, `0` to reset.

Touch: swipe left/right to navigate. Mouse wheel also advances slides.
The URL carries the slide (`#/42`), and the last position, theme and edits
are restored on reload.

## Real-time editing

Press `E` (or the ✎+ button in the dock) and the deck becomes directly
editable — no export, no round trip:

- Click any title, bullet, caption, chip, table cell or citation and type. The
  slide re-lays out **as you type**: the prose auto-fit and the figure-grid
  solver re-run, so nothing ever overflows the 16:9 stage.
- `Enter` in a bullet adds a new one below; `Backspace` in an empty bullet
  removes it.
- Hover any bullet, figure, chip, citation or table row and click the red ✕ to
  delete it.
- Every change is saved to the browser immediately, so a reload picks up where
  you left off.
- **Save HTML** writes the edited deck out as a fresh standalone file
  (`ess-deck-edited.html`) — fully self-contained and itself editable, so you
  can keep editing the copy and save again.
- **Reset** discards every edit and restores the original deck.

Printing (`Ctrl/Cmd-P`) lays the deck out one slide per page for PDF export.

## How it was built

The deck is generated, not hand-written, so it can be regenerated after a
content fix:

```
cd build
python3 build.py          # writes index.html AND the standalone single file
```

Both outputs come from the same source; the standalone build inlines
`assets/` as data URIs, emitting each image once even when several slides
share it.

| File | Role |
| --- | --- |
| `build/deck.json` | structured dump of the source PPTX (shapes, geometry, text, notes) |
| `build/imgmap.json` | original image → WebP asset map with pixel dimensions |
| `build/meta.py` | curated titles, chapter ranges, accents, transcriptions |
| `build/build.py` | classifies shapes into roles, picks a layout, emits the HTML |
| `build/shell.html` `shell.css` `shell.js` `faces.css` | the page shell, inlined at build time |

`build.py` sorts each slide's shapes into title / prose / figure caption /
annotation / citation using position, font size and proximity to images, then
picks one of six layouts (cover, text, split, gallery, hero, closing) from the
text-to-figure balance. At runtime two solvers keep every slide inside the
fixed 1920×1080 stage: one shrinks a prose panel's type until it fits, the
other chooses the figure-grid column count that maximises rendered image area.

Design notes: fixed 16:9 stage scaled as a whole (never reflowed), Zodiak /
Switzer / JetBrains Mono self-hosted, Noto Sans Thai for the notes, and a
per-chapter accent that drives the aurora background, rules, chips and
progress bar.
