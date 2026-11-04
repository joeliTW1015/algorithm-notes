// Checks the algorithms against the answers given in the slides and textbook.
// Run: node tests/run.js
const assert = require('assert');
const DP = require('../assets/algos.js');

let passed = 0;
function check(name, fn) { fn(); passed++; console.log('ok  ' + name); }

const P = [0, 1, 5, 8, 9, 10, 17, 17, 20, 24, 30];

check('rod cutting r and s (slides)', () => {
  const { r, s } = DP.rodCut(P, 10);
  assert.deepStrictEqual(r, [0, 1, 5, 8, 10, 13, 17, 18, 22, 25, 30]);
  assert.deepStrictEqual(s.slice(1, 9), [1, 2, 3, 2, 2, 6, 1, 2]);
  assert.deepStrictEqual(DP.rodPieces(s, 7), [1, 6]);
});

check('rod: 2^(n-1) cuttings and T(n) = 2^n calls', () => {
  assert.strictEqual(DP.rodCompositions(4).length, 8);
  for (let n = 0; n <= 8; n++) assert.strictEqual(DP.countNodes(DP.cutRodTree(n)), 2 ** n);
  const t = DP.cutRodTree(4);
  assert.strictEqual(DP.markMemo(t).computed, 5);
});

check('14.1-2 greedy counterexample', () => {
  const p = [0, 1, 20, 33, 36];
  assert.strictEqual(DP.rodGreedy(p, 4).value, 34);
  assert.strictEqual(DP.rodCut(p, 4).r[4], 40);
});

check('14.1-3 cut cost', () => {
  assert.strictEqual(DP.rodCutWithCost(P, 4, 0).r[4], 10);
  assert.strictEqual(DP.rodCutWithCost(P, 4, 1).r[4], 9);
  assert.strictEqual(DP.rodCutWithCost(P, 4, 2).r[4], 9);
});

check('matrix chain CLRS example', () => {
  const res = DP.matrixChain([30, 35, 15, 5, 10, 20, 25]);
  assert.strictEqual(res.m[1][6], 15125);
  assert.strictEqual(res.m[2][5], 7125);
  assert.strictEqual(DP.parens(res.s, 1, 6), '((A1(A2A3))((A4A5)A6))');
});

check('matrix chain 1x100 example', () => {
  assert.strictEqual(DP.matrixChain([1, 100, 1, 100]).m[1][3], 200);
  assert.strictEqual(DP.matrixChain([1, 100, 1, 100], 'max').m[1][3], 20000);
});

check('14.2-1', () => {
  const res = DP.matrixChain([5, 10, 3, 12, 5, 50, 6]);
  assert.strictEqual(res.m[1][6], 2010);
  assert.strictEqual(DP.parens(res.s, 1, 6), '((A1A2)((A3A4)(A5A6)))');
});

check('14.2-5 references = (n^3 - n)/3', () => {
  for (let n = 1; n <= 8; n++) {
    const dims = Array.from({ length: n + 1 }, (_, i) => i + 2);
    assert.strictEqual(DP.matrixChain(dims).refs, (n ** 3 - n) / 3);
  }
});

check('14.3-4 greedy counterexample', () => {
  const g = DP.mcmGreedy([1, 2, 3, 4]);
  assert.strictEqual(g.cost, 32);
  assert.strictEqual(DP.matrixChain([1, 2, 3, 4]).m[1][3], 18);
});

check('catalan', () => {
  assert.deepStrictEqual(DP.catalan(6).slice(1), [1, 1, 2, 5, 14, 42]);
});

check('LCS DIRTYROOM / DORMITORY', () => {
  const res = DP.lcs('DIRTYROOM', 'DORMITORY');
  assert.strictEqual(res.length, 4);
  assert.deepStrictEqual(res.c[9], [0, 1, 2, 2, 3, 3, 3, 4, 4, 4]);
  console.log('    traceback LCS =', res.lcs, ' all =', DP.allLCS('DIRTYROOM', 'DORMITORY').join(','));
  assert.strictEqual(DP.lcsMemoCells('DIRTYROOM', 'DORMITORY').length, 4);
});

