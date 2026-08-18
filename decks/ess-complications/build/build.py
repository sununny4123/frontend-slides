# -*- coding: utf-8 -*-
"""
Build the glassmorphism ESS deck.

Reads the structured PPTX dump (deck.json) + the image manifest (imgmap.json),
classifies every shape into a semantic role, then emits a single self-contained
index.html with all CSS/JS inlined (images live in ../assets/img).

Nothing is dropped: every text run, table, image and speaker note from the
source deck ends up somewhere in the output (slide body, figure caption,
annotation chip, source chip or the notes drawer).
"""

import html
import json
import os
import re

import meta

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, ".."))

SLIDE_W, SLIDE_H = 13.333, 7.5

# --- role classification --------------------------------------------------

SOURCE_RE = re.compile(
    r"(cumming|epos\s*20|icar\s*20|et\s+al\.|laryngoscope|otolaryngol|arch\s+otolaryg|"
    r"wormald|sammen|atlas of endoscopic|bailey|basic and clinical pharmacology|"
    r"operative techniques|journal of laryngology|j\.?\s*laryngol|eur arch|"
    r"current opinion|kaluskar|complication in ess|massegur|weidenbecher|moeller|"
    r"ulualp|higgins|catalano|alsharif|ashman|eloy|welch kc|kennedy dw|pant h)",
    re.I,
)

# Short strings that are endoscopic-view annotations rather than prose.
ANNOT_RE = re.compile(
    r"^(left|right|left side|right side|lp|mo|be|mt|st|sb|u|m|"
    r"mt,?h|mt,?v|ax|anc|fs|fso|fsr|iic|iid|iie|iif|oral|"
    r"zero degree endoscope|30-degree endoscope|retrograde|anterograde)\.?$",
    re.I,
)


def shape_text(sh):
    return "\n".join(p["t"] for p in sh.get("paras", [])).strip()


def is_source(txt, sh):
    if len(txt) > 320:
        return False
    if SOURCE_RE.search(txt):
        return True
    # tiny type parked at/below the slide edge is always a credit line
    return (sh.get("sz") or 99) <= 10 and sh.get("y", 0) > SLIDE_H - 0.6


def centre(sh):
    return (sh.get("x", 0) + sh.get("w", 0) / 2.0, sh.get("y", 0) + sh.get("h", 0) / 2.0)


def dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def inside(pt, sh):
    x, y = pt
    return (
        sh.get("x", 0) - 0.15 <= x <= sh.get("x", 0) + sh.get("w", 0) + 0.15
        and sh.get("y", 0) - 0.15 <= y <= sh.get("y", 0) + sh.get("h", 0) + 0.15
    )


def flatten(shapes, acc):
    """Groups are transparent — their children are ordinary shapes."""
    for sh in shapes:
        if sh["type"] == "group":
            flatten(sh.get("children", []), acc)
        else:
            acc.append(sh)
    return acc


