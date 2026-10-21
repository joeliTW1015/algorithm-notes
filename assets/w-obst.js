/* Widgets for Lecture 14-3: optimal binary search trees. */
(function () {
  'use strict';
  const { h, code, StepPlayer, table, tree, nums, bench, legend } = UI;
  const W = (window.Widgets = window.Widgets || {});
  const f2 = DP.fmt;

  const PRESETS = {
    clrs: { name: '投影片 / 課本 Figure 14.9（n = 5）', p: [0.15, 0.10, 0.05, 0.10, 0.20], q: [0.05, 0.10, 0.05, 0.05, 0.05, 0.10] },
    dict: { name: '翻譯字典（apple … spaghetti）', p: [0.21, 0.18, 0.01, 0.02, 0.04, 0.07], q: [0.01, 0.10, 0.05, 0.12, 0.04, 0.11, 0.04],
      keys: ['apple', 'banana', 'burger', 'hotdog', 'pizza', 'spaghetti'] },
    ex: { name: '習題 14.5-2（n = 7）', p: [0.04, 0.06, 0.08, 0.02, 0.10, 0.12, 0.14], q: [0.06, 0.06, 0.06, 0.06, 0.05, 0.05, 0.05, 0.05] },
  };

  // Decorate a {label, dummy, idx, children} tree for drawing.
  function decorate(t, p, q, keys) {
    (function walk(x, depth) {
      if (x.dummy) x.note = f2(q[x.idx]);
      else {
        x.sub = keys ? keys[x.idx - 1] : f2(p[x.idx]);
        if (keys) x.note = 'p=' + f2(p[x.idx]);
      }
      x.children.forEach((c) => walk(c, depth + 1));
    })(t, 1);
    return t;
  }

  function costTable(t, p, q) {
    const { total, rows } = DP.bstCost(t, p, q);
    const byDepth = {};
    rows.forEach((r) => { (byDepth[r.depth] = byDepth[r.depth] || []).push(r); });
    const lines = Object.keys(byDepth).map(Number).sort((a, b) => a - b).map((d) => {
      const rs = byDepth[d];
      const sum = rs.reduce((a, r) => a + r.prob, 0);
      return h('tr', null, h('td', { class: 'num' }, d), h('td', { class: 'mono small' }, rs.map((r) => `${r.label}(${f2(r.prob)})`).join(' ')),
        h('td', { class: 'num' }, `${d} × ${f2(sum)} = ${f2(d * sum)}`));
    });
    return h('table', { class: 'plain small', style: 'margin:8px 0' },
      h('tr', null, h('th', { class: 'num' }, '深度'), h('th', null, '節點（機率）'), h('th', { class: 'num' }, '貢獻')),
      lines, h('tr', null, h('td', { colspan: 2 }, h('b', null, '期望搜尋成本')), h('td', { class: 'num' }, h('b', null, f2(total)))));
  }

  /* The two trees from the slides (cost 2.80 vs 2.75). */
  W.bstCompare = function (el) {
    const { p: P, q } = PRESETS.clrs;
    const p = [0, ...P];
    const A = DP.treeFromSpec(['k2', ['k1', 'd0', 'd1'], ['k4', ['k3', 'd2', 'd3'], ['k5', 'd4', 'd5']]]);
    const Bt = DP.treeFromSpec(['k2', ['k1', 'd0', 'd1'], ['k5', ['k4', ['k3', 'd2', 'd3'], 'd4'], 'd5']]);
    const opts = { shape: 'circle', r: 21, gap: 46, levelH: 60, aria: 'binary search tree' };
    const B = bench('比較', '同一組機率、兩棵不同的 BST',
      h('table', { class: 'plain small', style: 'margin:0 0 10px' },
        h('tr', null, h('th', null, 'i'), ...[0, 1, 2, 3, 4, 5].map((i) => h('th', { class: 'num' }, i))),
        h('tr', null, h('th', null, 'p_i'), h('td'), ...P.map((x) => h('td', { class: 'num' }, f2(x)))),
        h('tr', null, h('th', null, 'q_i'), ...q.map((x) => h('td', { class: 'num' }, f2(x))))),
      h('div', { class: 'two' },
        h('div', null, h('h4', { style: 'margin-top:0' }, '(a) 看起來很平衡'), tree(decorate(A, p, q), opts), costTable(A, p, q)),
        h('div', null, h('h4', { style: 'margin-top:0' }, '(b) 最佳解'), tree(decorate(Bt, p, q), opts), costTable(Bt, p, q))),
      h('p', { class: 'small' }, '(b) 比較高，但機率最大的 k5（0.20）在第 2 層，機率小的 k3、k4 被放到下面。平衡 ≠ 最佳。圓圈 = key（下方數字是 p），方框 = dummy key（下方是 q）。'));
    el.replaceWith(B.el);
  };

  /* A static tree drawn from data-spec (JSON nested array); data-names optional key names. */
  W.bstSpec = function (el) {
    const t = DP.treeFromSpec(JSON.parse(el.dataset.spec));
    const names = el.dataset.names ? el.dataset.names.split(',') : null;
    (function walk(x) {
      if (names && !x.dummy) x.sub = names[x.idx - 1];
      x.children.forEach(walk);
    })(t);
    const fig = h('figure', { style: 'margin:18px 0;text-align:center' },
      tree(t, { r: names ? 28 : 18, gap: names ? 58 : 44, levelH: 58, aria: el.dataset.caption || 'tree' }),
      el.dataset.caption ? h('figcaption', { class: 'small muted' }, el.dataset.caption) : null);
    el.replaceWith(fig);
  };

  const OBSTCODE = [
    'let e[1:n+1, 0:n], w[1:n+1, 0:n], root[1:n, 1:n] be new tables',
    'for i = 1 to n + 1           // base cases',
    '    e[i, i-1] = q[i-1]       // 只有 dummy key d_(i-1)',
    '    w[i, i-1] = q[i-1]',
    'for l = 1 to n',
    '    for i = 1 to n - l + 1',
    '        j = i + l - 1',
    '        e[i, j] = ∞',
    '        w[i, j] = w[i, j-1] + p[j] + q[j]',
    '        for r = i to j        // 試每個 root',
    '            t = e[i, r-1] + e[r+1, j] + w[i, j]',
    '            if t < e[i, j]   // 新的最小值？',
    '                e[i, j] = t',
    '                root[i, j] = r',
    'return e and root',
  ];
  const OB_LINE = { 11: 12 };

  /* OPTIMAL-BST step by step. data-preset = clrs | dict | ex */
  W.obstTable = function (el) {
    const preset = h('select', { 'aria-label': '範例' }, Object.entries(PRESETS).map(([k, v]) => h('option', { value: k, selected: k === (el.dataset.preset || 'clrs') }, v.name)));
    const pIn = h('input', { type: 'text', spellcheck: 'false', 'aria-label': 'p1 … pn', style: 'width:300px' });
    const qIn = h('input', { type: 'text', spellcheck: 'false', 'aria-label': 'q0 … qn', style: 'width:300px' });
    const go = h('button', { class: 'primary' }, '重新計算');
    const err = h('div', { class: 'err' });
    const cd = code(OBSTCODE, 'OPTIMAL-BST(p, q, n)');
    const tE = h('div', { class: 'scroll-x' }), tW = h('div', { class: 'scroll-x' }), tR = h('div', { class: 'scroll-x' });
    const cands = h('div');
    const sol = h('div');
    const player = new StepPlayer({ code: { set: (n) => cd.set(OB_LINE[n] || n) }, render });
    const B = bench('逐步執行', 'Bottom-up 填 e、w、root 三張表',
      h('div', { class: 'inputs' }, h('label', null, '範例', preset), h('label', null, 'p1 … pn', pIn), h('label', null, 'q0 … qn', qIn), go, err),
      h('div', { class: 'table-row' },
        h('div', null, h('div', { class: 'table-cap' }, 'e[i, j]：k_i…k_j 的最佳期望成本'), tE),
        h('div', null, h('div', { class: 'table-cap' }, 'w[i, j]：機率總和'), tW),
        h('div', null, h('div', { class: 'table-cap' }, 'root[i, j]'), tR)),
      legend('cur', 'read', ['win', '目前最佳 root']),
      h('div', { class: 'bench-cols', style: 'margin-top:12px' }, cands, cd.el),
      player.el, sol);
    el.replaceWith(B.el);
    player.keys(B.el);
    let p, q, n, keys, res;
    function fill() {
      const P = PRESETS[preset.value];
      pIn.value = P.p.join(' ');
      qIn.value = P.q.join(' ');
    }
    function run() {
      const pa = nums(pIn.value), qa = nums(qIn.value);
      err.textContent = '';
      if (!pa || !qa || pa.some((x) => x < 0) || qa.some((x) => x < 0)) { err.textContent = '請輸入非負的機率，用空白分隔。'; return; }
      if (qa.length !== pa.length + 1) { err.textContent = `q 要比 p 多一個（p 有 ${pa.length} 個，q 需要 ${pa.length + 1} 個）。`; return; }
      if (pa.length > 8) { err.textContent = '最多 8 個 key。'; return; }
      const sum = pa.reduce((a, b) => a + b, 0) + qa.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1) > 1e-6) err.textContent = `注意：機率總和是 ${sum.toFixed(3)}，不是 1（仍然可以計算）。`;
      p = [0, ...pa]; q = qa; n = pa.length;
      const P = PRESETS[preset.value];
      keys = P.keys && P.p.join() === pa.join() ? P.keys : null;
      res = DP.optimalBST(p, q);
      player.load(res.steps);
      const t = decorate(DP.bstTree(res.root, 1, n), p, q, keys);
      sol.replaceChildren(
        h('h4', null, `結果：期望搜尋成本 e[1, ${n}] = ${f2(res.cost)}`),
        h('p', { class: 'small muted' }, `從 root[1, ${n}] = k${res.root[1][n]} 開始，左子樹查 root[1, ${res.root[1][n] - 1}]、右子樹查 root[${res.root[1][n] + 1}, ${n}]……一直遞迴（習題 14.5-1 的 CONSTRUCT-OPTIMAL-BST）。`),
        h('div', { class: 'two' },
          h('div', { class: 'scroll-x' }, tree(t, { r: keys ? 26 : 21, gap: keys ? 60 : 46, levelH: 64, aria: 'optimal BST' })),
          costTable(t, p, q)));
    }
    function render(st) {
      const has = (arr, i, j) => arr && arr.some(([a, b]) => a === i && b === j);
      const jHeads = Array.from({ length: n + 1 }, (_, j) => ({ text: j }));
      const iHeads = Array.from({ length: n + 1 }, (_, i) => ({ text: i + 1 }));
      const mk = (T, readList, isE) => table({
        corner: 'i \\ j', colHeads: jHeads, rowHeads: iHeads, compact: true,
        cell(ri, j) {
          const i = ri + 1;
          if (j < i - 1) return { text: '', cls: 'na' };
          const v = T[i][j];
          let cls = null;
          if (i === st.i && j === st.j) cls = 'cur'; else if (has(readList, i, j)) cls = 'read';
          return { text: v === null ? '' : f2(v), cls };
        },
      });
      tE.replaceChildren(mk(st.e, st.reads, true));
      tW.replaceChildren(mk(st.w, st.wRead && st.i ? st.wRead.filter(([a, b]) => !(a === st.i && b === st.j)) : null));
      const kHeads = Array.from({ length: n }, (_, k) => ({ text: k + 1 }));
      tR.replaceChildren(table({
        corner: 'i \\ j', colHeads: kHeads, rowHeads: kHeads, compact: true,
        cell(ri, ci) {
          const i = ri + 1, j = ci + 1;
          if (j < i) return { text: '', cls: 'na' };
          const v = st.root[i][j];
          return { text: v === null ? '' : v, cls: i === st.i && j === st.j && v !== null ? 'win' : null };
        },
      }));
      if (st.i && st.j) {
        const rows = [];
        const upto = st.done ? st.j : (st.r || st.i - 1);
        for (let r = st.i; r <= upto; r++) {
          const t = st.e[st.i][r - 1] + st.e[r + 1][st.j] + st.w[st.i][st.j];
          rows.push(h('tr', { style: st.root[st.i][st.j] === r ? 'background:var(--win-soft)' : null },
            h('td', { class: 'mono' }, `r=${r}`),
            h('td', { class: 'mono small' }, `e[${st.i},${r - 1}] + e[${r + 1},${st.j}] + w[${st.i},${st.j}] = ${f2(st.e[st.i][r - 1])} + ${f2(st.e[r + 1][st.j])} + ${f2(st.w[st.i][st.j])}`),
            h('td', { class: 'num' }, h('b', null, f2(t)))));
        }
        cands.replaceChildren(h('div', { class: 'table-cap', style: 'text-align:left' }, `e[${st.i}, ${st.j}] 的候選 root`),
          rows.length ? h('table', { class: 'plain', style: 'margin:0' }, rows) : h('p', { class: 'small muted' }, '先算 w，接著試每個 root。'));
      } else cands.replaceChildren();
    }
    preset.onchange = () => { fill(); run(); };
    go.onclick = run;
    fill();
    run();
  };
})();