check('LCS algorithms / logarithms', () => {
  const all = DP.allLCS('algorithms', 'logarithms');
  assert.ok(all.includes('lorithms') && all.includes('lgrithms'));
  console.log('    all =', all.join(','));
});

check('14.4-1', () => {
  const res = DP.lcs('10010101', '010110110');
  console.log('    length =', res.length, res.lcs);
});

check('optimal BST CLRS example (slides)', () => {
  const p = [0, 0.15, 0.10, 0.05, 0.10, 0.20];
  const q = [0.05, 0.10, 0.05, 0.05, 0.05, 0.10];
  const res = DP.optimalBST(p, q);
  assert.strictEqual(DP.fmt(res.cost), '2.75');
  assert.strictEqual(res.root[1][5], 2);
  assert.strictEqual(DP.fmt(res.e[1][2]), '0.90');
  const t = DP.bstTree(res.root, 1, 5);
  assert.strictEqual(DP.bstCost(t, p, q).total, 2.75);
  const a = DP.treeFromSpec(['k2', ['k1', 'd0', 'd1'], ['k4', ['k3', 'd2', 'd3'], ['k5', 'd4', 'd5']]]);
  assert.strictEqual(DP.bstCost(a, p, q).total, 2.8);
});

check('14.5-2', () => {
  const p = [0, 0.04, 0.06, 0.08, 0.02, 0.10, 0.12, 0.14];
  const q = [0.06, 0.06, 0.06, 0.06, 0.05, 0.05, 0.05, 0.05];
  const res = DP.optimalBST(p, q);
  assert.strictEqual(DP.fmt(res.cost), '3.12');
  console.log('    root =', res.root[1][7]);
});

check('dictionary example', () => {
  const p = [0, 0.21, 0.18, 0.01, 0.02, 0.04, 0.07];
  const q = [0.01, 0.10, 0.05, 0.12, 0.04, 0.11, 0.04];
  const res = DP.optimalBST(p, q);
  const slideTree = DP.treeFromSpec(['k2', ['k1', 'd0', 'd1'], ['k5', ['k4', ['k3', 'd2', 'd3'], 'd4'], ['k6', 'd5', 'd6']]]);
  console.log('    optimal =', DP.fmt(res.cost), ' slide tree =', DP.bstCost(slideTree, p, q).total);
});

check('stairs / LIS / sushi', () => {
  assert.deepStrictEqual(DP.stairs(6), [1, 1, 2, 4, 7, 13, 24]);
  const A = [11, 17, 5, 8, 6, 4, 7, 12, 3];
  const lis = DP.increasingSubseq(A, 'len');
  assert.strictEqual(lis.best, 4);
  console.log('    LIS =', lis.seq.map((i) => A[i]).join(','));
  const sushi = DP.increasingSubseq([3, 9, 2, 5, 7, 4, 8], 'sum');
  assert.strictEqual(sushi.best, 3 + 5 + 7 + 8);
});

check('tiling', () => {
  assert.strictEqual(DP.tiling(2, 3)[3], 3);
  assert.strictEqual(DP.tiling(1, 5)[5], 1);
  for (let k = 1; k <= 4; k++) for (let n = 0; n <= 9; n++) {
    if (k === 1) continue;
    assert.strictEqual(DP.enumerateTilings(k, n, 1e6).length, DP.tiling(k, n)[n]);
  }
});

check('tree MWIS', () => {
  const t = { id: 'a', w: 1, children: [{ id: 'b', w: 5, children: [] }, { id: 'c', w: 4, children: [{ id: 'd', w: 2, children: [] }] }] };
  const res = DP.treeMWIS(t);
  assert.strictEqual(res.best, 9);
});

check('pirates', () => {
  const st = DP.pirates(5, 1000, 'no');
  assert.deepStrictEqual(st[0].pay.slice(1), [998, 0, 1, 0, 1]);
  const st2 = DP.pirates(5, 1000, 'yes');
  console.log('    tie=yes:', st2[0].pay.slice(1).join(','));
});

