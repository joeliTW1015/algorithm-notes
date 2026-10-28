/* Pure greedy algorithms (Ch15) that also record a step-by-step trace for the visualisers.
 * No DOM access here, so the same file is loaded by the pages and by tests/run.js. */
(function (root) {
  'use strict';

  const round = (x) => Math.round(x * 1e9) / 1e9;
  const fmt = (x) => String(round(x));
  // 0.6666… → "2/3" when a small denominator fits, otherwise 3 decimals.
  function frac_(x) {
    if (Number.isInteger(round(x))) return String(round(x));
    for (let d = 2; d <= 100; d++) if (Math.abs(x * d - Math.round(x * d)) < 1e-9) return `${Math.round(x * d)}/${d}`;
    return x.toFixed(3);
  }

  /* ---------- Coin changing ---------- */
  function coinGreedy(coins, x) {
    const cs = [...new Set(coins)].sort((a, b) => b - a);
    const bag = [], steps = [];
    let left = x;
    steps.push({ line: 1, left, bag: [], msg: `要找 ${x} 元：先準備一個空袋子。` });
    while (left > 0) {
      const c = cs.find((v) => v <= left);
      if (c === undefined) {
        steps.push({ line: 3, left, bag: bag.slice(), stuck: true, msg: `剩 ${left} 元，但沒有面額 ≤ ${left} 的硬幣，找不開。` });
        return { bag, ok: false, steps };
      }
      bag.push(c);
      left -= c;
      steps.push({ line: 3, c, left, bag: bag.slice(),
        msg: `剩 ${left + c} 元 → 不超過 ${left + c} 的最大硬幣是 <b>$${c}</b>，放進袋子，x = ${left + c} − ${c} = ${left}。` });
    }
    steps.push({ line: 6, left: 0, bag: bag.slice(), done: true, msg: `x = 0，結束。共 <b>${bag.length}</b> 枚：${bag.join(' + ')}。` });
    return { bag, ok: true, steps };
  }

  // Problem 15-1(d): best[v] = 1 + min over coins c <= v of best[v - c]. O(nk).
  function coinDP(coins, n) {
    const best = new Array(n + 1).fill(Infinity), pick = new Array(n + 1).fill(null);
    best[0] = 0;
    for (let v = 1; v <= n; v++) {
      for (const c of coins) {
        if (c <= v && best[v - c] + 1 < best[v]) { best[v] = best[v - c] + 1; pick[v] = c; }
      }
    }
    const bag = [];
    if (best[n] < Infinity) for (let v = n; v > 0; v -= pick[v]) bag.push(pick[v]);
    bag.sort((a, b) => b - a);
    return { best, pick, bag, count: best[n] };
  }

  // Smallest amount where greedy uses more coins than optimal. A counterexample, if any,
  // is below the sum of the two largest coins (Kozen & Zaks 1994), so that is the default limit.
  function coinCounterexample(coins, limit) {
    const cs = [...new Set(coins)].sort((a, b) => b - a);
    limit = limit || (cs.length > 1 ? cs[0] + cs[1] : cs[0]);
    const dp = coinDP(cs, limit);
    for (let x = 1; x <= limit; x++) {
      const g = coinGreedy(cs, x);
      if (dp.best[x] < Infinity && (!g.ok || g.bag.length > dp.best[x])) {
        return { x, greedy: g.ok ? g.bag : null, opt: coinDP(cs, x).bag };
      }
    }
    return null;
  }

  /* ---------- Activity selection ---------- */
  // Activities are {id, s, f} on half-open intervals [s, f).
  const clash = (a, b) => a.s < b.f && b.s < a.f;
  const byFinish = (acts) => acts.slice().sort((a, b) => a.f - b.f || a.s - b.s);

  // GREEDY-ACTIVITY-SELECTOR on the activities sorted by finish time.
  function activitySelector(acts) {
    const a = byFinish(acts), steps = [];
    if (!a.length) return { order: a, chosen: [], steps };
    const sel = [a[0].id], skip = [];
    let k = 0;
    steps.push({ line: 2, m: 0, k, sel: sel.slice(), skip: [],
      msg: `依結束時間排序後，第一個活動 ${a[0].id} 最早結束（f = ${a[0].f}），一定選它：A = {${a[0].id}}，k = 1。` });
    for (let m = 1; m < a.length; m++) {
      const ok = a[m].s >= a[k].f;
      steps.push({ line: 5, m, k, ok, sel: sel.slice(), skip: skip.slice(),
        msg: `m = ${m + 1}：比較 ${a[m].id} 的開始時間 s = ${a[m].s} 和上一個選中的 ${a[k].id} 的結束時間 f = ${a[k].f}：` +
          (ok ? `${a[m].s} ≥ ${a[k].f}，不衝突。` : `${a[m].s} < ${a[k].f}，衝突。`) });
      if (ok) { sel.push(a[m].id); k = m; } else skip.push(a[m].id);
      steps.push({ line: ok ? 7 : 4, m, k, ok, sel: sel.slice(), skip: skip.slice(),
        msg: ok ? `選 ${a[m].id}：A = {${sel.join(', ')}}，k 移到 ${m + 1}。` : `跳過 ${a[m].id}，k 不動。` });
    }
    steps.push({ line: 8, m: null, k, sel: sel.slice(), skip: skip.slice(), done: true,
      msg: `掃完全部 ${a.length} 個活動，只看過每個一次 → O(n)。答案共 <b>${sel.length}</b> 個：{${sel.join(', ')}}。` });
    return { order: a, chosen: sel, steps };
  }

  const RULES = {
    finish: { name: '最早結束', key: (a) => [a.f, a.s] },
    start: { name: '最早開始', key: (a) => [a.s, a.f] },
    duration: { name: '最短時間', key: (a) => [a.f - a.s, a.f] },
    overlap: { name: '最少衝突', key: (a, rest) => [rest.filter((b) => b !== a && clash(a, b)).length, a.f] },
    lastStart: { name: '最晚開始', key: (a) => [-a.s, -a.f] },
  };

  // Generic greedy: repeatedly take the remaining activity that is best by `rule`,
  // then drop everything that conflicts with it.
  function activityByRule(acts, rule) {
    const R = RULES[rule];
    let rest = acts.slice();
    const chosen = [], steps = [], dropped = [];
    while (rest.length) {
      const keyed = rest.map((a) => ({ a, k: R.key(a, rest) }));
      keyed.sort((x, y) => x.k[0] - y.k[0] || x.k[1] - y.k[1]);
      const pick = keyed[0].a;
      const gone = rest.filter((b) => b !== pick && clash(pick, b));
      chosen.push(pick.id);
      gone.forEach((b) => dropped.push(b.id));
      rest = rest.filter((b) => b !== pick && !clash(pick, b));
      const why = rule === 'overlap' ? `（與剩下的活動衝突 ${keyed[0].k[0]} 個，最少）` : '';
      steps.push({ pick: pick.id, chosen: chosen.slice(), dropped: dropped.slice(), gone: gone.map((b) => b.id), rest: rest.map((b) => b.id),
        msg: `依「${R.name}」選 <b>${pick.id}</b>${why}，刪掉和它衝突的 ${gone.length ? gone.map((b) => b.id).join(', ') : '（沒有）'}。` });
    }
    return { chosen, steps };
  }

  // 15.1-5: weighted activity selection. Sort by finish, p[j] = last activity compatible with j,
  // V[j] = max(V[j-1], v_j + V[p[j]]).
  function weightedActivities(acts) {
    const a = byFinish(acts), n = a.length;
    const p = a.map((x, j) => { let i = j - 1; while (i >= 0 && a[i].f > x.s) i--; return i; });
    const V = new Array(n + 1).fill(0);
    for (let j = 1; j <= n; j++) V[j] = Math.max(V[j - 1], a[j - 1].v + V[p[j - 1] + 1]);
    const chosen = [];
    for (let j = n; j > 0;) {
      if (a[j - 1].v + V[p[j - 1] + 1] >= V[j - 1]) { chosen.push(a[j - 1].id); j = p[j - 1] + 1; } else j--;
    }
    return { order: a, p: p.map((i) => i + 1), V, best: V[n], chosen: chosen.reverse() };
  }

  /* ---------- Knapsack ---------- */
  // Items are {id, v, w}.
  function fractionalKnapsack(items, W) {
    const order = items.slice().sort((a, b) => b.v / b.w - a.v / a.w);
    const take = {}, steps = [];
    let cap = W, value = 0;
    items.forEach((it) => (take[it.id] = 0));
    steps.push({ cap, value, take: { ...take }, cur: null,
      msg: `依密度 v/w 由大到小排序：${order.map((it) => `${it.id}（${fmt(it.v / it.w)}）`).join(' → ')}。背包容量 W = ${W}。` });
    for (const it of order) {
      if (cap <= 0) break;
      const amt = Math.min(it.w, cap), frac = amt / it.w;
      take[it.id] = frac;
      cap = round(cap - amt);
      value = round(value + frac * it.v);
      steps.push({ cap, value, take: { ...take }, cur: it.id,
        msg: frac === 1
          ? `${it.id} 整個放得下（w = ${it.w}）：拿全部，價值 +${fmt(it.v)}，剩餘容量 ${fmt(cap)}。`
          : `${it.id} 只放得下 ${fmt(amt)} / ${it.w}，拿 ${frac_(frac)} 份，價值 +${fmt(frac * it.v)}。背包滿了。` });
    }
    steps.push({ cap, value, take: { ...take }, cur: null, done: true, msg: `總價值 <b>${fmt(value)}</b>。` });
    return { order, take, value, steps };
  }

  // 15.2-6: O(n) fractional knapsack with linear-time selection around the median density.
  function fractionalKnapsackLinear(items, W) {
    const take = {};
    items.forEach((it) => (take[it.id] = 0));
    let value = 0, set = items.slice(), cap = W;
    while (set.length && cap > 0) {
      const dens = set.map((it) => it.v / it.w).sort((a, b) => a - b); // stand-in for SELECT
      const m = dens[Math.floor((dens.length - 1) / 2)];
      const hi = set.filter((it) => it.v / it.w > m), eq = set.filter((it) => it.v / it.w === m), lo = set.filter((it) => it.v / it.w < m);
      const wHi = hi.reduce((s, it) => s + it.w, 0);
      if (wHi >= cap) { set = hi; continue; }
      hi.forEach((it) => { take[it.id] = 1; value += it.v; });
      cap -= wHi;
      for (const it of eq) {
        if (cap <= 0) break;
        const amt = Math.min(it.w, cap);
        take[it.id] = amt / it.w; value += (amt / it.w) * it.v; cap -= amt;
      }
      set = lo;
    }
    return { take, value: round(value) };
  }

  // Greedy for 0-1: go through items in `order`, take the whole item if it fits.
  function greedy01(items, W, by) {
    const key = { density: (it) => -it.v / it.w, value: (it) => -it.v, light: (it) => it.w }[by];
    const order = items.slice().sort((a, b) => key(a) - key(b));
    let cap = W, value = 0;
    const chosen = [];
    for (const it of order) if (it.w <= cap) { chosen.push(it.id); cap -= it.w; value += it.v; }
    return { chosen, value, weight: W - cap };
  }

  // 15.2-2: K[i][w] = best value using items 1..i with capacity w. O(nW).
  // Capacities are counted in units of `unit` (gcd of all weights and W) so the table stays small.
  function knapsack01(items, W) {
    const g = (a, b) => (b ? g(b, a % b) : a);
    const unit = items.reduce((u, it) => g(u, it.w), W) || 1;
    const C = W / unit, n = items.length;
    const K = Array.from({ length: n + 1 }, () => new Array(C + 1).fill(0));
    const take = Array.from({ length: n + 1 }, () => new Array(C + 1).fill(false));
    const steps = [{ i: 0, K: K.map((r) => r.slice()), msg: '第 0 列：不能拿任何物品，價值都是 0。' }];
    for (let i = 1; i <= n; i++) {
      const it = items[i - 1], wi = it.w / unit;
      for (let c = 0; c <= C; c++) {
        K[i][c] = K[i - 1][c];
        if (wi <= c && K[i - 1][c - wi] + it.v > K[i][c]) { K[i][c] = K[i - 1][c - wi] + it.v; take[i][c] = true; }
      }
      steps.push({ i, K: K.map((r) => r.slice()), take: take.map((r) => r.slice()),
        msg: `第 ${i} 列（物品 ${it.id}，v = ${it.v}，w = ${it.w}）：每個容量 w 取 max(不拿 = 上一列同一格, 拿 = ${it.v} + 上一列 w − ${it.w} 那格)。` });
    }
    const chosen = [], path = [];
    for (let i = n, c = C; i > 0; i--) {
      path.push([i, c]);
      if (take[i][c]) { chosen.push(items[i - 1].id); c -= items[i - 1].w / unit; }
    }
    return { K, take, unit, C, best: K[n][C], chosen: chosen.reverse(), path, steps };
  }

  /* ---------- Huffman codes ---------- */
  // chars: [{ch, f}]. Ties are broken by age (older node first), which reproduces CLRS Fig. 15.5.
  function huffman(chars) {
    let uid = 0;
    let Q = chars.map((c) => ({ ch: c.ch, f: c.f, id: uid++ }));
    const pop = () => {
      let bi = 0;
      Q.forEach((x, i) => { if (x.f < Q[bi].f || (x.f === Q[bi].f && x.id < Q[bi].id)) bi = i; });
      return Q.splice(bi, 1)[0];
    };
    const sorted = () => Q.slice().sort((a, b) => a.f - b.f || a.id - b.id);
    const steps = [{ line: 2, forest: sorted(), msg: `把 ${chars.length} 個字元放進 min-priority queue Q（依頻率）。` }];
    for (let i = 1; i < chars.length; i++) {
      const x = pop(), y = pop();
      const z = { f: x.f + y.f, left: x, right: y, id: uid++ };
      steps.push({ line: 6, forest: sorted(), x, y, z: null,
        msg: `第 ${i} 輪：EXTRACT-MIN 兩次，取出頻率最小的 <b>${label(x)}</b> 和 <b>${label(y)}</b>。` });
      Q.push(z);
      steps.push({ line: 8, forest: sorted(), z,
        msg: `合併成新節點 z：z.freq = ${x.f} + ${y.f} = <b>${z.f}</b>（左 0 = ${label(x)}，右 1 = ${label(y)}），INSERT 回 Q。剩 ${Q.length} 棵樹。` });
    }
    const rootNode = Q[0];
    const codes = {};
    (function walk(t, pre) {
      if (t.ch !== undefined) { codes[t.ch] = pre || '0'; return; }
      walk(t.left, pre + '0'); walk(t.right, pre + '1');
    })(rootNode, '');
    const cost = chars.reduce((s, c) => s + c.f * codes[c.ch].length, 0);
    steps.push({ line: 9, forest: [rootNode], done: true,
      msg: `只剩一棵樹，它就是 Huffman 樹。總成本 Σ f·|w| = <b>${cost}</b>。` });
    return { root: rootNode, codes, cost, steps };
  }
  function label(t) { return t.ch !== undefined ? `${t.ch}:${t.f}` : String(t.f); }

  // Sum over internal nodes of their frequency (15.3-4) — equals Σ f·depth.
  function internalSum(t) { return t.ch !== undefined ? 0 : t.f + internalSum(t.left) + internalSum(t.right); }

  function codeCost(codes, freq) { return Object.keys(freq).reduce((s, c) => s + freq[c] * codes[c].length, 0); }

  // Returns [a, b] where codes[a] is a prefix of codes[b], or null if the code is prefix-free.
  function prefixClash(codes) {
    const ks = Object.keys(codes);
    for (const a of ks) for (const b of ks) if (a !== b && codes[b].startsWith(codes[a])) return [a, b];
    return null;
  }

  // Every way to split `bits` into codewords (there is at most one for a prefix code).
  function allParses(bits, codes, limit) {
    limit = limit || 50;
    const out = [], ks = Object.keys(codes);
    (function go(i, acc) {
      if (out.length >= limit) return;
      if (i === bits.length) { out.push(acc.slice()); return; }
      for (const k of ks) if (codes[k] && bits.startsWith(codes[k], i)) { acc.push(k); go(i + codes[k].length, acc); acc.pop(); }
    })(0, []);
    return out;
  }

  // Scan left to right, emit a char as soon as the buffer equals a codeword.
  function decodePrefix(bits, codes) {
    const inv = {};
    Object.keys(codes).forEach((k) => (inv[codes[k]] = k));
    const out = [], parts = [];
    let buf = '';
    for (const b of bits) {
      buf += b;
      if (inv[buf] !== undefined) { out.push(inv[buf]); parts.push(buf); buf = ''; }
    }
    return { text: out.join(''), parts, rest: buf };
  }

  // Code tree for an arbitrary code (codewords may be internal nodes when the code is not prefix-free).
  function codeTree(codes) {
    const rootNode = { children: {} };
    Object.keys(codes).forEach((ch) => {
      let t = rootNode;
      for (const b of codes[ch]) t = t.children[b] = t.children[b] || { children: {} };
      t.ch = ch;
    });
    return rootNode;
  }

  // 15.3-5: preorder walk, 1 = internal node, 0 = leaf; leaves listed in the same order.
  function serializeTree(t) {
    let shape = '';
    const leaves = [];
    (function walk(x) {
      if (x.ch !== undefined) { shape += '0'; leaves.push(x.ch); return; }
      shape += '1'; walk(x.left); walk(x.right);
    })(t);
    return { shape, leaves };
  }

  /* ---------- Exercises ---------- */
  // 15.2-5: smallest set of unit-length closed intervals covering the points.
  function unitIntervals(points) {
    const xs = points.slice().sort((a, b) => a - b), out = [];
    for (const x of xs) if (!out.length || x > out[out.length - 1][1]) out.push([x, round(x + 1)]);
    return out;
  }

  // Maximum subarray by the greedy rule "drop the running prefix once its sum is negative".
  function maxSubarray(A) {
    let best = -Infinity, bl = 0, br = 0, cur = 0, cl = 0;
    const steps = [];
    for (let i = 0; i < A.length; i++) {
      let reset = false;
      if (cur < 0) { cur = 0; cl = i; reset = true; }
      cur += A[i];
      const improved = cur > best;
      if (improved) { best = cur; bl = cl; br = i; }
      steps.push({ i, cur, cl, best, bl, br, reset, improved,
        msg: (reset ? `前面累積的和 < 0，對後面只有壞處，丟掉，從 A[${i + 1}] 重新開始。` : '') +
          `cur = ${cur}（A[${cl + 1}..${i + 1}]）` + (improved ? `，超過目前最佳 → best = <b>${best}</b>。` : `，best 仍是 ${best}。`) });
    }
    return { best, lo: bl, hi: br, steps };
  }

  const api = {
    coinGreedy, coinDP, coinCounterexample,
    clash, activitySelector, activityByRule, RULES, weightedActivities,
    fractionalKnapsack, fractionalKnapsackLinear, greedy01, knapsack01,
    huffman, label, internalSum, codeCost, prefixClash, allParses, decodePrefix, codeTree, serializeTree,
    unitIntervals, maxSubarray, fmt, frac: frac_,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GR = api;
})(typeof window !== 'undefined' ? window : globalThis);
