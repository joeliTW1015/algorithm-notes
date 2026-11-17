/* Widgets for the midterm past-paper pages. */
(function () {
  'use strict';
  const { h, s, StepPlayer, table, nums, bench, legend } = UI;
  const W = (window.Widgets = window.Widgets || {});
  const CAT = { dp: 'DP', greedy: 'Greedy', amort: 'Amortized' };

  /* ---------- Hero: how often each topic appeared ---------- */
  W.examHeat = function (el) {
    const limit = Number(el.dataset.limit || 10);
    const topics = MT.TOPICS.slice().sort((a, b) => b.years.length - a.years.length).slice(0, limit);
    const max = Math.max(...topics.map((t) => t.years.length));
    const wrap = h('div', { class: 'heat' },
      h('div', { class: 'heat-cap' }, '2011–2025 期中考，各題型出現的考卷數'),
      topics.map((t, i) => h('a', { class: 'heat-row', href: t.href, style: `--d:${i * 70}ms` },
        h('span', { class: 'heat-name' }, t.name),
        h('span', { class: 'heat-bar' }, h('span', { class: 'heat-fill ' + t.cat, style: `--w:${(t.years.length / max) * 100}%` })),
        h('span', { class: 'heat-n' }, `${t.years.length}×`),
        h('span', { class: 'heat-yrs' }, t.years.map((y) => "'" + String(y).slice(2)).join(' ')))),
      h('div', { class: 'heat-legend' }, Object.entries(CAT).map(([k, v]) => h('span', null, h('i', { class: 'heat-dot ' + k }), v))));
    el.replaceWith(wrap);
    requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('go')));
  };

  /* Full ranking table (index page). */
  W.examRank = function (el) {
    const topics = MT.TOPICS.slice().sort((a, b) => b.years.length - a.years.length || a.years[0] - b.years[0]);
    const t = h('table', { class: 'plain' },
      h('tr', null, h('th', null, '#'), h('th', null, '題型'), h('th', null, '章'), h('th', { class: 'num' }, '次數'), h('th', null, '出現年份')),
      topics.map((x, i) => h('tr', null, h('td', { class: 'num' }, i + 1), h('td', null, h('a', { href: x.href }, x.name)),
        h('td', null, h('span', { class: 'yr-tag ' + x.cat }, CAT[x.cat])), h('td', { class: 'num' }, x.years.length), h('td', { class: 'mono small' }, x.years.join('、')))));
    el.replaceWith(h('div', { class: 'scroll-x' }, t));
  };

  /* ---------- Dynamic table trace ---------- */
  const DT_PRESETS = [
    ['2022 Q6', 'IIIIIDIDDDID'],
    ['2017 Q11', 'IIIIDIIDDDDI'],
    ['收縮連鎖', 'IIIIIIIIIDDDDDDD'],
    ['擴張邊界來回', 'IIIIIDIDID'],
  ];
  W.dynTable = function (el) {
    const inp = h('input', { type: 'text', value: el.dataset.ops || DT_PRESETS[0][1], spellcheck: 'false', style: 'width:260px', 'aria-label': '操作序列 I / D' });
    const err = h('div', { class: 'err' });
    const chips = h('div', { class: 'chips' }, DT_PRESETS.map(([name, ops]) => h('button', { type: 'button', onclick: () => { inp.value = ops; run(); } }, name)));
    const slots = h('div', { class: 'dt-slots' });
    const tbl = h('div', { class: 'scroll-x' });
    const sum = h('p', { class: 'small' });
    const player = new StepPlayer({ render });
    const B = bench('逐步執行', 'Dynamic table：滿了就加倍、少於 1/4 就減半',
      h('div', { class: 'inputs' }, h('label', null, '操作（I = insert、D = delete）', inp), err), chips,
      slots, tbl, legend(['cur', '這一步'], ['win', '擴張'], ['trace', '收縮']), player.el, sum);
    el.replaceWith(B.el);
    player.keys(B.el);
    let out;
    function run() {
      const ops = inp.value.toUpperCase().replace(/[^ID]/g, '');
      err.textContent = '';
      let num = 0;
      for (const c of ops) { num += c === 'I' ? 1 : -1; if (num < 0) { err.textContent = '刪除次數不能超過目前的元素個數（空的 table 不能 delete）。'; return; } }
      if (!ops.length || ops.length > 24) { err.textContent = '請輸入 1 到 24 個 I / D。'; return; }
      out = MT.dynTable(ops);
      player.load(out.steps);
      const tc = out.rows.reduce((a, r) => a + r.c, 0), ta = out.rows.reduce((a, r) => a + r.alpha, 0);
      sum.innerHTML = `總實際成本 Σc = ${tc}，總 amortized Σα = ${ta}，最後 Φ = ${out.rows[out.rows.length - 1].phi} ≥ Φ₀ = 0，所以 Σc = Σα − Φₙ ≤ Σα。每個 INSERT 的 α ≤ 3、DELETE 的 α ≤ 2。`;
    }
    function render(st) {
      const boxes = [];
      for (let k = 0; k < Math.max(st.size, 1); k++) boxes.push(h('span', { class: 'dt-slot' + (k < st.num ? ' full' : '') + (st.size === 0 ? ' none' : '') }));
      slots.replaceChildren(h('div', { class: 'small muted' }, `num = ${st.num}，size = ${st.size}，load = ${st.size ? st.num + '/' + st.size : '—'}，Φ = ${st.phi}`), h('div', { class: 'dt-row' }, boxes));
      const rows = out.rows;
      tbl.replaceChildren(table({ corner: 'i', compact: rows.length > 12,
        colHeads: rows.map((r) => ({ text: r.i })),
        rowHeads: ['op', 'num', 'size', 'c_i', 'Φ_i', 'α_i'].map((x) => ({ html: x.replace(/_i/, '<sub>i</sub>') })),
        cell(ri, ci) {
          if (ci >= st.i) return null;
          const r = rows[ci];
          const cls = ci === st.i - 1 ? 'cur' : r.event === 'expand' ? 'win' : r.event === 'contract' ? 'trace' : null;
          return { text: [r.op === 'I' ? 'ins' : 'del', r.num, r.size, r.c, r.phi, r.alpha][ri], cls };
        } }));
    }
    inp.oninput = run;
    run();
  };

  /* ---------- Resource allocation (2022 Q2) ---------- */
  W.resourceAlloc = function (el) {
    const P = [null, [0, 2, 8, 9], [0, 5, 6, 7], [0, 4, 4, 4], [0, 2, 4, 5]], m = 3, n = 4;
    const ptbl = table({ corner: 'P(i, j)', colHeads: [0, 1, 2, 3].map((j) => ({ text: 'j=' + j })), rowHeads: [1, 2, 3, 4].map((i) => ({ text: 'i=' + i })),
      cell: (r, c) => P[r + 1][c] });
    const tbl = h('div', { class: 'scroll-x' });
    const res = h('p', { class: 'small' });
    const player = new StepPlayer({ render });
    const B = bench('逐步執行', 'Resource allocation：X[i, j] 逐格填表（2022 Q2 的數據）',
      h('div', { class: 'two' }, h('div', null, h('div', { class: 'small muted' }, '利潤表 P'), ptbl), h('div', null, h('div', { class: 'small muted' }, 'X[i, j]（小字 = 給專案 i 的資源數 t）'), tbl)),
      legend('cur', 'read', 'win'), player.el, res);
    el.replaceWith(B.el);
    player.keys(B.el);
    const out = MT.resourceAlloc(P, m);
    const steps = out.steps.concat([{ X: out.X, T: out.T, final: true,
      msg: `完成：X[4, 3] = <b>${out.best}</b>。從 X[4,3] 沿著 t 往回：專案 1–4 分別給 ${out.alloc.join(', ')} 個資源。` }]);
    player.load(steps);
    res.textContent = `共 n·Σ(j+1) = ${n}·(2+3+4) = ${n * 9} 次候選比較 → O(m²n)。`;
    function render(st) {
      const path = new Set();
      if (st.final) for (let i = n, j = m; i >= 1; i--) { path.add(i + ',' + j); j -= st.T[i][j]; }
      const reads = new Set((st.reads || []).map(([a, b]) => a + ',' + b));
      tbl.replaceChildren(table({ corner: 'i \\ j', colHeads: [0, 1, 2, 3].map((j) => ({ text: j })), rowHeads: [0, 1, 2, 3, 4].map((i) => ({ text: i })),
        cell(i, j) {
          const v = st.X[i][j];
          if (v === null) return null;
          const cls = path.has(i + ',' + j) ? 'win' : i === st.i && j === st.j ? 'cur' : reads.has(i + ',' + j) ? 'read' : null;
          return { text: v, cls, sub: st.T[i] && st.T[i][j] !== null && i > 0 && j > 0 ? 't=' + st.T[i][j] : undefined };
        } }));
    }
  };

  /* ---------- Max-sum non-adjacent (2020 Q1) ---------- */
  W.nonAdjacent = function (el) {
    const inp = h('input', { type: 'text', value: el.dataset.a || '3 5 3 1 2 5 1', spellcheck: 'false', style: 'width:240px', 'aria-label': '陣列 A' });
    const err = h('div', { class: 'err' });
    const chips = h('div', { class: 'chips' }, [['2020 Q1', '3 5 3 1 2 5 1'], ['挑大的不一定對', '5 9 5 1 1'], ['全相等', '4 4 4 4 4 4']]
      .map(([nm, v]) => h('button', { type: 'button', onclick: () => { inp.value = v; run(); } }, nm)));
    const tbl = h('div', { class: 'scroll-x' });
    const player = new StepPlayer({ render });
    const B = bench('逐步執行', 'dp[i] = max(dp[i−1], dp[i−2] + A[i])',
      h('div', { class: 'inputs' }, h('label', null, 'A（正整數）', inp), err), chips, tbl, legend('cur', 'read', 'win'), player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    let A, out;
    function run() {
      A = nums(inp.value);
      err.textContent = '';
      if (!A || A.length > 16 || A.some((x) => x <= 0)) { err.textContent = '請輸入 1 到 16 個正數。'; return; }
      out = MT.maxNonAdjacent(A);
      player.load(out.steps.concat([{ i: A.length, dp: out.dp, final: true, msg: `答案 dp[${A.length}] = <b>${out.best}</b>，回溯選到 A[${out.pick.join('], A[')}]。` }]));
    }
    function render(st) {
      const pick = st.final ? new Set(out.pick) : new Set();
      tbl.replaceChildren(table({ corner: 'i', colHeads: Array.from({ length: A.length + 1 }, (_, i) => ({ text: i })), rowHeads: [{ text: 'A[i]' }, { text: 'dp[i]' }],
        cell(r, i) {
          const cls = pick.has(i) ? 'win' : !st.final && i === st.i ? 'cur' : !st.final && (i === st.i - 1 || i === st.i - 2) && i >= 0 ? 'read' : null;
          if (r === 0) return i === 0 ? '—' : { text: A[i - 1], cls };
          return i < st.dp.length ? { text: st.dp[i], cls } : null;
        } }));
    }
    inp.oninput = run;
    run();
  };

  /* ---------- Unit-time task scheduling (2021 Q3) ---------- */
  W.taskSched = function (el) {
    const pIn = h('input', { type: 'text', value: '100 19 27 25 15', spellcheck: 'false', 'aria-label': 'profit' });
    const dIn = h('input', { type: 'text', value: '2 1 2 1 3', spellcheck: 'false', 'aria-label': 'deadline' });
    const err = h('div', { class: 'err' });
    const chips = h('div', { class: 'chips' }, [['範例 1', '100 19 27 25 15', '2 1 2 1 3'], ['CLRS 風格 7 件', '70 60 50 40 30 20 10', '4 2 4 3 1 4 6'], ['deadline 都一樣', '5 9 3 7', '2 2 2 2']]
      .map(([nm, p, d]) => h('button', { type: 'button', onclick: () => { pIn.value = p; dIn.value = d; run(); } }, nm)));
    const view = h('div');
    const res = h('p', { class: 'small' });
    const player = new StepPlayer({ render });
    const B = bench('逐步執行', '利潤大的先排，放在 deadline 之前「最晚」的空格',
      h('div', { class: 'inputs' }, h('label', null, 'profit p', pIn), h('label', null, 'deadline d', dIn), err), chips, view, player.el, res);
    el.replaceWith(B.el);
    player.keys(B.el);
    let p, d, out;
    function run() {
      p = nums(pIn.value); d = nums(dIn.value);
      err.textContent = '';
      if (!p || !d || p.length !== d.length || p.length > 10 || d.some((x) => x < 1 || x !== Math.floor(x))) { err.textContent = 'p、d 長度要相同（≤ 10），deadline 是正整數。'; return; }
      out = MT.taskSchedule(p, d);
      player.load(out.steps);
      res.textContent = `Greedy 總利潤 ${out.total}；暴力枚舉所有可行子集的最佳值 ${MT.taskBrute(p, d)}。排序 O(n log n) + 每件往前找空格 O(n) → O(n²)（用 disjoint-set 可到 O(n α(n))）。`;
    }
    function render(st) {
      const T = st.slot.length - 1;
      view.replaceChildren(
        table({ corner: '', colHeads: p.map((_, i) => ({ text: 'a' + (i + 1) })), rowHeads: [{ text: 'profit' }, { text: 'deadline' }],
          cell: (r, i) => ({ text: r ? d[i] : p[i], cls: i === st.cur ? 'cur' : st.slot.includes(i) ? 'win' : null }) }),
        h('div', { class: 'small muted', style: 'margin-top:8px' }, '時間格'),
        table({ corner: 't', colHeads: Array.from({ length: T }, (_, k) => ({ text: k + 1 })), rowHeads: [{ text: '工作' }],
          cell: (_, k) => (st.slot[k + 1] === null ? null : { text: 'a' + (st.slot[k + 1] + 1), cls: st.placed === k + 1 ? 'cur' : 'win' }) }));
    }
    pIn.oninput = dIn.oninput = run;
    run();
  };

  /* ---------- Bag: maximise the number of items in O(n) ---------- */
  W.bagCount = function (el) {
    const wIn = h('input', { type: 'text', value: '7 2 9 4 1 6 3 8', spellcheck: 'false', style: 'width:220px', 'aria-label': '重量' });
    const xIn = h('input', { type: 'number', min: 0, max: 999, value: 15, 'aria-label': '容量 x' });
    const err = h('div', { class: 'err' });
    const view = h('div');
    const res = h('p', { class: 'small' });
    const player = new StepPlayer({ render });
    const B = bench('逐步執行', '用中位數切一半：輕的一半放得下就全拿',
      h('div', { class: 'inputs' }, h('label', null, '重量 w', wIn), h('label', null, '容量 x', xIn), err), view, legend(['win', '已裝進袋子'], ['read', '這一輪的輕半邊'], ['cur', '中位數']), player.el, res);
    el.replaceWith(B.el);
    player.keys(B.el);
    let w, out;
    function run() {
      w = nums(wIn.value);
      const x = Math.max(0, Math.min(999, Number(xIn.value) || 0));
      err.textContent = '';
      if (!w || w.length > 16 || w.some((v) => v <= 0)) { err.textContent = '請輸入 1 到 16 個正數。'; return; }
      out = MT.bagMaxCount(w, x);
      const done = { S: [], L: [], m: null, final: true, msg: `最多裝 <b>${out.count}</b> 件：{${out.taken.join(', ')}}。每一輪問題至少縮小一半：T(n) = T(n/2) + O(n) = O(n)。` };
      let acc = [];
      const steps = out.steps.map((st) => { const r = Object.assign({}, st, { taken: acc.slice() }); if (st.fit) acc = acc.concat(st.L); return r; });
      done.taken = out.taken;
      player.load(steps.concat([done]));
      res.textContent = '對照：先排序再從輕的拿也能得到同樣的件數，但要 O(n log n)。';
    }
    function render(st) {
      const taken = st.taken || [];
      const all = w.slice().sort((a, b) => a - b);
      const used = taken.slice();
      view.replaceChildren(h('div', { class: 'bag-row' }, all.map((v) => {
        const k = used.indexOf(v);
        const isTaken = k >= 0; if (isTaken) used.splice(k, 1);
        const cls = isTaken ? 'win' : v === st.m && !st.final ? 'cur' : (st.L || []).includes(v) && !st.final ? 'read' : (st.S || []).includes(v) ? '' : 'na';
        return h('span', { class: 'bag-item ' + cls, style: `--h:${Math.min(100, 18 + v * 6)}px` }, v);
      })));
    }
    wIn.oninput = xIn.oninput = run;
    run();
  };

  /* ---------- Bus company (2019 Q4) ---------- */
  W.busCost = function (el) {
    const mk = (lbl, v, max) => h('input', { type: 'number', min: lbl === 'V' ? 0 : 1, max, value: v, 'aria-label': lbl });
    const N = mk('N', 23, 200), M = mk('M', 5, 50), X = mk('X', 30, 999), V = mk('V', 2, 99);
    const out = h('div');
    const B = bench('試試看', '公車：每台 X 元；超過 M 人的車，車上每人賠 V 元',
      h('div', { class: 'inputs' }, h('label', null, 'N 人', N), h('label', null, 'M', M), h('label', null, 'X', X), h('label', null, 'V', V)), out);
    el.replaceWith(B.el);
    function run() {
      const n = clamp(N, 1, 200), m = clamp(M, 1, 50), x = clamp(X, 1, 999), v = clamp(V, 0, 99);
      const r = MT.busCost(n, m, x, v), brute = MT.busBrute(n, m, x, v);
      out.replaceChildren(h('table', { class: 'plain small' },
        h('tr', null, h('th', null, '方案'), h('th', null, '成本')),
        h('tr', { class: r.plan === 'comfy' || r.plan === 'one' ? 'best' : null }, h('td', null, `都不超載：⌈N/M⌉ = ${Math.ceil(n / m)} 台`), h('td', { class: 'num' }, `${Math.ceil(n / m)}·${x} = ${r.comfy}`)),
        n > m ? h('tr', { class: r.plan === 'packed' ? 'best' : null }, h('td', null, '全部塞 1 台'), h('td', { class: 'num' }, `${x} + ${v}·${n} = ${r.packed}`)) : null),
        h('p', { class: 'small' }, `公式答案 ${r.cost}；DP 暴力（枚舉每台車的人數）${brute} ${r.cost === brute ? '✓ 一樣' : '✗'}。`));
    }
    [N, M, X, V].forEach((i) => (i.oninput = run));
    run();
  };
  function clamp(inp, lo, hi) { const v = Math.floor(Number(inp.value)); return Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo)); }

  /* ---------- Stack with CUT (2022 Q7): accounting ---------- */
  W.cutStack = function (el) {
    const inp = h('input', { type: 'text', value: 'PPPOPCPPOC', spellcheck: 'false', style: 'width:220px', 'aria-label': 'P/O/C' });
    const pc = h('input', { type: 'number', min: 0, max: 5, value: 3, 'aria-label': 'PUSH 收費' });
    const err = h('div', { class: 'err' });
    const tbl = h('div', { class: 'scroll-x' });
    const res = h('p', { class: 'small' });
    const B = bench('試試看', 'Accounting：PUSH 收 $3、POP / CUT 收 $0，存款會不會變負？',
      h('div', { class: 'inputs' }, h('label', null, '操作（P = PUSH、O = POP、C = CUT）', inp), h('label', null, 'PUSH 收費', pc), err), tbl, res);
    el.replaceWith(B.el);
    function run() {
      const ops = inp.value.toUpperCase().replace(/[^POC]/g, '');
      err.textContent = '';
      if (!ops.length || ops.length > 20) { err.textContent = '請輸入 1 到 20 個 P / O / C。'; return; }
      const r = MT.cutStackRun(ops, { P: clamp(pc, 0, 5) });
      tbl.replaceChildren(table({ corner: '', colHeads: r.rows.map((x, i) => ({ text: i + 1 })), rowHeads: ['op', 'c_i', 'stack', 'bank'].map((t) => ({ html: t.replace('_i', '<sub>i</sub>') })),
        cell(ri, ci) {
          const x = r.rows[ci];
          return { text: [x.op === 'P' ? 'PUSH' : x.op === 'O' ? 'POP' : 'CUT', x.c, x.s, x.bank][ri], cls: x.bank < 0 ? 'bad' : x.op === 'C' ? 'trace' : null };
        } }));
      res.innerHTML = r.minBank >= 0 ? `存款最低 ${r.minBank} ≥ 0 ✓ → 總實際成本 ${r.actual} ≤ 總收費。`
        : `<b>存款變成 ${r.minBank}</b>：收費不夠付 CUT 的 2s。`;
    }
    inp.oninput = pc.oninput = run;
    run();
  };
})();
