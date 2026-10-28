/* Widgets for activity selection (slides p.9–19, exercises 15.1-x). */
(function () {
  'use strict';
  const { h, s, code, StepPlayer, bench, legend } = UI;
  const W = (window.Widgets = window.Widgets || {});

  const SLIDE = '1-3 2-5 4-7 1-8 5-9 8-10 9-11 11-14 13-16';
  const DATASETS = [
    ['投影片例子（9 個）', SLIDE],
    ['反例：最短時間（p.11）', '4:50-5:10 3:00-5:00 5:05-7:00'],
    ['反例：最早開始（p.12）', '3:00-10:00 3:10-3:20 3:20-3:30 3:30-3:40 3:40-3:50 3:50-4:00'],
    ['反例：最少衝突（15.1-3）', '0-3 4-7 8-11 12-15 2-5 6-9 10-13 2-5 2-5 2-5 10-13 10-13 10-13'],
  ];

  // "1-3 2-5" or "4:50-5:10 …" → {acts, clock}. Clock times are stored as minutes.
  function parseActs(str) {
    const re = /(\d+(?:\.\d+)?(?::\d\d)?)\s*[-–~]\s*(\d+(?:\.\d+)?(?::\d\d)?)/g;
    const t = (x) => (x.includes(':') ? Number(x.split(':')[0]) * 60 + Number(x.split(':')[1]) : Number(x));
    const acts = [];
    let m, clock = false;
    while ((m = re.exec(str))) {
      if (m[0].includes(':')) clock = true;
      acts.push({ id: 'a' + (acts.length + 1), s: t(m[1]), f: t(m[2]) });
    }
    if (!acts.length || acts.some((a) => !(a.f > a.s))) return null;
    return { acts, clock };
  }
  const clockFmt = (v) => `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;

  // One row per activity. cls(a) → extra class; fline = x position of a dashed marker.
  function timeline(acts, cls, opts) {
    opts = opts || {};
    const fmtT = opts.clock ? clockFmt : String;
    const lo = Math.min(...acts.map((a) => a.s)), hi = Math.max(...acts.map((a) => a.f));
    const span = hi - lo || 1;
    const nice = [1, 2, 5, 10, 15, 30, 60, 120].find((st) => span / st <= 16) || Math.ceil(span / 16);
    const t0 = Math.floor(lo / nice) * nice, t1 = Math.ceil(hi / nice) * nice;
    const L = 40, R = 14, rowH = opts.rowH || 22, Wd = opts.width || 680, top = 8;
    const H = top + acts.length * rowH + 26;
    const X = (t) => L + ((t - t0) / (t1 - t0 || 1)) * (Wd - L - R);
    const svg = s('svg', { class: 'tl', viewBox: `0 0 ${Wd} ${H}`, width: Wd, role: 'img', 'aria-label': opts.aria || '活動時間軸' });
    for (let t = t0; t <= t1; t += nice) {
      svg.append(s('line', { class: 'grid', x1: X(t), x2: X(t), y1: top, y2: H - 22 }));
      svg.append(s('text', { class: 'tick', x: X(t), y: H - 8 }, fmtT(t)));
    }
    svg.append(s('line', { class: 'axis', x1: L, x2: Wd - R, y1: H - 22, y2: H - 22 }));
    acts.forEach((a, i) => {
      const y = top + i * rowH;
      const g = s('g', { class: 'act' + (cls ? ' ' + (cls(a) || '') : '') });
      g.append(s('title', null, `${a.id}: [${fmtT(a.s)}, ${fmtT(a.f)})` + (a.v !== undefined ? `  v = ${a.v}` : '')));
      g.append(s('text', { x: 4, y: y + rowH / 2 }, a.id));
      g.append(s('rect', { x: X(a.s), y: y + 3, width: Math.max(2, X(a.f) - X(a.s)), height: rowH - 6, rx: 3 }));
      if (a.v !== undefined) g.append(s('text', { x: X(a.s) + 5, y: y + rowH / 2, style: 'font-size:10.5px' }, 'v=' + a.v));
      svg.append(g);
    });
    if (opts.fline !== undefined && opts.fline !== null) svg.append(s('line', { class: 'fline', x1: X(opts.fline), x2: X(opts.fline), y1: top - 4, y2: H - 22 }));
    return h('div', { class: 'scroll-x' }, svg);
  }
  W._timeline = timeline;
  W._parseActs = parseActs;

  const SELCODE = [
    'n = s.length',
    'A = {a1}',
    'k = 1',
    'for m = 2 to n',
    '    if s[m] >= f[k]',
    '        A = A ∪ {am}',
    '        k = m',
    'return A',
  ];

  function selectorClass(st, order) {
    return (a) => {
      const idx = order.indexOf(a);
      if (st.m === idx && !st.done && st.line === 5) return 'cur';
      if (st.sel.includes(a.id)) return order[st.k] === a && !st.done ? 'cmp sel' : 'sel';
      if (st.skip.includes(a.id)) return 'skip';
      return '';
    };
  }

  /* GREEDY-ACTIVITY-SELECTOR, step by step. */
  W.actSelector = function (el) {
    const inp = h('input', { type: 'text', value: el.dataset.acts || SLIDE, spellcheck: 'false', 'aria-label': '活動 s-f', style: 'width:420px' });
    const go = h('button', { class: 'primary' }, '重新計算');
    const err = h('div', { class: 'err' });
    const cd = code(SELCODE, 'GREEDY-ACTIVITY-SELECTOR(s, f)');
    const view = h('div');
    const note = h('p', { class: 'small muted' });
    const player = new StepPlayer({ code: cd, render });
    const B = bench('逐步執行', '依結束時間掃一遍，能選就選',
      h('div', { class: 'inputs' }, h('label', null, '活動 [s, f)，用 s-f 表示', inp), go, err), note,
      h('div', { class: 'bench-cols' }, h('div', null, h('div', { class: 'view' }),
        legend(['cur', '正在檢查的 am'], ['read', '上一個選中的 ak（虛線 = f[k]）'], ['win', '已選入 A'])), cd.el),
      player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    const holder = B.el.querySelector('.view');
    let res, clock;
    function run() {
      const p = parseActs(inp.value);
      err.textContent = '';
      if (!p) { err.textContent = '請輸入像 1-3 2-5 4-7 的區間（f 要大於 s）。'; return; }
      clock = p.clock;
      res = GR.activitySelector(p.acts);
      const sorted = res.order.every((a, i) => a === p.acts[i]);
      note.textContent = sorted ? '輸入已依結束時間排序（投影片的前提）。' : '輸入沒有依結束時間排序，先排序（O(n log n)），下面依排序後的順序畫。';
      player.load(res.steps);
    }
    function render(st) {
      const k = res.order[st.k];
      holder.replaceChildren(timeline(res.order, selectorClass(st, res.order), { clock, fline: st.done ? null : k.f }));
    }
    go.onclick = run;
    inp.onchange = run;
    run();
  };

  /* Try different greedy rules on different inputs. */
  W.actRules = function (el) {
    const inp = h('input', { type: 'text', value: DATASETS[Number(el.dataset.set || 0)][1], spellcheck: 'false', 'aria-label': '活動 s-f', style: 'width:420px' });
    const err = h('div', { class: 'err' });
    let rule = el.dataset.rule || 'duration';
    const ruleChips = h('div', { class: 'chips' });
    const dataChips = h('div', { class: 'chips' }, DATASETS.map(([name, v]) => h('button', { type: 'button', onclick: () => { inp.value = v; run(); } }, name)));
    const showOpt = h('input', { type: 'checkbox' });
    const view = h('div');
    const result = h('p');
    const player = new StepPlayer({ render });
    const B = bench('比較策略', '哪一種「先選誰」才對？',
      h('div', { class: 'inputs' }, h('label', null, '活動 [s, f)', inp), err),
      h('p', { class: 'small', style: 'margin:0 0 4px' }, '輸入：'), dataChips,
      h('p', { class: 'small', style: 'margin:10px 0 4px' }, '貪婪規則（每次從剩下、不衝突的活動中挑）：'), ruleChips,
      h('label', { class: 'small', style: 'display:flex;gap:6px;align-items:center;margin-top:8px' }, showOpt, '用紫框標出一組最佳解（最早結束法的結果）'),
      view, legend(['cur', '這一步選的'], ['win', '已選'], ['trace', '最佳解']), player.el, result);
    el.replaceWith(B.el);
    player.keys(B.el);
    function drawChips() {
      ruleChips.replaceChildren(...Object.entries(GR.RULES).map(([k, r]) =>
        h('button', { type: 'button', class: k === rule ? 'on' : null, onclick: () => { rule = k; drawChips(); run(); } }, r.name)));
    }
    let p, res, opt;
    function run() {
      p = parseActs(inp.value);
      err.textContent = '';
      if (!p) { err.textContent = '請輸入像 1-3 2-5 的區間（f 要大於 s）。'; return; }
      res = GR.activityByRule(p.acts, rule);
      opt = GR.activitySelector(p.acts).chosen;
      const ok = res.chosen.length === opt.length;
      result.replaceChildren(h('span', { class: 'verdict' + (ok ? '' : ' bad') }, ok ? '這次剛好最佳' : '不是最佳'), ' ',
        h('span', { class: 'small', html: `「${GR.RULES[rule].name}」選到 <b>${res.chosen.length}</b> 個 {${res.chosen.join(', ')}}；最佳是 <b>${opt.length}</b> 個 {${opt.join(', ')}}。` +
          (ok && rule !== 'finish' && rule !== 'lastStart' ? ' 試試其他輸入，找出它失敗的例子。' : '') }));
      player.load(res.steps, 'end');
    }
    function render(st) {
      const order = p.acts.slice().sort((a, b) => a.s - b.s || a.f - b.f);
      view.replaceChildren(timeline(order, (a) => {
        let c = '';
        if (a.id === st.pick) c = 'cur';
        else if (st.chosen.includes(a.id)) c = 'sel';
        else if (st.dropped.includes(a.id)) c = 'skip';
        if (showOpt.checked && opt.includes(a.id)) c += ' opt';
        return c;
      }, { clock: p.clock }));
    }
    showOpt.onchange = () => player.go(player.i);
    inp.onchange = run;
    drawChips();
    run();
  };

  /* Hub hero: the selector plays itself on the slide example, then loops. */
  W.heroActivity = function (el) {
    const acts = parseActs(SLIDE).acts;
    const res = GR.activitySelector(acts);
    const holder = h('div');
    const cap = h('div', { class: 'table-cap' });
    const wrap = h('div', { class: 'table-live', role: 'img', 'aria-label': '活動選擇自動示範' }, holder, cap);
    el.replaceWith(wrap);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let i = reduce ? res.steps.length - 1 : 0;
    function draw() {
      const st = res.steps[i];
      holder.replaceChildren(timeline(res.order, selectorClass(st, res.order), { width: 460, rowH: 20, fline: st.done ? null : res.order[st.k].f }));
      cap.textContent = st.done ? `選出 {${st.sel.join(', ')}}：依結束時間掃一遍就好` : `GREEDY-ACTIVITY-SELECTOR · 已選 ${st.sel.join(', ')}`;
    }
    draw();
    if (!reduce) setInterval(() => { i = (i + 1) % (res.steps.length + 3); if (i < res.steps.length) draw(); }, 700);
  };
})();