def classify(n, shapes, imgmap):
    """Split a slide's shapes into title / body / captions / annotations / figures / sources."""
    flat = flatten(shapes, [])
    title_txt = meta.TITLES[n]
    aliases = [a.lower() for a in meta.TITLE_ALIASES.get(n, [])]

    figures, sources, texts = [], [], []
    used_title = False

    for sh in flat:
        if sh["type"] == "image":
            info = imgmap[sh["src"]]
            figures.append(
                {
                    "file": info["file"],
                    "iw": info["w"],
                    "ih": info["h"],
                    "x": sh.get("x", 0),
                    "y": sh.get("y", 0),
                    "w": sh.get("w", 0),
                    "h": sh.get("h", 0),
                    "caps": [],
                    "annots": [],
                }
            )
        elif sh["type"] == "table":
            texts.append({"role": "table", "rows": sh["rows"], "sh": sh})
        elif sh["type"] == "text":
            txt = shape_text(sh)
            if not txt:
                continue
            low = txt.strip().lower().rstrip(" .")
            if not used_title and (
                low == title_txt.strip().lower() or low in aliases
                or (sh["name"].lower().startswith("title") and len(txt) < 120)
            ):
                used_title = True
                continue
            if is_source(txt, sh):
                sources.append(txt)
                continue
            texts.append({"role": "text", "txt": txt, "sh": sh})

    # keep reading order: top-to-bottom, then left-to-right
    figures.sort(key=lambda f: (round(f["y"], 1), f["x"]))
    texts.sort(key=lambda t: (round(t["sh"].get("y", 0), 1), t["sh"].get("x", 0)))

    bodies, captions, annots = [], [], []
    for item in texts:
        if item["role"] == "table":
            bodies.append(item)
            continue
        sh, txt = item["sh"], item["txt"]
        c = centre(sh)
        near, nd = None, 1e9
        for f in figures:
            d = 0.0 if inside(c, f) else dist(c, centre(f))
            if d < nd:
                near, nd = f, d
        short = len(txt) <= 34 and len(sh["paras"]) <= 2 and (
            (sh.get("sz") or 18) <= 16 or ANNOT_RE.match(txt.strip()) is not None
        )
        sz = sh.get("sz") or 18

        if near is not None and short and (nd < 2.6 or ANNOT_RE.match(txt.strip())):
            near["annots"].append(txt)
            annots.append(txt)
        elif near is not None and nd < 1.6 and len(txt) <= 90 and sz <= 16:
            near["caps"].append(txt)
            captions.append(txt)
        elif short and ANNOT_RE.match(txt.strip()):
            annots.append(txt)
            item["orphan_annot"] = True
        else:
            bodies.append(item)

    # de-duplicate credit lines while preserving order
    seen, srcs = set(), []
    for s in sources:
        k = re.sub(r"\s+", " ", s).strip().lower()
        if k not in seen:
            seen.add(k)
            srcs.append(re.sub(r"\s+", " ", s).strip())

    loose_annots = [a for a in annots if all(a not in f["annots"] for f in figures)]
    return {
        "title": title_txt,
        "bodies": bodies,
        "figures": figures,
        "sources": srcs,
        "annots": loose_annots,
    }


def pick_layout(n, c):
    if n in meta.LAYOUT_OVERRIDES:
        return meta.LAYOUT_OVERRIDES[n]
    chars = sum(
        len(b["txt"]) if b["role"] == "text" else sum(len(x) for r in b["rows"] for x in r)
        for b in c["bodies"]
    )
    nf = len(c["figures"])
    if nf == 0:
        return "text"
    if chars < 90:
        return "hero" if nf == 1 else "gallery"
    if chars < 420 and nf >= 3:
        return "gallery"
    return "split"


# --- HTML helpers ---------------------------------------------------------

def esc(s):
    return html.escape(s, quote=True)


def rich(s):
    """Escape, then re-enable the handful of inline tags used in transcripts."""
    s = esc(s)
    for tag in ("b", "i", "em", "strong"):
        s = s.replace(f"&lt;{tag}&gt;", f"<{tag}>").replace(f"&lt;/{tag}&gt;", f"</{tag}>")
    return s


def bullets_html(paras):
    """Render PPT paragraph levels as a nested, typed bullet list."""
    out = []
    for p in paras:
        t = p["t"].strip()
        if not t:
            continue
        lvl = min(p.get("lvl", 0), 3)
        # the source deck marks sub-points with a leading dash at level 0
        m = re.match(r"^[-–—]\s+(.*)$", t)
        if m:
            t = m.group(1)
            lvl = max(lvl, 1)
        # a trailing colon or a short line at level 0 reads as a sub-heading
        numbered = re.match(r"^(\(?\d+[.)]|\d+\s)", t) is not None
        head = lvl == 0 and not numbered and (
            t.endswith(":") or (len(t) < 46 and not t.endswith("."))
        )
        cls = f"b b{lvl}" + (" b-head" if head else "")
        out.append(f'<li class="{cls}"><span>{esc(t)}</span></li>')
    return '<ul class="bullets">' + "".join(out) + "</ul>"


