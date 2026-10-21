/* Widgets for the practice problems and homework. */
(function () {
  'use strict';
  const { h, s, StepPlayer, table, tree, nums, bench, legend } = UI;
  const W = (window.Widgets = window.Widgets || {});

  /* Staircase: F_k = F_{k-1} + F_{k-2} + F_{k-3}. */
  W.stairs = function (el) {
    const nIn = h('input', { type: 'number', min: 1, max: 30, value: 6, 'aria-label': 'n' });
    const tbl = h('div', { class: 'scroll-x' });
    const ways = h('div');
    const player = new StepPlayer({ render });
    const B = bench('逐步執行', '爬樓梯：一次走 1、2 或 3 階',
      h('div', { class: 'inputs' }, h('label', null, 'n（階數）', nIn)), tbl, player.el, ways);
    el.replaceWith(B.el);
    player.keys(B.el);
    let F, n;
    function run() {
      n = Math.max(1, Math.min(30, Number(nIn.value) || 1));
      F = DP.stairs(n);
      const steps = [{ k: 0, msg: 'Base case：F<sub>0</sub> = 1（0 階只有「不動」這一種走法）。也可以把 F<sub>1</sub> = 1、F<sub>2</sub> = 2 當 base case。' }];
      for (let k = 1; k <= n; k++) {
        const parts = [1, 2, 3].filter((m) => k - m >= 0);
        steps.push({ k, msg: `F<sub>${k}</sub>：最後一步走 ${parts.join(' / ')} 階 → 之前要先到第 ${parts.map((m) => k - m).join(' / ')} 階：` +
          `F<sub>${k}</sub> = ${parts.map((m) => `F<sub>${k - m}</sub>`).join(' + ')} = ${parts.map((m) => F[k - m]).join(' + ')} = <b>${F[k]}</b>` });
      }
      player.load(steps);
      // List the actual ways for small n.
      if (n <= 6) {
        const all = [];
        (function go(left, acc) { if (left === 0) { all.push(acc.slice()); return; } for (const m of [1, 2, 3]) if (m <= left) { acc.push(m); go(left - m, acc); acc.pop(); } })(n, []);
        ways.replaceChildren(h('p', { class: 'small' }, `n = ${n} 的全部 ${all.length} 種走法（依最後一步分組就是遞迴式的三項）：`),
          h('div', { class: 'chips' }, all.map((w) => h('span', { class: 'pill' }, w.join('+')))));
      } else ways.replaceChildren(h('p', { class: 'small muted' }, 'n ≤ 6 時會列出所有走法。'));
    }
    function render(st) {
      const cols = Array.from({ length: n + 1 }, (_, k) => ({ text: k }));
      tbl.replaceChildren(table({ corner: 'k', colHeads: cols, rowHeads: [{ html: 'F<sub>k</sub>' }], compact: n > 12,
        cell(_, k) {
          if (k > st.k) return null;
          let cls = null;
          if (k === st.k) cls = 'cur'; else if (st.k - k <= 3 && st.k > 0) cls = 'read';
          return { text: F[k], cls };
        } }));
    }
    nIn.oninput = run;
    run();
  };

  /* Longest increasing subsequence / sushi (max-sum increasing subsequence). data-mode = len | sum */
  W.incSubseq = function (el) {
    const sum = el.dataset.mode === 'sum';
    const inp = h('input', { type: 'text', value: el.dataset.a || (sum ? '3 9 2 5 7 4 8' : '11 17 5 8 6 4 7 12 3'), spellcheck: 'false', 'aria-label': '序列', style: 'width:300px' });
    const err = h('div', { class: 'err' });
    const tbl = h('div', { class: 'scroll-x' });
    const res = h('div');
    const name = sum ? 'S' : 'L';
    const player = new StepPlayer({ render });
    const B = bench('逐步執行', sum ? '壽司：價格遞增、總價最大' : 'LIS：以 A[i] 結尾的最長遞增子序列',
      h('div', { class: 'inputs' }, h('label', null, sum ? '每盤價格（由左到右）' : '序列 A', inp), err),
      tbl, legend(['cur', `正在算 ${name}[i]`], ['read', '正在比較的 j'], ['win', '最佳解']), player.el, res);
    el.replaceWith(B.el);
    player.keys(B.el);
    let A, out;
    function run() {
      A = nums(inp.value);
      err.textContent = '';
      if (!A || A.length > 16) { err.textContent = '請輸入 1 到 16 個數字。'; return; }
      out = DP.increasingSubseq(A, sum ? 'sum' : 'len');
      const steps = out.steps.slice();
      steps.push({ i: null, j: null, D: out.D, prev: out.prev, final: true,
        msg: `全部算完。答案是所有 ${name}[i] 中的最大值 = <b>${out.best}</b>（在 i = ${out.seq[out.seq.length - 1] + 1}）。沿著 prev 往回走得到：${out.seq.map((i) => A[i]).join(', ')}。` });
      player.load(steps);
      res.replaceChildren(h('p', { class: 'small' }, `共比較 n(n−1)/2 = ${A.length * (A.length - 1) / 2} 次 → O(n²) 時間；兩個長度 n 的陣列（${name} 和 prev）→ O(n) 空間。`));
    }
    function render(st) {
      const best = st.final ? new Set(out.seq) : new Set();
      const n = A.length;
      const cols = A.map((_, i) => ({ text: i + 1 }));
      tbl.replaceChildren(table({ corner: 'i', colHeads: cols, compact: n > 10,
        rowHeads: [{ html: sum ? '價格' : 'A[i]' }, { html: `${name}[i]` }, { html: 'prev' }],
        cell(r, i) {
          let cls = null;
          if (best.has(i)) cls = 'win';
          else if (i === st.i) cls = 'cur';
          else if (i === st.j) cls = st.ok ? 'read' : 'na';
          if (r === 0) return { text: A[i], cls };
          if (r === 1) return st.D[i] === null ? null : { text: st.D[i], cls };
          return st.D[i] === null ? null : { text: st.prev[i] === -1 ? '—' : st.prev[i] + 1, cls };
        } }));
    }
    inp.oninput = run;
    run();
  };

  /* ---------- Tree MWIS ---------- */
  const PRESET_TREE = { id: 'a', w: 3, children: [
    { id: 'b', w: 5, children: [{ id: 'e', w: 1, children: [] }, { id: 'f', w: 4, children: [] }] },
    { id: 'c', w: 2, children: [{ id: 'g', w: 6, children: [] }] },
    { id: 'd', w: 4, children: [{ id: 'h', w: 2, children: [{ id: 'j', w: 3, children: [] }] }, { id: 'i', w: 1, children: [] }] },
  ] };

  function randomTree(n) {
    const nodes = [];
    for (let k = 0; k < n; k++) {
      const node = { id: String.fromCharCode(97 + k), w: 1 + Math.floor(Math.random() * 9), children: [] };
      if (k > 0) {
        // Prefer shallow parents so the drawing stays wide rather than deep.
        const par = nodes[Math.floor(Math.random() * Math.min(nodes.length, Math.max(1, Math.ceil(k * 0.7))))];
        par.children.push(node);
      }
      nodes.push(node);
    }
    return nodes[0];
  }
  const cloneTree = (t) => JSON.parse(JSON.stringify(t));

  W.treeMWIS = function (el) {
    const rnd = h('button', null, '隨機產生一棵樹');
    const reset = h('button', null, '回到範例');
    const pic = h('div', { class: 'scroll-x' });
    const player = new StepPlayer({ render });
    const B = bench('逐步執行', '樹上的最大權重獨立集（post-order 由葉往根）',
      h('div', { class: 'inputs' }, rnd, reset, h('span', { class: 'small muted' }, '節點內：名稱 / 權重；下方：in, out')),
      pic, legend(['cur', '正在計算的節點'], ['read', '它的小孩（已算好）'], ['win', '最後選進獨立集']), player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    let T, out;
    function load(t) {
      T = t;
      out = DP.treeMWIS(cloneTree(T));
      const steps = [{ id: null, val: {}, msg: '從葉子開始，每個節點 v 算兩個值：in(v) = v 在獨立集裡時，v 的子樹最大權重；out(v) = v 不在獨立集裡時的最大權重。' }, ...out.steps];
      steps.push({ id: null, val: out.val, final: true,
        msg: `root ${T.id}：答案 = max(in(${T.id}), out(${T.id})) = max(${out.val[T.id].in}, ${out.val[T.id].out}) = <b>${out.best}</b>。由上往下還原：root 若選 in 就收進來，它的小孩只能 out；否則每個小孩各自取較大的那個。選中的節點：{${[...out.chosen].join(', ')}}。` });
      player.load(steps);
    }
    function render(st) {
      const t = cloneTree(T);
      const cur = st.id;
      let curKids = [];
      (function walk(x) {
        const v = st.val[x.id];
        x.label = `${x.id}/${x.w}`;
        if (v) x.note = `${v.in}, ${v.out}`;
        if (x.id === cur) { x.cls = 'hot'; curKids = x.children.map((c) => c.id); }
        if (st.final && out.chosen.has(x.id)) x.cls = 'chosen';
        x.children.forEach(walk);
      })(t);
      (function walk(x) { if (curKids.includes(x.id)) x.cls = 'read'; x.children.forEach(walk); })(t);
      pic.replaceChildren(tree(t, { r: 20, gap: 58, levelH: 80, aria: 'tree' }));
    }
    rnd.onclick = () => load(randomTree(8 + Math.floor(Math.random() * 5)));
    reset.onclick = () => load(PRESET_TREE);
    load(PRESET_TREE);
  };

  /* ---------- k x n tiling ---------- */
  W.tiling = function (el) {
    const kIn = h('input', { type: 'number', min: 1, max: 6, value: 2, 'aria-label': 'k' });
    const nIn = h('input', { type: 'number', min: 1, max: 40, value: 3, 'aria-label': 'n' });
    const tbl = h('div', { class: 'scroll-x' });
    const gallery = h('div');
    const B = bench('計算 + 畫出來', 'k × n 棋盤用 k × 1 長條鋪滿',
      h('div', { class: 'inputs' }, h('label', null, 'k', kIn), h('label', null, 'n', nIn)), tbl, gallery);
    el.replaceWith(B.el);
    function drawTiling(k, n, seq, cell) {
      const svg = s('svg', { viewBox: `0 0 ${n * cell + 2} ${k * cell + 2}`, width: n * cell + 2, height: k * cell + 2, role: 'img', 'aria-label': seq.join('') });
      let x = 1;
      for (const t of seq) {
        if (t === 'V') {
          svg.append(s('rect', { x: x + 1.5, y: 2.5, width: cell - 3, height: k * cell - 3, rx: 3, fill: '#a9c6ef', stroke: '#17253a', 'stroke-width': 1.5 }));
          x += cell;
        } else {
          for (let r = 0; r < k; r++) svg.append(s('rect', { x: x + 1.5, y: 1 + r * cell + 1.5, width: k * cell - 3, height: cell - 3, rx: 3, fill: '#b2e1c8', stroke: '#17253a', 'stroke-width': 1.5 }));
          x += k * cell;
        }
      }
      return svg;
    }
    function run() {
      const k = Math.max(1, Math.min(6, Number(kIn.value) || 1));
      const n = Math.max(1, Math.min(40, Number(nIn.value) || 1));
      const f = DP.tiling(k, n);
      tbl.replaceChildren(table({ corner: 'n', colHeads: f.map((_, i) => ({ text: i })), rowHeads: [{ html: 'f(n)' }], compact: true,
        cell(_, i) { return { text: f[i].toLocaleString(), cls: i === n ? 'cur' : (i === n - 1 || i === n - k) && n >= k ? 'read' : null }; } }));
      const note = h('p', { class: 'small' }, n >= k
        ? `f(${n}) = f(${n - 1}) + f(${n - k}) = ${f[n - 1].toLocaleString()} + ${f[n - k].toLocaleString()} = ${f[n].toLocaleString()}` + (k === 1 ? '（k = 1 時兩種放法是同一種，只有 1 種鋪法，遞迴式要特別處理）' : '')
        : `n < k：放不下橫條，只能全部直放 → f(${n}) = 1`);
      if (k === 1) { gallery.replaceChildren(h('p', { class: 'small' }, 'k = 1：每個格子就是一個 1 × 1 長條，只有 1 種鋪法。')); return; }
      const list = DP.enumerateTilings(k, n, 24);
      const cell = Math.max(10, Math.min(26, Math.floor(260 / Math.max(n, k))));
      gallery.replaceChildren(note,
        f[n] <= 24 ? h('p', { class: 'small muted' }, `全部 ${f[n]} 種鋪法（藍 = 直放的一條，綠 = ${k} 條橫放疊成 ${k}×${k} 方塊）：`) : h('p', { class: 'small muted' }, `共 ${f[n].toLocaleString()} 種，下面畫前 24 種：`),
        h('div', { class: 'tile-grid' }, list.map((seq) => drawTiling(k, n, seq, cell))));
    }
    kIn.oninput = nIn.oninput = run;
    run();
  };
})();