check('LCS tie-break left', () => {
  const a = require('../assets/algos.js').lcs('DIRTYROOM', 'DORMITORY', 'left');
  assert.strictEqual(a.lcs, 'DRTO');
});

/* ---------- Ch15 Greedy ---------- */
const GR = require('../assets/greedy.js');

check('coin changing: slides', () => {
  assert.deepStrictEqual(GR.coinGreedy([1, 2, 5, 10], 18).bag, [10, 5, 2, 1]);
  assert.deepStrictEqual(GR.coinGreedy([1, 4, 5, 10], 8).bag, [5, 1, 1, 1]);
  assert.deepStrictEqual(GR.coinDP([1, 4, 5, 10], 8).bag, [4, 4]);
  assert.strictEqual(GR.coinCounterexample([1, 2, 5, 10]), null);
  assert.strictEqual(GR.coinCounterexample([1, 5, 10, 25]), null);
  assert.strictEqual(GR.coinCounterexample([1, 4, 5, 10]).x, 8);
  assert.strictEqual(GR.coinCounterexample([1, 3, 4]).x, 6);
  for (let c = 2; c <= 4; c++) for (let k = 1; k <= 3; k++) {
    const coins = Array.from({ length: k + 1 }, (_, i) => c ** i);
    assert.strictEqual(GR.coinCounterexample(coins, 200), null, `powers of ${c}`);
  }
});

const SLIDE_ACTS = [[1, 3], [2, 5], [4, 7], [1, 8], [5, 9], [8, 10], [9, 11], [11, 14], [13, 16]]
  .map(([s, f], i) => ({ id: 'a' + (i + 1), s, f }));

check('activity selection: slide example', () => {
  assert.deepStrictEqual(GR.activitySelector(SLIDE_ACTS).chosen, ['a1', 'a3', 'a6', 'a8']);
  assert.deepStrictEqual(GR.activityByRule(SLIDE_ACTS, 'finish').chosen, ['a1', 'a3', 'a6', 'a8']);
  assert.deepStrictEqual(GR.activityByRule(SLIDE_ACTS, 'lastStart').chosen, ['a9', 'a7', 'a5', 'a2']);
});

check('activity selection: counterexamples', () => {
  const dur = [['A1', 290, 310], ['A2', 180, 300], ['A3', 305, 420]].map(([id, s, f]) => ({ id, s, f }));
  assert.deepStrictEqual(GR.activityByRule(dur, 'duration').chosen, ['A1']);
  assert.strictEqual(GR.activityByRule(dur, 'finish').chosen.length, 2);
  const st = [['A1', 180, 600], ['A2', 190, 200], ['A3', 200, 210], ['A4', 210, 220], ['A5', 220, 230]].map(([id, s, f]) => ({ id, s, f }));
  assert.deepStrictEqual(GR.activityByRule(st, 'start').chosen, ['A1']);
  assert.strictEqual(GR.activityByRule(st, 'finish').chosen.length, 4);
  const ov = [[0, 3], [4, 7], [8, 11], [12, 15], [2, 5], [6, 9], [10, 13], [2, 5], [2, 5], [2, 5], [10, 13], [10, 13], [10, 13]]
    .map(([s, f], i) => ({ id: 'b' + (i + 1), s, f }));
  assert.strictEqual(GR.activityByRule(ov, 'overlap').chosen.length, 3);
  assert.strictEqual(GR.activityByRule(ov, 'finish').chosen.length, 4);
});

check('15.1-5 weighted activities', () => {
  const acts = [['a', 0, 3, 5], ['b', 2, 5, 6], ['c', 4, 7, 5], ['d', 6, 9, 4], ['e', 1, 9, 20]].map(([id, s, f, v]) => ({ id, s, f, v }));
  const res = GR.weightedActivities(acts);
  assert.strictEqual(res.best, 20);
  assert.deepStrictEqual(res.chosen, ['e']);
  const res2 = GR.weightedActivities(SLIDE_ACTS.map((a) => ({ ...a, v: 1 })));
  assert.strictEqual(res2.best, 4);
});

