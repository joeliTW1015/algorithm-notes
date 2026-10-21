/* Widgets for Lecture 14-1: rod cutting (also reused by the exercises page). */
(function () {
  'use strict';
  const { h, code, StepPlayer, table, tree, nums, bench, legend } = UI;
  const W = (window.Widgets = window.Widgets || {});

  const DEFAULT_PRICES = '1 5 8 9 10 17 17 20 24 30';

  function rod(pieces, unit, opts) {
    unit = unit || 22;
    return h('span', { class: 'rod', title: pieces.join(' + ') },
      pieces.map((len, i) => h('span', { class: 'piece' + ((opts && opts.alt && i > 0) ? ' alt' : ''), style: `width:${len * unit}px` }, len)));
  }
  W._rod = rod;

  function priceInput(value) {
    return h('input', { type: 'text', value: value || DEFAULT_PRICES, spellcheck: 'false', 'aria-label': '價格 p1…pn' });
  }
  function parsePrices(str) {
    const a = nums(str);
    if (!a || a.some((x) => x < 0)) return null;
    return [0, ...a];
  }

  /* All 2^(n-1) ways to cut a rod of length n. */
  W.rodAllCuts = function (el) {
    const prices = priceInput();
    const nIn = h('input', { type: 'number', min: 1, max: 7, value: 4, 'aria-label': 'n' });
    const err = h('div', { class: 'err' });
    const out = h('div');
    const B = bench('枚舉', '把長度 n 的鋼條所有切法都列出來',
      h('div', { class: 'inputs' }, h('label', null, '價格 p1 p2 …', prices), h('label', null, 'n（≤ 7）', nIn), err), out);
    el.replaceWith(B.el);
    function run() {
      const p = parsePrices(prices.value);
      const n = Math.max(1, Math.min(7, Number(nIn.value) || 1));
      err.textContent = '';
      if (!p) { err.textContent = '價格請輸入非負數字，用空白或逗號分隔。'; return; }
      if (p.length - 1 < n) { err.textContent = `需要至少 ${n} 個價格。`; return; }
      const all = DP.rodCompositions(n).map((pc) => ({ pc, v: pc.reduce((a, i) => a + p[i], 0) }));
      const best = Math.max(...all.map((x) => x.v));
      out.replaceChildren(
        h('p', { class: 'small muted', html: `每個 1 吋位置都可以選「切」或「不切」，共 n − 1 = ${n - 1} 個位置 → 2<sup>${n - 1}</sup> = ${all.length} 種切法。綠框是收益最大的。` }),
        h('div', { class: 'rod-grid' }, all.map((x) => h('div', { class: 'rod-card' + (x.v === best ? ' best' : '') },
          h('span', { class: 'val' }, x.v), rod(x.pc, 22), h('div', { class: 'small muted' }, x.pc.map((i) => `p${i}`).join(' + '))))));
    }
    prices.oninput = nIn.oninput = run;
    run();
  };

  /* Recursion tree of CUT-ROD(p, n) and what memoization prunes. */
  W.rodTree = function (el) {
    const nIn = h('input', { type: 'range', min: 1, max: 6, value: 4, 'aria-label': 'n' });
    const nLab = h('b', null, '4');
    const memo = h('input', { type: 'checkbox' });
    const stats = h('p', { class: 'small' });
    const holder = h('div', { class: 'scroll-x' });
    const graph = h('div');
    const B = bench('遞迴樹', 'CUT-ROD(p, n) 到底呼叫了幾次？',
      h('div', { class: 'inputs' },
        h('label', null, h('span', null, 'n = ', nLab), nIn),
        h('label', { style: 'flex-direction:row;align-items:center;gap:6px;font-family:var(--f-body);font-size:14.5px;color:var(--ink)' }, memo, '標出 memoization 後不必再算的呼叫')),
      stats, holder, graph);
    el.replaceWith(B.el);
    function run() {
      const n = Number(nIn.value);
      nLab.textContent = n;
      const t = DP.cutRodTree(n);
      const total = DP.countNodes(t);
      const info = DP.markMemo(t);
      if (memo.checked) (function mark(x) { if (x.pruned) { x.cls = 'dup'; x.children = []; } x.children.forEach(mark); })(t);
      t.cls = 'hot';
      holder.replaceChildren(tree(t, { gap: n >= 6 ? 30 : 38, levelH: 52, r: 13, aria: 'CUT-ROD recursion tree' }));
      stats.innerHTML = memo.checked
        ? `有 memo 時只剩 <b>${info.calls}</b> 次呼叫（= 1 + n(n+1)/2），其中只有 <b>${info.computed}</b> = n + 1 次真的在計算；灰色虛線框是「查表就回傳」，它底下的整棵子樹都不會發生。沒有 memo 時是 ${total} 次。`
        : `節點總數（呼叫次數）= <b>${total}</b> = 2<sup>${n}</sup>。同一個數字出現很多次，代表同一個子問題被重算。`;
      // Subproblem graph: vertices n..0, edge x -> y for every y < x.
      const N = n + 1, gap = 46, Wd = 210, Ht = gap * (N - 1) + 40;
      const svg = UI.s('svg', { class: 'tree', viewBox: `0 0 ${Wd} ${Ht}`, width: Wd, role: 'img', 'aria-label': 'subproblem graph' });
      const x0 = 60;
      for (let a = n; a >= 0; a--) for (let b = a - 1; b >= 0; b--) {
        const y1 = 20 + (n - a) * gap, y2 = 20 + (n - b) * gap;
        if (a - b === 1) svg.append(UI.s('line', { class: 'edge', x1: x0, y1, x2: x0, y2 }));
        else { const bend = 14 + (a - b) * 16; svg.append(UI.s('path', { class: 'edge', d: `M${x0},${y1} C${x0 + bend},${y1} ${x0 + bend},${y2} ${x0},${y2}` })); }
      }
      for (let a = n; a >= 0; a--) {
        const g = UI.s('g', { class: 'node' + (a === n ? ' hot' : ''), transform: `translate(${x0},${20 + (n - a) * gap})` });
        g.append(UI.s('circle', { r: 13 }), UI.s('text', null, a));
        svg.append(g);
      }
      graph.replaceChildren(h('div', { class: 'two', style: 'align-items:center;margin-top:12px' },
        h('div', null, h('h4', { style: 'margin-top:0' }, 'Subproblem graph'),
          h('p', { class: 'small' }, `把遞迴樹裡「同一個數字」的節點全部合併成一個頂點，就得到右邊的圖：${N} 個頂點（子問題數），頂點 x 有 x 條出邊（x 個選擇）。總邊數 = 0 + 1 + … + ${n} = ${n * (n + 1) / 2} → 每個子問題算一次，總時間 Θ(n²)。`)),
        svg));
    }
    nIn.oninput = memo.onchange = run;
    run();
  };

  const RODCODE = [
    'EXTENDED-BOTTOM-UP-CUT-ROD(p, n)',
    'let r[0:n] and s[1:n] be new arrays',
    'r[0] = 0',
    'for j = 1 to n            // 由短到長',
    '    q = -∞',
    '    for i = 1 to j        // 第一刀切在 i',
    '        if q < p[i] + r[j - i]',
    '            q = p[i] + r[j - i]',
    '            s[j] = i     // 記下最佳第一刀',
    '    r[j] = q',
    'return r and s',
  ];
  // The algorithm reports lines relative to its own numbering; map to this listing.
  const ROD_LINE = { 2: 3, 4: 5, 6: 7, 7: 8, 9: 10 };

  /* Bottom-up rod cutting, step by step. data-prices, data-n */
  W.rodBottomUp = function (el) {
    const prices = priceInput(el.dataset.prices);
    const nIn = h('input', { type: 'number', min: 1, max: 15, value: el.dataset.n || 8, 'aria-label': 'n' });
    const go = h('button', { class: 'primary' }, '重新計算');
    const err = h('div', { class: 'err' });
    const cd = code(RODCODE, '虛擬碼（目前執行的那行會亮起）');
    const tbl = h('div', { class: 'scroll-x' });
    const cands = h('div');
    const sol = h('div');
    const player = new StepPlayer({ code: { set: (n) => cd.set(ROD_LINE[n] || n) }, render });
    const B = bench('逐步執行', 'Bottom-up 填表：r[j] 由小到大',
      h('div', { class: 'inputs' }, h('label', null, '價格 p1 p2 …', prices), h('label', null, 'n', nIn), go, err),
      h('div', { class: 'bench-cols' }, h('div', null, tbl, legend('cur', 'read', ['win', '最佳候選']), cands), cd.el),
      player.el, sol);
    el.replaceWith(B.el);
    player.keys(B.el);
    let p, n, res;
    function run() {
      p = parsePrices(prices.value);
      n = Math.max(1, Math.min(15, Number(nIn.value) || 1));
      err.textContent = '';
      if (!p) { err.textContent = '價格請輸入非負數字，用空白或逗號分隔。'; return; }
      if (p.length - 1 < n) { err.textContent = `只有 ${p.length - 1} 個價格，n 不能超過它。`; return; }
      res = DP.rodCut(p, n);
      player.load(res.steps);
      sol.replaceChildren(
        h('h4', null, '最後一步：用 s[ ] 還原切法（PRINT-CUT-ROD-SOLUTION）'),
        h('p', { class: 'small muted' }, '從長度 n 開始：先切下 s[n]，剩下 n − s[n]，再查 s[n − s[n]]……直到剩 0。'),
        h('div', { class: 'rod-grid' }, Array.from({ length: n }, (_, k) => k + 1).map((j) => {
          const pc = DP.rodPieces(res.s, j);
          return h('div', { class: 'rod-card' }, h('span', { class: 'val' }, 'r = ' + res.r[j]), h('div', { class: 'small' }, `長度 ${j}：${pc.join(' + ')}`), rod(pc, 14));
        })));
    }
    function render(st) {
      const cols = Array.from({ length: n + 1 }, (_, j) => ({ text: j }));
      tbl.replaceChildren(table({
        corner: 'j', colHeads: cols, compact: n > 10,
        rowHeads: [{ html: 'p[j]' }, { html: 'r[j]' }, { html: 's[j]' }],
        cell(ri, j) {
          if (ri === 0) {
            if (j === 0) return { text: '—', cls: 'na' };
            return { text: p[j], cls: st.i === j ? 'read' : null };
          }
          if (ri === 1) {
            const v = st.r[j];
            let cls = null;
            if (j === st.j) cls = 'cur';
            else if (st.reads && st.reads.includes(j)) cls = 'read';
            return { text: v === null ? '' : v, cls };
          }
          if (j === 0) return { text: '—', cls: 'na' };
          const v = st.s[j];
          return { text: v === null ? '' : v, cls: j === st.j && st.better ? 'win' : null };
        },
      }));
      // Candidates for the current j.
      if (st.j) {
        const rows = [];
        for (let i = 1; i <= (st.i || (st.done ? st.j : 0)); i++) {
          const v = p[i] + st.r[st.j - i];
          rows.push(h('div', { class: 'rod-card' + (st.s[st.j] === i ? ' best' : ''), style: 'display:flex;gap:10px;align-items:center' },
            rod(st.j - i > 0 ? [i, st.j - i] : [i], 14, { alt: true }),
            h('span', { class: 'small' }, `p${i} + r[${st.j - i}] = ${p[i]} + ${st.r[st.j - i]} = `, h('b', null, v))));
        }
        cands.replaceChildren(h('div', { class: 'table-cap', style: 'text-align:left;margin-top:12px' }, `r[${st.j}] 的候選（藍 = 第一段直接賣，綠 = 剩下的用最佳解 r）`), h('div', { style: 'display:grid;gap:6px' }, rows));
      } else cands.replaceChildren();
    }
    go.onclick = run;
    run();
  };
})();
