/* Midterm past papers (Ch14–16): pure algorithms + step logs, no DOM.
   Exported as module.exports (node tests) or window.MT (pages). */
(function (root) {
  'use strict';

  /* ---------- Dynamic table with expansion + contraction (CLRS 4th 16.4) ---------- */
  // Insert into a full table → double (size 0 → 1); delete that leaves α < 1/4 → halve.
  // Cost: insert = 1 (+ num copies on expansion); delete = 1 (+ num copies on contraction).
  // Φ = 2·num − size if α ≥ 1/2, size/2 − num if α < 1/2 (Φ = 0 for the empty table of size 0).
  function phiTable(num, size) {
    if (size === 0) return 0;
    return 2 * num >= size ? 2 * num - size : size / 2 - num;
  }
  function dynTable(ops) {
    let num = 0, size = 0;
    const rows = [], steps = [];
    steps.push({ i: 0, num, size, phi: 0, rows: [], msg: '一開始 table 是空的：num = 0、size = 0、Φ₀ = 0。' });
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const prevPhi = phiTable(num, size), prevNum = num, prevSize = size;
      let c, event = null;
      if (op === 'I') {
        if (num === size) { event = 'expand'; c = num + 1; size = size === 0 ? 1 : 2 * size; }
        else c = 1;
        num++;
      } else {
        if (num === 0) throw new Error('delete from an empty table');
        num--; c = 1;
        if (size > 0 && num * 4 < size) { event = 'contract'; c += num; size = num === 0 ? 0 : size / 2; }
      }
      const phi = phiTable(num, size);
      const alpha = c + phi - prevPhi;
      const row = { i: i + 1, op, num, size, c, phi, dphi: phi - prevPhi, alpha, event, prevNum, prevSize, prevPhi };
      rows.push(row);
      const load = size ? `${num}/${size}` : '0';
      const what = op === 'I'
        ? (event === 'expand' ? `INSERT：table 滿了（${prevNum}/${prevSize}）→ 擴成 size ${size}，搬 ${prevNum} 個再插入，c = ${prevNum} + 1 = ${c}` : `INSERT：還有空位，c = 1`)
        : (event === 'contract' ? `DELETE：刪完 load = ${num}/${prevSize} < 1/4 → 縮成 size ${size}，搬 ${num} 個，c = 1 + ${num} = ${c}` : `DELETE：刪完 load = ${num}/${prevSize}${num * 4 === prevSize ? '（剛好 1/4，不縮）' : ''}，c = 1`);
      const formula = 2 * num >= size && size ? `2·${num} − ${size}` : (size ? `${size}/2 − ${num}` : '0');
      steps.push({ i: i + 1, num, size, phi, rows: rows.slice(), event,
        msg: `第 ${i + 1} 個操作 ${what}。α = ${load}${size && 2 * num >= size ? ' ≥ 1/2' : ' < 1/2'} → Φ = ${formula} = ${phi}；` +
          `amortized = c + ΔΦ = ${c} + (${phi} − ${prevPhi}) = <b>${alpha}</b>。` });
    }
    return { rows, steps };
  }

  /* ---------- Resource allocation (2022 Q2) ---------- */
  // P[i][j] for project i = 1..n, j = 0..m resources. X[i][j] = max_{0≤t≤j} X[i−1][j−t] + P[i][t].
  function resourceAlloc(P, m) {
    const n = P.length - 1;
    const X = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
    const T = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
    const steps = [];
    for (let j = 0; j <= m; j++) X[0][j] = 0;
    for (let i = 0; i <= n; i++) X[i][0] = 0;
    steps.push({ X: copy2(X), T: copy2(T), msg: 'Boundary：X[0, j] = 0（沒有專案）、X[i, 0] = 0（沒有資源）。' });
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        let best = -Infinity, bt = 0;
        const cands = [];
        for (let t = 0; t <= j; t++) {
          const v = X[i - 1][j - t] + P[i][t];
          cands.push(`t=${t}: ${X[i - 1][j - t]}+${P[i][t]}=${v}`);
          if (v > best) { best = v; bt = t; }
        }
        X[i][j] = best; T[i][j] = bt;
        steps.push({ i, j, X: copy2(X), T: copy2(T), reads: Array.from({ length: j + 1 }, (_, t) => [i - 1, j - t]),
          msg: `X[${i}, ${j}]：給專案 ${i} t 個、前 ${i - 1} 個專案 ${'j−t'} 個 → ${cands.join('；')} → 取最大 <b>${best}</b>（t = ${bt}）。` });
      }
    }
    const alloc = new Array(n + 1).fill(0);
    for (let i = n, j = m; i >= 1; i--) { alloc[i] = T[i][j]; j -= T[i][j]; }
    return { X, T, alloc: alloc.slice(1), best: X[n][m], steps };
  }

  /* ---------- Max-sum non-adjacent subset (2020 Q1) ---------- */
  function maxNonAdjacent(A) {
    const n = A.length, dp = new Array(n + 1).fill(0), take = new Array(n + 1).fill(false);
    const steps = [{ i: 0, dp: dp.slice(0, 1), msg: 'dp[0] = 0（空陣列）。' }];
    for (let i = 1; i <= n; i++) {
      const skip = dp[i - 1], with_ = (i >= 2 ? dp[i - 2] : 0) + A[i - 1];
      dp[i] = Math.max(skip, with_); take[i] = with_ > skip;
      steps.push({ i, dp: dp.slice(0, i + 1), take: take[i],
        msg: `dp[${i}] = max(dp[${i - 1}], dp[${i - 2 < 0 ? 0 : i - 2}] + A[${i}]) = max(${skip}, ${with_}) = <b>${dp[i]}</b>${take[i] ? '（選 A[' + i + ']）' : '（不選 A[' + i + ']）'}。` });
    }
    const pick = [];
    for (let i = n; i >= 1;) { if (take[i]) { pick.unshift(i); i -= 2; } else i -= 1; }
    return { dp, best: dp[n], pick, steps };
  }

  /* ---------- Unit-time task scheduling with deadlines (2021 Q3) ---------- */
  // Greedy: by profit descending, put each task in the latest free slot ≤ its deadline.
  function taskSchedule(p, d) {
    const n = p.length, T = Math.max(0, ...d);
    const order = p.map((_, i) => i).sort((a, b) => p[b] - p[a] || a - b);
    const slot = new Array(T + 1).fill(null), steps = [];
    let total = 0;
    steps.push({ slot: slot.slice(), cur: null, msg: `依 profit 由大到小排序：${order.map((i) => `a${i + 1}(${p[i]})`).join(', ')}。時間格 1…${T}。` });
    for (const i of order) {
      let t = Math.min(d[i], T);
      while (t >= 1 && slot[t] !== null) t--;
      if (t >= 1) { slot[t] = i; total += p[i]; }
      steps.push({ slot: slot.slice(), cur: i, placed: t >= 1 ? t : null, total,
        msg: t >= 1 ? `a${i + 1}（profit ${p[i]}、deadline ${d[i]}）：放在 ≤ ${d[i]} 最晚的空格 <b>${t}</b>。目前總利潤 ${total}。`
          : `a${i + 1}（profit ${p[i]}、deadline ${d[i]}）：1…${d[i]} 都滿了 → 放棄。` });
    }
    return { slot, total, steps, chosen: slot.filter((x) => x !== null).sort((a, b) => a - b) };
  }
  // Brute force for tests: best total over all subsets that are feasible (EDF check).
  function taskBrute(p, d) {
    const n = p.length;
    let best = 0;
    for (let mask = 0; mask < 1 << n; mask++) {
      const idx = []; for (let i = 0; i < n; i++) if (mask >> i & 1) idx.push(i);
      idx.sort((a, b) => d[a] - d[b]);
      if (idx.every((i, k) => k + 1 <= d[i])) best = Math.max(best, idx.reduce((s, i) => s + p[i], 0));
    }
    return best;
  }

  /* ---------- Bag: pack as many items as possible in O(n) (2011 Q2, 2017 Q8) ---------- */
  // Select-based: median m; if the lighter half fits, take it and recurse on the heavier half.
  function bagMaxCount(w, x) {
    const steps = [], taken = [];
    let S = w.slice(), cap = x;
    while (S.length) {
      const sorted = S.slice().sort((a, b) => a - b);
      const half = Math.ceil(S.length / 2);
      const m = sorted[half - 1]; // lower median (SELECT in O(|S|)); split by rank so ties are safe
      const L = sorted.slice(0, half), R = sorted.slice(half);
      const sL = L.reduce((a, b) => a + b, 0);
      if (sL <= cap) {
        taken.push(...L); cap -= sL;
        steps.push({ S: S.slice(), m, L, R, fit: true, cap, msg: `S = {${S.join(', ')}}，中位數 ${m}。較輕的一半 {${L.join(', ')}} 總重 ${sL} ≤ 剩餘容量 → 全拿，容量剩 ${cap}，往較重的一半找。` });
        S = R;
      } else {
        steps.push({ S: S.slice(), m, L, R, fit: false, cap, msg: `S = {${S.join(', ')}}，中位數 ${m}。較輕的一半總重 ${sL} > 容量 ${cap} → 較重的一半一個都放不下，只在 {${L.join(', ')}} 裡找。` });
        if (L.length === 1) break;
        S = L;
      }
    }
    taken.sort((a, b) => a - b);
    return { taken, count: taken.length, steps };
  }

  /* ---------- Bus company (2019 Q4) ---------- */
  // Each bus costs X; a bus with more than M people pays V to each of its riders.
  function busCost(N, M, X, V) {
    const comfy = Math.ceil(N / M) * X;
    if (N <= M) return { cost: X, plan: 'one', comfy: X, packed: X };
    const packed = X + V * N;
    return { cost: Math.min(comfy, packed), plan: comfy <= packed ? 'comfy' : 'packed', comfy, packed };
  }
  // f(n) = min over the size s of one bus: X + (s > M ? V·s : 0) + f(n − s).
  function busBrute(N, M, X, V) {
    const f = [0];
    for (let n = 1; n <= N; n++) {
      f[n] = Infinity;
      for (let s = 1; s <= n; s++) f[n] = Math.min(f[n], X + (s > M ? V * s : 0) + f[n - s]);
    }
    return f[N];
  }

  /* ---------- c_i = i if i is a power of 2 (2019 Q6, 2020 Q6) ---------- */
  const isPow2 = (i) => i > 0 && (i & (i - 1)) === 0;
  const cost2 = (i) => (isPow2(i) ? i : 1);
  // Φ(D_i) = factor · (i − 2^⌊lg i⌋), Φ(D_0) = 0.
  function powPotential(n, factor) {
    const phi = (i) => (i === 0 ? 0 : factor * (i - 2 ** Math.floor(Math.log2(i))));
    const rows = [];
    for (let i = 1; i <= n; i++) rows.push({ i, c: cost2(i), phi: phi(i), amort: cost2(i) + phi(i) - phi(i - 1) });
    return rows;
  }

  /* ---------- Stack with CUT, accounting (2022 Q7) ---------- */
  // ops: 'P' push, 'O' pop, 'C' cut. Actual: PUSH 1, POP 1, CUT 2s. Charges default 3 / 0 / 0.
  function cutStackRun(ops, charge) {
    charge = Object.assign({ P: 3, O: 0, C: 0 }, charge);
    let s = 0, bank = 0, actual = 0, minBank = 0;
    const rows = [];
    for (const op of ops) {
      let c;
      if (op === 'P') { c = 1; s++; }
      else if (op === 'O') { if (!s) continue; c = 1; s--; }
      else { c = 2 * s; s = 0; }
      actual += c; bank += charge[op] - c; minBank = Math.min(minBank, bank);
      rows.push({ op, c, s, bank, actual });
    }
    return { rows, actual, bank, minBank };
  }

  /* ---------- Huffman on Fibonacci frequencies (2019 Q5, 2020 Q5) ---------- */
  function fib(n) { const f = [1, 1]; while (f.length < n) f.push(f[f.length - 1] + f[f.length - 2]); return f.slice(0, n); }

  /* ---------- Topic frequency (index hero) ---------- */
  // years = the papers the topic appeared in; href = where the questions live.
  const TOPICS = [
    { name: 'Huffman code', cat: 'greedy', years: [2017, 2018, 2019, 2020, 2022], href: 'greedy.html#huffman' },
    { name: 'Dynamic table（Φ 擴張 / 收縮）', cat: 'amort', years: [2011, 2017, 2020, 2022], href: 'amortized.html#dyntable' },
    { name: 'DP 兩要素 + 反例', cat: 'dp', years: [2012, 2013, 2022, 2023], href: 'dp.html#elements' },
    { name: 'Matrix-chain 填表', cat: 'dp', years: [2012, 2022, 2023, 2025], href: 'dp.html#mcm' },
    { name: 'LIS / 壽司遞增子序列', cat: 'dp', years: [2011, 2017, 2021, 2025], href: 'dp.html#lis' },
    { name: '找零錢（greedy 證明 / DP）', cat: 'greedy', years: [2018, 2021, 2022, 2025], href: 'greedy.html#coin' },
    { name: '一維計數 DP（樓梯、鋪磚、不相鄰）', cat: 'dp', years: [2013, 2018, 2020, 2025], href: 'dp.html#linear' },
    { name: '0/1 knapsack O(nW) 是 polynomial？', cat: 'dp', years: [2017, 2018, 2019], href: 'dp.html#pseudo' },
    { name: 'cᵢ = i（i 為 2 的冪）', cat: 'amort', years: [2019, 2020, 2024], href: 'amortized.html#pow2' },
    { name: 'Amortized 觀念填空 / 是非', cat: 'amort', years: [2017, 2018], href: 'amortized.html#concept' },
    { name: 'LCS（填表 / 省空間 / 子序列判斷）', cat: 'dp', years: [2012, 2019, 2020], href: 'dp.html#lcs' },
    { name: 'Unit-length intervals 覆蓋點', cat: 'greedy', years: [2018, 2024], href: 'greedy.html#unit' },
    { name: '背包裝最多件 O(n)', cat: 'greedy', years: [2011, 2017], href: 'greedy.html#bag' },
    { name: 'Max subarray O(n)', cat: 'dp', years: [2011, 2025], href: 'dp.html#maxsub' },
    { name: 'Stack 變形（MULTIPOP、CUT）', cat: 'amort', years: [2017, 2022], href: 'amortized.html#stack' },
    { name: 'Binary counter 變形', cat: 'amort', years: [2011, 2018], href: 'amortized.html#counter' },
    { name: 'OBST 填表', cat: 'dp', years: [2013], href: 'dp.html#obst' },
    { name: 'Rod cutting', cat: 'dp', years: [2019], href: 'dp.html#rod' },
    { name: 'Resource allocation', cat: 'dp', years: [2022], href: 'dp.html#resource' },
    { name: 'Activity selection 變形', cat: 'greedy', years: [2011], href: 'greedy.html#activity' },
    { name: 'Task scheduling（deadline + profit）', cat: 'greedy', years: [2021], href: 'greedy.html#tasks' },
  ];

  function copy2(a) { return a.map((r) => r.slice()); }

  const api = {
    phiTable, dynTable, resourceAlloc, maxNonAdjacent, taskSchedule, taskBrute,
    bagMaxCount, busCost, busBrute, isPow2, cost2, powPotential, cutStackRun, fib, TOPICS,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MT = api;
})(typeof window !== 'undefined' ? window : globalThis);
