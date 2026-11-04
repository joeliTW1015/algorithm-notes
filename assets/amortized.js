/* Pure amortized-analysis models (Ch16) that also record a step-by-step trace for the visualisers.
 * No DOM access here, so the same file is loaded by the pages and by tests/run.js. */
(function (root) {
  'use strict';

  /* ---------- Super stack (slides p.4–7, CLRS MULTIPOP) ---------- */
  // ops: [{op:'push', x} | {op:'pop'} | {op:'superpop', k}]. Cost: PUSH/POP 1, SUPER-POP(k) = #items popped.
  // init (optional): items already in the stack before the first operation (exercise 16.3-4).
  function stackRun(ops, init) {
    const st = init ? init.slice() : [], steps = [];
    let total = 0, pushes = 0, popped = 0, next = st.length ? Math.max(...st) + 1 : 1;
    steps.push({ i: 0, stack: st.slice(), cost: 0, total: 0, pushes: 0, popped: 0,
      msg: st.length ? `stack 一開始就有 ${st.length} 個元素，還沒有任何操作。` : '空的 stack，還沒有任何操作。' });
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

  const fromValue = (k, v) => Array.from({ length: k }, (_, i) => Math.floor(v / 2 ** i) % 2);

  // ops: array of 'inc' / 'dec' (default: n increments). Starts at `start` (default 0).
  function counterRun(k, opsOrN, start) {
    const ops = typeof opsOrN === 'number' ? Array(opsOrN).fill('inc') : opsOrN;
    let bits = fromValue(k, start || 0), total = 0;
    const perBit = Array(k).fill(0);
    const steps = [{ i: 0, bits, flips: [], cost: 0, total: 0, perBit: perBit.slice(), msg: `${k}-bit counter 從 ${value(bits)} 開始：${show(bits)}。` }];
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

  /* ---------- Lecture 16-2: accounting method ---------- */
  const money = (v) => (v < 0 ? '−$' + -v : '$' + v);
  const sgn = (v, dp) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(dp || 0);

  // Super stack with a bank (slides p.5–8, CLRS 16.2). charge = amortized cost of each kind of operation.
  // Every pushed item carries (charge.push − 1) dollars of credit; "pool" is money not tied to any item.
  // bank = Σ amortized − Σ actual = credit on items + pool; it must never go negative.
  function stackAccount(ops, charge) {
    charge = Object.assign({ push: 2, pop: 0, superpop: 0 }, charge);
    const per = Math.max(0, charge.push - 1), base = stackRun(ops);
    let bank = 0, amortTotal = 0, minBank = 0, firstNeg = -1;
    const steps = base.steps.map((st, i) => {
      if (i === 0) return Object.assign({}, st, { charge: 0, bank: 0, amortTotal: 0, per, pool: 0,
        msg: `空的 stack，銀行 $0。收費：PUSH $${charge.push}、POP $${charge.pop}、SUPER-POP $${charge.superpop}。` });
      const a = charge[st.op.op], before = bank;
      bank += a - st.cost; amortTotal += a;
      const pool = bank - per * st.stack.length;
      if (bank < minBank) minBank = bank;
      if (bank < 0 && firstNeg < 0) firstNeg = i;
      const name = st.op.op === 'push' ? `PUSH(${st.stack[st.stack.length - 1]})` : st.op.op === 'pop' ? 'POP' : `SUPER-POP(${st.op.k})`;
      let how;
      if (st.op.op === 'push') how = `收 $${a}：$1 付 PUSH 本身${per ? `，$${per} 存在新元素上` : '，沒有錢可以存在新元素上'}${a - 1 - per > 0 ? `，$${a - 1 - per} 放進銀行` : ''}。`;
      else if (!st.cost) how = `收 $${a}；stack 是空的，實際成本 0。`;
      else {
        const avail = a + per * st.cost;
        how = `收 $${a}，實際成本 ${st.cost}：被 pop 的 ${st.cost} 個元素${per ? `各捐出身上的 $${per}` : '身上沒有錢'}，` +
          (avail === st.cost ? '剛好夠付。' : avail > st.cost ? '夠付，多的放進銀行。' : `還差 $${st.cost - avail}，只能向銀行借。`);
      }
      return Object.assign({}, st, { charge: a, bank, amortTotal, per, pool,
        msg: `${name}：${how} 銀行 ${money(before)} → <b>${money(bank)}</b>${bank < 0 ? '（透支！）' : ''}；累計 amortized ${amortTotal} ≥ 實際 ${st.total}？${amortTotal >= st.total ? '是' : '否'}。` });
    });
    return { steps, total: base.total, amortTotal, minBank, firstNeg };
  }

  // Binary counter with $credit on bits (slides p.9–14, CLRS 16.2). Each INCREMENT is charged `charge`:
  // $1 pays for the single 0→1 flip, $1 stays on that bit as credit, the rest goes to the pool.
  // A 1→0 flip is paid by the bit's own credit, or by the pool if the bit has none (e.g. 1-bits present at the start).
  function counterAccount(k, n, opts) {
    opts = opts || {};
    const charge = opts.charge === undefined ? 2 : opts.charge, start = opts.start || 0;
    let bits = fromValue(k, start), credit = Array(k).fill(0), pool = 0, total = 0, amortTotal = 0, minBank = 0, firstNeg = -1;
    const bank = () => credit.reduce((a, b) => a + b, 0) + pool;
    const steps = [{ i: 0, bits, credit: credit.slice(), flips: [], set: -1, cost: 0, total: 0, amortTotal: 0, pool: 0, bank: 0,
      msg: `${k}-bit counter 從 ${start}（${show(bits)}）開始，銀行 $0。${start ? '注意：一開始就有的 1 身上<b>沒有</b> credit。' : ''}每次 INCREMENT 收 $${charge}。` }];
    for (let i = 1; i <= n; i++) {
      const r = increment(bits), before = bank();
      const resets = r.flips.filter((j) => bits[j] === 1), set = r.flips.find((j) => bits[j] === 0);
      let fromBits = 0, fromPool = 0, rest = charge;
      credit = credit.slice();
      resets.forEach((j) => { if (credit[j] > 0) { credit[j] = 0; fromBits++; } else fromPool++; });
      if (set !== undefined) { rest -= 1; const keep = Math.max(0, Math.min(1, rest)); credit[set] = keep; rest -= keep; }
      pool += rest - fromPool;
      bits = r.bits; total += r.cost; amortTotal += charge;
      const b = bank();
      if (b < minBank) minBank = b;
      if (b < 0 && firstNeg < 0) firstNeg = i;
      const parts = [];
      if (set !== undefined) parts.push(`b${set}: 0→1 用收到的 $1 付${credit[set] ? `，再存 $1 在 b${set} 上` : '，沒有錢存在它身上'}`);
      else parts.push('全部是 1，繞回 0（沒有位元變成 1）');
      if (resets.length) parts.push(`${resets.length} 個 1→0（${resets.map((j) => 'b' + j).join(', ')}）：${fromBits} 個用自己身上的 $1${fromPool ? `，<b>${fromPool} 個身上沒錢</b>，向銀行借` : ''}`);
      steps.push({ i, before: steps[i - 1].bits, bits, credit: credit.slice(), flips: r.flips, set: set === undefined ? -1 : set, resets, cost: r.cost,
        total, amortTotal, pool, bank: b,
        msg: `第 ${i} 次 INCREMENT（${show(steps[i - 1].bits)} → ${show(bits)}）收 $${charge}，實際成本 ${r.cost}。${parts.join('；')}。銀行 ${money(before)} → <b>${money(b)}</b>${b < 0 ? '（透支！）' : ''}。` });
    }
    return { steps, total, amortTotal, minBank, firstNeg };
  }

  /* ---------- Lecture 16-2: potential method ---------- */
  // Potential functions to try (slides p.23, p.26 and some that fail). f maps a data structure to a number.
  const ones = (bits) => bits.reduce((a, b) => a + b, 0);
  const PHI = {
    stack: [
      { id: 'items', label: 'Φ = #items（投影片）', f: (st) => st.length },
      { id: 'double', label: 'Φ = 2·#items', f: (st) => 2 * st.length },
      { id: 'zero', label: 'Φ = 0', f: () => 0 },
      { id: 'neg', label: 'Φ = −#items', f: (st) => -st.length },
    ],
    counter: [
      { id: 'ones', label: 'Φ = #1 bits（投影片）', f: ones },
      { id: 'double', label: 'Φ = 2·#1 bits', f: (b) => 2 * ones(b) },
      { id: 'zero', label: 'Φ = 0', f: () => 0 },
      { id: 'zeros', label: 'Φ = #0 bits', f: (b) => b.length - ones(b) },
    ],
  };

  // states D_0..D_n, costs c_1..c_n (costs[0] is ignored). ĉ_i = c_i + Φ(D_i) − Φ(D_{i−1}) (slide p.21).
  function potentialLedger(states, costs, phi) {
    const P = states.map(phi), rows = [];
    let total = 0, amortTotal = 0, minPhi = P[0], firstBelow = -1;
    for (let i = 1; i < states.length; i++) {
      const d = P[i] - P[i - 1], a = costs[i] + d;
      total += costs[i]; amortTotal += a;
      if (P[i] < minPhi) minPhi = P[i];
      if (P[i] < P[0] && firstBelow < 0) firstBelow = i;
      rows.push({ i, c: costs[i], phiBefore: P[i - 1], phi: P[i], dPhi: d, amort: a, total, amortTotal });
    }
    return { P, rows, total, amortTotal, phi0: P[0], phiN: P[P.length - 1], valid: firstBelow < 0, firstBelow };
  }

  /* ---------- Exercise 16.2-1: stack of size ≤ k, copied after every k operations ---------- */
  // ops: 'push' / 'pop'. Copying costs the current stack size. Every operation is charged $2.
  function backupRun(ops, k, charge) {
    charge = charge || 2;
    const st = [], steps = [{ i: 0, stack: [], cost: 0, copy: 0, total: 0, amortTotal: 0, bank: 0, msg: `空的 stack（大小上限 k = ${k}），每 ${k} 個操作備份一次。每個操作收 $${charge}。` }];
    let total = 0, bank = 0, next = 1, minBank = 0;
    ops.forEach((op, idx) => {
      const i = idx + 1;
      let cost = 0, what;
      if (op === 'push') {
        if (st.length >= k) throw new Error(`第 ${i} 個操作：stack 已滿（k = ${k}），不能再 PUSH`);
        st.push(next++); cost = 1; what = `PUSH(${st[st.length - 1]})`;
      } else {
        if (!st.length) throw new Error(`第 ${i} 個操作：stack 是空的，不能 POP`);
        st.pop(); cost = 1; what = 'POP';
      }
      const copy = i % k === 0 ? st.length : 0, didCopy = i % k === 0;
      cost += copy; total += cost; bank += charge - cost;
      if (bank < minBank) minBank = bank;
      steps.push({ i, op, stack: st.slice(), cost, copy, didCopy, total, amortTotal: charge * i, bank,
        msg: `${what}：成本 1${didCopy ? `，接著是第 ${i / k} 次備份，複製 ${copy} 個元素（成本 ${copy}）` : ''}。收 $${charge}，銀行 → <b>${money(bank)}</b>；累計實際 ${total} ≤ ${charge}n = ${charge * i}。` });
    });
    return { steps, total, minBank };
  }

  // 'random': random PUSH/POP that keep 0 ≤ size ≤ k. 'full': fill to k, then alternate POP/PUSH so every copy costs about k.
  function backupOps(n, k, mode, seed) {
    const r = rng(seed || 3), ops = [];
    let size = 0;
    for (let i = 0; i < n; i++) {
      let op;
      if (mode === 'full') op = size < k ? 'push' : 'pop';
      else op = size === 0 ? 'push' : size === k ? 'pop' : r() < 0.6 ? 'push' : 'pop';
      ops.push(op); size += op === 'push' ? 1 : -1;
    }
    return ops;
  }

  /* ---------- Exercise 16.2-3: counter with RESET, keeping a pointer to the high-order 1 ---------- */
  // INCREMENT costs #bits flipped; RESET touches bits 0..max, cost max + 1. Charges: INCREMENT $3, RESET $1.
  // Invariant: bank ≥ #1 bits + (max + 1).
  function resetCounterRun(k, ops, charge) {
    charge = Object.assign({ inc: 3, reset: 1 }, charge);
    let bits = Array(k).fill(0), max = -1, total = 0, amortTotal = 0, bank = 0, minSlack = Infinity;
    const steps = [{ i: 0, bits, max, cost: 0, total: 0, amortTotal: 0, bank: 0, flips: [], msg: `${k}-bit counter 從 0 開始，max = −1（沒有 1）。` }];
    ops.forEach((op, idx) => {
      let cost, flips, msg;
      if (op === 'inc') {
        const r = increment(bits);
        bits = r.bits; cost = r.cost; flips = r.flips;
        const top = r.flips[r.flips.length - 1];
        if (value(bits) === 0) max = -1; else if (bits[top] === 1 && top > max) max = top;
        msg = `INCREMENT：翻 ${cost} 個位元${value(bits) === 0 ? '（繞回 0，max = −1）' : ''}，max = ${max}`;
      } else {
        cost = max + 1; flips = Array.from({ length: max + 1 }, (_, j) => j).filter((j) => bits[j] === 1);
        msg = `RESET：只看 b0..b${max}（共 ${max + 1} 個），不用掃全部 ${k} 個；max = −1`;
        if (max < 0) msg = 'RESET：max = −1，計數器已經是 0，什麼都不用做';
        bits = Array(k).fill(0); max = -1;
      }
      total += cost; amortTotal += charge[op]; bank += charge[op] - cost;
      const need = ones(bits) + max + 1;
      minSlack = Math.min(minSlack, bank - need);
      steps.push({ i: idx + 1, op, bits, max, cost, flips, total, amortTotal, bank, need,
        msg: `${msg}，成本 ${cost}。收 $${charge[op]}，銀行 <b>${money(bank)}</b> ≥ #1 + (max+1) = ${need}。` });
    });
    return { steps, total, minSlack };
  }

  /* ---------- Exercise 16.3-3: binary min-heap, Φ = Σ_{j=1}^{n} lg j ---------- */
  // Actual cost = 1 + #swaps (≤ 1 + lg n). ops: {op:'insert', x} | {op:'extract'}.
  const heapPhi = (n) => { let t = 0; for (let j = 2; j <= n; j++) t += Math.log2(j); return t; };
  function heapRun(ops) {
    const A = [], steps = [{ i: 0, heap: [], out: null, cost: 0, total: 0, amortTotal: 0, phi: 0, amort: 0, path: [], msg: '空的 min-heap，Φ = 0。' }];
    let total = 0, amortTotal = 0;
    ops.forEach((o, idx) => {
      const n0 = A.length, path = [];
      let swaps = 0, out = null, msg;
      if (o.op === 'insert') {
        A.push(o.x);
        let i = A.length - 1;
        path.push(i);
        while (i > 0 && A[(i - 1) >> 1] > A[i]) { const p = (i - 1) >> 1; [A[p], A[i]] = [A[i], A[p]]; i = p; swaps++; path.push(i); }
        msg = `INSERT(${o.x})：往上換了 ${swaps} 次`;
      } else {
        if (!n0) throw new Error(`第 ${idx + 1} 個操作：heap 是空的，不能 EXTRACT-MIN`);
        out = A[0];
        const last = A.pop();
        if (A.length) {
          A[0] = last;
          let i = 0;
          path.push(0);
          for (;;) {
            const l = 2 * i + 1, r = l + 1;
            let m = i;
            if (l < A.length && A[l] < A[m]) m = l;
            if (r < A.length && A[r] < A[m]) m = r;
            if (m === i) break;
            [A[i], A[m]] = [A[m], A[i]]; i = m; swaps++; path.push(i);
          }
        }
        msg = `EXTRACT-MIN 取出 ${out}：往下換了 ${swaps} 次`;
      }
      const cost = 1 + swaps, d = heapPhi(A.length) - heapPhi(n0), amort = cost + d;
      total += cost; amortTotal += amort;
      steps.push({ i: idx + 1, op: o, heap: A.slice(), out, path, swaps, cost, n: A.length, phi: heapPhi(A.length), dPhi: d, amort, total, amortTotal,
        msg: `${msg}，實際成本 1 + ${swaps} = ${cost}；ΔΦ = ${o.op === 'insert' ? '+lg ' + A.length : '−lg ' + n0} = ${sgn(d, 2)}；ĉ = <b>${sgn(amort, 2).replace(/^\+/, '')}</b>` +
          (o.op === 'insert' ? `（≤ 1 + 2 lg n = ${(1 + 2 * Math.log2(A.length)).toFixed(2)}）。` : '（≤ 1）。') });
    });
    return { steps, total, amortTotal };
  }

  /* ---------- Exercise 16.3-5: queue from two stacks, Φ = 2·|IN| ---------- */
  // ENQUEUE pushes onto IN (cost 1). DEQUEUE pops OUT; if OUT is empty, first move all m items of IN onto OUT (cost 2m).
  function queueRun(ops) {
    const IN = [], OUT = [];
    let next = 1, total = 0, amortTotal = 0;
    const steps = [{ i: 0, IN: [], OUT: [], cost: 0, total: 0, amortTotal: 0, phi: 0, moved: 0, msg: '兩個空 stack：IN 收新來的，OUT 負責出隊。Φ = 2·|IN| = 0。' }];
    ops.forEach((op, idx) => {
      const phi0 = 2 * IN.length;
      let cost = 0, moved = 0, out = null, msg;
      if (op === 'enq') { IN.push(next); cost = 1; msg = `ENQUEUE(${next})：push 到 IN，成本 1`; next++; }
      else {
        if (!IN.length && !OUT.length) throw new Error(`第 ${idx + 1} 個操作：queue 是空的，不能 DEQUEUE`);
        if (!OUT.length) { moved = IN.length; while (IN.length) OUT.push(IN.pop()); cost += 2 * moved; }
        out = OUT.pop(); cost += 1;
        msg = moved ? `DEQUEUE：OUT 是空的，先把 IN 的 ${moved} 個倒過去（pop + push 各 ${moved} 次），再 pop 出 ${out}，成本 ${cost}` : `DEQUEUE：直接從 OUT pop 出 ${out}，成本 1`;
      }
      const phi = 2 * IN.length, amort = cost + phi - phi0;
      total += cost; amortTotal += amort;
      steps.push({ i: idx + 1, op, IN: IN.slice(), OUT: OUT.slice(), out, moved, cost, phi, dPhi: phi - phi0, amort, total, amortTotal,
        msg: `${msg}；ΔΦ = ${sgn(phi - phi0) || '0'}，ĉ = <b>${sgn(amort).replace(/^\+/, '') || '0'}</b>。` });
    });
    return { steps, total, amortTotal };
  }

  /* ---------- Exercise 16.3-6: INSERT / DELETE-LARGER-HALF, Φ = 2|S| ---------- */
  // Unsorted array. INSERT costs 1; DELETE-LARGER-HALF costs |S| (linear-time SELECT + PARTITION, constant taken as 1)
  // and removes the ⌈|S|/2⌉ largest elements (duplicates of the median are split as needed).
  function halfRun(ops) {
    let S = [], total = 0, amortTotal = 0;
    const steps = [{ i: 0, S: [], cost: 0, total: 0, amortTotal: 0, phi: 0, removed: [], msg: 'S 是空的（存在一個沒排序的陣列裡）。Φ = 2|S| = 0。' }];
    ops.forEach((o, idx) => {
      const phi0 = 2 * S.length;
      let cost, removed = [], msg;
      if (o.op === 'insert') { S = S.concat([o.x]); cost = 1; msg = `INSERT(${o.x})：放到陣列尾端，成本 1`; }
      else {
        const s = S.length, m = Math.ceil(s / 2);
        const order = S.map((x, j) => [x, j]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, m).map((p) => p[1]);
        const del = new Set(order);
        removed = S.filter((_, j) => del.has(j));
        S = S.filter((_, j) => !del.has(j));
        cost = s;
        msg = `DELETE-LARGER-HALF：|S| = ${s}，SELECT 找第 ${m} 大當 pivot、PARTITION 後刪掉最大的 ${m} 個（${removed.join(', ') || '—'}），成本 ${s}`;
      }
      const phi = 2 * S.length, amort = cost + phi - phi0;
      total += cost; amortTotal += amort;
      steps.push({ i: idx + 1, op: o, S: S.slice(), removed, cost, phi, dPhi: phi - phi0, amort, total, amortTotal,
        msg: `${msg}；ΔΦ = ${sgn(phi - phi0) || '0'}，ĉ = <b>${sgn(amort).replace(/^\+/, '') || '0'}</b>。` });
    });
    return { steps, total, amortTotal };
  }

  const api = {
    stackRun, randomStackOps, worstStackOps,
    increment, decrement, value, show, counterRun, incrementTotal,
    isPow2, powCost, powTotal,
    quicksortComparisons, permutations, quicksortStats, quicksortAvgFormula,
    rng, fromValue, stackAccount, counterAccount, PHI, potentialLedger,
    backupRun, backupOps, resetCounterRun, heapPhi, heapRun, queueRun, halfRun,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AM = api;
})(typeof window !== 'undefined' ? window : globalThis);