const SLIDE_ITEMS = [{ id: 'I1', v: 60, w: 10 }, { id: 'I2', v: 100, w: 20 }, { id: 'I3', v: 120, w: 30 }];

check('knapsack: slides', () => {
  assert.strictEqual(GR.fractionalKnapsack(SLIDE_ITEMS, 50).value, 240);
  assert.strictEqual(GR.fractionalKnapsackLinear(SLIDE_ITEMS, 50).value, 240);
  assert.deepStrictEqual(GR.greedy01(SLIDE_ITEMS, 50, 'density'), { chosen: ['I1', 'I2'], value: 160, weight: 30 });
  const k = GR.knapsack01(SLIDE_ITEMS, 50);
  assert.strictEqual(k.best, 220);
  assert.deepStrictEqual(k.chosen, ['I2', 'I3']);
  assert.strictEqual(k.unit, 10);
});

check('knapsack: linear fractional matches sorting version', () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let t = 0; t < 200; t++) {
    const items = Array.from({ length: 1 + Math.floor(rnd() * 9) }, (_, i) => ({ id: 'x' + i, v: 1 + Math.floor(rnd() * 50), w: 1 + Math.floor(rnd() * 20) }));
    const W = Math.floor(rnd() * 80);
    assert.ok(Math.abs(GR.fractionalKnapsack(items, W).value - GR.fractionalKnapsackLinear(items, W).value) < 1e-6);
    const brute = Math.max(...Array.from({ length: 1 << items.length }, (_, m) => {
      let v = 0, w = 0;
      items.forEach((it, i) => { if (m >> i & 1) { v += it.v; w += it.w; } });
      return w <= W ? v : 0;
    }));
    assert.strictEqual(GR.knapsack01(items, W).best, brute);
  }
});

const CLRS_FREQ = [['a', 45], ['b', 13], ['c', 12], ['d', 16], ['e', 9], ['f', 5]].map(([ch, f]) => ({ ch, f }));

check('huffman: CLRS figure', () => {
  const res = GR.huffman(CLRS_FREQ);
  assert.deepStrictEqual(res.codes, { a: '0', b: '101', c: '100', d: '111', e: '1101', f: '1100' });
  assert.strictEqual(res.cost, 224);
  assert.strictEqual(GR.internalSum(res.root), 224);
  const merges = res.steps.filter((s) => s.line === 8).map((s) => s.z.f);
  assert.deepStrictEqual(merges, [14, 25, 30, 55, 100]);
  const ser = GR.serializeTree(res.root);
  assert.strictEqual(ser.shape, '10110011000');
  assert.strictEqual(ser.leaves.join(''), 'acbfed');
});

check('huffman: slide encoding example is optimal', () => {
  const fr = [['a', 45], ['b', 11], ['c', 11], ['d', 11], ['e', 11], ['f', 11]].map(([ch, f]) => ({ ch, f }));
  assert.strictEqual(GR.huffman(fr).cost, 232);
  const slide = { a: '0', b: '100', c: '101', d: '110', e: '1110', f: '1111' };
  assert.strictEqual(GR.codeCost(slide, { a: 45, b: 11, c: 11, d: 11, e: 11, f: 11 }), 232);
  assert.strictEqual(GR.prefixClash(slide), null);
  assert.strictEqual(GR.decodePrefix('0100101', slide).text, 'abc');
});

check('prefix code: 0101 is ambiguous', () => {
  const bad = { a: '0', b: '1', c: '00', d: '01', e: '10', f: '11' };
  const parses = GR.allParses('0101', bad).map((p) => p.join(''));
  ['abab', 'dd', 'abd', 'aeb', 'dab'].forEach((s) => assert.ok(parses.includes(s), s));
  assert.ok(GR.prefixClash(bad));
});

check('15.3-3 Fibonacci frequencies', () => {
  const fib = [1, 1, 2, 3, 5, 8, 13, 21];
  const res = GR.huffman(fib.map((f, i) => ({ ch: 'abcdefgh'[i], f })));
  assert.deepStrictEqual(Object.values(res.codes).map((c) => c.length).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 7]);
  assert.strictEqual(res.codes.h, '0');
});

