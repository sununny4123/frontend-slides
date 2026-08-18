# Endoscopic Sinus Surgery (ESS) & Complications of ESS

A glassmorphism redesign of the 111-slide lecture deck
*"ESS and complications from ESS"* (Nichana S.), rebuilt as a single
self-contained, offline-capable HTML presentation.

Open `index.html` in any modern browser. No build step, no server, no
dependencies — fonts and images are local files under `assets/`.

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
| `E` | inline edit mode — click any text, autosaves to localStorage |
| `?` | shortcut reference |
| `Esc` | close any overlay |

Click any figure to open it full-screen: wheel or `+` / `−` to zoom, drag to
pan, `←` / `→` to step through the other figures on that slide, `0` to reset.

Touch: swipe left/right to navigate. Mouse wheel also advances slides.
The URL carries the slide (`#/42`), and the last position, theme and edits
are restored on reload.

Printing (`Ctrl/Cmd-P`) lays the deck out one slide per page for PDF export.

## How it was built

The deck is generated, not hand-written, so it can be regenerated after a
content fix:

```
cd build
python3 build.py          # needs deck.json + imgmap.json, both committed here
```

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
