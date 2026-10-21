/* Widgets for "elements of DP" and a few exercises: Fibonacci, merge sort tree, longest path. */
(function () {
  'use strict';
  const { h, s, tree, bench } = UI;
  const W = (window.Widgets = window.Widgets || {});

  /* Fibonacci recursion tree vs memoization. */
  W.fibTree = function (el) {
    const nIn = h('input', { type: 'range', min: 2, max: 7, value: el.dataset.n || 5, 'aria-label': 'n' });
    const nLab = h('b');
    const memo = h('input', { type: 'checkbox' });
    const stats = h('p', { class: 'small' });
    const holder = h('div', { class: 'scroll-x' });
    const B = bench('遞迴樹', 'FIB(n)：重複子問題長什麼樣子',
      h('div', { class: 'inputs' },
        h('label', null, h('span', null, 'n = ', nLab), nIn),
        h('label', { style: 'flex-direction:row;align-items:center;gap:6px;font-family:var(--f-body);font-size:14.5px;color:var(--ink)' }, memo, '用 memoization')),
      stats, holder);
    el.replaceWith(B.el);
    function run() {
      const n = Number(nIn.value);
      nLab.textContent = n;
      const t = DP.fibTree(n);
      const total = DP.countNodes(t);
      const info = DP.markMemo(t);
      (function mark(x, under) {
        if (x.pruned || under) { x.cls = 'dup'; if (memo.checked) x.children = []; }
        x.children.forEach((c) => mark(c, x.pruned || under));
      })(t, false);
      t.cls = 'hot';
      holder.replaceChildren(tree(t, { gap: 40, levelH: 54, r: 16, aria: 'Fibonacci recursion tree' }));
      stats.innerHTML = memo.checked
        ? `memo 版本只有 <b>${info.calls}</b> 次呼叫，其中 <b>${info.computed}</b> = n + 1 個子問題真的在算 → Θ(n)。`
        : `直接遞迴共 <b>${total}</b> 次呼叫（指數成長，約 φ<sup>n</sup>）。灰色虛線都是之前算過的 F 值。`;
    }
    nIn.oninput = memo.onchange = run;
    run();
  };

  /* Fibonacci subproblem graph (Exercise 14.1-6). */
  W.fibGraph = function (el) {
    const nIn = h('input', { type: 'number', min: 1, max: 10, value: 5, 'aria-label': 'n' });
    const out = h('div', { class: 'scroll-x' });
    const B = bench('Subproblem graph', 'FIB(n) 的子問題圖', h('div', { class: 'inputs' }, h('label', null, 'n', nIn)), out);
    el.replaceWith(B.el);
    function run() {
      const n = Math.max(1, Math.min(10, Number(nIn.value) || 1));
      const gap = 70, Wd = gap * n + 60, Ht = 130, y = 46;
      const svg = s('svg', { class: 'tree', viewBox: `0 0 ${Wd} ${Ht}`, width: Wd, role: 'img', 'aria-label': 'Fibonacci subproblem graph' });
      const x = (k) => 30 + (n - k) * gap;
      svg.append(s('defs', null, s('marker', { id: 'ah', viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, s('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#4b5b6f' }))));
      let edges = 0;
      for (let k = n; k >= 2; k--) {
        svg.append(s('line', { class: 'edge', x1: x(k) + 17, y1: y, x2: x(k - 1) - 18, y2: y, 'marker-end': 'url(#ah)' }));
        svg.append(s('path', { class: 'edge', d: `M${x(k)},${y + 17} Q${(x(k) + x(k - 2)) / 2},${y + 70} ${x(k - 2)},${y + 18}`, 'marker-end': 'url(#ah)' }));
        edges += 2;
      }
      for (let k = n; k >= 0; k--) {
        const g = s('g', { class: 'node' + (k === n ? ' hot' : ''), transform: `translate(${x(k)},${y})` });
        g.append(s('circle', { r: 17 }), s('text', null, 'F' + k));
        svg.append(g);
      }
      out.replaceChildren(svg, h('p', { class: 'small' }, `頂點 F0…F${n}：${n + 1} 個；每個 Fk（k ≥ 2）有兩條邊指向 F(k−1)、F(k−2)：共 2(n − 1) = ${edges} 條邊。`));
    }
    nIn.oninput = run;
    run();
  };

  /* Merge sort recursion tree on 16 elements (Exercise 14.3-2). */
  W.mergeTree = function (el) {
    const t = DP.mergeSortTree(1, 16);
    const keys = new Set();
    let dup = 0;
    (function walk(x) { if (keys.has(x.key)) dup++; keys.add(x.key); x.children.forEach(walk); })(t);
    const B = bench('遞迴樹', 'MERGE-SORT(A, 1, 16)：每個子問題都不一樣',
      h('div', { class: 'scroll-x' }, tree(t, { shape: 'rect', w: 44, hgt: 26, gap: 50, levelH: 56, aria: 'merge sort recursion tree' })),
      h('p', { class: 'small' }, `共 ${DP.countNodes(t)} 個節點，${keys.size} 個不同的子陣列區間，重複出現 ${dup} 次。`));
    el.replaceWith(B.el);
  };

  /* Shortest vs longest simple path on the 4-vertex graph of the slides. */
  W.pathDemo = function (el) {
    const V = ['q', 'r', 's', 't'];
    const pos = { q: [60, 50], r: [250, 50], s: [60, 200], t: [250, 200] };
    const E = [['q', 'r'], ['r', 'q'], ['q', 's'], ['s', 'q'], ['r', 't'], ['t', 'r'], ['s', 't'], ['t', 's']];
    const adj = {};
    V.forEach((v) => (adj[v] = E.filter((e) => e[0] === v).map((e) => e[1])));
    const from = h('select', { 'aria-label': '起點' }, V.map((v) => h('option', { value: v, selected: v === 'q' }, v)));
    const to = h('select', { 'aria-label': '終點' }, V.map((v) => h('option', { value: v, selected: v === 't' }, v)));
    const pic = h('div');
    const list = h('div');
    const B = bench('實驗', '列出所有 simple path，看最短 / 最長',
      h('div', { class: 'inputs' }, h('label', null, '從', from), h('label', null, '到', to)),
      h('div', { class: 'two', style: 'align-items:start' }, pic, list));
    el.replaceWith(B.el);
    function paths(a, b) {
      const out = [];
      (function dfs(v, path) {
        if (v === b) { out.push(path.slice()); return; }
        for (const w of adj[v]) if (!path.includes(w)) { path.push(w); dfs(w, path); path.pop(); }
      })(a, [a]);
      return out.sort((x, y) => x.length - y.length);
    }
    function draw(hiPath) {
      const svg = s('svg', { class: 'tree', viewBox: '0 0 310 250', width: 310, role: 'img', 'aria-label': 'graph' });
      svg.append(s('defs', null,
        s('marker', { id: 'pa', viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, s('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#4b5b6f' })),
        s('marker', { id: 'pb', viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, s('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#128a58' }))));
      const on = new Set();
      if (hiPath) for (let i = 0; i + 1 < hiPath.length; i++) on.add(hiPath[i] + hiPath[i + 1]);
      E.forEach(([a, b]) => {
        const [x1, y1] = pos[a], [x2, y2] = pos[b];
        const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
        const off = 6; // offset the two directions of an edge
        const ox = -uy * off, oy = ux * off;
        const hot = on.has(a + b);
        svg.append(s('line', { class: 'edge', x1: x1 + ux * 22 + ox, y1: y1 + uy * 22 + oy, x2: x2 - ux * 22 + ox, y2: y2 - uy * 22 + oy,
          'marker-end': hot ? 'url(#pb)' : 'url(#pa)', style: hot ? 'stroke:#128a58;stroke-width:3' : null }));
      });
      V.forEach((v) => {
        const g = s('g', { class: 'node' + (hiPath && hiPath.includes(v) ? ' win' : ''), transform: `translate(${pos[v][0]},${pos[v][1]})` });
        g.append(s('circle', { r: 18 }), s('text', null, v));
        svg.append(g);
      });
      pic.replaceChildren(svg);
    }
    function run() {
      const a = from.value, b = to.value;
      if (a === b) { list.replaceChildren(h('p', null, '起點和終點請選不同的頂點。')); draw(null); return; }
      const P = paths(a, b);
      const minL = P[0].length - 1, maxL = P[P.length - 1].length - 1;
      list.replaceChildren(h('table', { class: 'plain', style: 'margin-top:0' },
        h('tr', null, h('th', null, 'simple path'), h('th', { class: 'num' }, '邊數'), h('th', null, '')),
        P.map((p) => {
          const tr = h('tr', { style: 'cursor:pointer', tabindex: 0 },
            h('td', { class: 'mono' }, p.join(' → ')), h('td', { class: 'num' }, p.length - 1),
            h('td', { class: 'small' }, (p.length - 1 === minL ? '最短 ' : '') + (p.length - 1 === maxL ? '最長' : '')));
          tr.onmouseenter = tr.onfocus = () => draw(p);
          return tr;
        })),
        h('p', { class: 'small muted' }, '把滑鼠移到某一列上，圖上會畫出那條路徑。'));
      draw(P[P.length - 1]);
    }
    from.onchange = to.onchange = run;
    run();
  };
})();