check('15.2-5 unit intervals and greedy max subarray', () => {
  assert.deepStrictEqual(GR.unitIntervals([0.5, 1.2, 1.4, 2.6, 3, 5]), [[0.5, 1.5], [2.6, 3.6], [5, 6]]);
  const A = [13, -3, -25, 20, -3, -16, -23, 18, 20, -7, 12, -5, -22, 15, -4, 7];
  const r = GR.maxSubarray(A);
  assert.deepStrictEqual([r.best, r.lo + 1, r.hi + 1], [43, 8, 11]);
  assert.strictEqual(GR.maxSubarray([-3, -1, -2]).best, -1);
});

const AM = require('../assets/amortized.js');

check('super stack: total cost <= 2 * #PUSH, popped <= pushed', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const ops = AM.randomStackOps(60, seed);
    const r = AM.stackRun(ops);
    assert.ok(r.popped <= r.pushes);
    assert.ok(r.total <= 2 * r.pushes && r.total <= 2 * ops.length);
  }
  const w = AM.stackRun(AM.worstStackOps(10));
  assert.strictEqual(w.steps[10].cost, 9);
  assert.strictEqual(w.total, 18);
  const s = AM.stackRun([{ op: 'push' }, { op: 'push' }, { op: 'superpop', k: 5 }, { op: 'pop' }]);
  assert.deepStrictEqual(s.steps.map((x) => x.cost), [0, 1, 1, 2, 0]);
});

check('binary counter: slide examples and CLRS Figure 16.2', () => {
  const five = [1, 0, 1, 0, 0];
  const r = AM.increment(five);
  assert.strictEqual(AM.show(r.bits), '00110');
  assert.strictEqual(r.cost, 2);
  const max = AM.increment([1, 1, 1, 1, 1]);
  assert.strictEqual(AM.show(max.bits), '00000');
  assert.strictEqual(max.cost, 5);
  const fig = AM.counterRun(8, 16).steps.map((s) => s.total);
  assert.deepStrictEqual(fig, [0, 1, 3, 4, 7, 8, 10, 11, 15, 16, 18, 19, 22, 23, 25, 26, 31]);
});

check('binary counter: b_i flips floor(n/2^i) times, total < 2n', () => {
  for (const [k, n] of [[5, 31], [8, 100], [12, 1000]]) {
    const r = AM.counterRun(k, n);
    r.perBit.forEach((c, i) => assert.strictEqual(c, Math.floor(n / 2 ** i)));
    assert.strictEqual(r.total, AM.incrementTotal(n, k));
    assert.ok(r.total < 2 * n);
  }
});

check('16.1-2 alternating DECREMENT/INCREMENT costs k each', () => {
  const k = 6, ops = [];
  for (let i = 0; i < 20; i++) ops.push(i % 2 ? 'inc' : 'dec');
  const r = AM.counterRun(k, ops);
  r.steps.slice(1).forEach((s) => assert.strictEqual(s.cost, k));
  assert.strictEqual(r.total, 20 * k);
  assert.strictEqual(AM.show(AM.decrement([0, 0, 1, 0]).bits), '0011');
});

check('16.1-3 power-of-two costs: total < 3n', () => {
  assert.deepStrictEqual([1, 2, 3, 4, 5, 6, 7, 8].map(AM.powCost), [1, 2, 1, 4, 1, 1, 1, 8]);
  assert.strictEqual(AM.powTotal(8), 19);
  for (let n = 1; n <= 2000; n++) assert.ok(AM.powTotal(n) < 3 * n);
});

check('quicksort average over all n! inputs = 2(n+1)H_n - 4n, worst = n(n-1)/2', () => {
  for (let n = 1; n <= 7; n++) {
    const st = AM.quicksortStats(n);
    assert.ok(Math.abs(st.avg - AM.quicksortAvgFormula(n)) < 1e-9, 'n=' + n);
    assert.strictEqual(st.worst, (n * (n - 1)) / 2);
  }
});

