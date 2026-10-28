/* Widgets for the knapsack problems (slides p.20–24, exercises 15.2-x). */
(function () {
  'use strict';
  const { h, StepPlayer, table, nums, bench, legend } = UI;
  const W = (window.Widgets = window.Widgets || {});
  const fmt = (x) => GR.fmt(x);

  function itemInputs(el) {
    const v = h('input', { type: 'text', value: el.dataset.v || '60 100 120', spellcheck: 'false', 'aria-label': '價值 v' });
    const w = h('input', { type: 'text', value: el.dataset.w || '10 20 30', spellcheck: 'false', 'aria-label': '重量 w' });
    const cap = h('input', { type: 'number', min: 1, max: 999, value: el.dataset.cap || 50, 'aria-label': 'W' });
    const err = h('div', { class: 'err' });
    return {
      row: h('div', { class: 'inputs' }, h('label', null, '價值 v1 v2 …', v), h('label', null, '重量 w1 w2 …', w), h('label', null, '容量 W', cap), err),
      inputs: [v, w, cap],
      read() {
        err.textContent = '';
        const vs = nums(v.value), ws = nums(w.value), C = Number(cap.value);
        if (!vs || !ws || vs.length !== ws.length) { err.textContent = '價值和重量要一樣多個數字。'; return null; }
        if (vs.some((x) => x < 0) || ws.some((x) => !(x > 0) || !Number.isInteger(x)) || !(C > 0) || !Number.isInteger(C)) {
          err.textContent = '重量和 W 請用正整數，價值不能是負的。'; return null;
        }
        return { items: vs.map((vv, i) => ({ id: 'I' + (i + 1), v: vv, w: ws[i] })), W: C, err };
      },
    };
  }

  function sackBar(items, take, Wcap, cur) {
    const parts = items.filter((it) => take[it.id] > 0).map((it) => {
      const wt = take[it.id] * it.w;
      return h('span', { class: 'part' + (take[it.id] < 1 ? ' frac' : ''), style: `width:${(wt / Wcap) * 100}%;${it.id === cur ? 'box-shadow:inset 0 0 0 3px var(--pencil)' : ''}`,
        title: `${it.id}: ${fmt(wt)} / ${it.w}` }, take[it.id] < 1 ? `${it.id} ×${GR.frac(take[it.id])}` : it.id);
    });
    const used = items.reduce((s, it) => s + take[it.id] * it.w, 0);
    return h('div', null, h('div', { class: 'sack' }, parts), h('div', { class: 'sack-cap' }, h('span', null, '0'), h('span', null, `已用 ${fmt(used)} / W = ${Wcap}`)));
  }

  /* Fractional greedy step by step, then every 0-1 strategy against the optimum. */
  W.knapsack = function (el) {
    const I = itemInputs(el);
    const tbl = h('div', { class: 'scroll-x' });
    const sack = h('div');
    const cmp = h('div');
    const player = new StepPlayer({ render });
    const B = bench('逐步執行', 'Fractional knapsack：密度大的先拿，拿到滿為止',
      I.row, tbl, sack, player.el, cmp);
    el.replaceWith(B.el);
    player.keys(B.el);
    let d, res;
    function run() {
      d = I.read();
      if (!d) return;
      res = GR.fractionalKnapsack(d.items, d.W);
      player.load(res.steps);
      const rows = [
        ['Fractional：密度優先（可以切）', res.value, d.items.filter((it) => res.take[it.id] > 0).map((it) => res.take[it.id] < 1 ? `${GR.frac(res.take[it.id])} ${it.id}` : it.id)],
        ['0-1：密度優先', ...g01('density')],
        ['0-1：價值優先', ...g01('value')],
        ['0-1：最輕的先拿', ...g01('light')],
      ];
      const best = GR.knapsack01(d.items, d.W);
      function g01(by) { const r = GR.greedy01(d.items, d.W, by); return [r.value, r.chosen]; }
      cmp.replaceChildren(h('h4', null, '各種策略的結果'),
        h('table', { class: 'plain' },
          h('tr', null, h('th', null, '策略'), h('th', { class: 'num' }, '總價值'), h('th', null, '拿了'), h('th', null, '')),
          rows.map(([name, v, ch], i) => h('tr', null, h('td', null, name), h('td', { class: 'num' }, fmt(v)), h('td', null, ch.join(', ') || '—'),
            h('td', null, i === 0 ? h('span', { class: 'verdict' }, '最佳（fractional）') : h('span', { class: 'verdict' + (v === best.best ? '' : ' bad') }, v === best.best ? '0-1 最佳' : '差 ' + fmt(best.best - v))))),
          h('tr', null, h('td', null, h('b', null, '0-1：DP 最佳解')), h('td', { class: 'num' }, h('b', null, best.best)), h('td', null, best.chosen.join(', ') || '—'), h('td', null, ''))),
        h('p', { class: 'small muted' }, 'Fractional 的最佳值一定 ≥ 0-1 的最佳值（0-1 的解也是 fractional 的可行解）。'));
    }
    function render(st) {
      tbl.replaceChildren(table({
        corner: '', compact: true,
        colHeads: res.order.map((it) => ({ text: it.id })),
        rowHeads: [{ html: 'v' }, { html: 'w' }, { html: 'v / w' }, { html: '拿的比例' }],
        cell(r, c) {
          const it = res.order[c];
          if (r === 0) return it.v;
          if (r === 1) return it.w;
          if (r === 2) return { text: fmt(it.v / it.w), cls: c === 0 ? 'read' : null };
          const t = st.take[it.id];
          return { text: t === 0 && st.cur !== it.id ? '' : GR.frac(t), cls: it.id === st.cur ? 'cur' : t > 0 ? 'win' : null };
        },
      }), h('div', { class: 'table-cap', style: 'text-align:left' }, '欄位已依密度由大到小排序'));
      sack.replaceChildren(sackBar(d.items, st.take, d.W, st.cur), h('p', { class: 'small' }, '目前總價值：', h('b', null, fmt(st.value))));
    }
    I.inputs.forEach((x) => (x.onchange = run));
    run();
  };

  /* 15.2-2: the O(nW) table for 0-1 knapsack, one row per item, then the traceback. */
  W.knap01Table = function (el) {
    const I = itemInputs(el);
    const tbl = h('div', { class: 'scroll-x' });
    const player = new StepPlayer({ render });
    const B = bench('DP 填表', '0-1 knapsack：K[i, w] = 只用前 i 個物品、容量 w 的最大價值',
      I.row, tbl, legend('cur', ['win', '拿這個物品'], 'trace'), player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    let d, res, steps;
    function run() {
      d = I.read();
      if (!d) return;
      res = GR.knapsack01(d.items, d.W);
      if (res.C > 60) { d.err.textContent = `W / 單位 = ${res.C} 欄太寬了，請用較小的 W（或讓重量有公因數）。`; return; }
      steps = res.steps.concat([{ i: d.items.length, K: res.K, take: res.take, trace: true,
        msg: `回溯：從 K[${d.items.length}, ${d.W}] = <b>${res.best}</b> 往上走。和上一列同一格相同 → 沒拿；不同 → 拿了，往左跳 w<sub>i</sub>。拿了 {${res.chosen.join(', ')}}。` }]);
      player.load(steps);
    }
    function render(st) {
      const onPath = (i, c) => st.trace && res.path.some(([a, b]) => a === i && b === c);
      tbl.replaceChildren(table({
        corner: 'i \\ w', compact: res.C > 12,
        colHeads: Array.from({ length: res.C + 1 }, (_, c) => ({ text: c * res.unit })),
        rowHeads: [{ text: '0' }, ...d.items.map((it, i) => ({ html: `${i + 1} <span class="small muted">(${it.v}, ${it.w})</span>` }))],
        cell(i, c) {
          if (i > st.i) return null;
          let cls = i === st.i && !st.trace ? 'cur' : null;
          if (st.take && st.take[i] && st.take[i][c] && (i === st.i || st.trace)) cls = 'win';
          if (onPath(i, c)) cls = 'trace';
          return { text: st.K[i][c], cls };
        },
      }), res.unit > 1 ? h('div', { class: 'table-cap', style: 'text-align:left' }, `重量和 W 都是 ${res.unit} 的倍數，所以欄位以 ${res.unit} 為一格。`) : null);
    }
    I.inputs.forEach((x) => (x.onchange = run));
    run();
  };
})();
