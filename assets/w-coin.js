/* Widgets for coin changing (slides p.3–6, Problem 15-1). */
(function () {
  'use strict';
  const { h, code, StepPlayer, table, nums, bench } = UI;
  const W = (window.Widgets = window.Widgets || {});

  const PRESETS = [
    ['$1 $2 $5 $10（投影片）', '1 2 5 10', 18],
    ['$1 $4 $5 $10（反例）', '1 4 5 10', 8],
    ['美國 1 5 10 25', '1 5 10 25', 63],
    ['1 3 4', '1 3 4', 6],
    ['2 的冪 1 2 4 8', '1 2 4 8', 15],
  ];

  function coinRow(bag, cls) {
    return h('div', { class: 'coins' }, bag.length ? bag.map((c, i) => h('span', { class: 'coin' + (c >= 10 ? ' big' : '') + (cls ? ' ' + cls(i) : '') }, c)) : h('span', { class: 'small muted' }, '（空的）'));
  }
  W._coinRow = coinRow;

  function parseCoins(str) {
    const a = nums(str);
    if (!a || a.some((x) => x <= 0 || !Number.isInteger(x))) return null;
    return [...new Set(a)].sort((x, y) => x - y);
  }

  const COINCODE = [
    'bag = ∅',
    'while x > 0',
    '    c = 不超過 x 的最大硬幣',
    '    把 c 放進 bag',
    '    x = x - c',
    'return bag',
  ];

  /* The greedy change-maker, step by step, checked against the true optimum. */
  W.coinGreedy = function (el) {
    const coinsIn = h('input', { type: 'text', value: el.dataset.coins || PRESETS[0][1], spellcheck: 'false', 'aria-label': '面額' });
    const xIn = h('input', { type: 'number', min: 1, max: 999, value: el.dataset.x || PRESETS[0][2], 'aria-label': 'x' });
    const err = h('div', { class: 'err' });
    const chips = h('div', { class: 'chips' }, PRESETS.map(([name, cs, x]) => h('button', { type: 'button', onclick: () => { coinsIn.value = cs; xIn.value = x; run(); } }, name)));
    const cd = code(COINCODE, '貪婪找零');
    const view = h('div');
    const verdict = h('div');
    const player = new StepPlayer({ code: cd, render });
    const B = bench('逐步執行', '每次拿「最大且不超過 x」的硬幣',
      h('div', { class: 'inputs' }, h('label', null, '面額', coinsIn), h('label', null, '找 x 元', xIn), err), chips,
      h('div', { class: 'bench-cols', style: 'margin-top:12px' }, view, cd.el), player.el, verdict);
    el.replaceWith(B.el);
    player.keys(B.el);
    let x, coins, opt;
    function run() {
      coins = parseCoins(coinsIn.value);
      x = Math.max(1, Math.min(999, Math.floor(Number(xIn.value)) || 1));
      err.textContent = '';
      if (!coins) { err.textContent = '面額請輸入正整數，用空白或逗號分隔。'; return; }
      const g = GR.coinGreedy(coins, x);
      opt = GR.coinDP(coins, x);
      player.load(g.steps);
      const ce = GR.coinCounterexample(coins);
      const same = g.ok && g.bag.length === opt.count;
      verdict.replaceChildren(
        h('h4', null, '和最佳解比較（用 DP 算出的最少枚數）'),
        h('div', { class: 'two', style: 'align-items:start' },
          h('div', null, h('p', { class: 'small' }, '貪婪：', h('b', null, g.ok ? g.bag.length + ' 枚' : '找不開')), coinRow(g.bag)),
          h('div', null, h('p', { class: 'small' }, '最佳：', h('b', null, opt.count < Infinity ? opt.count + ' 枚' : '無解')), coinRow(opt.bag, () => 'opt'))),
        h('p', null, h('span', { class: 'verdict' + (same ? '' : ' bad') }, same ? '貪婪 = 最佳' : '貪婪不是最佳'), ' ',
          h('span', { class: 'small', html: ce
            ? `這組面額<b>有反例</b>：最小的是 x = ${ce.x}（貪婪 ${ce.greedy ? ce.greedy.join('+') : '找不開'}，最佳 ${ce.opt.join('+')}）。`
            : '這組面額對<b>所有</b> x 貪婪都最佳（檢查到兩個最大面額之和，超過就不會再有反例）。' })));
    }
    function render(st) {
      view.replaceChildren(
        h('p', { style: 'margin:0 0 6px' }, '還要找：', h('span', { class: 'coin big', style: 'width:auto;padding:0 12px;border-radius:99px' }, '$' + st.left)),
        h('p', { class: 'small muted', style: 'margin:0' }, '袋子：'),
        coinRow(st.bag, (i) => (i === st.bag.length - 1 && st.c ? 'new' : '')));
    }
    coinsIn.onchange = xIn.onchange = run;
    run();
  };

  /* Greedy vs optimal for every amount 1..N (Problem 15-1 c, d). */
  W.coinCompare = function (el) {
    const coinsIn = h('input', { type: 'text', value: el.dataset.coins || '1 4 5 10', spellcheck: 'false', 'aria-label': '面額' });
    const nIn = h('input', { type: 'number', min: 5, max: 40, value: el.dataset.n || 24, 'aria-label': 'N' });
    const err = h('div', { class: 'err' });
    const chips = h('div', { class: 'chips' }, PRESETS.map(([name, cs]) => h('button', { type: 'button', onclick: () => { coinsIn.value = cs; run(); } }, name)));
    const out = h('div');
    const B = bench('全部比一遍', 'x = 1…N：貪婪枚數 vs DP 最少枚數',
      h('div', { class: 'inputs' }, h('label', null, '面額', coinsIn), h('label', null, 'N（≤ 40）', nIn), err), chips, out);
    el.replaceWith(B.el);
    function run() {
      const coins = parseCoins(coinsIn.value);
      const N = Math.max(5, Math.min(40, Number(nIn.value) || 24));
      err.textContent = '';
      if (!coins) { err.textContent = '面額請輸入正整數。'; return; }
      const dp = GR.coinDP(coins, N);
      const gr = Array.from({ length: N + 1 }, (_, x) => { const g = GR.coinGreedy(coins, x); return g.ok ? g.bag.length : Infinity; });
      const bad = [];
      for (let x = 1; x <= N; x++) if (gr[x] !== dp.best[x]) bad.push(x);
      const show = (v) => (v === Infinity ? '—' : v);
      out.replaceChildren(
        h('div', { class: 'scroll-x' }, table({
          corner: 'x', compact: true, colHeads: Array.from({ length: N }, (_, i) => ({ text: i + 1 })),
          rowHeads: [{ text: '貪婪' }, { text: '最佳' }, { text: '最後一枚' }],
          cell(r, i) {
            const x = i + 1, wrong = gr[x] !== dp.best[x];
            if (r === 0) return { text: show(gr[x]), cls: wrong ? 'cur' : null };
            if (r === 1) return { text: show(dp.best[x]), cls: wrong ? 'win' : null };
            return { text: dp.pick[x] === null ? '—' : dp.pick[x], cls: 'na' };
          },
        })),
        h('p', { class: 'small', html: bad.length
          ? `黃色欄 = 貪婪比最佳多用硬幣，共 ${bad.length} 個：x = ${bad.join(', ')}。`
          : `1…${N} 全部一致：這組面額貪婪就是最佳。` }),
        h('p', { class: 'small muted', html: `「最佳」列就是 Problem 15-1(d) 的 DP：best[x] = 1 + min<sub>c ≤ x</sub> best[x − c]，best[0] = 0；「最後一枚」列記錄達到最小值的 c，可用來還原找法。共 N × k 次比較 → O(nk)。` }));
    }
    coinsIn.onchange = nIn.onchange = run;
    run();
  };
})();
