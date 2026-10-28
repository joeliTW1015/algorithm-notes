/* Widgets used only by the Ch15 exercises page. */
(function () {
  'use strict';
  const { h, s, StepPlayer, table, nums, bench, legend } = UI;
  const W = (window.Widgets = window.Widgets || {});

  /* 15.1-5: weighted activity selection by DP. */
  W.weightedAct = function (el) {
    const inp = h('input', { type: 'text', value: '0-3:3 1-4:2 3-6:5 4-7:4 2-9:9 6-10:4 8-11:3 9-12:2', spellcheck: 'false', style: 'width:420px', 'aria-label': '活動 s-f:v' });
    const err = h('div', { class: 'err' });
    const out = h('div');
    const B = bench('DP', '活動有價值 v：最大化總價值', h('div', { class: 'inputs' }, h('label', null, '活動 s-f:v', inp), err), out);
    el.replaceWith(B.el);
    function run() {
      err.textContent = '';
      const re = /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*:\s*(\d+(?:\.\d+)?)/g, acts = [];
      let m;
      while ((m = re.exec(inp.value))) acts.push({ id: 'a' + (acts.length + 1), s: +m[1], f: +m[2], v: +m[3] });
      if (!acts.length || acts.some((a) => !(a.f > a.s))) { err.textContent = '格式：s-f:v，例如 0-3:3。'; return; }
      const res = GR.weightedActivities(acts);
      const greedy = GR.activitySelector(acts).chosen;
      const gVal = acts.filter((a) => greedy.includes(a.id)).reduce((t, a) => t + a.v, 0);
      out.replaceChildren(
        W._timeline(res.order, (a) => (res.chosen.includes(a.id) ? 'sel' : '')),
        h('div', { class: 'scroll-x' }, table({
          corner: 'j', compact: true,
          colHeads: [{ text: 0 }, ...res.order.map((a, j) => ({ text: j + 1 }))],
          rowHeads: [{ text: '活動' }, { text: 'v' }, { html: 'p(j)' }, { html: 'V[j]' }],
          cell(r, j) {
            if (j === 0) return r === 3 ? 0 : { text: '—', cls: 'na' };
            const a = res.order[j - 1];
            if (r === 0) return { text: a.id, cls: res.chosen.includes(a.id) ? 'win' : null };
            if (r === 1) return a.v;
            if (r === 2) return res.p[j - 1];
            return { text: res.V[j], cls: j === res.order.length ? 'trace' : null };
          },
        })),
        h('p', { class: 'small', html: `最佳總價值 V[${res.order.length}] = <b>${res.best}</b>，選 {${res.chosen.join(', ')}}。` +
          `只看「最早結束」的貪婪會選 {${greedy.join(', ')}}，總價值 ${gVal}${gVal < res.best ? '——加了權重之後貪婪就不對了' : ''}。` }));
    }
    inp.onchange = run;
    run();
  };

  /* 15.2-5: cover points with the fewest unit intervals. */
  W.unitCover = function (el) {
    const inp = h('input', { type: 'text', value: '0.3 0.8 1.2 2.5 2.9 3.4 3.6 5.1 5.4 6.8', spellcheck: 'false', style: 'width:340px', 'aria-label': '點' });
    const err = h('div', { class: 'err' });
    const out = h('div');
    const B = bench('貪婪', '最左邊還沒被蓋到的點 x → 放 [x, x+1]', h('div', { class: 'inputs' }, h('label', null, '點 x1 x2 …', inp), err), out);
    el.replaceWith(B.el);
    function run() {
      err.textContent = '';
      const pts = nums(inp.value);
      if (!pts) { err.textContent = '請輸入數字。'; return; }
      const iv = GR.unitIntervals(pts);
      const lo = Math.floor(Math.min(...pts)), hi = Math.ceil(Math.max(...pts) + 1);
      const Wd = 640, L = 20, X = (t) => L + ((t - lo) / (hi - lo || 1)) * (Wd - 2 * L);
      const svg = s('svg', { class: 'tl', viewBox: `0 0 ${Wd} 110`, width: Wd, role: 'img', 'aria-label': 'unit intervals' });
      for (let t = lo; t <= hi; t++) {
        svg.append(s('line', { class: 'grid', x1: X(t), x2: X(t), y1: 10, y2: 84 }), s('text', { class: 'tick', x: X(t), y: 100 }, t));
      }
      svg.append(s('line', { class: 'axis', x1: L, x2: Wd - L, y1: 84, y2: 84 }));
      iv.forEach(([a, b], i) => {
        const g = s('g', { class: 'act sel' });
        g.append(s('rect', { x: X(a), y: 18 + (i % 2) * 22, width: X(b) - X(a), height: 16, rx: 3 }));
        g.append(s('text', { x: X(a) + 4, y: 26 + (i % 2) * 22, style: 'font-size:10.5px' }, `[${a}, ${b}]`));
        svg.append(g);
      });
      pts.forEach((x) => svg.append(s('circle', { cx: X(x), cy: 84, r: 4.5, fill: 'var(--ink)' })));
      out.replaceChildren(h('div', { class: 'scroll-x' }, svg),
        h('p', { class: 'small' }, `共 ${iv.length} 個區間。點排序後只掃一次：O(n log n)（排序）+ O(n)。`));
    }
    inp.oninput = run;
    run();
  };

  /* Problem in the slides: maximum subarray, greedily. */
  W.maxSub = function (el) {
    const inp = h('input', { type: 'text', value: '13 -3 -25 20 -3 -16 -23 18 20 -7 12 -5 -22 15 -4 7', spellcheck: 'false', style: 'width:420px', 'aria-label': 'A' });
    const err = h('div', { class: 'err' });
    const tbl = h('div', { class: 'scroll-x' });
    const player = new StepPlayer({ render });
    const B = bench('逐步執行', '貪婪求最大子陣列：前綴和變負就丟掉',
      h('div', { class: 'inputs' }, h('label', null, '陣列 A', inp), err), tbl, legend('cur', ['read', '目前的區段 cur'], ['win', '目前最佳 best']), player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    let A;
    function run() {
      err.textContent = '';
      A = nums(inp.value);
      if (!A) { err.textContent = '請輸入數字。'; return; }
      player.load(GR.maxSubarray(A).steps);
    }
    function render(st) {
      tbl.replaceChildren(table({
        corner: 'i', compact: A.length > 12,
        colHeads: A.map((_, i) => ({ text: i + 1 })),
        rowHeads: [{ text: 'A[i]' }, { text: '最佳' }],
        cell(r, i) {
          if (r === 0) return { text: A[i], cls: i === st.i ? 'cur' : i >= st.cl && i < st.i ? 'read' : null };
          return i >= st.bl && i <= st.br ? { text: '■', cls: 'win' } : null;
        },
      }), h('p', { class: 'small' }, `cur = ${st.cur}，best = ${st.best}（A[${st.bl + 1}..${st.br + 1}]）`));
    }
    inp.onchange = run;
    run();
  };
})();
