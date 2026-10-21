/* Widgets for Lecture 14-2: matrix-chain multiplication (also reused by the exercises page). */
(function () {
  'use strict';
  const { h, code, StepPlayer, table, tree, nums, bench, legend } = UI;
  const W = (window.Widgets = window.Widgets || {});

  function dimsInput(v) {
    return h('input', { type: 'text', value: v, spellcheck: 'false', 'aria-label': '維度 p0 p1 … pn' });
  }
  function parseDims(str, maxN) {
    const d = nums(str);
    if (!d || d.length < 2 || d.some((x) => x <= 0 || !Number.isInteger(x))) return { err: '請輸入至少 2 個正整數 p0 p1 … pn（A_i 是 p_{i−1} × p_i）。' };
    if (d.length - 1 > maxN) return { err: `最多 ${maxN} 個矩陣（${maxN + 1} 個數字）。` };
    return { dims: d };
  }
  function dimsLine(d) {
    return d.slice(1).map((x, i) => `A${i + 1}: ${d[i]}×${x}`).join('　');
  }

  // Every full parenthesization with its cost.
  function allParens(d, i, j) {
    if (i === j) return [{ str: `A${i}`, cost: 0, steps: [] }];
    const out = [];
    for (let k = i; k < j; k++) {
      for (const L of allParens(d, i, k)) for (const R of allParens(d, k + 1, j)) {
        const c = d[i - 1] * d[k] * d[j];
        out.push({ str: `(${L.str}${R.str})`, cost: L.cost + R.cost + c, steps: [...L.steps, ...R.steps, `${d[i - 1]}·${d[k]}·${d[j]}`] });
      }
    }
    return out;
  }

  /* All parenthesizations and their costs. data-dims */
  W.mcmAll = function (el) {
    const inp = dimsInput(el.dataset.dims || '1 100 1 100');
    const err = h('div', { class: 'err' });
    const out = h('div');
    const B = bench('枚舉', '所有括號方式與乘法次數',
      h('div', { class: 'inputs' }, h('label', null, '維度 p0 p1 … pn（n ≤ 7）', inp), err), out);
    el.replaceWith(B.el);
    function run() {
      const r = parseDims(inp.value, 7);
      err.textContent = r.err || '';
      if (r.err) return;
      const d = r.dims, n = d.length - 1;
      const list = allParens(d, 1, n).sort((a, b) => a.cost - b.cost);
      const lo = list[0].cost, hi = list[list.length - 1].cost;
      out.replaceChildren(
        h('p', { class: 'small muted' }, dimsLine(d)),
        h('p', { class: 'small' }, `n = ${n} 個矩陣共有 P(${n}) = ${list.length} 種括號方式。最少 ${lo.toLocaleString()} 次，最多 ${hi.toLocaleString()} 次` + (lo ? `，差了 ${(hi / lo).toFixed(1)} 倍。` : '。')),
        h('div', { class: 'scroll-x', style: 'max-height:340px;overflow-y:auto' },
          h('table', { class: 'plain', style: 'margin:0' },
            h('tr', null, h('th', null, '括號方式'), h('th', null, '每次相乘的成本'), h('th', { class: 'num' }, '總次數')),
            list.map((x) => h('tr', { style: x.cost === lo ? 'background:var(--win-soft)' : null },
              h('td', { class: 'mono' }, x.str), h('td', { class: 'mono small' }, x.steps.join(' + ') || '—'), h('td', { class: 'num' }, x.cost.toLocaleString()))))));
    }
    inp.oninput = run;
    run();
  };

  /* Recursion tree of RECURSIVE-MATRIX-CHAIN(p, 1, n). */
  W.mcmTree = function (el) {
    const nIn = h('input', { type: 'range', min: 2, max: 5, value: el.dataset.n || 4, 'aria-label': 'n' });
    const nLab = h('b');
    const memo = h('input', { type: 'checkbox' });
    const stats = h('p', { class: 'small' });
    const holder = h('div', { class: 'scroll-x' });
    const B = bench('遞迴樹', 'RECURSIVE-MATRIX-CHAIN(p, 1, n) 的呼叫',
      h('div', { class: 'inputs' },
        h('label', null, h('span', null, 'n = ', nLab), nIn),
        h('label', { style: 'flex-direction:row;align-items:center;gap:6px;font-family:var(--f-body);font-size:14.5px;color:var(--ink)' }, memo, '用 memoization（查表就不再往下遞迴）')),
      stats, holder);
    el.replaceWith(B.el);
    function run() {
      const n = Number(nIn.value);
      nLab.textContent = n;
      const t = DP.mcmTree(1, n);
      const total = DP.countNodes(t);
      const info = DP.markMemo(t);
      (function mark(x, under) {
        if (x.pruned || under) { x.cls = 'dup'; if (memo.checked) x.children = []; }
        x.children.forEach((c) => mark(c, x.pruned || under));
      })(t, false);
      t.cls = 'hot';
      holder.replaceChildren(tree(t, { gap: 40, levelH: 58, r: 16, aria: 'RECURSIVE-MATRIX-CHAIN recursion tree' }));
      stats.innerHTML = memo.checked
        ? `用 memo 之後只剩 <b>${info.calls}</b> 次呼叫，其中 <b>${info.computed}</b> = n(n+1)/2 個子問題真的在算（每個 (i, j) 一次）；灰色是查表直接回傳。`
        : `總共 <b>${total}</b> 次呼叫。灰色虛線節點是「前面已經算過的 (i, j)」——同樣的子樹被整個重算（投影片上灰底的子樹）。`;
    }
    nIn.oninput = memo.onchange = run;
    run();
  };

  function mcmCode(max) {
    return [
      'let m[1:n, 1:n] and s[1:n-1, 2:n] be new tables',
      'for i = 1 to n                // chain length 1',
      '    m[i, i] = 0',
      'for l = 2 to n                // l is the chain length',
      '    for i = 1 to n - l + 1    // chain begins at A_i',
      '        j = i + l - 1         // chain ends at A_j',
      `        m[i, j] = ${max ? '-∞' : '∞'}`,
      '        for k = i to j - 1    // try A_i..k · A_k+1..j',
      '            q = m[i, k] + m[k+1, j] + p[i-1]·p[k]·p[j]',
      `            if q ${max ? '>' : '<'} m[i, j]`,
      '                m[i, j] = q   // remember this cost',
      '                s[i, j] = k   // remember this index',
      'return m and s',
    ];
  }
  const MCM_LINE = { 9: 10, 12: 12 };

  /* Bottom-up MATRIX-CHAIN-ORDER, step by step. data-dims, data-mode=max */
  W.mcmBottomUp = function (el) {
    const max = el.dataset.mode === 'max';
    const inp = dimsInput(el.dataset.dims || '30 35 15 5 10 20 25');
    const go = h('button', { class: 'primary' }, '重新計算');
    const err = h('div', { class: 'err' });
    const cd = code(mcmCode(max), `MATRIX-CHAIN-ORDER(p, n)${max ? '（改成求最大）' : ''}`);
    const dimsP = h('p', { class: 'small muted', style: 'margin:0 0 8px' });
    const tblM = h('div', { class: 'scroll-x' }), tblS = h('div', { class: 'scroll-x' });
    const cands = h('div');
    const sol = h('div');
    const player = new StepPlayer({ code: { set: (n) => cd.set(MCM_LINE[n] || n) }, render });
    const B = bench('逐步執行', max ? '求「最多」乘法次數的 m 與 s 表' : 'Bottom-up 填 m 與 s 表（依 chain length 由短到長）',
      h('div', { class: 'inputs' }, h('label', null, '維度 p0 p1 … pn（n ≤ 8）', inp), go, err),
      dimsP,
      h('div', { class: 'two' }, h('div', null, h('div', { class: 'table-cap' }, `m[i, j]：A_i…A_j 的${max ? '最多' : '最少'}乘法次數`), tblM),
        h('div', null, h('div', { class: 'table-cap' }, 's[i, j]：最佳分割點 k'), tblS)),
      legend('cur', 'read', ['win', '目前最佳 k']),
      h('div', { class: 'bench-cols', style: 'margin-top:12px' }, cands, cd.el),
      player.el, sol);
    el.replaceWith(B.el);
    player.keys(B.el);
    let d, n, res;
    function run() {
      const r = parseDims(inp.value, 8);
      err.textContent = r.err || '';
      if (r.err) return;
      d = r.dims; n = d.length - 1;
      dimsP.textContent = dimsLine(d);
      res = DP.matrixChain(d, max ? 'max' : 'min');
      player.load(res.steps);
      const t = DP.parenTree(res.s, d, 1, n);
      sol.replaceChildren(
        h('h4', null, '還原最佳括號：PRINT-OPTIMAL-PARENS(s, 1, n)'),
        h('p', null, '最佳解：', h('code', { style: 'font-size:15px' }, DP.parens(res.s, 1, n)), `，共 ${res.m[1][n].toLocaleString()} 次純量乘法。`),
        h('p', { class: 'small muted' }, `s[1, ${n}] = ${res.s[1][n] || '—'} 表示最外層切在 A${res.s[1][n] || 1} 之後；左右兩邊再各自查 s 表，遞迴下去。每個節點下方是它的結果矩陣維度。`),
        h('div', { class: 'scroll-x' }, tree(t, { shape: 'rect', w: 50, hgt: 34, gap: 58, levelH: 60, aria: 'parenthesization tree' })));
    }
    function render(st) {
      const heads = Array.from({ length: n }, (_, k) => ({ text: k + 1 }));
      const isRead = (i, j) => st.reads && st.reads.some(([a, b]) => a === i && b === j);
      tblM.replaceChildren(table({
        corner: 'i \\ j', colHeads: heads, rowHeads: heads, compact: n > 6,
        cell(ri, ci) {
          const i = ri + 1, j = ci + 1;
          if (j < i) return { text: '', cls: 'na' };
          const v = st.m[i][j];
          let cls = null;
          if (i === st.i && j === st.j) cls = 'cur'; else if (isRead(i, j)) cls = 'read';
          return { text: v === null ? '' : v.toLocaleString(), cls };
        },
      }));
      tblS.replaceChildren(table({
        corner: 'i \\ j', colHeads: heads, rowHeads: heads, compact: n > 6,
        cell(ri, ci) {
          const i = ri + 1, j = ci + 1;
          if (j <= i) return { text: '', cls: 'na' };
          const v = st.s[i][j];
          return { text: v === null ? '' : v, cls: i === st.i && j === st.j && v !== null ? 'win' : null };
        },
      }));
      if (st.i && st.j) {
        const rows = [];
        const upto = st.done ? st.j - 1 : (st.k || st.i - 1);
        for (let k = st.i; k <= upto; k++) {
          const q = st.m[st.i][k] + st.m[k + 1][st.j] + d[st.i - 1] * d[k] * d[st.j];
          rows.push(h('tr', { style: st.s[st.i][st.j] === k ? 'background:var(--win-soft)' : null },
            h('td', { class: 'mono' }, `k=${k}`),
            h('td', { class: 'mono small' }, `(A${st.i}…A${k})(A${k + 1}…A${st.j})`),
            h('td', { class: 'mono small' }, `${st.m[st.i][k]} + ${st.m[k + 1][st.j]} + ${d[st.i - 1]}·${d[k]}·${d[st.j]}`),
            h('td', { class: 'num' }, h('b', null, q.toLocaleString()))));
        }
        cands.replaceChildren(h('div', { class: 'table-cap', style: 'text-align:left' }, `m[${st.i}, ${st.j}] 的候選（l = ${st.l}）`),
          rows.length ? h('table', { class: 'plain', style: 'margin:0' }, rows) : h('p', { class: 'small muted' }, '還沒試任何 k。'));
      } else cands.replaceChildren();
    }
    go.onclick = run;
    run();
  };

  /* Greedy split (Exercise 14.3-4) vs DP. */
  W.mcmGreedy = function (el) {
    const inp = dimsInput(el.dataset.dims || '1 2 3 4');
    const err = h('div', { class: 'err' });
    const out = h('div');
    const B = bench('比較', '先選讓 p_{i−1}·p_k·p_j 最小的 k（貪婪） vs DP',
      h('div', { class: 'inputs' }, h('label', null, '維度 p0 p1 … pn', inp), err), out);
    el.replaceWith(B.el);
    function run() {
      const r = parseDims(inp.value, 12);
      err.textContent = r.err || '';
      if (r.err) return;
      const d = r.dims, n = d.length - 1;
      const g = DP.mcmGreedy(d);
      const res = DP.matrixChain(d);
      const opt = res.m[1][n];
      out.replaceChildren(h('table', { class: 'plain' },
        h('tr', null, h('th', null, '方法'), h('th', null, '括號'), h('th', { class: 'num' }, '乘法次數')),
        h('tr', null, h('td', null, '貪婪'), h('td', { class: 'mono' }, g.str), h('td', { class: 'num' }, g.cost.toLocaleString())),
        h('tr', { style: 'background:var(--win-soft)' }, h('td', null, 'DP（最佳）'), h('td', { class: 'mono' }, DP.parens(res.s, 1, n)), h('td', { class: 'num' }, opt.toLocaleString()))),
        h('p', { class: 'small' }, g.cost > opt ? `貪婪法多做了 ${(g.cost - opt).toLocaleString()} 次乘法 → 不是最佳解。` : '這組輸入貪婪法剛好也是最佳，換一組試試（例如 1 2 3 4）。'));
    }
    inp.oninput = run;
    run();
  };

  /* Count table references R(i, j) (Exercise 14.2-5). */
  W.mcmRefs = function (el) {
    const nIn = h('input', { type: 'number', min: 1, max: 12, value: 6, 'aria-label': 'n' });
    const out = h('div');
    const B = bench('驗證', '實際數一數 m 表被讀取了幾次', h('div', { class: 'inputs' }, h('label', null, 'n', nIn)), out);
    el.replaceWith(B.el);
    function run() {
      const n = Math.max(1, Math.min(12, Number(nIn.value) || 1));
      // R(i, j): how many times m[i][j] is read while filling other entries.
      const R = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));
      for (let l = 2; l <= n; l++) for (let i = 1; i <= n - l + 1; i++) {
        const j = i + l - 1;
        for (let k = i; k < j; k++) { R[i][k]++; R[k + 1][j]++; }
      }
      let total = 0;
      const heads = Array.from({ length: n }, (_, k) => ({ text: k + 1 }));
      const t = table({ corner: 'i \\ j', colHeads: heads, rowHeads: heads, compact: true,
        cell(ri, ci) { const i = ri + 1, j = ci + 1; if (j < i) return { text: '', cls: 'na' }; total += R[i][j]; return R[i][j]; } });
      out.replaceChildren(h('div', { class: 'scroll-x' }, t),
        h('p', { class: 'small' }, `表中數字 = R(i, j)。總和 = ${total}，公式 (n³ − n)/3 = (${n ** 3} − ${n})/3 = ${(n ** 3 - n) / 3} ✓`));
    }
    nIn.oninput = run;
    run();
  };
})();
