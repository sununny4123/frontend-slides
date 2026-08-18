/* ===========================================================
   ESS DECK CONTROLLER
   Fixed 1920×1080 stage + all interactive chrome:
   navigation, auto-fit, overview grid, search, notes, figure
   lightbox, presenter timer, theming and inline editing.
   =========================================================== */
(function () {
    'use strict';

    var DATA = window.DECK;
    var LS = 'ess-deck-v1';

    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

    var stage = $('#deckStage');
    var slides = $$('.slide');
    var total = slides.length;

    var state = {
        i: 0,
        editing: false,
        ch: -1,
        timer: { on: false, sec: 0, id: null },
        jumpBuf: '',
        terse: true
    };

    /* -------------------------------------------------------
       STAGE SCALING — one transform, never a reflow
       ------------------------------------------------------- */
    function scaleStage() {
        var f = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
        var x = (window.innerWidth - 1920 * f) / 2;
        var y = (window.innerHeight - 1080 * f) / 2;
        stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + f + ')';
    }

    /* -------------------------------------------------------
       AUTO-FIT — guarantees dense slides never clip
       ------------------------------------------------------- */
    function fitPanel(pb) {
        var f = pb.querySelector('.fit');
        if (!f) return;
        var multicol = (getComputedStyle(f).columnCount || 'auto') !== 'auto';
        var max = +(pb.dataset.grow || 1.85);

        var fits = function (s) {
            f.style.setProperty('--fit', s);
            /* a real margin, not a rounding guard: fonts settle late and line
               wrapping shifts by a few px, so the fitted size keeps slack */
            return multicol ? f.scrollWidth <= f.clientWidth - 10
                            : f.scrollHeight <= pb.clientHeight - 10;
        };

        /* binary-search the largest scale that still fits: dense slides shrink,
           sparse ones grow until they own the stage — no dead space either way */
        var lo, hi;
        if (fits(1)) { lo = 1; hi = max; if (fits(max)) { lo = max; hi = max; } }
        else { lo = 0.44; hi = 1; }
        for (var k = 0; k < 16 && hi - lo > 0.006; k++) {
            var mid = (lo + hi) / 2;
            if (fits(mid)) lo = mid; else hi = mid;
        }
        /* final verification: line-wrap thresholds make the search's answer
           occasionally optimistic, so step down until it genuinely fits */
        var g = 0;
        while (!fits(lo) && lo > 0.44 && g++ < 24) lo -= 0.03;
        f.style.setProperty('--fit', lo.toFixed(3));
        pb.dataset.fit = lo.toFixed(2);
    }

    function fitAll() {
        $$('.figbox').forEach(solveGrid);
        $$('.panel-body').forEach(fitPanel);
    }

    /* -------------------------------------------------------
       JUSTIFIED FIGURE ROWS
       Every card is sized to its own image, and every row is
       stretched to the full block width, so figures leave no
       letterboxing and no empty cells.
       ------------------------------------------------------- */
    function solveGrid(box, pass) {
        var figs = $$('.fig', box);
        if (!figs.length) return;
        var W = box.clientWidth, H = box.clientHeight;

        /* a gallery's figures claim the height they can actually use; whatever
           is left goes to the prose panel above them, which grows to fill it */
        var lead = box.classList.contains('gal-grid') ? box.parentElement : null;
        if (lead) {
            var bodyH = lead.clientHeight;
            var g = parseFloat(getComputedStyle(lead).rowGap) || 20;
            H = Math.max(160, bodyH - g - Math.round(bodyH * 0.18));
        }
        if (!W || !H) return;

        var gap = parseFloat(getComputedStyle(box).rowGap) || 16;
        var ratios = figs.map(function (f) { return +f.dataset.ratio || 1; });
        var pads = figs.map(function (f) {
            return parseFloat(getComputedStyle(f).paddingTop) || 0;
        });
        /* caption and chip rows sit under the image and are not part of it */
        var extra = figs.map(function (f) {
            var e = 0;
            $$('.fig-cap, .fig-chips', f).forEach(function (el) { e += el.offsetHeight || 24; });
            return e ? e + 4 : 0;
        });

        var N = figs.length;

        /* every row is stretched to the full width, so a row's height follows
           straight from the aspect ratios it contains */
        function rowOf(j, i) {
            var sum = 0, padSum = 0, ex = 0, pd = 0;
            for (var k = j; k < i; k++) {
                sum += ratios[k];
                padSum += 2 * pads[k];
                ex = Math.max(ex, extra[k]);
                pd = Math.max(pd, pads[k]);
            }
            var avail = W - gap * (i - j - 1) - padSum;
            var mh = avail / sum;
            return { j: j, i: i, mh: mh, extra: ex, pad: pd, h: mh + ex + 2 * pd };
        }

        /* for each row count, find the break points that pack shortest, then
           keep the tallest packing that still fits — biggest possible figures */
        var best = null;
        for (var R = 1; R <= N; R++) {
            var dp = [], back = [];
            for (var r = 0; r <= R; r++) {
                dp.push(new Array(N + 1).fill(Infinity));
                back.push(new Array(N + 1).fill(-1));
            }
            dp[0][0] = 0;
            for (var r2 = 1; r2 <= R; r2++) {
                for (var i2 = r2; i2 <= N; i2++) {
                    for (var j2 = r2 - 1; j2 < i2; j2++) {
                        if (dp[r2 - 1][j2] === Infinity) continue;
                        var v = dp[r2 - 1][j2] + rowOf(j2, i2).h;
                        if (v < dp[r2][i2]) { dp[r2][i2] = v; back[r2][i2] = j2; }
                    }
                }
            }
            var total = dp[R][N] + gap * (R - 1);
            if (total > H) break;
            best = { R: R, total: total, back: back };
        }
        if (!best) best = { R: 1, total: rowOf(0, N).h, back: null };

        var rows = [];
        if (best.back) {
            var end = N;
            for (var r3 = best.R; r3 >= 1; r3--) {
                var st = best.back[r3][end];
                rows.unshift(rowOf(st, end));
                end = st;
            }
        } else {
            rows = [rowOf(0, N)];
        }

        rows.forEach(function (row) {
            for (var i = row.j; i < row.i; i++) {
                var f = figs[i];
                /* shave a hair off so rounding never pushes a card onto a new line */
                f.style.width = (ratios[i] * row.mh + 2 * pads[i] - 0.6) + 'px';
                f.style.height = (row.mh + row.extra + 2 * row.pad) + 'px';
                var m = f.querySelector('.fig-media');
                if (m) m.style.height = row.mh + 'px';
            }
        });

        if (lead) {
            /* hand the unused height back to the prose panel */
            box.style.flex = '0 0 ' + Math.ceil(best.total) + 'px';
            box.style.alignContent = 'flex-start';
        } else {
            /* spread small slack between rows; a large gap reads as a hole,
               so centre the block instead */
            var slack = H - best.total;
            var perGap = rows.length > 1 ? slack / (rows.length - 1) : slack;
            box.style.alignContent = slack <= 22 ? 'flex-start'
                : (rows.length > 1 && perGap <= 60 ? 'space-between' : 'center');
        }

        /* caption heights change once the cards have their real widths, so
           measure once more and settle the layout */
        if (!pass) solveGrid(box, 1);
        var res = { rows: rows };
        box.dataset.rows = res.rows.length;
    }

    /* -------------------------------------------------------
       NAVIGATION
       ------------------------------------------------------- */
    function chapterOf(n) {
        for (var i = 0; i < DATA.chapters.length; i++) {
            if (n >= DATA.chapters[i].a && n <= DATA.chapters[i].b) return i;
        }
        return 0;
    }

    function show(i, opts) {
        opts = opts || {};
        var from = state.i;
        state.i = clamp(i, 0, total - 1);
        var dir = state.i > from ? 'enter-fwd' : (state.i < from ? 'enter-back' : '');
        /* the chapter card is a reading beat — it should not fire on a jump */
        var seq = Math.abs(state.i - from) === 1;
        slides.forEach(function (s, k) {
            var on = k === state.i;
            s.classList.toggle('active', on);
            s.classList.toggle('visible', on);
            s.classList.remove('enter-fwd', 'enter-back');
            if (on && dir && !opts.silent) {
                /* restart the entrance animation */
                void s.offsetWidth;
                s.classList.add(dir);
            }
        });
        var n = state.i + 1;
        var chIdx = chapterOf(n);
        var ch = DATA.chapters[chIdx];

        /* a short title card whenever the deck crosses into a new chapter */
        if (!opts.silent && seq && chIdx !== state.ch) chapterBeat(chIdx);
        state.ch = chIdx;

        /* the ambient aurora inherits the chapter accent */
        document.body.style.setProperty('--accent', ch.c);
        document.body.style.setProperty('--accent2', ch.c2);

        $('#progressFill').style.width = (n / total * 100) + '%';
        $('#curN').textContent = n;
        $$('.rail-item').forEach(function (b) {
            b.classList.toggle('on', +b.dataset.ch === chapterOf(n));
        });
        if (!$('#notesPanel').hidden) renderNotes();
        if (!opts.silent) {
            history.replaceState(null, '', '#/' + n);
            try { localStorage.setItem(LS + ':pos', String(n)); } catch (e) {}
        }
        preload(state.i);
        preload(state.i + 1);
        preload(state.i + 2);
    }

    /* After first paint, quietly upgrade every remaining figure to eager so
       jumping around — and printing to PDF — never waits on a lazy fetch. */
    function warmAll() {
        var imgs = $$('img[loading="lazy"]');
        var i = 0;
        (function step() {
            var end = Math.min(i + 12, imgs.length);
            for (; i < end; i++) imgs[i].loading = 'eager';
            if (i < imgs.length) setTimeout(step, 120);
        })();
    }

    function chapterBeat(idx) {
        var c = DATA.chapters[idx];
        var el = $('#chBeat');
        $('#cbNo').textContent = String(idx + 1).padStart(2, '0');
        $('#cbName').textContent = c.t;
        $('#cbRange').textContent = 'slides ' + c.a + '–' + c.b;
        el.classList.add('on');
        clearTimeout(state._beat);
        state._beat = setTimeout(function () { el.classList.remove('on'); }, 1150);
    }

    function preload(idx) {
        var s = slides[idx];
        if (!s) return;
        $$('img[loading="lazy"]', s).forEach(function (im) { im.loading = 'eager'; });
    }

    var next = function () { show(state.i + 1); };
    var prev = function () { show(state.i - 1); };

    /* -------------------------------------------------------
       CHAPTER RAIL
       ------------------------------------------------------- */
    function buildRail() {
        var rail = $('#rail');
        DATA.chapters.forEach(function (c, i) {
            var b = document.createElement('button');
            b.className = 'rail-item';
            b.dataset.ch = i;
            b.style.setProperty('--rc', c.c);
            b.style.height = Math.max(14, (c.b - c.a + 1) * 3.2) + 'px';
            b.innerHTML = '<span class="tip">' + c.t + '</span>';
            b.title = c.t + ' — slides ' + c.a + '–' + c.b;
            b.addEventListener('click', function () { show(c.a - 1); });
            rail.appendChild(b);
        });
    }

    /* -------------------------------------------------------
       OVERVIEW GRID
       ------------------------------------------------------- */
    var gridBuilt = false;

    function buildGrid() {
        if (gridBuilt) return;
        gridBuilt = true;
        var body = $('#gridBody');
        var chips = $('#gridChips');

        var all = document.createElement('button');
        all.className = 'ov-chip on';
        all.textContent = 'All';
        all.dataset.ch = '-1';
        all.style.setProperty('--cc', 'var(--accent)');
        chips.appendChild(all);

        DATA.chapters.forEach(function (c, i) {
            var b = document.createElement('button');
            b.className = 'ov-chip';
            b.textContent = c.s;
            b.dataset.ch = i;
            b.style.setProperty('--cc', c.c);
            chips.appendChild(b);
        });

        chips.addEventListener('click', function (e) {
            var t = e.target.closest('.ov-chip');
            if (!t) return;
            $$('.ov-chip', chips).forEach(function (c) { c.classList.toggle('on', c === t); });
            var ch = +t.dataset.ch;
            $$('.gcard', body).forEach(function (card) {
                card.style.display = (ch < 0 || +card.dataset.ch === ch) ? '' : 'none';
            });
        });

        DATA.slides.forEach(function (s, k) {
            var c = DATA.chapters[s.c];
            var card = document.createElement('div');
            card.className = 'gcard';
            card.setAttribute('role', 'button');
            card.tabIndex = 0;
            card.dataset.ch = s.c;
            card.style.setProperty('--gc', c.c);
            card.style.animationDelay = Math.min(k * 6, 400) + 'ms';
            card.innerHTML =
                (s.thumb
                    ? '<div class="gthumb"><img loading="lazy" src="' + imgSrc(s.thumb) + '" alt=""></div>'
                    : '<div class="gthumb empty">' + c.s + '</div>') +
                '<div class="gmeta"><span class="gnum">' + String(s.n).padStart(2, '0') +
                (s.nf ? ' · ' + s.nf + ' fig' : '') + '</span>' +
                '<span class="gttl">' + s.t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span></div>';
            card.addEventListener('click', function () { show(s.n - 1); closeAll(); });
            body.appendChild(card);
        });
    }

    function markGridCurrent() {
        $$('.gcard').forEach(function (c, k) { c.classList.toggle('cur', k === state.i); });
    }

    /* -------------------------------------------------------
       SEARCH
       ------------------------------------------------------- */
    var searchSel = 0;

    function escapeHtml(s) {
        return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function runSearch(q) {
        var body = $('#searchBody');
        var count = $('#searchCount');
        body.innerHTML = '';
        searchSel = 0;
        q = q.trim();
        if (q.length < 2) {
            body.innerHTML = '<p class="empty-note">Type at least two characters to search all ' +
                total + ' slides — titles, bullets, figure captions, sources and speaker notes.</p>';
            count.textContent = '';
            return;
        }
        var terms = q.toLowerCase().split(/\s+/);
        var hits = [];
        DATA.slides.forEach(function (s) {
            var hay = (s.t + ' ' + s.txt + ' ' + s.notes).toLowerCase();
            var score = 0, ok = true;
            terms.forEach(function (t) {
                if (hay.indexOf(t) < 0) { ok = false; return; }
                score += (s.t.toLowerCase().indexOf(t) >= 0 ? 12 : 0) + 1;
            });
            if (ok) hits.push({ s: s, score: score });
        });
        hits.sort(function (a, b) { return b.score - a.score || a.s.n - b.s.n; });
        count.textContent = hits.length + (hits.length === 1 ? ' slide' : ' slides');

        if (!hits.length) {
            body.innerHTML = '<p class="empty-note">No slide matches “' + escapeHtml(q) + '”.</p>';
            return;
        }

        var rx = new RegExp('(' + terms.map(function (t) {
            return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('|') + ')', 'ig');

        hits.forEach(function (h, k) {
            var s = h.s;
            var c = DATA.chapters[s.c];
            var pool = s.txt + ' ' + (s.notes || '');
            var at = pool.toLowerCase().indexOf(terms[0]);
            var from = Math.max(0, at - 90);
            var snip = (from > 0 ? '… ' : '') + pool.substr(from, 230) + '…';
            var btn = document.createElement('div');
            btn.className = 'sres' + (k === 0 ? ' sel' : '');
            btn.setAttribute('role', 'button');
            btn.tabIndex = 0;
            btn.style.setProperty('--sc', c.c);
            btn.innerHTML =
                '<span class="sn">' + String(s.n).padStart(3, '0') + '<br>' + c.s + '</span>' +
                '<span><span class="st">' + escapeHtml(s.t).replace(rx, '<mark>$1</mark>') + '</span>' +
                '<span class="sx">' + escapeHtml(snip).replace(rx, '<mark>$1</mark>') + '</span></span>';
            btn.addEventListener('click', function () { show(s.n - 1); closeAll(); });
            body.appendChild(btn);
        });
    }

    function moveSearchSel(d) {
        var items = $$('.sres');
        if (!items.length) return;
        items[searchSel] && items[searchSel].classList.remove('sel');
        searchSel = clamp(searchSel + d, 0, items.length - 1);
        items[searchSel].classList.add('sel');
        items[searchSel].scrollIntoView({ block: 'nearest' });
    }

    /* -------------------------------------------------------
       NOTES
       ------------------------------------------------------- */
    function renderNotes() {
        var s = DATA.slides[state.i];
        $('#notesSlide').textContent = 'slide ' + s.n + ' — ' + s.t;
        var body = $('#notesBody');
        var bits = [];
        if (s.notes) bits.push(escapeHtml(s.notes));
        if (s.src && s.src.length) {
            bits.push('\n\n— Sources —\n' + s.src.map(escapeHtml).join('\n'));
        }
        body.innerHTML = bits.length
            ? bits.join('')
            : '<span class="nempty">No speaker notes on this slide.</span>';
        body.scrollTop = 0;
    }

    /* -------------------------------------------------------
       LIGHTBOX — zoom + pan across a slide's figures
       ------------------------------------------------------- */
    var lb = { figs: [], k: 0, z: 1, x: 0, y: 0, drag: null };

    /* the deck already holds every image once — reuse those bytes for the
       lightbox and the overview thumbnails instead of a second copy */
    function imgSrc(file) {
        var im = document.querySelector('img[data-file="' + file + '"]');
        return im ? (im.currentSrc || im.src) : 'assets/img/' + file;
    }

    function openLightbox(fig) {
        lb.figs = $$('.fig', slides[state.i]);
        lb.k = Math.max(0, lb.figs.indexOf(fig));
        $('#lightbox').hidden = false;
        loadLb();
    }

    function loadLb() {
        var f = lb.figs[lb.k];
        if (!f) return;
        var src = f.querySelector('img');
        $('#lbImg').src = src ? (src.currentSrc || src.src) : '';
        var cap = f.querySelector('.fig-cap');
        var chips = $$('.chip', f).map(function (c) { return c.textContent; }).join(' · ');
        $('#lbCap').textContent =
            (lb.k + 1) + '/' + lb.figs.length + '  ' + (cap ? cap.textContent : chips);
        lb.z = 1; lb.x = 0; lb.y = 0;
        applyLb();
    }

    function applyLb() {
        $('#lbImg').style.transform =
            'translate(' + lb.x + 'px,' + lb.y + 'px) scale(' + lb.z + ')';
        $('#lbZoom').textContent = Math.round(lb.z * 100) + '%';
    }

    function zoom(d, cx, cy) {
        var z0 = lb.z;
        lb.z = clamp(lb.z * d, 0.5, 8);
        if (cx !== undefined) {
            var r = $('#lbStage').getBoundingClientRect();
            var ox = cx - r.left - r.width / 2 - lb.x;
            var oy = cy - r.top - r.height / 2 - lb.y;
            lb.x -= ox * (lb.z / z0 - 1);
            lb.y -= oy * (lb.z / z0 - 1);
        }
        applyLb();
    }

    function lbStep(d) {
        lb.k = (lb.k + d + lb.figs.length) % lb.figs.length;
        loadLb();
    }

    /* -------------------------------------------------------
       OVERLAY PLUMBING
       ------------------------------------------------------- */
    function openOv(id) {
        closeAll(true);
        $(id).hidden = false;
        if (id === '#gridOverlay') { buildGrid(); markGridCurrent(); }
        if (id === '#searchOverlay') {
            var inp = $('#searchInput');
            inp.value = '';
            runSearch('');
            setTimeout(function () { inp.focus(); }, 40);
        }
    }

    function anyOpen() {
        return ['#gridOverlay', '#searchOverlay', '#helpOverlay', '#lightbox']
            .some(function (id) { return !$(id).hidden; });
    }

    function closeAll(keepNotes) {
        ['#gridOverlay', '#searchOverlay', '#helpOverlay', '#lightbox'].forEach(function (id) {
            $(id).hidden = true;
        });
        if (!keepNotes) { /* notes drawer stays until toggled */ }
    }

    function toggleNotes() {
        var p = $('#notesPanel');
        p.hidden = !p.hidden;
        $('[data-act="notes"]').classList.toggle('on', !p.hidden);
        if (!p.hidden) renderNotes();
    }

    function toast(msg) {
        var t = $('#toast');
        t.hidden = false;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._id);
        t._id = setTimeout(function () { t.classList.remove('show'); }, 1700);
    }

    /* -------------------------------------------------------
       TIMER / THEME / FULLSCREEN
       ------------------------------------------------------- */
    function fmt(s) {
        return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }

    function toggleTimer() {
        var t = state.timer;
        t.on = !t.on;
        $('[data-act="timer"]').classList.toggle('on', t.on);
        if (t.on) {
            t.id = setInterval(function () {
                t.sec++;
                $('#timerLabel').textContent = fmt(t.sec);
            }, 1000);
            toast('Timer running — press P to pause, double-click to reset');
        } else {
            clearInterval(t.id);
        }
    }

    function setTheme(mode) {
        document.documentElement.dataset.theme = mode;
        try { localStorage.setItem(LS + ':theme', mode); } catch (e) {}
    }

    function toggleTheme() {
        setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    }

    function toggleFull() {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    }

    /* -------------------------------------------------------
       WORDING — telegraphic by default, full prose on demand
       Every compressed line keeps its original sentence, so the
       lecture wording is always one keypress away.
       ------------------------------------------------------- */
    function setTerse(on) {
        state.terse = on;
        $$('[data-full]').forEach(function (el) {
            if (!el.dataset.terse) el.dataset.terse = el.innerHTML;
            el.innerHTML = on ? el.dataset.terse : el.dataset.full;
        });
        document.body.classList.toggle('verbose', !on);
        fitAll();
        try { localStorage.setItem(LS + ':terse', on ? '1' : '0'); } catch (e) {}
        toast(on ? 'Telegraphic wording' : 'Full lecture wording');
    }

    /* -------------------------------------------------------
       REAL-TIME EDITING
       Every text run on the slide is directly editable. The slide
       re-lays out as you type (auto-fit + figure grid re-solve),
       bullets can be added/removed, figures deleted, and the whole
       edited deck saved back out as a standalone HTML file.
       ------------------------------------------------------- */
    var EDIT_SEL = [
        '.s-title', '.ch-tab', '.b span', '.fig-cap', '.chip', '.src',
        '.cover-kicker', '.cover-title', '.cover-by', '.cover-meta span',
        '.closing-title', '.closing-sub', '.tr-title', '.tr-note', '.tg h4',
        '.tbl th', '.tbl td'
    ].join(', ');

    /* elements a user can delete outright while editing */
    var KILL_SEL = '.b, .fig, .chip, .src, .tbl tr';

    function setEditing(on) {
        state.editing = on;
        document.body.classList.toggle('editing', on);
        $('#editToggle').classList.toggle('on', on);
        $('#editToggle').classList.toggle('show', on);
        var b = $('[data-act="edit"]');
        if (b) b.classList.toggle('on', on);
        $('#editBar').hidden = !on;
        $$(EDIT_SEL).forEach(function (el) {
            if (on) el.setAttribute('contenteditable', 'true');
            else el.removeAttribute('contenteditable');
        });
        if (!on) { hideKill(); document.getSelection().removeAllRanges(); }
        refitActive();
        toast(on
            ? 'Editing — click any text. Enter adds a bullet, ✕ removes a block.'
            : 'Editing off');
    }

    /* re-solve only the slide being edited: instant feedback, no jank */
    function refitActive() {
        var s = slides[state.i];
        if (!s) return;
        $$('.figbox', s).forEach(solveGrid);
        $$('.panel-body', s).forEach(fitPanel);
    }

    /* --- floating delete affordance -------------------------- */
    var killTarget = null;

    function showKill(el) {
        killTarget = el;
        var k = $('#killBtn');
        var r = el.getBoundingClientRect();
        k.style.left = Math.min(window.innerWidth - 34, r.right - 12) + 'px';
        k.style.top = Math.max(6, r.top - 6) + 'px';
        k.hidden = false;
    }

    function hideKill() {
        killTarget = null;
        $('#killBtn').hidden = true;
    }

    function removeTarget() {
        if (!killTarget) return;
        var host = killTarget.closest('.slide');
        killTarget.remove();
        hideKill();
        refitActive();
        saveDoc();
        if (host) toast('Block removed — Reset in the edit bar restores the original deck');
    }

    /* --- bullet keyboard behaviour --------------------------- */
    function onEditKey(e) {
        if (!state.editing) return;
        var span = e.target.closest && e.target.closest('.b span');
        if (!span) return;
        var li = span.parentElement;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            var clone = li.cloneNode(true);
            var cs = clone.querySelector('span');
            cs.innerHTML = '';
            cs.setAttribute('contenteditable', 'true');
            li.insertAdjacentElement('afterend', clone);
            cs.focus();
            refitActive();
            saveDoc();
        } else if (e.key === 'Backspace' && !span.textContent.trim()) {
            var prev = li.previousElementSibling;
            if (!prev) return;
            e.preventDefault();
            li.remove();
            var ps = prev.querySelector('span');
            if (ps) {
                ps.focus();
                var r = document.createRange();
                r.selectNodeContents(ps);
                r.collapse(false);
                var sel = document.getSelection();
                sel.removeAllRanges();
                sel.addRange(r);
            }
            refitActive();
            saveDoc();
        }
    }

    /* --- persistence ----------------------------------------- */
    function saveDoc() {
        try {
            localStorage.setItem(LS + ':doc', stage.innerHTML);
            localStorage.setItem(LS + ':docv', '2');
        } catch (e) {
            toast('Edits are too large for this browser to remember — use Save HTML');
        }
    }

    function restoreDoc() {
        var raw;
        try {
            if (localStorage.getItem(LS + ':docv') !== '2') return false;
            raw = localStorage.getItem(LS + ':doc');
        } catch (e) { return false; }
        if (!raw) return false;
        stage.innerHTML = raw;
        slides = $$('.slide');
        total = slides.length;
        return true;
    }

    function resetDoc() {
        try {
            localStorage.removeItem(LS + ':doc');
            localStorage.removeItem(LS + ':docv');
            localStorage.removeItem(LS + ':edits');
        } catch (e) {}
        location.reload();
    }

    /* keep the search index honest after edits */
    function syncIndex() {
        slides.forEach(function (s, i) {
            var rec = DATA.slides[i];
            if (!rec) return;
            var t = s.querySelector('.s-title, .cover-title, .closing-title');
            if (t) rec.t = t.textContent.trim().replace(/\s+/g, ' ');
            var body = s.querySelector('.slide-inner');
            if (body) rec.txt = (body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 2600);
        });
    }

    /* --- save the edited deck back out as one HTML file ------- */
    function saveHtml() {
        syncIndex();
        var clone = document.documentElement.cloneNode(true);
        clone.querySelectorAll('[contenteditable]').forEach(function (e) {
            e.removeAttribute('contenteditable');
        });
        /* repeated images resolve themselves on load — don't serialise a
           second copy of their (possibly very large) data URI */
        clone.querySelectorAll('img[data-dup]').forEach(function (im) {
            im.removeAttribute('src');
        });
        clone.querySelectorAll('.slide').forEach(function (s) {
            s.classList.remove('active', 'visible');
        });
        var body = clone.querySelector('body');
        body.classList.remove('editing', 'dock-lit');
        var bar = clone.querySelector('#editBar');
        if (bar) bar.setAttribute('hidden', '');
        var kb = clone.querySelector('#killBtn');
        if (kb) kb.setAttribute('hidden', '');
        /* overlays rebuild themselves on demand — shipping their generated
           markup would carry a second copy of every thumbnail */
        ['#gridBody', '#gridChips', '#searchBody'].forEach(function (sel) {
            var el = clone.querySelector(sel);
            if (el) el.innerHTML = '';
        });
        var lb = clone.querySelector('#lbImg');
        if (lb) lb.removeAttribute('src');

        var data = clone.querySelector('#deckData');
        if (data) data.textContent = 'window.DECK = ' + JSON.stringify(DATA) + ';';

        var html = '<!DOCTYPE html>\n' + clone.outerHTML;
        var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'ess-deck-edited.html';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        toast('Saved a standalone copy with your edits');
    }

    /* -------------------------------------------------------
       EVENTS
       ------------------------------------------------------- */
    function onKey(e) {
        var typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName) ||
                     e.target.isContentEditable;

        if (!$('#searchOverlay').hidden && typing) {
            if (e.key === 'Escape') { closeAll(); return; }
            if (e.key === 'Enter') { var sel = $('.sres.sel'); sel && sel.click(); e.preventDefault(); return; }
            if (e.key === 'ArrowDown') { moveSearchSel(1); e.preventDefault(); return; }
            if (e.key === 'ArrowUp') { moveSearchSel(-1); e.preventDefault(); return; }
            return;
        }
        if (typing) { if (e.key === 'Escape') e.target.blur(); return; }

        if (!$('#lightbox').hidden) {
            if (e.key === 'Escape') { closeAll(); return; }
            if (e.key === 'ArrowRight') { lbStep(1); return; }
            if (e.key === 'ArrowLeft') { lbStep(-1); return; }
            if (e.key === '+' || e.key === '=') { zoom(1.25); return; }
            if (e.key === '-') { zoom(0.8); return; }
            if (e.key === '0') { lb.z = 1; lb.x = 0; lb.y = 0; applyLb(); return; }
            return;
        }

        if (e.key >= '0' && e.key <= '9') {
            state.jumpBuf += e.key;
            $('#jumpBuf').textContent = state.jumpBuf;
            $('#jumpPill').hidden = false;
            clearTimeout(state._jt);
            state._jt = setTimeout(commitJump, 1200);
            return;
        }
        if (e.key === 'Enter' && state.jumpBuf) { commitJump(); return; }

        switch (e.key) {
            case 'ArrowRight': case ' ': case 'PageDown':
                e.preventDefault(); next(); break;
            case 'ArrowLeft': case 'PageUp': case 'Backspace':
                e.preventDefault(); prev(); break;
            case 'ArrowDown': e.preventDefault(); next(); break;
            case 'ArrowUp': e.preventDefault(); prev(); break;
            case 'Home': show(0); break;
            case 'End': show(total - 1); break;
            case 'g': case 'G': $('#gridOverlay').hidden ? openOv('#gridOverlay') : closeAll(); break;
            case '/': case 's': case 'S':
                e.preventDefault();
                $('#searchOverlay').hidden ? openOv('#searchOverlay') : closeAll();
                break;
            case 'n': case 'N': toggleNotes(); break;
            case 'p': case 'P': toggleTimer(); break;
            case 't': case 'T': toggleTheme(); break;
            case 'f': case 'F': toggleFull(); break;
            case 'e': case 'E': setEditing(!state.editing); break;
            case 'w': case 'W': setTerse(!state.terse); break;
            case '?': openOv('#helpOverlay'); break;
            case 'Escape':
                if (anyOpen()) closeAll();
                else if (!$('#notesPanel').hidden) toggleNotes();
                else if (state.editing) setEditing(false);
                break;
        }
    }

    function commitJump() {
        var n = parseInt(state.jumpBuf, 10);
        state.jumpBuf = '';
        $('#jumpPill').hidden = true;
        if (n >= 1 && n <= total) show(n - 1);
    }

    function bind() {
        window.addEventListener('resize', scaleStage);
        window.addEventListener('keydown', onKey);

        /* dock */
        $$('.dk[data-act]').forEach(function (b) {
            b.addEventListener('click', function () {
                var a = b.dataset.act;
                if (a === 'next') next();
                else if (a === 'prev') prev();
                else if (a === 'grid') openOv('#gridOverlay');
                else if (a === 'search') openOv('#searchOverlay');
                else if (a === 'notes') toggleNotes();
                else if (a === 'timer') toggleTimer();
                else if (a === 'theme') toggleTheme();
                else if (a === 'full') toggleFull();
                else if (a === 'help') openOv('#helpOverlay');
                else if (a === 'edit') setEditing(!state.editing);
                else if (a === 'wording') setTerse(!state.terse);
                else if (a === 'jump') openOv('#gridOverlay');
            });
        });
        $('[data-act="timer"]').addEventListener('dblclick', function () {
            state.timer.sec = 0;
            $('#timerLabel').textContent = '00:00';
        });

        $$('[data-close]').forEach(function (b) {
            b.addEventListener('click', function () {
                if (b.closest('#notesPanel')) toggleNotes();
                else closeAll();
            });
        });

        /* click outside the panel closes an overlay */
        ['#gridOverlay', '#searchOverlay', '#helpOverlay'].forEach(function (id) {
            $(id).addEventListener('mousedown', function (e) {
                if (e.target === $(id)) closeAll();
            });
        });

        $('#searchInput').addEventListener('input', function (e) { runSearch(e.target.value); });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var t = e.target.closest && e.target.closest('.gcard, .sres');
            if (t) { e.preventDefault(); t.click(); }
        });

        /* the cover's contents list jumps to a chapter */
        stage.addEventListener('click', function (e) {
            var go = e.target.closest('[data-go]');
            if (go && !state.editing) { show(+go.dataset.go - 1); }
        });
        stage.addEventListener('keydown', function (e) {
            var go = e.target.closest && e.target.closest('[data-go]');
            if (go && (e.key === 'Enter' || e.key === ' ') && !state.editing) {
                e.preventDefault();
                show(+go.dataset.go - 1);
            }
        });

        /* figures → lightbox */
        stage.addEventListener('click', function (e) {
            if (e.target.closest('[data-more]')) {
                if ($('#notesPanel').hidden) toggleNotes();
                return;
            }
            var f = e.target.closest('.fig');
            if (!f || state.editing || f.closest('.closing-glass')) return;
            openLightbox(f);
        });
        stage.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter') return;
            var f = e.target.closest('.fig');
            if (f && !state.editing) { e.preventDefault(); openLightbox(f); }
        });

        /* lightbox controls */
        $('#lbNext').addEventListener('click', function () { lbStep(1); });
        $('#lbPrev').addEventListener('click', function () { lbStep(-1); });
        $('#lbIn').addEventListener('click', function () { zoom(1.25); });
        $('#lbOut').addEventListener('click', function () { zoom(0.8); });
        $('#lbReset').addEventListener('click', function () { lb.z = 1; lb.x = 0; lb.y = 0; applyLb(); });
        $('#lbStage').addEventListener('wheel', function (e) {
            e.preventDefault();
            zoom(e.deltaY < 0 ? 1.12 : 0.89, e.clientX, e.clientY);
        }, { passive: false });
        $('#lbStage').addEventListener('mousedown', function (e) {
            lb.drag = { x: e.clientX - lb.x, y: e.clientY - lb.y };
            this.classList.add('dragging');
        });
        window.addEventListener('mousemove', function (e) {
            if (!lb.drag) return;
            lb.x = e.clientX - lb.drag.x;
            lb.y = e.clientY - lb.drag.y;
            applyLb();
        });
        window.addEventListener('mouseup', function () {
            lb.drag = null;
            $('#lbStage').classList.remove('dragging');
        });
        $('#lightbox').addEventListener('mousedown', function (e) {
            if (e.target === this) closeAll();
        });

        /* wheel navigation on the deck (debounced) */
        var wheelLock = 0;
        window.addEventListener('wheel', function (e) {
            if (anyOpen() || !$('#notesPanel').hidden || state.editing) return;
            var now = Date.now();
            if (now - wheelLock < 620 || Math.abs(e.deltaY) < 18) return;
            wheelLock = now;
            e.deltaY > 0 ? next() : prev();
        }, { passive: true });

        /* touch */
        var t0 = null;
        window.addEventListener('touchstart', function (e) {
            if (anyOpen()) return;
            t0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
        }, { passive: true });
        window.addEventListener('touchend', function (e) {
            if (!t0 || anyOpen()) return;
            var dx = e.changedTouches[0].clientX - t0.x;
            var dy = e.changedTouches[0].clientY - t0.y;
            if (Date.now() - t0.t < 700 && Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
                dx < 0 ? next() : prev();
            }
            t0 = null;
        }, { passive: true });

        /* edit affordance: JS hover with delay (never CSS ~ sibling) */
        var hideId = null;
        var showBtn = function () {
            clearTimeout(hideId);
            $('#editToggle').classList.add('show');
        };
        var hideBtn = function () {
            hideId = setTimeout(function () {
                if (!state.editing) $('#editToggle').classList.remove('show');
            }, 400);
        };
        $('#editHotzone').addEventListener('mouseenter', showBtn);
        $('#editHotzone').addEventListener('mouseleave', hideBtn);
        $('#editToggle').addEventListener('mouseenter', showBtn);
        $('#editToggle').addEventListener('mouseleave', hideBtn);
        $('#editToggle').addEventListener('click', function () { setEditing(!state.editing); });
        $('#editDone').addEventListener('click', function () { setEditing(false); });
        $('#editSave').addEventListener('click', saveHtml);
        $('#editReset').addEventListener('click', function () {
            if (confirm('Discard every edit and restore the original deck?')) resetDoc();
        });
        $('#killBtn').addEventListener('click', removeTarget);

        /* live re-layout while typing, then persist shortly after */
        document.addEventListener('input', function (e) {
            if (!e.target.isContentEditable) return;
            var host = e.target.closest('[data-full]');
            if (host) { delete host.dataset.full; delete host.dataset.terse; }
            clearTimeout(state._fitT);
            state._fitT = setTimeout(refitActive, 90);
            clearTimeout(state._save);
            state._save = setTimeout(saveDoc, 600);
        });

        document.addEventListener('keydown', onEditKey, true);

        /* the ✕ follows whatever block the pointer is over */
        stage.addEventListener('mouseover', function (e) {
            if (!state.editing) return;
            var t = e.target.closest(KILL_SEL);
            if (t && t !== killTarget) showKill(t);
        });
        stage.addEventListener('mouseleave', function () {
            if (state.editing) setTimeout(function () {
                if (!$('#killBtn').matches(':hover')) hideKill();
            }, 260);
        });

        /* dock wakes up on pointer activity near the bottom */
        window.addEventListener('mousemove', function (e) {
            document.body.classList.toggle('dock-lit', e.clientY > window.innerHeight - 120);
        });

        /* printing needs every figure decoded, not just the ones near the cursor */
        window.addEventListener('beforeprint', function () {
            $$('img[loading="lazy"]').forEach(function (im) { im.loading = 'eager'; });
        });

        window.addEventListener('hashchange', function () {
            var m = /^#\/(\d+)$/.exec(location.hash);
            if (m) show(+m[1] - 1, { silent: true });
        });
    }

    /* -------------------------------------------------------
       BOOT
       ------------------------------------------------------- */
    function boot() {
        scaleStage();
        buildRail();
        bind();

        try {
            var th = localStorage.getItem(LS + ':theme');
            if (th) setTheme(th);
        } catch (e) {}

        var restored = restoreDoc();
        try {
            if (localStorage.getItem(LS + ':terse') === '0') setTerse(false);
        } catch (e) {}

        var start = 0;
        var m = /^#\/(\d+)$/.exec(location.hash);
        if (m) start = +m[1] - 1;
        else {
            try {
                var p = localStorage.getItem(LS + ':pos');
                if (p) start = +p - 1;
            } catch (e) {}
        }
        show(clamp(start, 0, total - 1));

        var run = function () {
            fitAll();
            show(state.i, { silent: true });
            setTimeout(warmAll, 900);
            /* late font/image work can nudge metrics — settle once more */
            setTimeout(fitAll, 1800);
            if (document.fonts && document.fonts.addEventListener) {
                document.fonts.addEventListener('loadingdone', function () {
                    clearTimeout(state._ft);
                    state._ft = setTimeout(fitAll, 80);
                });
            }
        };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
        else window.addEventListener('load', run);
        window.addEventListener('load', function () { setTimeout(fitAll, 60); });
        window.addEventListener('resize', function () {
            clearTimeout(state._ft);
            state._ft = setTimeout(fitAll, 220);
        });

        if (restored) toast('Restored your edited copy — Reset in the edit bar brings back the original');

        window.__deck = {
            show: show, fitAll: fitAll, state: state,
            edit: setEditing, save: saveHtml, reset: resetDoc, terse: setTerse
        };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
