/* The hub's hero: an LCS table that fills itself, cell by cell, then traces back. */
(function () {
  'use strict';
  const { h, table } = UI;
  const W = (window.Widgets = window.Widgets || {});
  const ARROW = { diag: '↖', up: '↑', left: '←' };

  W.heroTable = function (el) {
    const X = 'DIRTYROOM', Y = 'DORMITORY';
    const res = DP.lcs(X, Y);
    const steps = res.steps;
    const holder = h('div', { class: 'table-live', 'aria-label': 'LCS 表格自動填入的示範', role: 'img' });
    const cap = h('div', { class: 'table-cap' });
    const wrap = h('div', null, holder, cap);
    el.replaceWith(wrap);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let k = reduce ? steps.length + res.path.length : 0;
    function draw() {
      const fillIdx = Math.min(k, steps.length - 1);
      const st = steps[fillIdx];
      const trailN = Math.max(0, k - (steps.length - 1));
      const trail = res.path.slice(0, trailN);
      const onTrail = (i, j) => trail.some(([a, b]) => a === i && b === j);
      holder.replaceChildren(table({
        corner: '', compact: true,
        colHeads: [{ text: '' }, ...[...Y].map((c) => ({ text: c, ch: true }))],
        rowHeads: [{ text: '' }, ...[...X].map((c) => ({ text: c, ch: true }))],
        cell(i, j) {
          const v = st.c[i][j];
          if (v === null) return null;
          let cls = null;
          if (trailN === 0 && i === st.i && j === st.j) cls = 'cur';
          else if (trailN === 0 && st.reads && st.reads.some(([a, b]) => a === i && b === j)) cls = 'read';
          else if (onTrail(i, j)) cls = 'trace';
          const a = st.b[i][j];
          return { html: `${v}${a ? `<span class="arr">${ARROW[a]}</span>` : ''}`, cls };
        },
      }));
      cap.textContent = trailN === 0
        ? `LCS("${X}", "${Y}")：填 c[${st.i ?? 0}, ${st.j ?? 0}]`
        : `沿箭頭回溯 → LCS = "${res.lcs}"（長度 ${res.length}）`;
    }
    draw();
    if (reduce) return;
    const total = steps.length + res.path.length + 14; // pause on the finished table
    setInterval(() => {
      if (document.hidden) return;
      k = (k + 1) % total;
      if (k < steps.length + res.path.length) draw();
    }, 140);
  };
})();
