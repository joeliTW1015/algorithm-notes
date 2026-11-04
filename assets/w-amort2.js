/* Widgets for Ch16-2 (accounting & potential method) and exercises 16.2-x / 16.3-x. Load after w-amort.js. */
(function () {
  'use strict';
  const { h, s, StepPlayer, bench, tree } = UI;
  const W = (window.Widgets = window.Widgets || {});
  const chart = W._chart;
  const money = (v) => (v < 0 ? '−$' + -v : '$' + v);
  const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2)).replace('-', '−');
  const sgn = (v) => (v > 0 ? '+' : '') + fmt(v);

  /* ---------- Shared pieces ---------- */
  // Reads an integer input, clamps it to [lo, hi] and collects a message when it had to change it.
  function readInt(input, lo, hi, def, name, errs) {
    const raw = String(input.value).trim(), x = Number(raw);
    if (raw === '' || !Number.isFinite(x)) { errs.push(`${name} 要填數字，先用 ${def}。`); input.value = def; return def; }
    const v = Math.max(lo, Math.min(hi, Math.round(x)));
    if (v !== x) errs.push(`${name} 要是 ${lo}–${hi} 的整數，已改成 ${v}。`);
    input.value = v;
    return v;
  }
  const numIn = (v, lo, hi, label) => h('input', { type: 'number', min: lo, max: hi, value: v, 'aria-label': label });
  const chipRow = (items) => h('div', { class: 'chips' }, items.map(([t, fn]) => h('button', { type: 'button', onclick: fn }, t)));
  // Chips that behave like radio buttons.
  function pickRow(items, cur, onPick) {
    const btns = items.map((it) => h('button', { type: 'button', class: it === cur ? 'on' : null, 'aria-pressed': String(it === cur),
      onclick: () => { btns.forEach((b, j) => { b.classList.toggle('on', items[j] === it); b.setAttribute('aria-pressed', String(items[j] === it)); }); onPick(it); } }, it.label));
    return h('div', { class: 'chips' }, btns);
  }

  // Bars = c_i (yellow = the expensive kind), black = Σc_i, green dashed = Σĉ_i, purple = bank or Φ(D_i).
  function costChart(steps, i, o) {
    const N = Math.max(8, steps.length - 1), upto = steps.slice(0, i + 1);
    const lines = [{ pts: upto.map((t) => [t.i, t.total]), cls: 'total', label: '累計實際成本 Σc<sub>i</sub>' }];
    if (o.amort !== false) lines.push({ pts: upto.map((t) => [t.i, t.amortTotal]), cls: 'ref', label: o.amortLabel || '累計 amortized Σĉ<sub>i</sub>' });
    if (o.bound) lines.push({ pts: [[0, 0], [N, o.bound * N]], cls: 'naive', label: o.boundLabel });
    if (o.side) lines.push({ pts: upto.map((t) => [t.i, o.side(t)]), cls: 'phi', label: o.sideLabel });
    const vals = steps.flatMap((t) => [t.total || 0, t.cost || 0, o.amort === false ? 0 : t.amortTotal || 0, o.side ? o.side(t) || 0 : 0]);
    return chart({ xMax: N, yMax: Math.max(4, ...vals, o.bound ? o.bound * N : 0), yMin: Math.min(0, ...vals), cursor: steps[i].i, xLabel: '第幾個操作',
      bars: steps.slice(1).map((t) => ({ x: t.i, y: t.cost, cls: o.hot && o.hot(t) ? 'hot' : '' })), barLabel: o.barLabel || '單次實際成本 c<sub>i</sub>', lines });
  }

  // Every step as one table row (built once per run); set(i) moves the highlight to step i.
  function ledger(heads, rows) {
    const t = h('table', { class: 'plain fig' }, h('tr', null, heads.map((x) => h('th', { html: x }))));
    rows.forEach((cells) => t.append(h('tr', null, cells.map((c) => (typeof c === 'number'
      ? h('td', { class: 'num' }, fmt(c)) : h('td', { html: c === undefined || c === null ? '' : String(c) }))))));
    const box = h('div', { class: 'fig-scroll ledger' }, t);
    return {
      el: box,
      set(i) {
        const trs = t.querySelectorAll('tr');
        trs.forEach((tr, r) => tr.classList.toggle('on', r === i + 1));
        const row = trs[i + 1];
        if (row) box.scrollTop = Math.max(0, row.offsetTop - box.clientHeight / 2);
      },
    };
  }

  const coins = (n, cls) => (n > 0 ? h('span', { class: 'coins' }, Array.from({ length: Math.min(n, 3) }, () => h('span', { class: 'coin' + (cls ? ' ' + cls : '') }, '$'))) : null);
  function stackCol(items, o) {
    o = o || {};
    const MAX = o.max || 10, shown = items.slice(-MAX).reverse();
    return h('div', { class: 'stackviz' },
      h('div', { class: 'top-label' }, o.title || 'top'),
      shown.length ? shown.map((x, j) => h('div', { class: 'item' + (o.fresh && j === 0 ? ' new' : '') }, String(x), coins(o.coins))) : h('div', { class: 'empty' }, '（空的）'),
      items.length > MAX ? h('div', { class: 'more' }, `… 下面還有 ${items.length - MAX} 個`) : null);
  }
  function bankBox(bank, sub) {
    return h('div', { class: 'bankbox' + (bank < 0 ? ' neg' : '') },
      h('div', { class: 'small muted' }, '銀行'), h('div', { class: 'amt' }, money(bank)), sub ? h('div', { class: 'small muted' }, sub) : null);
  }
  // Counter bits with something drawn under each bit (a $1 coin of credit, the max pointer …).
  function bitsWith(bits, flips, under) {
    const row = W._bitBoxes(bits, flips);
    [...row.children].forEach((cell, j) => cell.append(under(bits.length - 1 - j) || h('span', { class: 'under' })));
    return row;
  }

  // Potential "height": a bar from 0 to Φ(D_i), with a dashed line at Φ(D_0).
  function meter(v, v0, lo, hi, label) {
    const Wd = 150, H = 190, T = 16, B = 16, top = Math.max(hi, 1), bot = Math.min(lo, 0);
    const Y = (y) => T + (H - T - B) * (1 - (y - bot) / (top - bot || 1));
    const svg = s('svg', { class: 'pmeter', viewBox: `0 0 ${Wd} ${H}`, width: Wd, role: 'img', 'aria-label': `Φ = ${fmt(v)}` });
    svg.append(s('line', { class: 'base', x1: 20, x2: Wd - 10, y1: Y(0), y2: Y(0) }), s('text', { class: 'tick', x: 16, y: Y(0) + 4, 'text-anchor': 'end' }, '0'));
    svg.append(s('rect', { class: 'pbar' + (v < v0 ? ' low' : ''), x: 44, width: 36, y: Math.min(Y(v), Y(0)), height: Math.max(1, Math.abs(Y(0) - Y(v))) }));
    svg.append(s('line', { class: 'start', x1: 34, x2: 90, y1: Y(v0), y2: Y(v0) }), s('text', { class: 'tick', x: 92, y: Y(v0) + 4 }, 'Φ(D₀)'));
    svg.append(s('text', { class: 'val', x: 62, y: v >= 0 ? Y(v) - 4 : Y(v) + 13, 'text-anchor': 'middle' }, fmt(v)));
    return h('div', { class: 'pmeter-wrap' }, h('div', { class: 'small muted', html: label }), svg);
  }

  /* ---------- Accounting: super stack (slides p.5–8) ---------- */
  const STACK_SEQS = [
    ['隨機 24 次', () => AM.randomStackOps(24, 3)],
    ['推 12 個 + SUPER-POP(12)', () => AM.worstStackOps(13)],
    ['反覆：推 4 個再全部 pop', () => { const o = []; for (let r = 0; r < 4; r++) o.push(...AM.worstStackOps(5)); return o; }],
  ];
  const opName = (o) => (o.op === 'push' ? 'PUSH' : o.op === 'pop' ? 'POP' : `SUPER-POP(${o.k})`);

  W.bankStack = function (el) {
    let ops = STACK_SEQS[0][1]();
    const cIn = { push: numIn(2, 0, 5, 'PUSH 收費'), pop: numIn(0, 0, 5, 'POP 收費'), superpop: numIn(0, 0, 5, 'SUPER-POP 收費') };
    const kIn = numIn(3, 1, 99, 'k'), err = h('div', { class: 'err' });
    let pend = [];
    const setCharge = (p, q, r) => () => { cIn.push.value = p; cIn.pop.value = q; cIn.superpop.value = r; refresh(); };
    const opBtn = (t, fn) => h('button', { type: 'button', onclick: () => { fn(); refresh(); } }, t);
    const view = h('div'), stats = h('div'), plot = h('div');
    const player = new StepPlayer({ render });
    const B = bench('Accounting', '每個操作先付 amortized cost，多的錢存在元素上',
      h('div', { class: 'inputs' }, h('label', null, 'PUSH 收 $', cIn.push), h('label', null, 'POP 收 $', cIn.pop), h('label', null, 'SUPER-POP 收 $', cIn.superpop), err),
      chipRow([['投影片：$2 / $0 / $0', setCharge(2, 0, 0)], ['PUSH 只收 $1（錢不夠）', setCharge(1, 0, 0)], ['PUSH 收 $3（太多，鬆）', setCharge(3, 0, 0)], ['每個都收 $1', setCharge(1, 1, 1)]]),
      h('div', { class: 'inputs', style: 'margin-top:14px' },
        opBtn('PUSH', () => ops.push({ op: 'push' })), opBtn('POP', () => ops.push({ op: 'pop' })),
        h('label', null, 'k', kIn), opBtn('SUPER-POP(k)', () => ops.push({ op: 'superpop', k: readInt(kIn, 1, 99, 3, 'k', pend) })),
        opBtn('復原一步', () => ops.pop()), opBtn('清空', () => (ops = []))),
      chipRow(STACK_SEQS.map(([t, f]) => [t, () => { ops = f(); refresh(); }])),
      h('div', { class: 'bench-cols', style: 'margin-top:12px' }, view, stats), plot, player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    let res;
    function refresh() {
      const e = pend;
      pend = [];
      const charge = { push: readInt(cIn.push, 0, 5, 2, 'PUSH 收費', e), pop: readInt(cIn.pop, 0, 5, 0, 'POP 收費', e), superpop: readInt(cIn.superpop, 0, 5, 0, 'SUPER-POP 收費', e) };
      err.textContent = e.join(' ');
      res = AM.stackAccount(ops, charge);
      player.load(res.steps, 'end');
    }
    function render(st, i, steps) {
      view.replaceChildren(h('div', { class: 'stack-pair credit' },
        stackCol(st.stack, { fresh: st.op && st.op.op === 'push', coins: st.per }),
        h('div', { class: 'stack-out' }, h('div', { class: 'small muted' }, '這一步 pop 掉：'),
          st.out && st.out.length ? st.out.map((x) => h('div', { class: 'item out' }, String(x), coins(st.per, 'spent'))) : h('div', { class: 'small muted' }, '—')),
        bankBox(st.bank, st.pool ? `元素上 ${money(st.bank - st.pool)}，沒綁定 ${money(st.pool)}` : `= 元素上的 credit`)));
      const ok = res.firstNeg < 0;
      stats.replaceChildren(h('table', { class: 'plain' },
        h('tr', null, h('th', null, '操作次數'), h('td', { class: 'num' }, st.i)),
        h('tr', null, h('th', null, '收到的錢 Σĉ'), h('td', { class: 'num' }, st.amortTotal)),
        h('tr', null, h('th', null, '實際成本 Σc'), h('td', { class: 'num' }, h('b', null, st.total))),
        h('tr', null, h('th', null, '銀行 = Σĉ − Σc'), h('td', { class: 'num' }, money(st.bank))),
        h('tr', null, h('th', null, 'stack 大小'), h('td', { class: 'num' }, st.stack.length))),
        h('p', { class: 'small' }, h('span', { class: 'verdict' + (ok ? '' : ' bad') }, ok ? '從不透支' : `第 ${res.firstNeg} 步透支`),
          ok ? ' 每個前綴都有 Σĉ ≥ Σc，收費就是合法的 amortized cost。' : ' 那一刻 Σĉ < Σc：這組收費不是上界，不能當 amortized cost。'));
      plot.replaceChildren(costChart(steps, i, { hot: (t) => t.op.op === 'superpop', side: (t) => t.bank, sideLabel: '銀行餘額' }));
    }
    refresh();
  };

  /* ---------- Accounting: binary counter (slides p.9–14) ---------- */
  W.bankCounter = function (el) {
    const kIn = numIn(5, 2, 10, 'k'), nIn = numIn(32, 1, 200, 'n'), cIn = numIn(2, 0, 4, '收費'), sIn = numIn(0, 0, 1023, '起始值');
    const err = h('div', { class: 'err' });
    const preset = (k, n, c, s0) => () => { kIn.value = k; nIn.value = n; cIn.value = c; sIn.value = s0; run(); };
    const now = h('div'), stats = h('div'), plot = h('div');
    const player = new StepPlayer({ render });
    const B = bench('Accounting', '每次 INCREMENT 收 $2：$1 付 0→1，$1 存在那個位元上',
      h('div', { class: 'inputs' }, h('label', null, 'k（位元數）', kIn), h('label', null, 'n（INCREMENT 次數）', nIn), h('label', null, '每次收 $', cIn), h('label', null, '起始值', sIn), err),
      chipRow([['投影片：k = 5，收 $2，從 0 開始', preset(5, 32, 2, 0)], ['課本 Fig. 16.2：k = 8, n = 16', preset(8, 16, 2, 0)],
        ['只收 $1（錢不夠）', preset(5, 16, 1, 0)], ['p.14：從 7 = 00111 開始', preset(5, 16, 2, 7)]]),
      h('div', { class: 'bench-cols', style: 'margin-top:12px' }, now, stats), plot, player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    let res;
    function run() {
      const e = [];
      const k = readInt(kIn, 2, 10, 5, 'k', e), n = readInt(nIn, 1, 200, 32, 'n', e), c = readInt(cIn, 0, 4, 2, '收費', e);
      const s0 = readInt(sIn, 0, 2 ** k - 1, 0, '起始值', e);
      err.textContent = e.join(' ');
      res = AM.counterAccount(k, n, { charge: c, start: s0 });
      player.load(res.steps, 0);
    }
    function render(st, i, steps) {
      const resets = new Set(st.resets || []);
      now.replaceChildren(
        bitsWith(st.bits, st.flips, (j) => (st.bits[j] ? h('span', { class: 'coin' + (st.credit[j] ? '' : ' none') }, st.credit[j] ? '$1' : '無')
          : resets.has(j) ? h('span', { class: 'coin spent' }, '$1') : null)),
        h('p', { class: 'small muted', style: 'margin:4px 0 10px' }, '每個 1 底下的 $1 是它身上的 credit；「無」= 身上沒有錢的 1；劃掉的 $1 = 這一步剛捐出去的。'),
        bankBox(st.bank, st.pool ? `位元上 ${money(st.bank - st.pool)}，沒綁定 ${money(st.pool)}` : `= #1 bits 上的 credit`));
      const ok = res.firstNeg < 0, ones = st.bits.reduce((a, b) => a + b, 0);
      stats.replaceChildren(h('table', { class: 'plain' },
        h('tr', null, h('th', null, 'INCREMENT 次數'), h('td', { class: 'num' }, i)),
        h('tr', null, h('th', null, 'count'), h('td', { class: 'num' }, AM.value(st.bits))),
        h('tr', null, h('th', null, '#1 bits'), h('td', { class: 'num' }, ones)),
        h('tr', null, h('th', null, '收到的錢 Σĉ'), h('td', { class: 'num' }, st.amortTotal)),
        h('tr', null, h('th', null, '實際成本 Σc'), h('td', { class: 'num' }, h('b', null, st.total))),
        h('tr', null, h('th', null, '銀行'), h('td', { class: 'num' }, money(st.bank)))),
        h('p', { class: 'small' }, h('span', { class: 'verdict' + (ok ? '' : ' bad') }, ok ? '從不透支' : `第 ${res.firstNeg} 次透支`),
          ok ? ' 銀行 ≥ #1 bits ≥ 0，所以 Σc ≤ Σĉ。' : ' 有 1 身上沒有錢可以付它的 1→0。'));
      plot.replaceChildren(costChart(steps, i, { hot: (t) => t.cost >= 3, side: (t) => t.bank, sideLabel: '銀行餘額' }));
    }
    kIn.onchange = nIn.onchange = cIn.onchange = sIn.onchange = run;
    run();
  };

  /* ---------- Potential method: one widget for the stack and one for the counter (slides p.23–28) ---------- */
  // Shared part: choose Φ, then show Φ(D_i), ΔΦ and ĉ_i = c_i + ΔΦ for every step.
  function potentialBench(el, o) {
    let phi = o.list[0];
    const err = h('div', { class: 'err' }), meterBox = h('div'), view = h('div'), ledBox = h('div'), summary = h('div'), plot = h('div');
    const player = new StepPlayer({ render });
    const B = bench('Potential', o.title, o.inputs(err), pickRow(o.list, phi, (p) => { phi = p; refresh(player.i); }),
      ...(o.extra || []), h('div', { class: 'pot-cols', style: 'margin-top:12px' }, meterBox, view, ledBox), summary, plot, player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    let led, steps, table;
    function refresh(at) {
      const e = [], run = o.run(e);
      err.textContent = e.join(' ');
      led = AM.potentialLedger(run.states, run.steps.map((t) => t.cost), phi.f);
      steps = run.steps.map((st, i) => {
        const r = led.rows[i - 1];
        const msg = i === 0 ? `${st.msg} Φ(D<sub>0</sub>) = ${fmt(led.P[0])}。`
          : `${o.name(st)}：實際成本 c<sub>${i}</sub> = ${r.c}；Φ 從 ${fmt(r.phiBefore)} 變成 ${fmt(r.phi)}（ΔΦ = ${sgn(r.dPhi)}）；ĉ<sub>${i}</sub> = c + ΔΦ = ${r.c} ${r.dPhi < 0 ? '−' : '+'} ${fmt(Math.abs(r.dPhi))} = <b>${fmt(r.amort)}</b>。`;
        return Object.assign({}, st, { phi: led.P[i], amortTotal: r ? r.amortTotal : 0, msg });
      });
      table = ledger(['i', '操作', 'c<sub>i</sub>', 'Φ(D<sub>i</sub>)', 'ΔΦ', 'ĉ<sub>i</sub>'],
        [[0, '（開始）', '', led.P[0], '', ''], ...led.rows.map((r) => [r.i, o.name(run.steps[r.i]), r.c, r.phi, sgn(r.dPhi), r.amort])]);
      ledBox.replaceChildren(table.el);
      // Distinct amortized costs per kind of operation.
      const kinds = new Map();
      led.rows.forEach((r) => { const kd = o.kind(run.steps[r.i]); if (!kinds.has(kd)) kinds.set(kd, new Set()); kinds.get(kd).add(r.amort); });
      const lines = [...kinds].map(([kd, set]) => {
        const v = [...set].sort((a, b) => a - b);
        return `${kd}：ĉ ${v.length === 1 ? '= ' + fmt(v[0]) : v.length <= 4 ? '∈ {' + v.map(fmt).join(', ') + '}' : `從 ${fmt(v[0])} 到 ${fmt(v[v.length - 1])}（不是常數）`}`;
      });
      const short = led.rows.find((r) => r.amortTotal < r.total);
      summary.replaceChildren(h('div', { class: 'pot-summary' },
        h('p', null, h('span', { class: 'verdict' + (led.valid ? '' : ' bad') }, led.valid ? 'Φ(Dᵢ) ≥ Φ(D₀) 對所有 i' : `第 ${led.firstBelow} 步 Φ(Dᵢ) < Φ(D₀)`), ' ',
          led.valid ? '所以每個前綴都有 Σĉ ≥ Σc，ĉ 是合法的 amortized cost。'
            : short ? `第 ${short.i} 步時 Σĉ = ${fmt(short.amortTotal)} < Σc = ${fmt(short.total)}：ĉ 不是上界。` : '這一串剛好沒出事，但換一串操作就可能 Σĉ < Σc。'),
        h('p', { class: 'small', html: lines.join('　·　') }),
        h('p', { class: 'small muted', html: `Telescoping（p.21）：Σĉ = Σc + Φ(D<sub>n</sub>) − Φ(D<sub>0</sub>) → ${fmt(led.amortTotal)} = ${fmt(led.total)} + ${fmt(led.phiN)} − ${fmt(led.phi0)}` })));
      const all = led.P;
      steps._lo = Math.min(...all); steps._hi = Math.max(...all);
      player.load(steps, at === undefined ? 'end' : at);
    }
    function render(st, i) {
      meterBox.replaceChildren(meter(st.phi, led.P[0], steps._lo, steps._hi, `位能 Φ(D<sub>${i}</sub>)`));
      view.replaceChildren(o.view(st, i));
      table.set(i);
      plot.replaceChildren(costChart(steps, i, { hot: o.hot, side: (t) => t.phi, sideLabel: 'Φ(D<sub>i</sub>)' }));
    }
    return { refresh };
  }

  W.potStack = function (el) {
    let ops = STACK_SEQS[0][1]();
    const s0 = Number(el.dataset.s0 || 0);
    const kIn = numIn(3, 1, 99, 'k'), sIn = numIn(s0, 0, 20, 's0');
    let pb, pend = [];
    const opBtn = (t, fn) => h('button', { type: 'button', onclick: () => { fn(); pb.refresh(); } }, t);
    const seqs = s0 ? [['SUPER-POP 把原本的也 pop 掉', () => [{ op: 'push' }, { op: 'push' }, { op: 'superpop', k: 99 }, { op: 'push' }]],
      ['只 PUSH 6 次', () => Array(6).fill({ op: 'push' })], ...STACK_SEQS] : STACK_SEQS;
    pb = potentialBench(el, {
      title: s0 ? 'stack 一開始就有 s₀ 個元素（16.3-4）' : 'Super stack：Φ(S) = stack 裡的元素個數',
      list: AM.PHI.stack,
      inputs: (err) => h('div', { class: 'inputs' },
        s0 ? h('label', null, 's₀（一開始幾個）', sIn) : null,
        opBtn('PUSH', () => ops.push({ op: 'push' })), opBtn('POP', () => ops.push({ op: 'pop' })),
        h('label', null, 'k', kIn), opBtn('SUPER-POP(k)', () => ops.push({ op: 'superpop', k: readInt(kIn, 1, 99, 3, 'k', pend) })),
        opBtn('復原一步', () => ops.pop()), opBtn('清空', () => (ops = [])), err),
      extra: [chipRow(seqs.map(([t, f]) => [t, () => { ops = f(); pb.refresh(); }]))],
      run(e) {
        e.push(...pend); pend = [];
        const n0 = s0 ? readInt(sIn, 0, 20, s0, 's₀', e) : 0;
        const r = AM.stackRun(ops, Array.from({ length: n0 }, (_, j) => j + 1));
        return { steps: r.steps, states: r.steps.map((t) => t.stack) };
      },
      name: (st) => opName(st.op),
      kind: (st) => (st.op.op === 'push' ? 'PUSH' : st.op.op === 'pop' ? 'POP' : 'SUPER-POP'),
      hot: (t) => t.op.op === 'superpop',
      view: (st) => h('div', { class: 'stack-pair' }, stackCol(st.stack, { fresh: st.op && st.op.op === 'push' }),
        h('div', { class: 'stack-out' }, h('div', { class: 'small muted' }, '這一步 pop 掉：'),
          st.out && st.out.length ? st.out.map((x) => h('div', { class: 'item out' }, String(x))) : h('div', { class: 'small muted' }, '—'))),
    });
    sIn.onchange = () => pb.refresh();
    pb.refresh();
  };

  W.potCounter = function (el) {
    const kIn = numIn(5, 2, 10, 'k'), nIn = numIn(32, 1, 200, 'n'), sIn = numIn(0, 0, 1023, '起始值');
    let pb;
    const preset = (k, n, s0) => () => { kIn.value = k; nIn.value = n; sIn.value = s0; pb.refresh(0); };
    pb = potentialBench(el, {
      title: 'Binary counter：Φ(B) = 1 的個數',
      list: AM.PHI.counter,
      inputs: (err) => h('div', { class: 'inputs' }, h('label', null, 'k（位元數）', kIn), h('label', null, 'n（INCREMENT 次數）', nIn), h('label', null, '起始值', sIn), err),
      extra: [chipRow([['投影片：k = 5，從 0 數到繞回', preset(5, 32, 0)], ['k = 4, n = 20（看繞回那步 ĉ = 0）', preset(4, 20, 0)], ['從 11 = 01011 開始（b₀ = 3）', preset(5, 12, 11)]])],
      run(e) {
        const k = readInt(kIn, 2, 10, 5, 'k', e), n = readInt(nIn, 1, 200, 32, 'n', e), s0 = readInt(sIn, 0, 2 ** k - 1, 0, '起始值', e);
        const r = AM.counterRun(k, n, s0);
        return { steps: r.steps, states: r.steps.map((t) => t.bits) };
      },
      name: (st) => `INC → ${AM.show(st.bits)}`,
      kind: () => 'INCREMENT',
      hot: (t) => t.cost >= 3,
      view: (st) => h('div', null, W._bitBoxes(st.bits, st.flips),
        h('p', { class: 'small', style: 'margin:6px 0' }, `count = ${AM.value(st.bits)}　#1 bits = ${st.bits.reduce((a, b) => a + b, 0)}　這次翻 ${st.cost} 個`)),
    });
    kIn.onchange = nIn.onchange = sIn.onchange = () => pb.refresh(0);
    pb.refresh(0);
  };

  /* ---------- 16.2-1: stack of size ≤ k with a backup copy after every k operations ---------- */
  W.backupStack = function (el) {
    const kIn = numIn(4, 2, 12, 'k'), nIn = numIn(32, 1, 120, 'n'), err = h('div', { class: 'err' });
    let mode = 'full';
    const view = h('div'), plot = h('div');
    const player = new StepPlayer({ render });
    const B = bench('16.2-1', '每個操作收 $2：$1 付自己，$1 存起來付下一次備份',
      h('div', { class: 'inputs' }, h('label', null, 'k（大小上限 = 備份間隔）', kIn), h('label', null, 'n（操作數）', nIn), err),
      chipRow([['推滿後 POP / PUSH 交替（每次備份都是 k 個）', () => { mode = 'full'; run(); }], ['隨機 PUSH / POP', () => { mode = 'random'; run(); }]]),
      h('div', { style: 'margin-top:12px' }, view), plot, player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    let k;
    function run() {
      const e = [];
      k = readInt(kIn, 2, 12, 4, 'k', e);
      const n = readInt(nIn, 1, 120, 32, 'n', e);
      err.textContent = e.join(' ');
      player.load(AM.backupRun(AM.backupOps(n, k, mode, 3), k).steps, 0);
    }
    function render(st, i, steps) {
      view.replaceChildren(h('div', { class: 'stack-pair' }, stackCol(st.stack, { title: `top（≤ ${k}）`, fresh: st.op === 'push' }),
        h('div', { class: 'stack-out' }, h('div', { class: 'small muted' }, `第 ${i} 個操作`, h('br'), `下次備份：第 ${Math.ceil((i + 1) / k) * k} 個之後`),
          st.didCopy ? h('div', { class: 'backup' }, `備份！複製 ${st.copy} 個`) : null),
        bankBox(st.bank, `收了 $${st.amortTotal}，花了 $${st.total}`)));
      plot.replaceChildren(costChart(steps, i, { amortLabel: '累計收費 2n', hot: (t) => t.didCopy, side: (t) => t.bank, sideLabel: '銀行餘額' }));
    }
    kIn.onchange = nIn.onchange = run;
    run();
  };

  /* ---------- 16.2-3: INCREMENT + RESET with a pointer to the high-order 1 ---------- */
  W.resetCounter = function (el) {
    const kIn = numIn(6, 2, 10, 'k'), err = h('div', { class: 'err' });
    let ops = [];
    const repeat = (m, r) => { const o = []; for (let t = 0; t < r; t++) o.push(...Array(m).fill('inc'), 'reset'); return o; };
    const opBtn = (t, fn) => h('button', { type: 'button', onclick: () => { fn(); refresh(); } }, t);
    const now = h('div'), side = h('div'), plot = h('div');
    const player = new StepPlayer({ render });
    const B = bench('16.2-3', 'RESET 只清 b₀..b_max：INCREMENT 收 $3、RESET 收 $1',
      h('div', { class: 'inputs' }, h('label', null, 'k', kIn), opBtn('INCREMENT', () => ops.push('inc')), opBtn('RESET', () => ops.push('reset')),
        opBtn('復原一步', () => ops.pop()), opBtn('清空', () => (ops = [])), err),
      chipRow([['INC ×9 再 RESET，重複 3 次', () => { ops = repeat(9, 3); refresh(); }], ['INC ×1 再 RESET，重複 10 次', () => { ops = repeat(1, 10); refresh(); }],
        ['只 INC 40 次', () => { ops = Array(40).fill('inc'); refresh(); }]]),
      h('div', { class: 'bench-cols', style: 'margin-top:12px' }, now, side), plot, player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    function refresh() {
      const e = [];
      const k = readInt(kIn, 2, 10, 6, 'k', e);
      err.textContent = e.join(' ');
      player.load(AM.resetCounterRun(k, ops).steps, 'end');
    }
    function render(st, i, steps) {
      const touched = st.op === 'reset' ? Array.from({ length: st.cost }, (_, j) => j) : st.flips;
      now.replaceChildren(bitsWith(st.bits, touched, (j) => (j === st.max ? h('span', { class: 'ptr' }, '▲ max') : null)),
        h('p', { class: 'small', style: 'margin:6px 0' }, st.op === 'reset' ? (st.cost ? `RESET 只碰了 b0..b${st.cost - 1}（黃色）。` : 'RESET：已經是 0。') : '',
          `max = ${st.max}　這次成本 `, h('b', null, st.cost), `　累計 ${st.total} ≤ 收費 ${st.amortTotal}`));
      side.replaceChildren(bankBox(st.bank, `≥ #1 + (max+1) = ${st.need === undefined ? 0 : st.need}`));
      plot.replaceChildren(costChart(steps, i, { amortLabel: '累計收費', hot: (t) => t.op === 'reset', side: (t) => t.bank, sideLabel: '銀行餘額' }));
    }
    kIn.onchange = refresh;
    ops = repeat(9, 3);
    refresh();
  };

  /* ---------- 16.3-3: binary min-heap with Φ = Σ lg j ---------- */
  W.heapPot = function (el) {
    const xIn = numIn(5, -999, 999, 'x'), err = h('div', { class: 'err' });
    let ops = [], pend = [];
    const rnd = (n, seed) => { const r = AM.rng(seed); return Array.from({ length: n }, () => 1 + Math.floor(r() * 99)); };
    const presets = [
      ['隨機插入 12 個，再取出 12 個', () => [...rnd(12, 4).map((x) => ({ op: 'insert', x })), ...Array(12).fill({ op: 'extract' })]],
      ['遞減插入 15 個（每次都爬到頂）', () => Array.from({ length: 15 }, (_, j) => ({ op: 'insert', x: 99 - j * 6 }))],
      ['插 3 個、取 1 個，重複', () => { const o = [], v = rnd(30, 9); for (let t = 0; t < 8; t++) o.push(...v.slice(3 * t, 3 * t + 3).map((x) => ({ op: 'insert', x })), { op: 'extract' }); return o; }],
    ];
    const opBtn = (t, fn) => h('button', { type: 'button', onclick: () => { fn(); refresh(); } }, t);
    const view = h('div'), stats = h('div'), plot = h('div');
    const player = new StepPlayer({ render });
    const B = bench('16.3-3', 'Φ = lg 1 + lg 2 + … + lg n：INSERT 先存位能，EXTRACT-MIN 拿來用',
      h('div', { class: 'inputs' }, h('label', null, 'x', xIn), opBtn('INSERT(x)', () => ops.push({ op: 'insert', x: readInt(xIn, -999, 999, 5, 'x', pend) })),
        opBtn('EXTRACT-MIN', () => ops.push({ op: 'extract' })), opBtn('復原一步', () => ops.pop()), opBtn('清空', () => (ops = [])), err),
      chipRow(presets.map(([t, f]) => [t, () => { ops = f(); refresh(); }])),
      h('div', { class: 'bench-cols', style: 'margin-top:12px' }, view, stats), plot, player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    function refresh() {
      err.textContent = pend.join(' ');
      pend = [];
      let res;
      try { res = AM.heapRun(ops); } catch (e) { err.textContent = e.message + '，已取消這一步。'; ops.pop(); res = AM.heapRun(ops); }
      player.load(res.steps, 'end');
    }
    function render(st, i, steps) {
      const A = st.heap, hot = new Set(st.path);
      const node = (j) => ({ label: A[j], cls: hot.has(j) ? 'hot' : '', children: [2 * j + 1, 2 * j + 2].filter((c) => c < A.length).map(node) });
      view.replaceChildren(A.length ? tree(node(0), { gap: 38, levelH: 50, r: 15, aria: 'min-heap' }) : h('p', { class: 'small muted' }, '（空的 heap）'),
        h('p', { class: 'small muted' }, '黃色 = 這一步換過位置的路徑'));
      stats.replaceChildren(h('table', { class: 'plain' },
        h('tr', null, h('th', null, 'n（heap 大小）'), h('td', { class: 'num' }, A.length)),
        h('tr', null, h('th', null, 'Φ = lg(n!)'), h('td', { class: 'num' }, fmt(st.phi))),
        h('tr', null, h('th', null, '這步 c'), h('td', { class: 'num' }, st.cost)),
        h('tr', null, h('th', null, '這步 ĉ'), h('td', { class: 'num' }, i ? fmt(st.amort) : '—')),
        h('tr', null, h('th', null, 'Σc / Σĉ'), h('td', { class: 'num' }, `${st.total} / ${fmt(st.amortTotal || 0)}`))));
      plot.replaceChildren(costChart(steps, i, { hot: (t) => t.op.op === 'extract', barLabel: 'c<sub>i</sub>（黃 = EXTRACT-MIN）', side: (t) => t.phi, sideLabel: 'Φ = lg(n!)' }));
    }
    ops = presets[0][1]();
    refresh();
  };

  /* ---------- 16.3-5: queue from two stacks, Φ = 2·|IN| ---------- */
  W.twoStackQueue = function (el) {
    const err = h('div', { class: 'err' });
    let ops = [];
    const rep = (a, b, r) => { const o = []; for (let t = 0; t < r; t++) o.push(...Array(a).fill('enq'), ...Array(b).fill('deq')); return o; };
    const opBtn = (t, fn) => h('button', { type: 'button', onclick: () => { fn(); refresh(); } }, t);
    const view = h('div'), plot = h('div');
    const player = new StepPlayer({ render });
    const B = bench('16.3-5', '兩個 stack 做 queue：ENQUEUE ĉ = 3，DEQUEUE ĉ = 1',
      h('div', { class: 'inputs' }, opBtn('ENQUEUE', () => ops.push('enq')), opBtn('DEQUEUE', () => ops.push('deq')), opBtn('復原一步', () => ops.pop()), opBtn('清空', () => (ops = [])), err),
      chipRow([['ENQ ×8 再 DEQ ×8', () => { ops = rep(8, 8, 1); refresh(); }], ['ENQ ×4、DEQ ×2，重複', () => { ops = rep(4, 2, 5); refresh(); }], ['ENQ、DEQ 交替', () => { ops = rep(1, 1, 12); refresh(); }]]),
      h('div', { style: 'margin-top:12px' }, view), plot, player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    function refresh() {
      err.textContent = '';
      let res;
      try { res = AM.queueRun(ops); } catch (e) { err.textContent = e.message + '，已取消這一步。'; ops.pop(); res = AM.queueRun(ops); }
      player.load(res.steps, 'end');
    }
    function render(st, i, steps) {
      view.replaceChildren(h('div', { class: 'stack-pair' },
        stackCol(st.IN, { title: 'IN（top）', fresh: st.op === 'enq' }), stackCol(st.OUT, { title: 'OUT（top）' }),
        h('div', { class: 'stack-out' }, h('div', { class: 'small muted' }, '出隊：'), st.out !== null && st.out !== undefined ? h('div', { class: 'item out' }, String(st.out)) : h('div', { class: 'small muted' }, '—'),
          st.moved ? h('div', { class: 'backup' }, `倒了 ${st.moved} 個`) : null),
        h('table', { class: 'plain' },
          h('tr', null, h('th', null, 'Φ = 2·|IN|'), h('td', { class: 'num' }, st.phi)),
          h('tr', null, h('th', null, '這步 c / ĉ'), h('td', { class: 'num' }, i ? `${st.cost} / ${st.amort}` : '—')),
          h('tr', null, h('th', null, 'Σc ≤ Σĉ'), h('td', { class: 'num' }, `${st.total} ≤ ${st.amortTotal || 0}`)))));
      plot.replaceChildren(costChart(steps, i, { hot: (t) => t.moved > 0, barLabel: 'c<sub>i</sub>（黃 = 要倒 stack 的 DEQUEUE）', side: (t) => t.phi, sideLabel: 'Φ = 2·|IN|' }));
    }
    ops = rep(4, 2, 5);
    refresh();
  };

  /* ---------- 16.3-6: INSERT / DELETE-LARGER-HALF, Φ = 2|S| ---------- */
  W.halfSet = function (el) {
    const xIn = numIn(7, -999, 999, 'x'), err = h('div', { class: 'err' });
    let ops = [], pend = [];
    const ins = (xs) => xs.map((x) => ({ op: 'insert', x }));
    const rnd = (n, seed) => { const r = AM.rng(seed); return Array.from({ length: n }, () => 1 + Math.floor(r() * 30)); };
    const presets = [
      ['插 16 個，再 DLH ×3', () => [...ins(rnd(16, 2)), ...Array(3).fill({ op: 'dlh' })]],
      ['每插 5 個就 DLH 一次', () => { const o = [], v = rnd(30, 7); for (let t = 0; t < 6; t++) o.push(...ins(v.slice(5 * t, 5 * t + 5)), { op: 'dlh' }); return o; }],
      ['有重複值：5 5 5 5 2 2 8', () => [...ins([5, 5, 5, 5, 2, 2, 8]), { op: 'dlh' }, { op: 'dlh' }]],
    ];
    const opBtn = (t, fn) => h('button', { type: 'button', onclick: () => { fn(); refresh(); } }, t);
    const view = h('div'), plot = h('div');
    const player = new StepPlayer({ render });
    const B = bench('16.3-6', 'INSERT 收 3、DELETE-LARGER-HALF 收 0：m 個操作 ≤ 3m',
      h('div', { class: 'inputs' }, h('label', null, 'x', xIn), opBtn('INSERT(x)', () => ops.push({ op: 'insert', x: readInt(xIn, -999, 999, 7, 'x', pend) })),
        opBtn('DELETE-LARGER-HALF', () => ops.push({ op: 'dlh' })), opBtn('復原一步', () => ops.pop()), opBtn('清空', () => (ops = [])), err),
      chipRow(presets.map(([t, f]) => [t, () => { ops = f(); refresh(); }])),
      h('div', { style: 'margin-top:12px' }, view), plot, player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    function refresh() {
      err.textContent = pend.join(' ');
      pend = [];
      player.load(AM.halfRun(ops).steps, 'end');
    }
    function render(st, i, steps) {
      view.replaceChildren(
        h('div', { class: 'arr' }, st.S.length ? st.S.map((x, j) => h('span', { class: 'cell' + (st.op && st.op.op === 'insert' && j === st.S.length - 1 ? ' new' : '') }, String(x))) : h('span', { class: 'small muted' }, '（S 是空的）'),
          st.removed.map((x) => h('span', { class: 'cell out' }, String(x)))),
        h('p', { class: 'small', style: 'margin:6px 0' }, `|S| = ${st.S.length}　Φ = 2|S| = ${st.phi}　這步 c = ${st.cost}${i ? `，ĉ = ${fmt(st.amort)}` : ''}　Σc = ${st.total} ≤ 3m = ${3 * i}`));
      plot.replaceChildren(costChart(steps, i, { hot: (t) => t.op.op === 'dlh', barLabel: 'c<sub>i</sub>（黃 = DELETE-LARGER-HALF）', bound: 3, boundLabel: '3m', side: (t) => t.phi, sideLabel: 'Φ = 2|S|' }));
    }
    ops = presets[0][1]();
    refresh();
  };
})();
