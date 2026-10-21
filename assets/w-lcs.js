/* Widgets for Lecture 14-3: longest common subsequence. */
(function () {
  'use strict';
  const { h, code, StepPlayer, table, bench, legend } = UI;
  const W = (window.Widgets = window.Widgets || {});
  const ARROW = { diag: '↖', up: '↑', left: '←' };

  function strInput(v, label, width) {
    return h('input', { type: 'text', value: v, spellcheck: 'false', 'aria-label': label, maxlength: 14, style: `width:${width || 170}px;text-transform:none` });
  }

  /* Is T a subsequence of S? Highlights the matched positions greedily. */
  W.subseqCheck = function (el) {
    const S = strInput('farmers', 'S', 200), T = strInput('fame', '候選', 200);
    const out = h('div');
    const B = bench('檢查', '這是 S 的 subsequence 嗎？',
      h('div', { class: 'inputs' }, h('label', null, '字串 S', S), h('label', null, '候選子序列', T)), out);
    el.replaceWith(B.el);
    function run() {
      const s = S.value, t = T.value;
      const idx = [];
      let j = 0;
      for (let i = 0; i < s.length && j < t.length; i++) if (s[i] === t[j]) { idx.push(i); j++; }
      const ok = j === t.length;
      out.replaceChildren(
        h('div', { style: 'display:flex;gap:4px;flex-wrap:wrap;margin:6px 0' }, [...s].map((ch, i) =>
          h('span', { class: 'mono', style: `display:inline-block;width:30px;text-align:center;border:1.5px solid var(--ink);border-radius:4px;padding:3px 0;background:${idx.includes(i) && ok ? 'var(--hl)' : '#fff'}` }, ch,
            h('span', { style: 'display:block;font-size:10px;color:var(--ink-faint)' }, i + 1)))),
        h('p', { class: 'small' }, ok
          ? `是 ✓：取 S 的第 ${idx.map((i) => i + 1).join(', ')} 個字元（下標遞增）就得到 “${t}”。`
          : `不是 ✗：由左往右貪婪比對，只能配到 “${t.slice(0, j)}”，剩下 “${t.slice(j)}” 在 S 後面找不到。`));
    }
    S.oninput = T.oninput = run;
    run();
  };

  const LCSCODE = [
    'm = X.length',
    'n = Y.length',
    'for i = 1 to m',
    '    c[i, 0] = 0',
    'for j = 0 to n',
    '    c[0, j] = 0',
    'for i = 1 to m',
    '    for j = 1 to n',
    '        if x_i == y_j',
    '            c[i, j] = c[i-1, j-1] + 1',
    '            b[i, j] = "↖"',
    '        elseif c[i-1, j] ≥ c[i, j-1]',
    '            c[i, j] = c[i-1, j]',
    '            b[i, j] = "↑"',
    '        else c[i, j] = c[i, j-1]',
    '            b[i, j] = "←"',
    'return c and b',
  ];

  // Number of calls made by the plain recursive Compute_L(m, n), counted with a DP.
  function naiveCalls(X, Y) {
    const m = X.length, n = Y.length;
    const C = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(1));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      C[i][j] = 1 + (X[i - 1] === Y[j - 1] ? C[i - 1][j - 1] : C[i - 1][j] + C[i][j - 1]);
    return C[m][n];
  }

  /* LCS-LENGTH step by step plus the traceback. data-x, data-y */
  W.lcsTable = function (el) {
    const X = strInput(el.dataset.x || 'DIRTYROOM', 'X（列）'), Y = strInput(el.dataset.y || 'DORMITORY', 'Y（行）');
    const tie = h('select', { 'aria-label': '平手時' }, h('option', { value: 'up' }, '↑（≥，課本）'), h('option', { value: 'left' }, '←（>）'));
    const go = h('button', { class: 'primary' }, '重新計算');
    const err = h('div', { class: 'err' });
    const cd = code(LCSCODE, 'LCS-LENGTH(X, Y)');
    const tbl = h('div', { class: 'scroll-x' });
    const info = h('div');
    const player = new StepPlayer({ code: cd, render });
    const B = bench('逐步執行', '填 c 表（數字）與 b 表（箭頭），最後從 c[m, n] 回溯',
      h('div', { class: 'inputs' }, h('label', null, 'X（列，長度 m）', X), h('label', null, 'Y（行，長度 n）', Y), h('label', null, '平手時往', tie), go, err),
      h('div', { class: 'bench-cols' }, h('div', null, tbl, legend('cur', 'read', ['trace', '回溯路徑（↖ 的字元組成 LCS）'])), cd.el),
      player.el, info);
    el.replaceWith(B.el);
    player.keys(B.el);
    let x, y, res;
    function run() {
      x = X.value.trim(); y = Y.value.trim();
      err.textContent = '';
      if (!x || !y) { err.textContent = '兩個字串都不能是空的。'; return; }
      res = DP.lcs(x, y, tie.value);
      const m = x.length, n = y.length;
      // Append the traceback as extra steps.
      const steps = res.steps.slice();
      const last = steps[steps.length - 1];
      let built = '';
      const trail = [];
      steps.push(Object.assign({}, last, { i: null, j: null, reads: null, trail: [], line: 17,
        msg: `表填完了：LCS 長度 = c[${m}, ${n}] = <b>${res.length}</b>。接下來從右下角 c[${m}, ${n}] 開始沿著箭頭往回走（PRINT-LCS）。` }));
      for (const [i, j] of res.path) {
        trail.push([i, j]);
        const dir = res.b[i][j];
        if (dir === 'diag') built = x[i - 1] + built;
        steps.push(Object.assign({}, last, { i: null, j: null, reads: null, trail: trail.slice(), line: 17,
          msg: dir === 'diag'
            ? `(${i}, ${j}) 是 ↖：x${i} = y${j} = '${x[i - 1]}' 屬於 LCS，往左上走。目前（由後往前）得到 “<b>${built}</b>”。`
            : `(${i}, ${j}) 是 ${ARROW[dir]}：這格沒有用到字元，往${dir === 'up' ? '上' : '左'}走。` }));
      }
      steps.push(Object.assign({}, last, { i: null, j: null, reads: null, trail: trail.slice(), line: 17, final: true,
        msg: `走到邊界（i = 0 或 j = 0）停止。把 ↖ 格子的字元由前往後讀，得到一個 LCS：“<b>${res.lcs}</b>”。` }));
      player.load(steps);
      const all = DP.allLCS(x, y, 40);
      const memo = DP.lcsMemoCells(x, y);
      info.replaceChildren(h('div', { class: 'two', style: 'margin-top:12px' },
        h('div', { class: 'note', style: 'margin:0' },
          h('p', null, h('b', null, `所有 LCS（共 ${all.length} 個${all.length >= 40 ? '以上' : ''}）：`), all.join('、')),
          h('p', { class: 'small muted' }, '回溯只會走出其中一個；平手時選 ↑ 或 ← 會走到不同的 LCS。')),
        h('div', { class: 'note', style: 'margin:0' },
          h('p', { class: 'small' }, `直接遞迴 Compute_L(${m}, ${n})：${naiveCalls(x, y).toLocaleString()} 次呼叫。`),
          h('p', { class: 'small' }, `Bottom-up：填 (m+1)(n+1) = ${(m + 1) * (n + 1)} 格。`),
          h('p', { class: 'small' }, `Memoized（習題 14.4-3）：只碰到 ${memo.cells.length} 格，共 ${memo.calls} 次呼叫。`))));
    }
    function render(st) {
      const m = x.length, n = y.length;
      const onTrail = (i, j) => st.trail && st.trail.some(([a, b]) => a === i && b === j);
      // On the final step, colour the row/column headers of the characters that form the LCS.
      const diag = st.final ? res.path.filter(([a, b]) => res.b[a][b] === 'diag') : [];
      const rowsUsed = new Set(diag.map(([a]) => a)), colsUsed = new Set(diag.map(([, b]) => b));
      const rowHeads = [{ text: '' }, ...[...x].map((ch, i) => ({ text: ch, ch: true, cls: rowsUsed.has(i + 1) ? 'trace' : null }))];
      const colHeads = [{ text: '' }, ...[...y].map((ch, j) => ({ text: ch, ch: true, cls: colsUsed.has(j + 1) ? 'trace' : null }))];
      tbl.replaceChildren(table({
        corner: '', colHeads, rowHeads, compact: Math.max(m, n) > 10,
        cell(i, j) {
          const v = st.c[i][j];
          if (v === null) return null;
          let cls = null;
          if (i === st.i && j === st.j) cls = 'cur';
          else if (st.reads && st.reads.some(([a, b]) => a === i && b === j)) cls = 'read';
          else if (onTrail(i, j)) cls = 'trace';
          const a = st.b[i][j];
          return { html: `${v}${a ? `<span class="arr">${ARROW[a]}</span>` : ''}`, cls };
        },
      }));
    }
    go.onclick = run;
    tie.onchange = run;
    run();
  };

  /* Cells visited by the memoized version (Exercise 14.4-3). */
  W.lcsMemo = function (el) {
    const X = strInput('ABCBDAB', 'X'), Y = strInput('BDCABA', 'Y');
    const out = h('div');
    const B = bench('比較', 'Memoized LCS 實際算了哪些格子',
      h('div', { class: 'inputs' }, h('label', null, 'X', X), h('label', null, 'Y', Y)), out);
    el.replaceWith(B.el);
    function run() {
      const x = X.value.trim(), y = Y.value.trim();
      if (!x || !y) return;
      const memo = DP.lcsMemoCells(x, y);
      const { c } = DP.lcs(x, y);
      const vis = new Set(memo.cells.map(([i, j]) => i + ',' + j));
      out.replaceChildren(h('div', { class: 'scroll-x' }, table({
        corner: '', compact: true,
        colHeads: [{ text: '' }, ...[...y].map((ch) => ({ text: ch, ch: true }))],
        rowHeads: [{ text: '' }, ...[...x].map((ch) => ({ text: ch, ch: true }))],
        cell(i, j) { return vis.has(i + ',' + j) ? { text: c[i][j], cls: 'read' } : { text: c[i][j], cls: 'na' }; },
      })), h('p', { class: 'small' }, `藍色 = memoized 版本有算到的格子（${memo.cells.length} / ${(x.length + 1) * (y.length + 1)}）；斜線 = 從來沒被呼叫。每格最多算一次、每次 O(1) → O(mn)。`));
    }
    X.oninput = Y.oninput = run;
    run();
  };
})();