// ---------- Ch16-2 Accounting & potential method ----------
check('accounting super stack (slides p.5-8): $2/$0/$0 never overdraws, bank = #items', () => {
  for (const seed of [1, 3, 11, 42]) {
    const r = AM.stackAccount(AM.randomStackOps(80, seed));
    assert.strictEqual(r.firstNeg, -1);
    r.steps.forEach((s) => { assert.strictEqual(s.bank, s.stack.length); assert.ok(s.total <= 2 * s.pushes); });
  }
  const bad = AM.stackAccount([{ op: 'push' }, { op: 'pop' }], { push: 1 });
  assert.strictEqual(bad.firstNeg, 2);
  assert.strictEqual(AM.stackAccount(AM.worstStackOps(10), { push: 1, pop: 1, superpop: 1 }).minBank, -8);
});

check('accounting binary counter (slides p.9-14): bank >= #1 bits; start != 0 overdraws', () => {
  for (const [k, n] of [[5, 32], [8, 16], [4, 50]]) {
    const r = AM.counterAccount(k, n);
    assert.strictEqual(r.firstNeg, -1);
    r.steps.forEach((s) => {
      const ones = s.bits.reduce((a, b) => a + b, 0);
      assert.ok(s.bank >= ones);
      assert.strictEqual(s.bank, s.amortTotal - s.total);
      assert.strictEqual(s.credit.reduce((a, b) => a + b, 0), ones);
    });
  }
  assert.deepStrictEqual(AM.counterAccount(8, 16).steps.map((s) => s.total), [0, 1, 3, 4, 7, 8, 10, 11, 15, 16, 18, 19, 22, 23, 25, 26, 31]);
  const p14 = AM.counterAccount(5, 4, { start: 7 });
  assert.strictEqual(p14.steps[1].cost, 4);
  assert.strictEqual(p14.steps[1].bank, -2);
  assert.ok(AM.counterAccount(5, 16, { charge: 1 }).firstNeg > 0);
});

check('potential super stack (slides p.23-25): PUSH 2, POP 0, SUPER-POP 0; telescoping', () => {
  const ops = AM.randomStackOps(80, 9), r = AM.stackRun(ops);
  const phi = AM.PHI.stack.find((p) => p.id === 'items');
  const L = AM.potentialLedger(r.steps.map((s) => s.stack), r.steps.map((s) => s.cost), phi.f);
  assert.ok(L.valid);
  L.rows.forEach((row) => assert.strictEqual(row.amort, ops[row.i - 1].op === 'push' ? 2 : 0));
  assert.strictEqual(L.amortTotal, L.total + L.phiN - L.phi0);
  const neg = AM.potentialLedger(r.steps.map((s) => s.stack), r.steps.map((s) => s.cost), AM.PHI.stack.find((p) => p.id === 'neg').f);
  assert.ok(!neg.valid && neg.amortTotal < neg.total);
});

check('potential counter (slides p.26-28, CLRS 16.3): amortized <= 2, = 0 on wrap; total <= 2n - b_n + b_0', () => {
  const r = AM.counterRun(4, 40);
  const L = AM.potentialLedger(r.steps.map((s) => s.bits), r.steps.map((s) => s.cost), AM.PHI.counter[0].f);
  L.rows.forEach((row) => assert.strictEqual(row.amort, row.i % 16 === 0 ? 0 : 2));
  for (const start of [0, 7, 11, 31]) {
    const run = AM.counterRun(5, 20, start), b0 = run.steps[0].bits.reduce((a, b) => a + b, 0), bn = run.steps[20].bits.reduce((a, b) => a + b, 0);
    assert.ok(run.total <= 2 * 20 - bn + b0, 'start=' + start);
  }
});

check('16.2-1 backup stack: $2 per operation is enough, total <= 2n', () => {
  for (let k = 2; k <= 12; k++) for (const mode of ['random', 'full']) {
    const r = AM.backupRun(AM.backupOps(100, k, mode, k), k);
    assert.ok(r.minBank >= 0, `k=${k} ${mode}`);
    assert.ok(r.total <= 200);
  }
  const full = AM.backupRun(AM.backupOps(32, 4, 'full'), 4);
  assert.deepStrictEqual(full.steps.filter((s) => s.didCopy).map((s) => s.copy), Array(8).fill(4));
});

