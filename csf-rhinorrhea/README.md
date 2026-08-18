# Cerebrospinal Fluid Rhinorrhea — interactive HTML deck

An 82-slide web presentation converted from `CSF rhinorrhea SK.pptx` (79 source slides,
Nichana S.), rebuilt in a light-theme design system with interactive teaching tools and a
built-in live editor.

Open `index.html` in any modern browser. No build step, no server, no dependencies.

```
csf-rhinorrhea/
├── index.html     the whole deck — markup, styles, slide model and editor
└── assets/        108 figures (WebP), 2 operative videos (MP4 + WebM), self-hosted fonts
```

## Navigating

| Key | Action | | Key | Action |
|---|---|---|---|---|
| `←` `→` `Space` | Previous / next slide | | `N` | Speaker notes |
| `O` | Slide overview grid | | `T` | Presentation timer |
| `C` | Contents panel | | `F` | Fullscreen |
| `/` | Search every slide | | `E` | Live editor |
| `Esc` | Close any panel | | `?` | Shortcut reminder |

Click the left or right third of a slide to page through it, or swipe on a touchscreen.
The chrome fades out while the room is watching and returns as soon as you move the pointer.

## Interactive elements

- **Skull base map** — clickable markers on a sagittal CT; each site explains why it leaks,
  how it is reached, and how the graft is oriented.
- **Diagnostic algorithm explorer** — walk the pathway one decision at a time, with a
  breadcrumb trail you can step back through.
- **Repair selector** — set defect size, intracranial pressure and intra-operative flow, and
  the recommended construct is assembled from the source material.
- **Layered reconstruction** — select any layer of the multilayer repair to see its purpose.
- **Fluorescein before/after** — drag the handle across the same sphenoid leak.
- **Self-check cards** — six questions that flip to reveal the answer.
- **Figure viewer** — click any figure for a zoomable, pannable lightbox (scroll to zoom,
  drag to pan, `←` `→` between figures on the slide).
- **Operative video** — both clips from the original lecture, served as MP4 with a WebM
  fallback so they play on every browser.

## Live editor

Press `E`. The deck is data — every slide is an object in a model that the renderer turns
into DOM — so edits apply instantly.

- **Inline** — click any text on the slide and type.
- **Slide tab** — change the layout, rewrite bullets, swap figures from the image library,
  edit tables, stats, cards, hotspots and notes.
- **Deck tab** — reorder slides by dragging, insert, duplicate or delete.
- **Theme tab** — five accent palettes, type scale, background colour.
- **File tab** — export the deck as JSON or as a standalone HTML file with your edits baked
  in, re-import a saved JSON, or discard everything and restore the original.

Edits autosave to the browser as you type (`Ctrl+S` to save immediately, `Ctrl+Z` / `Ctrl+Shift+Z`
to undo and redo). An exported HTML file needs the `assets/` folder beside it.

## Exporting a handout

Print the page (`Ctrl+P`) at 1920×1080 landscape with background graphics on — the print
stylesheet lays out one slide per page.

## Source

Clinical content is reproduced from the original lecture and its citations, which appear on
each slide: Cummings Otolaryngology 7th ed., Bailey's Head & Neck Surgery 5th ed., the ICAR
endoscopic skull-base surgery review, Wormald's Endoscopic Sinus Surgery 4th ed., the Atlas
of Endoscopic Sinus and Skull Base Surgery, and the journal articles listed on the
references slide.
