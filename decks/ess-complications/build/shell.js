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
        timer: { on: false, sec: 0, id: null },
        jumpBuf: ''
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
        f.style.setProperty('--fit', 1);
        var s = 1, guard = 0;
        var over = function () {
            return multicol ? f.scrollWidth > f.clientWidth + 1
                            : f.scrollHeight > pb.clientHeight + 1;
        };
        while (over() && s > 0.44 && guard++ < 50) {
            s -= 0.025;
            f.style.setProperty('--fit', s.toFixed(3));
        }
        pb.dataset.fit = s.toFixed(2);
    }

    function fitAll() {
        $$('.figbox').forEach(solveGrid);
        $$('.panel-body').forEach(fitPanel);
    }

    /* -------------------------------------------------------
       FIGURE GRID SOLVER
       Picks the column count that maximises the total rendered
       image area for this block's real width/height, so square
       endoscopic views and wide banners both land well.
       ------------------------------------------------------- */
    function solveGrid(box) {
        var figs = $$('.fig', box);
        if (!figs.length) return;
        var W = box.clientWidth, H = box.clientHeight;
        if (!W || !H) return;

        var gap = parseFloat(getComputedStyle(box).rowGap) || 18;
        var ratios = figs.map(function (f) { return +f.dataset.ratio || 1; });
        var chrome = figs.map(function (f) {
            /* card padding + caption/chip rows steal height from the image */
            var pad = 2 * (parseFloat(getComputedStyle(f).paddingTop) || 0);
            var extra = 0;
            $$('.fig-cap, .fig-chips', f).forEach(function (el) { extra += el.offsetHeight || 26; });
            return pad + extra;
        });

        var best = null;
        for (var cols = 1; cols <= Math.min(figs.length, 6); cols++) {
            var spans = ratios.map(function (r) { return (cols >= 3 && r > 2.4) ? 2 : 1; });
            var cells = spans.reduce(function (a, b) { return a + b; }, 0);
            var rows = Math.ceil(cells / cols);
            var cw = (W - (cols - 1) * gap) / cols;
            var chh = (H - (rows - 1) * gap) / rows;
            if (cw < 60 || chh < 60) continue;
            var area = 0;
            for (var i = 0; i < figs.length; i++) {
                var availW = cw * spans[i] + (spans[i] - 1) * gap - 28;
                var availH = chh - chrome[i];
                if (availH < 24) { area = -1; break; }
                var h = Math.min(availH, availW / ratios[i]);
                area += h * h * ratios[i];
            }
            if (area > 0 && (!best || area > best.area)) best = { area: area, cols: cols, spans: spans };
        }
        if (!best) best = { cols: Math.min(figs.length, 3), spans: ratios.map(function () { return 1; }) };

        box.style.setProperty('--cols', best.cols);
        box.dataset.cols = best.cols;
        figs.forEach(function (f, i) { f.classList.toggle('span2', best.spans[i] === 2); });
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
        state.i = clamp(i, 0, total - 1);
        slides.forEach(function (s, k) {
            var on = k === state.i;
            s.classList.toggle('active', on);
            s.classList.toggle('visible', on);
        });
        var n = state.i + 1;
        var ch = DATA.chapters[chapterOf(n)];

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
                    ? '<div class="gthumb"><img loading="lazy" src="assets/img/' + s.thumb + '" alt=""></div>'
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

    function openLightbox(fig) {
        lb.figs = $$('.fig', slides[state.i]);
        lb.k = Math.max(0, lb.figs.indexOf(fig));
        $('#lightbox').hidden = false;
        loadLb();
    }

    function loadLb() {
        var f = lb.figs[lb.k];
        if (!f) return;
        $('#lbImg').src = f.dataset.src;
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
       INLINE EDITING — autosaves to localStorage
       ------------------------------------------------------- */
    var EDIT_SEL = '.s-title, .b span, .fig-cap, .chip, .cover-title, .closing-title, .tr-title, .tg h4, .src, .b1 span';

    function setEditing(on) {
        state.editing = on;
        document.body.classList.toggle('editing', on);
        $('#editToggle').classList.toggle('on', on);
        $$(EDIT_SEL).forEach(function (el) {
            if (on) el.setAttribute('contenteditable', 'true');
            else el.removeAttribute('contenteditable');
        });
        toast(on ? 'Edit mode on — click any text, changes save automatically' : 'Edit mode off');
        if (!on) fitAll();
    }

    function saveEdits() {
        var map = {};
        slides.forEach(function (s, i) {
            $$(EDIT_SEL, s).forEach(function (el, k) { map[i + ':' + k] = el.innerHTML; });
        });
        try { localStorage.setItem(LS + ':edits', JSON.stringify(map)); } catch (e) {}
    }

    function restoreEdits() {
        var raw;
        try { raw = localStorage.getItem(LS + ':edits'); } catch (e) { return; }
        if (!raw) return;
        var map;
        try { map = JSON.parse(raw); } catch (e) { return; }
        slides.forEach(function (s, i) {
            $$(EDIT_SEL, s).forEach(function (el, k) {
                var v = map[i + ':' + k];
                if (v !== undefined && v !== el.innerHTML) el.innerHTML = v;
            });
        });
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

        document.addEventListener('input', function (e) {
            if (e.target.isContentEditable) {
                clearTimeout(state._save);
                state._save = setTimeout(saveEdits, 500);
            }
        });

        /* dock wakes up on pointer activity near the bottom */
        window.addEventListener('mousemove', function (e) {
            document.body.classList.toggle('dock-lit', e.clientY > window.innerHeight - 120);
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

        restoreEdits();

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

        var run = function () { fitAll(); show(state.i, { silent: true }); };
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
        else window.addEventListener('load', run);
        window.addEventListener('resize', function () {
            clearTimeout(state._ft);
            state._ft = setTimeout(fitAll, 220);
        });

        window.__deck = { show: show, fitAll: fitAll, state: state };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
