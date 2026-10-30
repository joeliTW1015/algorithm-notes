/* Widgets for amortized analysis (Ch16-1: super stack, binary counter, exercises 16.1-x, average case). */
(function () {
  'use strict';
  const { h, s, code, StepPlayer, table, bench } = UI;
  const W = (window.Widgets = window.Widgets || {});
  const clamp = (v, lo, hi, d) => Math.max(lo, Math.min(hi, Math.floor(Number(v)) || d));

  /* ---------- Shared drawing ---------- */
  // Bits drawn b_{k-1} … b_0 (left to right, like the slides); flipped bits are yellow.
  function bitBoxes(bits, flips, opts) {
    opts = opts || {};
    const k = bits.length, f = new Set(flips || []);
    return h('div', { class: 'bitrow' + (opts.small ? ' small' : '') },
      Array.from({ length: k }, (_, j) => {
        const i = k - 1 - j;
        return h('div', { class: 'bitcell' + (f.has(i) ? ' flip' : '') },
          h('span', { class: 'v' }, bits[i]), h('span', { class: 'ix', html: `b<sub>${i}</sub>` }));
      }));
  }

  const nice = (max, n) => {
    const raw = max / (n || 5), p = 10 ** Math.floor(Math.log10(raw || 1));
    return [1, 2, 5, 10].map((m) => m * p).find((st) => raw <= st) || p * 10;
  };

  let chartId = 0;
  // Line / bar chart. lines: [{pts:[[x,y]…], cls, label}], bars: [{x, y, cls}], xMax/yMax: axis ranges.
  function chart(o) {
    const w = o.w || 640, H = o.h || 240, L = 46, R = 14, T = 12, B = 30;
    const X = (x) => L + (x / (o.xMax || 1)) * (w - L - R);
    const Y = (y) => T + (H - T - B) * (1 - y / (o.yMax || 1));
    const svg = s('svg', { class: 'chart', viewBox: `0 0 ${w} ${H}`, role: 'img', 'aria-label': o.aria || 'chart' });
    const ys = nice(o.yMax, 5), xs = nice(o.xMax, 8);
    for (let y = 0; y <= o.yMax + 1e-9; y += ys) {
      svg.append(s('line', { class: 'grid', x1: L, x2: w - R, y1: Y(y), y2: Y(y) }),
        s('text', { class: 'tick', x: L - 6, y: Y(y) + 4, 'text-anchor': 'end' }, y));
    }
    for (let x = 0; x <= o.xMax + 1e-9; x += xs) svg.append(s('text', { class: 'tick', x: X(x), y: H - B + 16, 'text-anchor': 'middle' }, x));
    svg.append(s('line', { class: 'axis', x1: L, x2: w - R, y1: Y(0), y2: Y(0) }), s('line', { class: 'axis', x1: L, x2: L, y1: T, y2: Y(0) }));
    if (o.xLabel) svg.append(s('text', { class: 'tick', x: w - R, y: H - 2, 'text-anchor': 'end' }, o.xLabel));
    const bw = Math.max(1.5, Math.min(18, ((w - L - R) / (o.xMax || 1)) * 0.7));
    (o.bars || []).forEach((b) => {
      const y = Math.min(b.y, o.yMax);
      svg.append(s('rect', { class: 'bar' + (b.cls ? ' ' + b.cls : ''), x: X(b.x) - bw / 2, y: Y(y), width: bw, height: Math.max(0, Y(0) - Y(y)) }));
    });
    // Lines that leave the plot (e.g. the nk bound) are clipped at the top instead of bent.
    const clipId = 'clip' + ++chartId;
    svg.append(s('clipPath', { id: clipId }, s('rect', { x: L, y: T - 2, width: w - L - R, height: H - T - B + 4 })));
    const lines = s('g', { 'clip-path': `url(#${clipId})` });
    (o.lines || []).forEach((ln) => {
      const pts = ln.pts.map(([x, y]) => [X(x), Y(y)].map((v) => v.toFixed(1)).join(','));
      lines.append(s('polyline', { class: 'ln ' + (ln.cls || ''), points: pts.join(' ') }));
    });
    svg.append(lines);
    if (o.cursor !== undefined) svg.append(s('line', { class: 'cursor', x1: X(o.cursor), x2: X(o.cursor), y1: T, y2: Y(0) }));
    const legend = h('div', { class: 'chart-legend' },
      [...(o.bars && o.bars.length && o.barLabel ? [['bar', o.barLabel]] : []), ...(o.lines || []).filter((l) => l.label).map((l) => [l.cls, l.label])]
        .map(([c, t]) => h('span', { class: 'lg ' + c, html: t })));
    return h('div', { class: 'chart-wrap' }, svg, legend);
  }
  W._chart = chart;
  W._bitBoxes = bitBoxes;

  /* ---------- Hero: a 5-bit counter that keeps counting ---------- */
  W.heroCounter = function (el) {
    const K = 5, N = 32;
    const run = AM.counterRun(K, N);
    const holder = h('div'), cap = h('div', { class: 'table-cap' });
    const wrap = h('div', { class: 'hero-counter', role: 'img', 'aria-label': '5-bit 二進位計數器自動示範' }, holder, cap);
    el.replaceWith(wrap);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = reduce ? N : 1;
    function draw() {
      const st = run.steps[i];
      holder.replaceChildren(bitBoxes(st.bits, st.flips),
        chart({ w: 380, h: 170, xMax: N, yMax: 2 * N, cursor: i,
          bars: run.steps.slice(1, i + 1).map((t) => ({ x: t.i, y: t.cost, cls: t.cost >= 3 ? 'hot' : '' })), barLabel: '每次成本',
          lines: [{ pts: run.steps.slice(0, i + 1).map((t) => [t.i, t.total]), cls: 'total', label: '累計成本' },
            { pts: [[0, 0], [N, 2 * N]], cls: 'ref', label: '2n' }] }));
      cap.innerHTML = `第 ${i} 次 INCREMENT：成本 ${st.cost}，累計 <b>${st.total}</b> &lt; 2n = ${2 * i}`;
    }
    draw();
    if (!reduce) setInterval(() => { i = i >= N ? 1 : i + 1; draw(); }, 650);
  };

  /* ---------- Super stack (slides p.4–7) ---------- */
  function stackView(st) {
    const MAX = 12, items = st.stack.slice(-MAX).reverse();
    const fresh = st.op && st.op.op === 'push';
    const col = h('div', { class: 'stackviz' },
      h('div', { class: 'top-label' }, 'top'),
      items.length ? items.map((x, j) => h('div', { class: 'item' + (fresh && j === 0 ? ' new' : '') }, x)) : h('div', { class: 'empty' }, '（空的）'),
      st.stack.length > MAX ? h('div', { class: 'more' }, `… 下面還有 ${st.stack.length - MAX} 個`) : null);
    const out = h('div', { class: 'stack-out' },
      h('div', { class: 'small muted' }, '這一步拿走：'),
      st.out && st.out.length ? st.out.map((x) => h('div', { class: 'item out' }, x)) : h('div', { class: 'small muted' }, '—'));
    return h('div', { class: 'stack-pair' }, col, out);
  }

  W.superStack = function (el) {
    let ops = [];
    const kIn = h('input', { type: 'number', min: 1, max: 99, value: 3, 'aria-label': 'k' });
    const btn = (t, fn, cls) => h('button', { type: 'button', class: cls || null, onclick: () => { fn(); refresh(); } }, t);
    const controls = h('div', { class: 'inputs' },
      btn('PUSH', () => ops.push({ op: 'push' })),
      btn('POP', () => ops.push({ op: 'pop' })),
      h('label', null, 'k', kIn),
      btn('SUPER-POP(k)', () => ops.push({ op: 'superpop', k: clamp(kIn.value, 1, 99, 1) })),
      btn('復原一步', () => ops.pop()),
      btn('清空', () => (ops = [])));
    const chips = h('div', { class: 'chips' },
      h('button', { type: 'button', onclick: () => { ops = AM.randomStackOps(30, 11); refresh(); } }, '隨機 30 次'),
      h('button', { type: 'button', onclick: () => { ops = AM.randomStackOps(60, 5); refresh(); } }, '隨機 60 次'),
      h('button', { type: 'button', onclick: () => { ops = AM.worstStackOps(20); refresh(); } }, '推 19 個 + SUPER-POP(19)'),
      h('button', { type: 'button', onclick: () => { ops = []; for (let r = 0; r < 4; r++) ops.push(...AM.worstStackOps(6)); refresh(); } }, '反覆：推 5 個再全部 pop'));
    const view = h('div'), stats = h('div'), plot = h('div');
    const player = new StepPlayer({ render });
    const B = bench('自己操作', 'PUSH / POP / SUPER-POP：單次可能很貴，總和卻不超過 2n',
      controls, chips, h('div', { class: 'bench-cols', style: 'margin-top:12px' }, view, stats), plot, player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    let run;
    function refresh() {
      run = AM.stackRun(ops);
      player.load(run.steps, 'end');
    }
    function render(st, i, steps) {
      view.replaceChildren(stackView(st));
      const n = st.i, worstSingle = Math.max(0, ...steps.slice(1, i + 1).map((t) => t.cost));
      stats.replaceChildren(h('table', { class: 'plain' },
        h('tr', null, h('th', null, '操作次數 n'), h('td', { class: 'num' }, n)),
        h('tr', null, h('th', null, 'PUSH 次數'), h('td', { class: 'num' }, st.pushes)),
        h('tr', null, h('th', null, '總共被 pop 掉的個數'), h('td', { class: 'num' }, st.popped)),
        h('tr', null, h('th', null, '單次最貴'), h('td', { class: 'num' }, worstSingle)),
        h('tr', null, h('th', null, '累計實際成本'), h('td', { class: 'num' }, h('b', null, st.total))),
        h('tr', null, h('th', null, '上界 2n'), h('td', { class: 'num' }, 2 * n)),
        h('tr', null, h('th', null, '平均（amortized）'), h('td', { class: 'num' }, n ? (st.total / n).toFixed(2) : '—'))),
        h('p', { class: 'small' }, h('span', { class: 'verdict' + (st.total <= 2 * n ? '' : ' bad') }, st.total <= 2 * n ? 'total ≤ 2n' : 'total > 2n?!'),
          ' 因為 pop 掉的個數 ≤ PUSH 次數 ≤ n。'));
      const N = Math.max(10, steps.length - 1);
      plot.replaceChildren(chart({ xMax: N, yMax: Math.max(4, 2 * N, ...steps.map((t) => t.total)), cursor: n, xLabel: '第幾個操作',
        bars: steps.slice(1).map((t) => ({ x: t.i, y: t.cost, cls: t.op.op === 'superpop' ? 'hot' : '' })), barLabel: '單次成本（黃 = SUPER-POP）',
        lines: [{ pts: steps.slice(0, i + 1).map((t) => [t.i, t.total]), cls: 'total', label: '累計成本' },
          { pts: [[0, 0], [N, 2 * N]], cls: 'ref', label: '2n' }] }));
    }
    ops = AM.randomStackOps(30, 11);
    refresh();
  };

  /* ---------- Binary counter (slides p.8–14, CLRS Figure 16.2) ---------- */
  const INCCODE = [
    'INCREMENT(A, k)',
    'i = 0',
    'while i < k and A[i] == 1   // 從 b0 往上，1 翻成 0（進位）',
    '    A[i] = 0',
    '    i = i + 1',
    'if i < k',
    '    A[i] = 1                // 第一個 0 翻成 1',
  ];

  W.counter = function (el) {
    const kIn = h('input', { type: 'number', min: 2, max: 12, value: el.dataset.k || 5, 'aria-label': 'k' });
    const nIn = h('input', { type: 'number', min: 1, max: 300, value: el.dataset.n || 32, 'aria-label': 'n' });
    const chips = h('div', { class: 'chips' }, [['投影片 k = 5，數到繞回', 5, 32], ['課本 Fig. 16.2：k = 8, n = 16', 8, 16], ['k = 4, n = 40（繞回兩次多）', 4, 40], ['k = 10, n = 300', 10, 300]]
      .map(([t, k, n]) => h('button', { type: 'button', onclick: () => { kIn.value = k; nIn.value = n; run(); } }, t)));
    const now = h('div'), tableBox = h('div', { class: 'fig-scroll' }), perBit = h('div'), plot = h('div');
    const player = new StepPlayer({ render });
    const B = bench('逐步執行', 'k-bit counter：成本 = 翻轉的位元數',
      h('div', { class: 'inputs' }, h('label', null, 'k（位元數）', kIn), h('label', null, 'n（INCREMENT 次數）', nIn)), chips,
      h('div', { class: 'bench-cols', style: 'margin-top:12px' }, h('div', null, now, perBit), code(INCCODE).el),
      player.el, h('div', { class: 'two', style: 'margin-top:14px' }, tableBox, plot));
    el.replaceWith(B.el);
    player.keys(B.el);
    let k, n, res;
    function run() {
      k = clamp(kIn.value, 2, 12, 5); n = clamp(nIn.value, 1, 300, 32);
      res = AM.counterRun(k, n);
      // Figure 16.2-style table, built once; render() only moves the highlight.
      const t = h('table', { class: 'plain fig' }, h('tr', null, h('th', null, 'count'), h('th', null, '位元'), h('th', { class: 'num' }, '成本'), h('th', { class: 'num' }, '累計')));
      res.steps.forEach((st) => t.append(h('tr', null, h('td', { class: 'num' }, AM.value(st.bits)),
        h('td', { class: 'mono', html: st.bits.slice().reverse().map((b, j) => st.flips.includes(k - 1 - j) ? `<mark>${b}</mark>` : b).join(' ') }),
        h('td', { class: 'num' }, st.cost), h('td', { class: 'num' }, st.total))));
      tableBox.replaceChildren(h('div', { class: 'small muted' }, '像課本 Figure 16.2：每一列翻轉的位元以黃色標出'), t);
      player.load(res.steps, 0);
    }
    function render(st, i) {
      now.replaceChildren(bitBoxes(st.bits, st.flips),
        h('p', { class: 'small', style: 'margin:6px 0' }, `count = ${AM.value(st.bits)}　這次成本 `, h('b', null, st.cost), `　累計 ${st.total}　（2n = ${2 * i}，nk = ${i * k}）`));
      perBit.replaceChildren(h('div', { class: 'scroll-x' }, table({
        corner: '', compact: true, colHeads: Array.from({ length: k }, (_, j) => ({ html: `b<sub>${k - 1 - j}</sub>` })),
        rowHeads: [{ text: '已翻次數' }, { html: `⌊n/2<sup>i</sup>⌋` }],
        cell(r, j) {
          const b = k - 1 - j, v = r === 0 ? st.perBit[b] : Math.floor(i / 2 ** b);
          return { text: v, cls: r === 0 && st.flips.includes(b) ? 'cur' : null };
        },
      })), h('p', { class: 'small muted', style: 'margin:4px 0 0', html: `兩列永遠相同：b<sub>i</sub> 每 2<sup>i</sup> 次才翻一次。總和 = ${st.total} &lt; 2n = ${2 * i}。` }));
      [...tableBox.querySelectorAll('tr')].forEach((tr, r) => tr.classList.toggle('on', r === i + 1));
      const row = tableBox.querySelectorAll('tr')[i + 1];
      if (row) tableBox.scrollTop = Math.max(0, row.offsetTop - tableBox.clientHeight / 2);
      plot.replaceChildren(chart({ w: 520, h: 260, xMax: n, yMax: Math.max(2 * n, 4), cursor: i, xLabel: 'n',
        bars: res.steps.slice(1).map((t) => ({ x: t.i, y: t.cost, cls: t.cost >= 3 ? 'hot' : '' })), barLabel: '單次成本',
        lines: [{ pts: res.steps.slice(0, i + 1).map((t) => [t.i, t.total]), cls: 'total', label: '累計成本' },
          { pts: [[0, 0], [n, 2 * n]], cls: 'ref', label: '2n' },
          { pts: [[0, 0], [n, n * k]], cls: 'naive', label: 'nk（粗略上界）' }] }));
    }
    kIn.onchange = nIn.onchange = run;
    run();
  };

  /* ---------- 16.1-2: INCREMENT + DECREMENT ---------- */
  W.incDec = function (el) {
    const kIn = h('input', { type: 'number', min: 2, max: 10, value: 6, 'aria-label': 'k' });
    let ops = [];
    const btn = (t, fn) => h('button', { type: 'button', onclick: () => { fn(); refresh(); } }, t);
    const presets = h('div', { class: 'chips' },
      btn('DEC, INC 交替 24 次', () => { ops = Array.from({ length: 24 }, (_, i) => (i % 2 ? 'inc' : 'dec')); }),
      btn('只有 INC 24 次', () => { ops = Array(24).fill('inc'); }),
      btn('先 INC 到 011…1，再 INC/DEC 交替', () => { const m = 2 ** (clamp(kIn.value, 2, 10, 6) - 1) - 1; ops = [...Array(m).fill('inc'), ...Array.from({ length: 24 }, (_, i) => (i % 2 ? 'dec' : 'inc'))]; }));
    const now = h('div'), plot = h('div');
    const player = new StepPlayer({ render });
    const B = bench('16.1-2', '加入 DECREMENT 後，對手可以讓每次都翻 k 個位元',
      h('div', { class: 'inputs' }, h('label', null, 'k', kIn), btn('INCREMENT', () => ops.push('inc')), btn('DECREMENT', () => ops.push('dec')), btn('復原一步', () => ops.pop()), btn('清空', () => (ops = []))),
      presets, h('div', { style: 'margin-top:12px' }, now), plot, player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    let k, res;
    function refresh() { k = clamp(kIn.value, 2, 10, 6); res = AM.counterRun(k, ops); player.load(res.steps, 'end'); }
    function render(st, i) {
      now.replaceChildren(bitBoxes(st.bits, st.flips),
        h('p', { class: 'small', style: 'margin:6px 0' }, `count = ${AM.value(st.bits)}　這次 ${st.op ? (st.op === 'inc' ? 'INCREMENT' : 'DECREMENT') : '—'} 成本 `, h('b', null, st.cost),
          `　累計 ${st.total}　（2n = ${2 * i}，nk = ${i * k}）`));
      const N = Math.max(8, res.steps.length - 1);
      plot.replaceChildren(chart({ xMax: N, yMax: Math.max(N * k, 4), cursor: i, xLabel: '第幾個操作',
        bars: res.steps.slice(1).map((t) => ({ x: t.i, y: t.cost, cls: t.op === 'dec' ? 'hot' : '' })), barLabel: '單次成本（黃 = DECREMENT）',
        lines: [{ pts: res.steps.slice(0, i + 1).map((t) => [t.i, t.total]), cls: 'total', label: '累計成本' },
          { pts: [[0, 0], [N, 2 * N]], cls: 'ref', label: '2n' },
          { pts: [[0, 0], [N, N * k]], cls: 'naive', label: 'nk' }] }));
    }
    kIn.onchange = refresh;
    ops = Array.from({ length: 24 }, (_, i) => (i % 2 ? 'inc' : 'dec'));
    refresh();
  };

  /* ---------- 16.1-3: c_i = i if i is a power of 2, else 1 ---------- */
  W.powCost = function (el) {
    const nIn = h('input', { type: 'number', min: 1, max: 200, value: 40, 'aria-label': 'n' });
    const out = h('div');
    const B = bench('16.1-3', 'c_i = i（i 是 2 的冪）否則 1：總和 < 3n', h('div', { class: 'inputs' }, h('label', null, 'n（≤ 200）', nIn)), out);
    el.replaceWith(B.el);
    function run() {
      const n = clamp(nIn.value, 1, 200, 40);
      let tot = 0, pw = 0;
      const pts = [[0, 0]], bars = [];
      for (let i = 1; i <= n; i++) {
        const c = AM.powCost(i); tot += c; if (AM.isPow2(i)) pw += c;
        pts.push([i, tot]); bars.push({ x: i, y: c, cls: AM.isPow2(i) ? 'hot' : '' });
      }
      const m = Math.floor(Math.log2(n));
      out.replaceChildren(chart({ xMax: n, yMax: 3 * n, xLabel: 'i', bars, barLabel: 'c<sub>i</sub>（黃 = 2 的冪）',
        lines: [{ pts, cls: 'total', label: '累計 Σc<sub>i</sub>' }, { pts: [[0, 0], [n, 3 * n]], cls: 'naive', label: '3n' }] }),
      h('p', { class: 'small', html: `2 的冪 1, 2, …, 2<sup>${m}</sup> 合計 ${pw} = 2<sup>${m + 1}</sup> − 1 &lt; 2n = ${2 * n}；其他 ${n - m - 1} 個各 1。總和 <b>${tot}</b> &lt; 3n = ${3 * n}，平均 ${(tot / n).toFixed(2)}。` }));
    }
    nIn.onchange = nIn.oninput = run;
    run();
  };

  /* ---------- Average case (slides p.16–17): quicksort over all n! inputs ---------- */
  W.qsAverage = function (el) {
    const nIn = h('select', { 'aria-label': 'n' }, [3, 4, 5, 6, 7, 8].map((v) => h('option', { value: v, selected: v === 6 }, v)));
    const out = h('div');
    const B = bench('平均情況', 'QUICKSORT 在所有 n! 種輸入順序上的比較次數', h('div', { class: 'inputs' }, h('label', null, 'n', nIn)), out);
    el.replaceWith(B.el);
    function run() {
      const n = Number(nIn.value), st = AM.quicksortStats(n);
      const xs = [...st.hist.keys()].sort((a, b) => a - b), top = Math.max(...st.hist.values());
      out.replaceChildren(chart({ xMax: st.worst + 1, yMax: top, h: 220, xLabel: '比較次數',
        bars: xs.map((c) => ({ x: c, y: st.hist.get(c), cls: c === st.worst ? 'hot' : '' })), barLabel: '有幾種輸入（黃 = 最壞）',
        lines: [{ pts: [[st.avg, 0], [st.avg, top]], cls: 'ref', label: `平均 ${st.avg.toFixed(2)}` }] }),
      h('table', { class: 'plain' },
        h('tr', null, h('th', null, '輸入順序數 n!'), h('td', { class: 'num' }, st.count)),
        h('tr', null, h('th', null, '平均比較次數'), h('td', { class: 'num' }, st.avg.toFixed(3)), h('td', { class: 'small muted' }, `= 2(n+1)H_n − 4n = ${AM.quicksortAvgFormula(n).toFixed(3)}，Θ(n log n)`)),
        h('tr', null, h('th', null, '最壞比較次數'), h('td', { class: 'num' }, st.worst), h('td', { class: 'small muted' }, `= n(n−1)/2，例如輸入 ${st.worstPerm.join(' ')}`)),
        h('tr', null, h('th', null, '把最壞輸入連續排 m 次'), h('td', { class: 'num' }, `${st.worst}·m`), h('td', { class: 'small muted' }, '每次都 Θ(n²)，平均下來還是 Θ(n²) → 不是 amortized Θ(n log n)'))));
    }
    nIn.onchange = run;
    run();
  };
})();
