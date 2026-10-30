/* Pure amortized-analysis models (Ch16) that also record a step-by-step trace for the visualisers.
 * No DOM access here, so the same file is loaded by the pages and by tests/run.js. */
(function (root) {
  'use strict';

  /* ---------- Super stack (slides p.4–7, CLRS MULTIPOP) ---------- */
  // ops: [{op:'push', x} | {op:'pop'} | {op:'superpop', k}]. Cost: PUSH/POP 1, SUPER-POP(k) = #items popped.
  function stackRun(ops) {
    const st = [], steps = [];
    let total = 0, pushes = 0, popped = 0, next = 1;
    steps.push({ i: 0, stack: [], cost: 0, total: 0, pushes: 0, popped: 0, msg: '空的 stack，還沒有任何操作。' });
    ops.forEach((o, idx) => {
      let cost = 0, out = [], msg;
      if (o.op === 'push') {
        const x = o.x !== undefined ? o.x : next;
        next = Math.max(next, x) + 1;
        st.push(x); cost = 1; pushes++;
        msg = `PUSH(${x})：成本 1。`;
      } else if (o.op === 'pop') {
        if (st.length) { out = [st.pop()]; cost = 1; popped++; msg = `POP：拿走 ${out[0]}，成本 1。`; }
        else msg = 'POP：stack 是空的，什麼都沒做（成本 0）。';
      } else {
        const m = Math.min(o.k, st.length);
        out = st.splice(st.length - m, m).reverse();
        cost = m; popped += m;
        msg = `SUPER-POP(${o.k})：拿走頂端 ${m} 個${m ? `（${out.join(', ')}）` : ''}，成本 <b>${m}</b>。`;
      }
      total += cost;
      steps.push({ i: idx + 1, op: o, out, stack: st.slice(), cost, total, pushes, popped,
        msg: msg + ` 累計成本 ${total}；被 pop 掉的總數 ${popped} ≤ PUSH 次數 ${pushes}。` });
    });
    return { steps, total, pushes, popped };
  }

  // Deterministic pseudo-random sequence (so a preset always looks the same).
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => { a ^= a << 13; a ^= a >>> 17; a ^= a << 5; return (a >>> 0) / 4294967296; };
  }
  function randomStackOps(n, seed) {
    const r = rng(seed || 7), ops = [];
    let size = 0;
    for (let i = 0; i < n; i++) {
      const u = r();
      if (size === 0 || u < 0.6) { ops.push({ op: 'push' }); size++; }
      else if (u < 0.8) { ops.push({ op: 'pop' }); size--; }
      else { const k = 1 + Math.floor(r() * size); ops.push({ op: 'superpop', k }); size -= k; }
    }
    return ops;
  }
  // Looks bad per operation: n−1 pushes, then one SUPER-POP that costs n−1. Total still 2(n−1).
  function worstStackOps(n) {
    return [...Array.from({ length: n - 1 }, () => ({ op: 'push' })), { op: 'superpop', k: n - 1 }];
  }

  /* ---------- k-bit binary counter (slides p.8–14, CLRS INCREMENT) ---------- */
  // bits[i] = b_i (b_0 is the lowest bit). Returns the new bits and which bits flipped.
  function increment(bits) {
    const b = bits.slice(), k = b.length, flips = [];
    let i = 0;
    while (i < k && b[i] === 1) { b[i] = 0; flips.push(i); i++; }
    if (i < k) { b[i] = 1; flips.push(i); }
    return { bits: b, flips, cost: flips.length };
  }
  // 16.1-2: subtract 1 (mod 2^k): trailing 0s become 1, then the lowest 1 becomes 0.
  function decrement(bits) {
    const b = bits.slice(), k = b.length, flips = [];
    let i = 0;
    while (i < k && b[i] === 0) { b[i] = 1; flips.push(i); i++; }
    if (i < k) { b[i] = 0; flips.push(i); }
    return { bits: b, flips, cost: flips.length };
  }
  const value = (bits) => bits.reduce((v, x, i) => v + x * 2 ** i, 0);
  const show = (bits) => bits.slice().reverse().join('');

  // ops: array of 'inc' / 'dec' (default: n increments). Starts at 0.
  function counterRun(k, opsOrN) {
    const ops = typeof opsOrN === 'number' ? Array(opsOrN).fill('inc') : opsOrN;
    let bits = Array(k).fill(0), total = 0;
    const perBit = Array(k).fill(0);
    const steps = [{ i: 0, bits, flips: [], cost: 0, total: 0, perBit: perBit.slice(), msg: `${k}-bit counter 從 0 開始：${show(bits)}。` }];
    ops.forEach((op, idx) => {
      const before = bits, r = op === 'dec' ? decrement(bits) : increment(bits);
      bits = r.bits; total += r.cost;
      r.flips.forEach((i) => perBit[i]++);
      const name = op === 'dec' ? 'DECREMENT' : 'INCREMENT';
      const wrap = op === 'dec' ? value(before) === 0 : value(bits) === 0;
      steps.push({ i: idx + 1, op, before, bits, flips: r.flips, cost: r.cost, total, perBit: perBit.slice(),
        msg: `第 ${idx + 1} 次 ${name}：${show(before)} → ${show(bits)}（count = ${value(bits)}${wrap ? '，繞回來了' : ''}），翻了 ` +
          `${r.flips.map((i) => 'b' + i).join(', ')}，成本 <b>${r.cost}</b>；累計 ${total}。` });
    });
    return { steps, total, perBit };
  }

  // Slide p.13: b_i flips ⌊n/2^i⌋ times, so the total is Σ_{i<k} ⌊n/2^i⌋ < 2n.
  function incrementTotal(n, k) {
    let t = 0;
    for (let i = 0; i < k; i++) t += Math.floor(n / 2 ** i);
    return t;
  }

  /* ---------- Exercise 16.1-3 ---------- */
  const isPow2 = (i) => i > 0 && (i & (i - 1)) === 0;
  const powCost = (i) => (isPow2(i) ? i : 1);
  function powTotal(n) { let t = 0; for (let i = 1; i <= n; i++) t += powCost(i); return t; }

  /* ---------- Average case (slides p.16–17): quicksort comparisons ---------- */
  // CLRS QUICKSORT with Lomuto PARTITION (pivot = last element); PARTITION on A[p..r] makes r − p comparisons.
  function quicksortComparisons(arr) {
    const A = arr.slice();
    let c = 0;
    (function qs(p, r) {
      if (p >= r) return;
      const x = A[r];
      let i = p - 1;
      for (let j = p; j < r; j++) { c++; if (A[j] <= x) { i++; [A[i], A[j]] = [A[j], A[i]]; } }
      [A[i + 1], A[r]] = [A[r], A[i + 1]];
      qs(p, i); qs(i + 2, r);
    })(0, A.length - 1);
    return c;
  }
  function permutations(n) {
    const out = [], a = Array.from({ length: n }, (_, i) => i + 1);
    (function rec(k) {
      if (k === n) { out.push(a.slice()); return; }
      for (let i = k; i < n; i++) { [a[k], a[i]] = [a[i], a[k]]; rec(k + 1); [a[k], a[i]] = [a[i], a[k]]; }
    })(0);
    return out;
  }
  // Every input order of 1..n: histogram of comparisons, average, worst.
  function quicksortStats(n) {
    const hist = new Map();
    let sum = 0, worst = 0, best = Infinity, worstPerm = null;
    const perms = permutations(n);
    for (const p of perms) {
      const c = quicksortComparisons(p);
      hist.set(c, (hist.get(c) || 0) + 1);
      sum += c;
      if (c > worst) { worst = c; worstPerm = p; }
      best = Math.min(best, c);
    }
    return { count: perms.length, avg: sum / perms.length, worst, best, worstPerm, hist };
  }
  // Closed form of the average: 2(n+1)H_n − 4n.
  function quicksortAvgFormula(n) {
    let H = 0;
    for (let i = 1; i <= n; i++) H += 1 / i;
    return 2 * (n + 1) * H - 4 * n;
  }

  const api = {
    stackRun, randomStackOps, worstStackOps,
    increment, decrement, value, show, counterRun, incrementTotal,
    isPow2, powCost, powTotal,
    quicksortComparisons, permutations, quicksortStats, quicksortAvgFormula,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AM = api;
})(typeof window !== 'undefined' ? window : globalThis);