def table_html(rows):
    if not rows:
        return ""
    head, body = rows[0], rows[1:]
    th = "".join(f"<th>{esc(c)}</th>" for c in head)
    tb = "".join(
        "<tr>" + "".join(f'<td>{esc(c).replace(chr(10), "<br>")}</td>' for c in r) + "</tr>"
        for r in body
    )
    return f'<div class="tbl-wrap"><table class="tbl"><thead><tr>{th}</tr></thead><tbody>{tb}</tbody></table></div>'


def transcript_html(tr):
    if tr["kind"] == "bullets":
        items = "".join(f'<li class="b b0"><span>{rich(i)}</span></li>' for i in tr["items"])
        inner = f'<ul class="bullets">{items}</ul>'
    else:
        blocks = []
        for g in tr["groups"]:
            items = "".join(f'<li class="b b1"><span>{rich(i)}</span></li>' for i in g["items"])
            blocks.append(
                f'<div class="tg"><h4>{rich(g["head"])}</h4>'
                + (f'<ul class="bullets">{items}</ul>' if items else "")
                + "</div>"
            )
        inner = '<div class="tgroups">' + "".join(blocks) + "</div>"
    ttl = f'<h3 class="tr-title">{rich(tr["title"])}</h3>' if tr.get("title") else ""
    return (
        f'<div class="transcript" title="{esc(tr["note"])}">{ttl}{inner}'
        f'<p class="tr-note">{esc(tr["note"])}</p></div>'
    )


def grid_cols(figs, area):
    """How many columns a figure block gets, given its count and the space it has."""
    n = len(figs)
    if n <= 1:
        return 1
    if n <= 4:
        return 2
    if n <= 6:
        return 3 if area == "full" else 2
    if n <= 9:
        return 3
    if n <= 12:
        return 4
    return 5


def figure_html(f, idx, n, cols=2):
    ratio = f["iw"] / max(f["ih"], 1)
    wide = "wide" if ratio > 2.0 else ("tall" if ratio < 0.62 else "")
    caps = "".join(f'<p class="fig-cap">{esc(c)}</p>' for c in f["caps"])
    chips = "".join(f'<span class="chip chip-annot">{esc(a)}</span>' for a in f["annots"])
    chiprow = f'<div class="fig-chips">{chips}</div>' if chips else ""
    alt = esc((f["caps"] + f["annots"] + ["Figure"])[0])[:140]
    return f"""<figure class="fig glass {wide}" data-slide="{n}" data-fig="{idx}" data-ratio="{ratio:.3f}" data-src="assets/img/{f['file']}" tabindex="0">
  <div class="fig-media" style="--ratio:{ratio:.4f}">
    <img src="assets/img/{f['file']}" width="{f['iw']}" height="{f['ih']}" loading="lazy" decoding="async" alt="{alt}">
    <span class="fig-zoom" aria-hidden="true">⤢</span>
  </div>
  {chiprow}{caps}
</figure>"""


def split_columns(bodies):
    """Detect a genuine left/right column pair on the source slide."""
    mid = SLIDE_W / 2.0
    left, right = [], []
    for it in bodies:
        sh = it["sh"]
        cx = sh.get("x", 0) + sh.get("w", 0) / 2.0
        if sh.get("w", 0) > SLIDE_W * 0.6:
            return None                      # a full-width block spans both columns
        if cx < mid - 0.3:
            left.append(it)
        elif cx > mid + 0.3:
            right.append(it)
        else:
            return None
    if not left or not right:
        return None
    ly = (min(i["sh"]["y"] for i in left), max(i["sh"]["y"] + i["sh"]["h"] for i in left))
    ry = (min(i["sh"]["y"] for i in right), max(i["sh"]["y"] + i["sh"]["h"] for i in right))
    if min(ly[1], ry[1]) - max(ly[0], ry[0]) < 0.8:
        return None                          # stacked, not side by side
    left.sort(key=lambda i: i["sh"]["y"])
    right.sort(key=lambda i: i["sh"]["y"])
    return [left, right]


def block_html(it):
    if it["role"] == "table":
        return table_html(it["rows"])
    return bullets_html(it["sh"]["paras"])