check('16.2-3 counter with RESET: bank >= #1 + (max+1), total <= 3n', () => {
  const r = AM.rng(5);
  for (let trial = 0; trial < 40; trial++) {
    const k = 2 + (trial % 8), ops = Array.from({ length: 120 }, () => (r() < 0.1 ? 'reset' : 'inc'));
    const res = AM.resetCounterRun(k, ops);
    assert.ok(res.minSlack >= 0);
    assert.ok(res.total <= 3 * ops.length);
    res.steps.forEach((s) => { const top = s.bits.lastIndexOf(1); assert.strictEqual(s.max, top); });
  }
});

check('16.3-3 min-heap: Phi = lg(n!) gives INSERT <= 1 + 2 lg n, EXTRACT-MIN <= 1', () => {
  const r = AM.rng(8), xs = Array.from({ length: 60 }, () => Math.floor(r() * 100));
  const ops = [...xs.map((x) => ({ op: 'insert', x })), ...xs.map(() => ({ op: 'extract' }))];
  const res = AM.heapRun(ops);
  assert.deepStrictEqual(res.steps.filter((s) => s.op && s.op.op === 'extract').map((s) => s.out), xs.slice().sort((a, b) => a - b));
  res.steps.slice(1).forEach((s) => {
    if (s.op.op === 'insert') assert.ok(s.amort <= 1 + 2 * Math.log2(s.n) + 1e-9);
    else assert.ok(s.amort <= 1 + 1e-9);
  });
  assert.ok(Math.abs(AM.heapPhi(8) - Math.log2(40320)) < 1e-9);
});

check('16.3-4 stack starting with s0 items: total = 2#PUSH + s0 - sn', () => {
  for (const s0 of [0, 3, 8]) {
    const ops = [...AM.randomStackOps(50, s0 + 1), { op: 'superpop', k: 99 }, { op: 'push' }];
    const r = AM.stackRun(ops, Array.from({ length: s0 }, (_, j) => j + 1)), last = r.steps[r.steps.length - 1];
    assert.strictEqual(r.total, 2 * r.pushes + s0 - last.stack.length);
  }
});

check('16.3-5 queue from two stacks: FIFO, ENQUEUE 3, DEQUEUE 1', () => {
  const r = AM.rng(2), ops = [];
  let size = 0;
  for (let i = 0; i < 200; i++) { const op = size && r() < 0.45 ? 'deq' : 'enq'; ops.push(op); size += op === 'enq' ? 1 : -1; }
  const res = AM.queueRun(ops), outs = res.steps.filter((s) => s.op === 'deq').map((s) => s.out);
  assert.deepStrictEqual(outs, outs.map((_, j) => j + 1));
  res.steps.slice(1).forEach((s) => assert.strictEqual(s.amort, s.op === 'enq' ? 3 : 1));
  assert.ok(res.total <= res.amortTotal);
});

check('16.3-6 DELETE-LARGER-HALF: keeps the floor(s/2) smallest, m operations <= 3m', () => {
  const r = AM.rng(6), ops = [];
  for (let i = 0; i < 300; i++) ops.push(r() < 0.15 ? { op: 'dlh' } : { op: 'insert', x: Math.floor(r() * 10) });
  const res = AM.halfRun(ops);
  res.steps.slice(1).forEach((s, j) => {
    if (s.op.op !== 'dlh') return;
    const before = res.steps[j].S.slice().sort((a, b) => a - b);
    assert.deepStrictEqual(s.S.slice().sort((a, b) => a - b), before.slice(0, Math.floor(before.length / 2)));
    assert.ok(s.amort <= 0);
  });
  assert.ok(res.total <= 3 * ops.length);
  const dup = AM.halfRun([5, 5, 5, 5, 2, 2, 8].map((x) => ({ op: 'insert', x })).concat([{ op: 'dlh' }]));
  assert.deepStrictEqual(dup.steps[8].S.slice().sort(), [2, 2, 5]);
});

console.log(`\n${passed} checks passed`);
