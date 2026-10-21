/* Shared UI: sidebar, step player, DP tables, trees, pseudocode. */
(function () {
  'use strict';

  const NAV = [
    { title: 'Ch14 Dynamic Programming', items: [
      { id: 'hub', href: 'index.html', text: '總覽與速查表' },
    ] },
    { title: 'Lecture 14-1', items: [
      { id: 'rod', href: 'rod-cutting.html', text: 'Rod Cutting 鋼條切割' },
    ] },
    { title: 'Lecture 14-2', items: [
      { id: 'mcm', href: 'matrix-chain.html', text: 'Matrix-Chain 矩陣鏈乘' },
      { id: 'elements', href: 'elements.html', text: '何時用 DP：兩大性質' },
    ] },
    { title: 'Lecture 14-3', items: [
      { id: 'lcs', href: 'lcs.html', text: 'LCS 最長共同子序列' },
      { id: 'obst', href: 'obst.html', text: 'Optimal BST 最佳搜尋樹' },
    ] },
    { title: '練習', items: [
      { id: 'practice', href: 'practice.html', text: 'Practice at Home & 作業' },
      { id: 'exercises', href: 'exercises.html', text: '課本習題 14.x 詳解' },
      { id: 'puzzles', href: 'puzzles.html', text: '海盜分金 & 腦力激盪' },
    ] },
  ];

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  const SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) el.setAttribute(k, v);
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  }

  /* ---------- Sidebar ---------- */
  function buildNav() {
    const side = document.querySelector('aside.side');
    if (!side) return;
    const page = side.dataset.page;
    side.append(h('a', { class: 'brand', href: page === 'home' ? 'index.html' : 'index.html' },
      '演算法筆記', h('small', null, 'ALGORITHMS · 2026 FALL')));
    for (const g of NAV) {
      const ul = h('ul');
      for (const it of g.items) {
        const li = h('li', null, h('a', { href: it.href, class: it.id === page ? 'current' : null }, it.text));
        if (it.id === page) {
          const toc = h('ul', { class: 'toc' });
          document.querySelectorAll('main h2[id]').forEach((h2) => {
            toc.append(h('li', null, h('a', { href: '#' + h2.id, 'data-for': h2.id }, h2.dataset.short || h2.textContent)));
          });
          if (toc.children.length) li.append(toc);
        }
        ul.append(li);
      }
      side.append(h('div', { class: 'group' }, h('div', { class: 'group-title' }, g.title), ul));
    }
    side.append(h('div', { class: 'group' }, h('div', { class: 'group-title' }, '其他'),
      h('ul', null, h('li', null, h('a', { href: '../index.html' }, '← 所有章節')))));

    const btn = h('button', { class: 'menu-btn', 'aria-label': '開啟目錄', 'aria-expanded': 'false' }, '☰ 目錄');
    btn.addEventListener('click', () => {
      const open = side.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    document.body.append(btn);
    side.addEventListener('click', (e) => { if (e.target.closest('a')) side.classList.remove('open'); });

    // Highlight the section currently in view.
    const links = side.querySelectorAll('.toc a');
    if (links.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) links.forEach((a) => a.classList.toggle('active', a.dataset.for === en.target.id));
        });
      }, { rootMargin: '0px 0px -70% 0px' });
      document.querySelectorAll('main h2[id]').forEach((el) => io.observe(el));
    }
  }

  /* ---------- Pseudocode ---------- */
  // lines: array of strings; '//' starts a comment. Returns {el, set(lineNo)}.
  function code(lines, title) {
    const pre = h('pre', { class: 'code' });
    const spans = lines.map((src, i) => {
      const span = h('span', { class: 'ln', 'data-n': i + 1 });
      const ci = src.indexOf('//');
      const body = ci >= 0 ? src.slice(0, ci) : src;
      span.innerHTML = esc(body).replace(/\b(for|to|downto|if|else|elseif|then|return|let|while|do|and|or|be|new)\b/g, '<span class="kw">$1</span>') +
        (ci >= 0 ? `<span class="cm">${esc(src.slice(ci))}</span>` : '');
      pre.append(span);
      return span;
    });
    const wrap = h('div', null, title ? h('div', { class: 'code-title' }, title) : null, pre);
    return {
      el: wrap,
      set(n) {
        spans.forEach((sp, i) => sp.classList.toggle('on', i + 1 === n));
        const on = spans[n - 1];
        if (on && pre.scrollHeight > pre.clientHeight) on.scrollIntoView({ block: 'nearest' });
      },
    };
  }
  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ---------- Step player ---------- */
  class StepPlayer {
    constructor(opts) {
      this.render = opts.render;
      this.code = opts.code || null;
      this.steps = [];
      this.i = 0;
      this.timer = null;
      this.say = h('div', { class: 'say', 'aria-live': 'polite' });
      this.btnFirst = h('button', { title: '回到開頭', 'aria-label': '回到開頭' }, '⏮');
      this.btnPrev = h('button', { title: '上一步（←）', 'aria-label': '上一步' }, '←');
      this.btnPlay = h('button', { class: 'primary', title: '自動播放（空白鍵）', 'aria-label': '自動播放' }, '▶ 播放');
      this.btnNext = h('button', { title: '下一步（→）', 'aria-label': '下一步' }, '→');
      this.btnLast = h('button', { title: '跳到最後', 'aria-label': '跳到最後' }, '⏭');
      this.range = h('input', { type: 'range', min: 0, max: 0, value: 0, 'aria-label': '步驟' });
      this.count = h('span', { class: 'count' });
      this.speed = h('select', { 'aria-label': '播放速度' },
        h('option', { value: 1400 }, '慢'), h('option', { value: 700, selected: true }, '中'), h('option', { value: 260 }, '快'));
      this.el = h('div', { class: 'player-wrap' },
        h('div', { class: 'player' }, this.btnFirst, this.btnPrev, this.btnPlay, this.btnNext, this.btnLast, this.range, this.count, this.speed),
        this.say);
      this.btnFirst.onclick = () => { this.stop(); this.go(0); };
      this.btnPrev.onclick = () => { this.stop(); this.go(this.i - 1); };
      this.btnNext.onclick = () => { this.stop(); this.go(this.i + 1); };
      this.btnLast.onclick = () => { this.stop(); this.go(this.steps.length - 1); };
      this.btnPlay.onclick = () => (this.timer ? this.stop() : this.play());
      this.range.oninput = () => { this.stop(); this.go(Number(this.range.value)); };
      this.speed.onchange = () => { if (this.timer) { this.stop(); this.play(); } };
      this.el.tabIndex = -1;
    }
    // Attach keyboard control to a container (arrow keys / space while focus is inside).
    keys(container) {
      container.addEventListener('keydown', (e) => {
        if (e.target.matches('input[type=text], input[type=number], select, textarea')) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); this.btnNext.click(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); this.btnPrev.click(); }
        else if (e.key === ' ' && e.target.tagName !== 'BUTTON') { e.preventDefault(); this.btnPlay.click(); }
      });
      return this;
    }
    load(steps, at) {
      this.stop();
      this.steps = steps;
      this.range.max = Math.max(0, steps.length - 1);
      this.go(at === 'end' ? steps.length - 1 : at || 0);
    }
    go(i) {
      if (!this.steps.length) return;
      this.i = Math.max(0, Math.min(this.steps.length - 1, i));
      const st = this.steps[this.i];
      this.range.value = this.i;
      this.count.textContent = `步驟 ${this.i + 1} / ${this.steps.length}`;
      this.say.innerHTML = st.msg || '';
      if (this.code) this.code.set(st.line);
      this.btnPrev.disabled = this.btnFirst.disabled = this.i === 0;
      this.btnNext.disabled = this.btnLast.disabled = this.i === this.steps.length - 1;
      this.render(st, this.i, this.steps);
    }
    play() {
      if (this.i >= this.steps.length - 1) this.go(0);
      this.btnPlay.textContent = '❚❚ 暫停';
      this.timer = setInterval(() => {
        if (this.i >= this.steps.length - 1) return this.stop();
        this.go(this.i + 1);
      }, Number(this.speed.value));
    }
    stop() {
      clearInterval(this.timer);
      this.timer = null;
      this.btnPlay.textContent = '▶ 播放';
    }
  }

  /* ---------- Tables ---------- */
  // cell(r, c) returns null (empty), a string, or {text, cls, sub, html}.
  function table(opts) {
    const t = h('table', { class: 'dp' + (opts.compact ? ' compact' : '') });
    if (opts.corner !== undefined || opts.colHeads) {
      const tr = h('tr', null, h('th', { html: opts.corner || '' }));
      opts.colHeads.forEach((c, ci) => tr.append(h('th', { class: (c.cls || '') + (c.ch ? ' ch' : ''), html: c.html !== undefined ? c.html : String(c.text !== undefined ? c.text : c) })));
      t.append(tr);
    }
    opts.rowHeads.forEach((rh, ri) => {
      const tr = h('tr', null, h('th', { class: (rh.cls || '') + (rh.ch ? ' ch' : ''), html: rh.html !== undefined ? rh.html : String(rh.text !== undefined ? rh.text : rh) }));
      opts.colHeads.forEach((_, ci) => {
        let v = opts.cell(ri, ci);
        if (v === null || v === undefined) v = { text: '', cls: 'empty' };
        else if (typeof v !== 'object') v = { text: String(v) };
        const td = h('td', { class: v.cls || null, title: v.title || null });
        if (v.html !== undefined) td.innerHTML = v.html; else td.textContent = v.text;
        if (v.sub !== undefined) td.append(h('span', { class: 'sub' }, v.sub));
        tr.append(td);
      });
      t.append(tr);
    });
    return t;
  }

  /* ---------- Trees ---------- */
  // node: {label, sub?, children[], cls?}. Leaves are spaced evenly; parents centre over children.
  function tree(root, opts) {
    opts = Object.assign({ gap: 46, levelH: 62, r: 17, shape: 'circle', w: 46, hgt: 30, pad: 24 }, opts || {});
    let leaf = 0, maxDepth = 0;
    (function lay(n, d) {
      n._d = d; maxDepth = Math.max(maxDepth, d);
      if (!n.children || !n.children.length) { n._x = leaf++ * opts.gap; return; }
      n.children.forEach((c) => lay(c, d + 1));
      n._x = (n.children[0]._x + n.children[n.children.length - 1]._x) / 2;
    })(root, 0);
    const half = opts.shape === 'circle' ? opts.r : opts.w / 2;
    const W = Math.max(1, leaf - 1) * opts.gap + 2 * (half + opts.pad);
    const H = maxDepth * opts.levelH + 2 * (half + opts.pad) + (opts.extraH || 0);
    const ox = half + opts.pad, oy = (opts.shape === 'circle' ? opts.r : opts.hgt / 2) + opts.pad;
    const svg = s('svg', { class: 'tree', viewBox: `0 0 ${W} ${H}`, width: opts.scale ? W * opts.scale : W, role: 'img', 'aria-label': opts.aria || 'tree' });
    const edges = s('g'), nodes = s('g');
    svg.append(edges, nodes);
    (function draw(n) {
      const x = ox + n._x, y = oy + n._d * opts.levelH;
      (n.children || []).forEach((c, ci) => {
        const cx = ox + c._x, cy = oy + c._d * opts.levelH;
        edges.append(s('line', { class: 'edge' + (c.edgeCls ? ' ' + c.edgeCls : ''), x1: x, y1: y, x2: cx, y2: cy }));
        if (c.edgeLabel) edges.append(s('text', { class: 'lab', x: (x + cx) / 2 + (cx < x ? -8 : 8), y: (y + cy) / 2 }, c.edgeLabel));
        draw(c);
      });
      const g = s('g', { class: 'node' + (n.cls ? ' ' + n.cls : ''), transform: `translate(${x},${y})` });
      if (n.title) g.append(s('title', null, n.title));
      const isRect = opts.shape === 'rect' || n.dummy;
      if (isRect) {
        const w = n.dummy ? Math.min(opts.w, 34) : opts.w, hh = n.dummy ? 24 : opts.hgt;
        g.append(s('rect', { x: -w / 2, y: -hh / 2, width: w, height: hh, rx: n.dummy ? 3 : 6 }));
      } else g.append(s('circle', { r: opts.r }));
      if (n.sub !== undefined) {
        g.append(s('text', { y: -6 }, n.label), s('text', { class: 'sub', y: 8 }, n.sub));
      } else g.append(s('text', null, n.label));
      if (n.note !== undefined) g.append(s('text', { class: 'sub note', y: (isRect ? opts.hgt / 2 : opts.r) + 11 }, n.note));
      if (n.id !== undefined) g.dataset.id = n.id;
      nodes.append(g);
    })(root);
    return svg;
  }

  /* ---------- Misc ---------- */
  function nums(str) {
    const parts = String(str).split(/[\s,，、;]+/).filter(Boolean);
    const out = parts.map(Number);
    if (!out.length || out.some((x) => !Number.isFinite(x))) return null;
    return out;
  }

  function bench(label, title, ...body) {
    const b = h('div', { class: 'bench-body' }, ...body);
    const el = h('section', { class: 'bench', tabindex: '-1' },
      h('div', { class: 'bench-head' }, h('span', { class: 'label' }, label), h('span', { class: 'title' }, title)), b);
    return { el, body: b };
  }

  function legend(...kinds) {
    const names = { cur: '正在計算', read: '讀取的子問題', win: '目前最佳 / 選中', trace: '回溯路徑' };
    return h('div', { class: 'legend' }, kinds.map((k) => h('span', { class: 'l-' + (typeof k === 'string' ? k : k[0]) }, typeof k === 'string' ? names[k] : k[1])));
  }

  function renderMath(el) {
    if (window.renderMathInElement) {
      window.renderMathInElement(el || document.body, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }],
        throwOnError: false,
      });
    }
  }

  window.UI = { h, s, code, StepPlayer, table, tree, nums, bench, legend, renderMath, esc };

  document.addEventListener('DOMContentLoaded', () => {
    buildNav();
    // Static pseudocode: <pre data-code="TITLE">…</pre> becomes a numbered listing.
    document.querySelectorAll('pre[data-code]').forEach((pre) => {
      let lines = pre.textContent.replace(/^\n+|\s+$/g, '').split('\n');
      const ind = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
      lines = lines.map((l) => l.slice(ind));
      const c = code(lines, pre.dataset.code || null);
      if (pre.dataset.on) pre.dataset.on.split(',').forEach((n) => c.el.querySelectorAll('.ln')[Number(n) - 1].classList.add('on'));
      pre.replaceWith(c.el);
    });
    // Mount any widgets declared with data-widget, then typeset math.
    document.querySelectorAll('[data-widget]').forEach((el) => {
      const fn = window.Widgets && window.Widgets[el.dataset.widget];
      if (fn) {
        try { fn(el); } catch (err) { console.error(err); el.textContent = '互動元件載入失敗：' + err.message; }
      }
    });
    renderMath();
    // Links like exercises.html#ex-14-2-1 open that exercise's solution.
    function openTarget() {
      const t = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (t && t.classList.contains('ex')) {
        const d = t.querySelector('details');
        if (d) d.open = true;
        t.scrollIntoView();
      }
    }
    window.addEventListener('hashchange', openTarget);
    openTarget();
  });
})();