def body_html(c, n):
    parts = []
    tr = meta.TRANSCRIPTS.get(n)
    if tr:
        parts.append(transcript_html(tr))
    cols = split_columns(c["bodies"]) if len(c["bodies"]) >= 2 else None
    if cols:
        parts.append(
            '<div class="bcols">'
            + "".join('<div class="bcol">' + "".join(block_html(i) for i in col) + "</div>" for col in cols)
            + "</div>"
        )
    else:
        for b in c["bodies"]:
            parts.append(block_html(b))
    if c["annots"]:
        chips = "".join(f'<span class="chip">{esc(a)}</span>' for a in c["annots"])
        parts.append(f'<div class="chiprow">{chips}</div>')
    return "".join(parts)


def slide_html(n, c, layout, ch_idx, total):
    ch = meta.CHAPTERS[ch_idx]
    accent, accent2 = ch[4], ch[5]
    area = "split" if layout == "split" else "full"
    cols = grid_cols(c["figures"], area)
    figs = "".join(figure_html(f, i, n, cols) for i, f in enumerate(c["figures"]))
    body = body_html(c, n)
    shown = c["sources"][:2]
    extra = c["sources"][2:]
    src = "".join(f'<span class="src">{esc(s)}</span>' for s in shown)
    if extra:
        src += (
            f'<button class="src src-more" data-more '
            f'title="{esc(" · ".join(extra))}">+{len(extra)} more</button>'
        )
    srcbar = f'<div class="sources">{src}</div>' if src else "<div></div>"

    head = f"""<header class="s-head reveal">
      <div class="eyebrow"><i class="dot"></i>{esc(ch[2])}<em>/</em>{n:02d}</div>
      <h2 class="s-title">{esc(c['title'])}</h2>
      <div class="rule"></div>
    </header>"""

    if layout == "cover":
        return f"""<section class="slide s-cover" data-n="{n}" data-ch="{ch_idx}" style="--accent:{accent};--accent2:{accent2}">
  <div class="slide-inner cover-inner">
    <div class="cover-glass glass reveal">
      <p class="cover-kicker">Rhinology &middot; Surgical Technique &amp; Safety</p>
      <h1 class="cover-title">Endoscopic Sinus Surgery<span>&amp; Complications of ESS</span></h1>
      <div class="cover-rule"></div>
      <p class="cover-by">Nichana S.</p>
      <div class="cover-meta">
        <span>{total} slides</span><span>15 chapters</span><span>195 figures</span>
      </div>
      <p class="cover-hint">Press <kbd>&rarr;</kbd> to begin &middot; <kbd>?</kbd> for shortcuts</p>
    </div>
    <div class="cover-figs figbox" style="--cols:{cols}">{figs}</div>
  </div>
  <footer class="s-foot">{srcbar}</footer>
</section>"""

    if layout == "closing":
        return f"""<section class="slide s-closing" data-n="{n}" data-ch="{ch_idx}" style="--accent:{accent};--accent2:{accent2}">
  <div class="slide-inner closing-inner">
    <div class="closing-glass glass reveal">
      {figs}
      <h2 class="closing-title">Thank you</h2>
      <p class="closing-sub">Endoscopic Sinus Surgery &amp; Complications of ESS &middot; Nichana S.</p>
    </div>
  </div>
  <footer class="s-foot">{srcbar}</footer>
</section>"""

    if layout == "hero":
        return f"""<section class="slide" data-n="{n}" data-ch="{ch_idx}" style="--accent:{accent};--accent2:{accent2}">
  <div class="slide-inner l-hero">
    {head}
    <div class="s-body hero-body reveal">
      <div class="hero-figs figbox" style="--cols:{cols}">{figs}</div>
      {f'<div class="panel glass side-note"><div class="panel-body"><div class="fit">{body}</div></div></div>' if body else ''}
    </div>
  </div>
  <footer class="s-foot">{srcbar}</footer>
</section>"""

    if layout == "gallery":
        return f"""<section class="slide" data-n="{n}" data-ch="{ch_idx}" style="--accent:{accent};--accent2:{accent2}">
  <div class="slide-inner l-gallery">
    {head}
    <div class="s-body gal-body reveal">
      {f'<div class="gal-lead panel glass"><div class="panel-body"><div class="fit">{body}</div></div></div>' if body else ''}
      <div class="gal-grid figbox" style="--cols:{cols}">{figs}</div>
    </div>
  </div>
  <footer class="s-foot">{srcbar}</footer>
</section>"""

    if layout == "text":
        wide = "two-col" if len(re.sub(r"<[^>]+>", "", body)) > 780 else ""
        return f"""<section class="slide" data-n="{n}" data-ch="{ch_idx}" style="--accent:{accent};--accent2:{accent2}">
  <div class="slide-inner l-text">
    {head}
    <div class="s-body reveal">
      <div class="panel glass text-panel {wide}"><div class="panel-body"><div class="fit">{body}</div></div></div>
    </div>
  </div>
  <footer class="s-foot">{srcbar}</footer>
</section>"""

    # split — the prose/figure ratio follows how much text the slide carries
    chars = len(re.sub(r"<[^>]+>", "", body))
    dens = " stacked" if chars > 1750 else (" dense" if chars > 1050 else "")
    return f"""<section class="slide" data-n="{n}" data-ch="{ch_idx}" style="--accent:{accent};--accent2:{accent2}">
  <div class="slide-inner l-split">
    {head}
    <div class="s-body split-body{dens} reveal">
      <div class="panel glass text-panel"><div class="panel-body"><div class="fit">{body}</div></div></div>
      <div class="split-figs figbox" style="--cols:{cols}">{figs}</div>
    </div>
  </div>
  <footer class="s-foot">{srcbar}</footer>
</section>"""


