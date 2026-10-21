/* Small widgets used only on the textbook-exercises page. */
(function () {
  'use strict';
  const { h, nums, table, bench } = UI;
  const W = (window.Widgets = window.Widgets || {});

  function pricesIn(v) { return h('input', { type: 'text', value: v, spellcheck: 'false', 'aria-label': '價格', style: 'width:220px' }); }

  /* 14.1-2: greedy by density vs DP. */
  W.rodGreedy = function (el) {
    const P = pricesIn('1 20 33 36');
    const nIn = h('input', { type: 'number', min: 1, max: 12, value: 4, 'aria-label': 'n' });
    const err = h('div', { class: 'err' });
    const out = h('div');
    const B = bench('比較', '貪婪（先切密度最高的）vs DP',
      h('div', { class: 'inputs' }, h('label', null, '價格 p1 p2 …', P), h('label', null, 'n', nIn), err), out);
    el.replaceWith(B.el);
    function run() {
      const a = nums(P.value);
      const n = Number(nIn.value) || 1;
      err.textContent = '';
      if (!a || a.length < n) { err.textContent = `需要至少 ${n} 個價格。`; return; }
      const p = [0, ...a];
      const g = DP.rodGreedy(p, n);
      const d = DP.rodCut(p, n);
      const opt = DP.rodPieces(d.s, n);
      out.replaceChildren(
        h('table', { class: 'plain' }, h('tr', null, h('th', null, '長度 i'), ...a.slice(0, n).map((_, i) => h('th', { class: 'num' }, i + 1))),
          h('tr', null, h('th', null, 'p_i'), ...a.slice(0, n).map((x) => h('td', { class: 'num' }, x))),
          h('tr', null, h('th', null, '密度 p_i / i'), ...a.slice(0, n).map((x, i) => h('td', { class: 'num' }, (x / (i + 1)).toFixed(2))))),
        h('div', { class: 'two' },
          h('div', null, h('b', null, '貪婪：'), W._rod(g.pieces, 26), h('span', null, `  收益 ${g.value}`)),
          h('div', null, h('b', null, 'DP：'), W._rod(opt, 26), h('span', null, `  收益 ${d.r[n]}`))),
        h('p', { class: 'small' }, g.value < d.r[n] ? `貪婪法少賺了 ${d.r[n] - g.value} → 反例成立。` : '這組價格貪婪法剛好最佳，換一組試試。'));
    }
    P.oninput = nIn.oninput = run;
    run();
  };

  /* 14.1-3: every cut costs c. */
  W.rodCost = function (el) {
    const P = pricesIn('1 5 8 9 10 17 17 20 24 30');
    const cIn = h('input', { type: 'number', min: 0, max: 20, value: 2, step: 1, 'aria-label': 'c' });
    const out = h('div', { class: 'scroll-x' });
    const B = bench('計算', '每切一刀要付 c 元', h('div', { class: 'inputs' }, h('label', null, '價格', P), h('label', null, '每刀成本 c', cIn)), out);
    el.replaceWith(B.el);
    function run() {
      const a = nums(P.value);
      if (!a) return;
      const n = a.length, p = [0, ...a], c = Number(cIn.value) || 0;
      const r0 = DP.rodCut(p, n), r1 = DP.rodCutWithCost(p, n, c);
      const pieces = (s, j) => { const o = []; while (j > 0) { o.push(s[j]); j -= s[j]; } return o.join('+'); };
      out.replaceChildren(table({ corner: 'j', compact: true, colHeads: a.map((_, i) => ({ text: i + 1 })),
        rowHeads: [{ html: 'r[j]（c = 0）' }, { html: '切法' }, { html: `r[j]（c = ${c}）` }, { html: '切法' }],
        cell(ri, ci) {
          const j = ci + 1;
          if (ri === 0) return r0.r[j];
          if (ri === 1) return { text: pieces(r0.s, j), cls: 'na' };
          if (ri === 2) return { text: r1.r[j], cls: r1.r[j] !== r0.r[j] - c * (pieces(r0.s, j).split('+').length - 1) ? 'win' : null };
          return { text: pieces(r1.s, j), cls: 'na' };
        } }),
      h('p', { class: 'small' }, `c 越大，最佳解越傾向少切。綠色格子是「把 c = 0 的最佳切法照抄再扣掉刀費」不是最佳的地方。`));
    }
    P.oninput = cIn.oninput = run;
    run();
  };

  /* 14.1-4: number of calls when the loop only goes to floor(n/2). */
  W.rodHalf = function (el) {
    const N = 14;
    const T = [1], H = [1, 1];
    for (let n = 1; n <= N; n++) T[n] = 2 ** n;
    for (let n = 2; n <= N; n++) { let s = 1; for (let i = 1; i <= Math.floor(n / 2); i++) s += H[i] + H[n - i]; H[n] = s; }
    const B = bench('數一數', '兩種寫法的遞迴呼叫次數',
      h('div', { class: 'scroll-x' }, table({ corner: 'n', compact: true, colHeads: Array.from({ length: N + 1 }, (_, i) => ({ text: i })),
        rowHeads: [{ html: 'CUT-ROD' }, { html: '只跑到 ⌊n/2⌋' }, { html: '比例' }],
        cell(r, n) { return r === 0 ? T[n] : r === 1 ? H[n] : (H[n] / T[n]).toFixed(2); } })),
      h('p', { class: 'small' }, '迴圈少跑一半，但每圈要遞迴兩次，呼叫次數仍然是 Θ(2ⁿ)（大約是原本的 0.8 倍）。'));
    el.replaceWith(B.el);
  };
})();
