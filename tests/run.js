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

console.log(`\n${passed} checks passed`);