# --- main -----------------------------------------------------------------

def main():
    deck = json.load(open(os.path.join(HERE, "deck.json")))
    imgmap = json.load(open(os.path.join(HERE, "imgmap.json")))
    slides = deck["slides"]
    total = len(slides)

    html_parts, index = [], []
    for s in slides:
        n = s["n"]
        c = classify(n, s["shapes"], imgmap)
        layout = pick_layout(n, c)
        ch = meta.chapter_of(n)
        html_parts.append(slide_html(n, c, layout, ch, total))

        searchable = [c["title"]]
        for b in c["bodies"]:
            if b["role"] == "text":
                searchable.append(b["txt"])
            else:
                searchable += [x for r in b["rows"] for x in r]
        for f in c["figures"]:
            searchable += f["caps"] + f["annots"]
        searchable += c["annots"] + c["sources"]
        tr = meta.TRANSCRIPTS.get(n)
        if tr:
            if tr["kind"] == "bullets":
                searchable += tr["items"]
            else:
                for g in tr["groups"]:
                    searchable.append(g["head"])
                    searchable += g["items"]
        index.append(
            {
                "n": n,
                "t": c["title"],
                "c": ch,
                "thumb": c["figures"][0]["file"] if c["figures"] else "",
                "nf": len(c["figures"]),
                "notes": s.get("notes", ""),
                "src": c["sources"],
                "txt": re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", " ".join(searchable)))[:2600],
            }
        )

    css = open(os.path.join(HERE, "shell.css"), encoding="utf-8").read()
    faces = open(os.path.join(HERE, "faces.css"), encoding="utf-8").read()
    js = open(os.path.join(HERE, "shell.js"), encoding="utf-8").read()
    shell = open(os.path.join(HERE, "shell.html"), encoding="utf-8").read()

    chapters = [
        {"a": a, "b": b, "t": t, "s": s_, "c": c1, "c2": c2}
        for (a, b, t, s_, c1, c2) in meta.CHAPTERS
    ]
    data = json.dumps({"slides": index, "chapters": chapters}, ensure_ascii=False)

    out = (
        shell.replace("/*__FACES__*/", faces)
        .replace("/*__CSS__*/", css)
        .replace("/*__DATA__*/", data)
        .replace("/*__JS__*/", js)
        .replace("<!--__SLIDES__-->", "\n".join(html_parts))
        .replace("__TOTAL__", str(total))
    )
    path = os.path.join(OUT, "index.html")
    open(path, "w", encoding="utf-8").write(out)
    print(f"wrote {path}  ({len(out)/1024:.0f} KB, {total} slides)")


if __name__ == "__main__":
    main()
