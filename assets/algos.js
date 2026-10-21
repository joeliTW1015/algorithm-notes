/* Pure DP algorithms that also record a step-by-step trace for the visualisers.
 * No DOM access here, so the same file is loaded by the pages and by tests/run.js. */
(function (root) {
  'use strict';

  const INF = Infinity;
  const copy2 = (t) => t.map((row) => row.slice());
  const round = (x) => Math.round(x * 1e9) / 1e9;

  /* ---------- Rod cutting (EXTENDED-BOTTOM-UP-CUT-ROD) ---------- */
  // p is 1-indexed: p[0] is ignored. n <= p.length - 1.
  function rodCut(p, n) {
    const r = new Array(n + 1).fill(null);
    const s = new Array(n + 1).fill(null);
    const steps = [];
    r[0] = 0;
    steps.push({ line: 2, j: null, i: null, r: r.slice(), s: s.slice(),
      msg: 'Base case：長度 0 的鋼條收益為 0，所以 r[0] = 0。' });
    for (let j = 1; j <= n; j++) {
      let q = -INF;
      steps.push({ line: 4, j, i: null, q, r: r.slice(), s: s.slice(),
        msg: `開始計算 r[${j}]：先令 q = −∞，接著嘗試第一刀的每個位置 i = 1…${j}。` });
      for (let i = 1; i <= j; i++) {
        const cand = p[i] + r[j - i];
        const better = cand > q;
        const old = q;
        if (better) { q = cand; s[j] = i; }
        steps.push({ line: better ? 7 : 6, j, i, q, cand, better, r: r.slice(), s: s.slice(), reads: [j - i],
          msg: `i = ${i}：先切下長度 ${i}（賣 p[${i}] = ${p[i]}），剩下長度 ${j - i} 用最佳解 r[${j - i}] = ${r[j - i]}。` +
            ` 候選值 = ${p[i]} + ${r[j - i]} = <b>${cand}</b>` +
            (better ? `，比目前的 q = ${old === -INF ? '−∞' : old} 好 → 更新 q = ${cand}、s[${j}] = ${i}。`
              : `，沒有比 q = ${old} 好，不更新。`) });
      }
      r[j] = q;
      steps.push({ line: 9, j, i: null, q, done: true, r: r.slice(), s: s.slice(),
        msg: `r[${j}] = ${q} 確定（第一刀切在 s[${j}] = ${s[j]}）。之後計算更長的鋼條時就直接查表，不再重算。` });
    }
    return { r, s, steps };
  }

  function rodPieces(s, n) {
    const pieces = [];
    while (n > 0) { pieces.push(s[n]); n -= s[n]; }
    return pieces;
  }

  // All 2^(n-1) ways to cut a rod of length n, as arrays of piece lengths.
  function rodCompositions(n) {
    const out = [];
    for (let mask = 0; mask < (1 << (n - 1)); mask++) {
      const pieces = [];
      let len = 1;
      for (let b = 0; b < n - 1; b++) {
        if (mask & (1 << (n - 2 - b))) { pieces.push(len); len = 1; } else len++;
      }
      pieces.push(len);
      out.push(pieces);
    }
    return out;
  }

  // Greedy by density (Exercise 14.1-2).
  function rodGreedy(p, n) {
    const pieces = [];
    let left = n;
    while (left > 0) {
      let best = 1;
      for (let i = 1; i <= left; i++) if (p[i] / i > p[best] / best) best = i;
      pieces.push(best);
      left -= best;
    }
    return { pieces, value: pieces.reduce((a, i) => a + p[i], 0) };
  }

  // Rod cutting where every cut costs c (Exercise 14.1-3).
  function rodCutWithCost(p, n, c) {
    const r = [0], s = [0];
    for (let j = 1; j <= n; j++) {
      let q = p[j], best = j;
      for (let i = 1; i < j; i++) {
        const cand = p[i] + r[j - i] - c;
        if (cand > q) { q = cand; best = i; }
      }
      r[j] = q; s[j] = best;
    }
    return { r, s };
  }

  /* ---------- Recursion trees ---------- */
  // CUT-ROD(p, n): children are CUT-ROD(p, n - i) for i = 1..n.
  function cutRodTree(n) {
    const node = { label: String(n), key: n, children: [] };
    for (let i = 1; i <= n; i++) node.children.push(cutRodTree(n - i));
    return node;
  }

  // RECURSIVE-MATRIX-CHAIN(p, i, j): children (i,k) and (k+1,j) for each k.
  function mcmTree(i, j) {
    const node = { label: `${i}..${j}`, key: `${i},${j}`, children: [] };
    for (let k = i; k < j; k++) node.children.push(mcmTree(i, k), mcmTree(k + 1, j));
    return node;
  }

  function mergeSortTree(lo, hi) {
    const node = { label: lo === hi ? `${lo}` : `${lo}–${hi}`, key: `${lo},${hi}`, children: [] };
    if (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      node.children.push(mergeSortTree(lo, mid), mergeSortTree(mid + 1, hi));
    }
    return node;
  }

  function fibTree(n) {
    const node = { label: `F${n}`, key: n, children: [] };
    if (n >= 2) node.children.push(fibTree(n - 1), fibTree(n - 2));
    return node;
  }

  // Marks, in DFS (call) order, which calls a memoized version would actually compute.
  function markMemo(tree) {
    const seen = new Set();
    let calls = 0, computed = 0;
    (function walk(node) {
      calls++;
      if (seen.has(node.key)) { node.memoHit = true; node.pruned = true; return; }
      seen.add(node.key);
      computed++;
      node.children.forEach(walk);
    })(tree);
    return { calls, computed };
  }

  function countNodes(tree) {
    return 1 + tree.children.reduce((a, c) => a + countNodes(c), 0);
  }

  /* ---------- Matrix-chain multiplication ---------- */
  // dims = [p0, p1, ..., pn]; A_i is p_{i-1} x p_i. mode 'min' (default) or 'max' (Exercise 14.3-3).
  function matrixChain(dims, mode) {
    const maximise = mode === 'max';
    const n = dims.length - 1;
    const m = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(null));
    const s = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(null));
    const steps = [];
    let refs = 0;
    for (let i = 1; i <= n; i++) m[i][i] = 0;
    steps.push({ line: 3, m: copy2(m), s: copy2(s),
      msg: `Chain length 1：單一矩陣不用乘，所以 m[i, i] = 0（i = 1…${n}）。` });
    for (let l = 2; l <= n; l++) {
      for (let i = 1; i <= n - l + 1; i++) {
        const j = i + l - 1;
        let best = maximise ? -INF : INF;
        steps.push({ line: 7, l, i, j, m: copy2(m), s: copy2(s),
          msg: `Chain length ${l}：計算 m[${i}, ${j}]，也就是 A${i}…A${j} 的${maximise ? '最多' : '最少'}乘法次數。先令 m[${i}, ${j}] = ${maximise ? '−∞' : '∞'}，再試每個分割點 k = ${i}…${j - 1}。` });
        for (let k = i; k < j; k++) {
          refs += 2;
          const q = m[i][k] + m[k + 1][j] + dims[i - 1] * dims[k] * dims[j];
          const better = maximise ? q > best : q < best;
          const old = best;
          if (better) { best = q; m[i][j] = q; s[i][j] = k; }
          steps.push({ line: better ? 11 : 9, l, i, j, k, q, better, m: copy2(m), s: copy2(s),
            reads: [[i, k], [k + 1, j]],
            msg: `k = ${k}：(A${i}…A${k})(A${k + 1}…A${j}) → m[${i},${k}] + m[${k + 1},${j}] + p${i - 1}·p${k}·p${j}` +
              ` = ${m[i][k]} + ${m[k + 1][j]} + ${dims[i - 1]}·${dims[k]}·${dims[j]} = <b>${q}</b>` +
              (better ? `，${old === INF || old === -INF ? '是第一個候選' : (maximise ? '比 ' + old + ' 大' : '比 ' + old + ' 小')} → 更新 m[${i},${j}] = ${q}、s[${i},${j}] = ${k}。`
                : `，沒有比 ${old} ${maximise ? '大' : '小'}，不更新。`) });
        }
        steps.push({ line: 12, l, i, j, done: true, m: copy2(m), s: copy2(s),
          msg: `m[${i}, ${j}] = ${m[i][j]} 確定，最佳分割點 s[${i}, ${j}] = ${s[i][j]}。` });
      }
    }
    return { m, s, n, steps, refs };
  }

  function parens(s, i, j) {
    if (i === j) return `A${i}`;
    return `(${parens(s, i, s[i][j])}${parens(s, s[i][j] + 1, j)})`;
  }

  // The optimal parenthesization as a binary tree (for drawing).
  function parenTree(s, dims, i, j) {
    if (i === j) return { label: `A${i}`, sub: `${dims[i - 1]}×${dims[i]}`, children: [] };
    const k = s[i][j];
    return { label: `${i}..${j}`, sub: `${dims[i - 1]}×${dims[j]}`, children: [parenTree(s, dims, i, k), parenTree(s, dims, k + 1, j)] };
  }

  // Greedy split that minimises p_{i-1} p_k p_j first (Exercise 14.3-4).
  function mcmGreedy(dims, i, j) {
    i = i || 1; j = j || dims.length - 1;
    if (i === j) return { cost: 0, str: `A${i}` };
    let bk = i;
    for (let k = i; k < j; k++) if (dims[i - 1] * dims[k] * dims[j] < dims[i - 1] * dims[bk] * dims[j]) bk = k;
    const L = mcmGreedy(dims, i, bk), R = mcmGreedy(dims, bk + 1, j);
    return { cost: L.cost + R.cost + dims[i - 1] * dims[bk] * dims[j], str: `(${L.str}${R.str})` };
  }

  function catalan(n) { // number of full parenthesizations of n matrices = C_{n-1}
    const P = [0, 1];
    for (let k = 2; k <= n; k++) {
      let t = 0;
      for (let a = 1; a < k; a++) t += P[a] * P[k - a];
      P[k] = t;
    }
    return P;
  }

  /* ---------- LCS ---------- */
  function lcs(X, Y, tie) {
    const preferUp = tie !== 'left';
    const m = X.length, n = Y.length;
    const c = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(null));
    const b = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(null));
    const steps = [];
    for (let i = 0; i <= m; i++) c[i][0] = 0;
    for (let j = 0; j <= n; j++) c[0][j] = 0;
    steps.push({ line: 6, c: copy2(c), b: copy2(b), msg: 'Step 1：空字串和任何字串的 LCS 長度都是 0，所以第 0 列、第 0 行全部填 0。' });
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        let msg, line, reads;
        if (X[i - 1] === Y[j - 1]) {
          c[i][j] = c[i - 1][j - 1] + 1; b[i][j] = 'diag'; line = 10; reads = [[i - 1, j - 1]];
          msg = `x${i} = '${X[i - 1]}' 與 y${j} = '${Y[j - 1]}' <b>相同</b> → 這個字元一定可以接在 LCS 尾端：c[${i},${j}] = c[${i - 1},${j - 1}] + 1 = ${c[i][j]}，箭頭 ↖。`;
        } else if (preferUp ? c[i - 1][j] >= c[i][j - 1] : c[i - 1][j] > c[i][j - 1]) {
          c[i][j] = c[i - 1][j]; b[i][j] = 'up'; line = 13; reads = [[i - 1, j], [i, j - 1]];
          msg = `'${X[i - 1]}' ≠ '${Y[j - 1]}' → 取 max(上方 c[${i - 1},${j}] = ${c[i - 1][j]}, 左方 c[${i},${j - 1}] = ${c[i][j - 1]})。上方 ${preferUp ? '≥' : '>'} 左方 → c[${i},${j}] = ${c[i][j]}，箭頭 ↑。`;
        } else {
          c[i][j] = c[i][j - 1]; b[i][j] = 'left'; line = 15; reads = [[i - 1, j], [i, j - 1]];
          msg = `'${X[i - 1]}' ≠ '${Y[j - 1]}' → 取 max(上方 c[${i - 1},${j}] = ${c[i - 1][j]}, 左方 c[${i},${j - 1}] = ${c[i][j - 1]})。左方${preferUp ? '較大' : ' ≥ 上方'} → c[${i},${j}] = ${c[i][j]}，箭頭 ←。`;
        }
        steps.push({ line, i, j, reads, c: copy2(c), b: copy2(b), msg });
      }
    }
    // Trace back from c[m][n] (PRINT-LCS).
    const path = [];
    let i = m, j = n, out = '';
    while (i > 0 && j > 0) {
      path.push([i, j]);
      if (b[i][j] === 'diag') { out = X[i - 1] + out; i--; j--; } else if (b[i][j] === 'up') i--; else j--;
    }
    return { c, b, steps, path, lcs: out, length: c[m][n] };
  }

  // Cells touched by the memoized version (Exercise 14.4-3).
  function lcsMemoCells(X, Y) {
    const memo = new Map();
    let calls = 0;
    function L(i, j) {
      calls++;
      const key = i * 10007 + j;
      if (memo.has(key)) return memo.get(key);
      let v;
      if (i === 0 || j === 0) v = 0;
      else if (X[i - 1] === Y[j - 1]) v = L(i - 1, j - 1) + 1;
      else v = Math.max(L(i - 1, j), L(i, j - 1));
      memo.set(key, v);
      return v;
    }
    const length = L(X.length, Y.length);
    const cells = [...memo.keys()].map((k) => [Math.floor(k / 10007), k % 10007]);
    return { length, cells, calls };
  }

  function allLCS(X, Y, limit) {
    limit = limit || 50;
    const { c } = lcs(X, Y);
    const memo = new Map();
    function back(i, j) {
      const key = i + ',' + j;
      if (memo.has(key)) return memo.get(key);
      let res;
      if (i === 0 || j === 0) res = new Set(['']);
      else if (X[i - 1] === Y[j - 1]) res = new Set([...back(i - 1, j - 1)].map((s) => s + X[i - 1]));
      else {
        res = new Set();
        if (c[i - 1][j] >= c[i][j - 1]) back(i - 1, j).forEach((s) => res.add(s));
        if (c[i][j - 1] >= c[i - 1][j]) back(i, j - 1).forEach((s) => res.add(s));
      }
      if (res.size > limit) res = new Set([...res].slice(0, limit));
      memo.set(key, res);
      return res;
    }
    return [...back(X.length, Y.length)].sort();
  }

  /* ---------- Optimal BST ---------- */
  // p[1..n] (p[0] ignored), q[0..n].
  function optimalBST(p, q) {
    const n = q.length - 1;
    const e = Array.from({ length: n + 2 }, () => new Array(n + 1).fill(null));
    const w = Array.from({ length: n + 2 }, () => new Array(n + 1).fill(null));
    const rt = Array.from({ length: n + 2 }, () => new Array(n + 1).fill(null));
    const steps = [];
    for (let i = 1; i <= n + 1; i++) { e[i][i - 1] = q[i - 1]; w[i][i - 1] = q[i - 1]; }
    steps.push({ line: 4, e: copy2(e), w: copy2(w), root: copy2(rt),
      msg: 'Boundary condition：只含 dummy key d<sub>i−1</sub> 的子樹 → e[i, i−1] = w[i, i−1] = q<sub>i−1</sub>。' });
    for (let l = 1; l <= n; l++) {
      for (let i = 1; i <= n - l + 1; i++) {
        const j = i + l - 1;
        w[i][j] = round(w[i][j - 1] + p[j] + q[j]);
        let best = INF;
        steps.push({ line: 9, l, i, j, e: copy2(e), w: copy2(w), root: copy2(rt), wRead: [[i, j - 1]],
          msg: `計算 e[${i}, ${j}]（keys k${i}…k${j}）。先算 w[${i},${j}] = w[${i},${j - 1}] + p${j} + q${j} = ${fmt(w[i][j - 1])} + ${fmt(p[j])} + ${fmt(q[j])} = <b>${fmt(w[i][j])}</b>。接著試每個 root r = ${i}…${j}。` });
        for (let r = i; r <= j; r++) {
          const t = round(e[i][r - 1] + e[r + 1][j] + w[i][j]);
          const better = t < best - 1e-12;
          const old = best;
          if (better) { best = t; e[i][j] = t; rt[i][j] = r; }
          steps.push({ line: better ? 13 : 11, l, i, j, r, t, better, e: copy2(e), w: copy2(w), root: copy2(rt),
            reads: [[i, r - 1], [r + 1, j]], wRead: [[i, j]],
            msg: `root = k${r}：左子樹 e[${i},${r - 1}] = ${fmt(e[i][r - 1])}，右子樹 e[${r + 1},${j}] = ${fmt(e[r + 1][j])}，加上 w[${i},${j}] = ${fmt(w[i][j])}（整棵子樹深一層，每個節點多比較一次）→ <b>${fmt(t)}</b>` +
              (better ? (old === INF ? '，是第一個候選 → 記錄。' : `，比 ${fmt(old)} 小 → 更新 root[${i},${j}] = ${r}。`) : `，沒有比 ${fmt(old)} 小。`) });
        }
        steps.push({ line: 14, l, i, j, done: true, e: copy2(e), w: copy2(w), root: copy2(rt),
          msg: `e[${i}, ${j}] = ${fmt(e[i][j])} 確定，root[${i}, ${j}] = k${rt[i][j]}。` });
      }
    }
    return { e, w, root: rt, n, steps, cost: e[1][n] };
  }

  function fmt(x) {
    if (x === null || x === undefined) return '';
    if (x === INF) return '∞';
    return (Math.round(x * 100) / 100).toFixed(2);
  }

  // Build the optimal tree (CONSTRUCT-OPTIMAL-BST, Exercise 14.5-1) as {label, children}.
  function bstTree(rt, i, j) {
    if (j === i - 1) return { label: `d${j}`, dummy: true, idx: j, children: [] };
    const r = rt[i][j];
    return { label: `k${r}`, idx: r, children: [bstTree(rt, i, r - 1), bstTree(rt, r + 1, j)] };
  }

  // Expected search cost of any tree with depth(root) = 1.
  function bstCost(tree, p, q) {
    const rows = [];
    let total = 0;
    (function walk(node, depth) {
      const prob = node.dummy ? q[node.idx] : p[node.idx];
      rows.push({ label: node.label, depth, prob, contrib: depth * prob });
      total += depth * prob;
      node.children.forEach((c) => walk(c, depth + 1));
    })(tree, 1);
    return { total: round(total), rows };
  }

  // Build a tree from a nested spec like ['k2', ['k1','d0','d1'], ...].
  function treeFromSpec(spec) {
    if (typeof spec === 'string') {
      const dummy = spec[0] === 'd';
      return { label: spec, dummy, idx: Number(spec.slice(1)), children: [] };
    }
    const [label, L, R] = spec;
    return { label, idx: Number(label.slice(1)), children: [treeFromSpec(L), treeFromSpec(R)] };
  }

  /* ---------- Practice problems ---------- */
  // Number of ways to climb k stairs with moves of 1, 2 or 3.
  function stairs(n, moves) {
    moves = moves || [1, 2, 3];
    const F = [1];
    for (let k = 1; k <= n; k++) F[k] = moves.reduce((a, s) => a + (k - s >= 0 ? F[k - s] : 0), 0);
    return F;
  }

  // O(n^2) DP over "ends at i". mode 'len' = LIS length, 'sum' = max-weight increasing subsequence (sushi).
  function increasingSubseq(A, mode, strict) {
    if (strict === undefined) strict = true;
    const n = A.length;
    const D = new Array(n).fill(null), prev = new Array(n).fill(-1);
    const steps = [];
    const less = (a, b) => (strict ? a < b : a <= b);
    for (let i = 0; i < n; i++) {
      D[i] = mode === 'sum' ? A[i] : 1;
      steps.push({ i, j: null, D: D.slice(), prev: prev.slice(),
        msg: mode === 'sum' ? `第 ${i + 1} 盤（$${A[i]}）：最少可以只拿這一盤 → S[${i + 1}] = ${A[i]}。接著看前面哪一盤可以接在它前面。`
          : `A[${i + 1}] = ${A[i]}：最少可以自己一個元素 → L[${i + 1}] = 1。接著看前面哪些元素可以接在它前面。` });
      for (let j = 0; j < i; j++) {
        const ok = less(A[j], A[i]);
        const cand = ok ? D[j] + (mode === 'sum' ? A[i] : 1) : null;
        const better = ok && cand > D[i];
        if (better) { D[i] = cand; prev[i] = j; }
        steps.push({ i, j, ok, better, D: D.slice(), prev: prev.slice(),
          msg: ok
            ? (mode === 'sum'
              ? `${A[j]} < ${A[i]}，可以先拿第 ${j + 1} 盤再拿第 ${i + 1} 盤：S[${j + 1}] + ${A[i]} = ${cand}` + (better ? ` → 更新 S[${i + 1}] = ${cand}。` : `，沒有比 ${D[i]} 大。`)
              : `${A[j]} < ${A[i]}，可以接在 A[${j + 1}] 後面：L[${j + 1}] + 1 = ${cand}` + (better ? ` → 更新 L[${i + 1}] = ${cand}。` : `，沒有比 ${D[i]} 大。`))
            : `${A[j]} ${strict ? '≥' : '>'} ${A[i]}，不能接在後面，跳過。` });
      }
    }
    let end = 0;
    for (let i = 1; i < n; i++) if (D[i] > D[end]) end = i;
    const seq = [];
    for (let i = end; i !== -1; i = prev[i]) seq.unshift(i);
    return { D, prev, steps, best: D[end], seq };
  }

  // k x n board tiled with k x 1 bars: f(n) = f(n-1) + f(n-k).
  function tiling(k, n) {
    const f = [];
    // k = 1: a vertical bar and a horizontal bar are the same 1x1 piece, so there is exactly one tiling.
    for (let x = 0; x <= n; x++) f[x] = x < k || k === 1 ? 1 : f[x - 1] + f[x - k];
    return f;
  }

  // Each tiling is a sequence of 'V' (one vertical bar, width 1) and 'H' (k stacked horizontal bars, width k).
  function enumerateTilings(k, n, limit) {
    limit = limit || 60;
    const out = [];
    (function go(rest, acc) {
      if (out.length >= limit) return;
      if (rest === 0) { out.push(acc.slice()); return; }
      acc.push('V'); go(rest - 1, acc); acc.pop();
      if (rest >= k && k > 1) { acc.push('H'); go(rest - k, acc); acc.pop(); }
    })(n, []);
    return out;
  }

  // Maximum-weight independent set on a rooted tree. tree: {id, w, children}.
  function treeMWIS(tree) {
    const steps = [];
    const val = {};
    (function post(node) {
      node.children.forEach(post);
      const inc = node.w + node.children.reduce((a, c) => a + val[c.id].out, 0);
      const exc = node.children.reduce((a, c) => a + Math.max(val[c.id].in, val[c.id].out), 0);
      val[node.id] = { in: inc, out: exc };
      const kids = node.children.map((c) => c.id);
      steps.push({ id: node.id, val: JSON.parse(JSON.stringify(val)),
        msg: kids.length === 0
          ? `葉節點 ${node.id}：選它 → in = w = ${node.w}；不選 → out = 0。`
          : `節點 ${node.id}（w = ${node.w}）：<br>選它 → 小孩都不能選：in = ${node.w} + ${kids.map((c) => `out(${c})`).join(' + ')} = <b>${inc}</b>；<br>不選 → 每個小孩自由選較好的：out = ${kids.map((c) => `max(in(${c}), out(${c}))`).join(' + ')} = <b>${exc}</b>。` });
    })(tree);
    const chosen = new Set();
    (function pick(node, parentTaken) {
      const take = !parentTaken && val[node.id].in >= val[node.id].out;
      if (take) chosen.add(node.id);
      node.children.forEach((c) => pick(c, take));
    })(tree, false);
    return { val, steps, chosen, best: Math.max(val[tree.id].in, val[tree.id].out) };
  }

  /* ---------- Puzzles ---------- */
  // Pirate game. Pirates are ranked 1..N, the lowest remaining rank proposes. A proposal passes when
  // at least half of the remaining pirates (proposer included) vote yes.
  // tie: 'no'  — a pirate votes yes only if strictly better off than after rejection;
  //      'yes' — a pirate also votes yes when it makes no difference.
  function pirates(N, coins, tie) {
    const stages = [];
    let next = null; // payoff vector (indexed by rank) if the current proposer is thrown out
    for (let first = N; first >= 1; first--) {
      const k = N - first + 1; // pirates remaining
      const need = Math.ceil(k / 2); // votes needed, including the proposer
      const pay = new Array(N + 1).fill(0);
      const others = [];
      for (let r = first + 1; r <= N; r++) others.push({ r, price: next ? next[r] + (tie === 'yes' ? 0 : 1) : 0, before: next ? next[r] : 0 });
      others.sort((a, b) => a.price - b.price || b.r - a.r);
      const bought = others.slice(0, need - 1);
      let spent = 0;
      bought.forEach((o) => { pay[o.r] = o.price; spent += o.price; });
      pay[first] = coins - spent;
      for (let r = 1; r < first; r++) pay[r] = null; // already out
      stages.push({ first, k, need, pay: pay.slice(), bought: bought.map((o) => o.r), prev: next ? next.slice() : null });
      next = pay;
    }
    return stages.reverse(); // stages[0] is the real game (rank 1 proposes)
  }

  const api = {
    rodCut, rodPieces, rodCompositions, rodGreedy, rodCutWithCost,
    cutRodTree, mcmTree, mergeSortTree, fibTree, markMemo, countNodes,
    matrixChain, parens, parenTree, mcmGreedy, catalan,
    lcs, lcsMemoCells, allLCS,
    optimalBST, bstTree, bstCost, treeFromSpec, fmt,
    stairs, increasingSubseq, tiling, enumerateTilings, treeMWIS, pirates,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DP = api;
})(typeof window !== 'undefined' ? window : globalThis);
