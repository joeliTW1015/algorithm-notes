/* Widgets for prefix codes and Huffman's algorithm (slides p.25–43, exercises 15.3-x). */
(function () {
  'use strict';
  const { h, code, StepPlayer, tree, bench, legend } = UI;
  const W = (window.Widgets = window.Widgets || {});

  // "a:45 b=13" → [{ch, f}] in input order.
  function parsePairs(str, numeric) {
    const re = /([^\s:=,;]+)\s*[:=]\s*([^\s,;]+)/g, out = [];
    let m;
    while ((m = re.exec(str))) out.push({ ch: m[1], f: numeric ? Number(m[2]) : m[2] });
    return out;
  }
  const freqText = (arr) => arr.map((x) => `${x.ch}:${x.f}`).join(' ');

  const CODES = [
    ['定長 3 bits', 'a=000 b=001 c=010 d=011 e=100 f=101'],
    ['投影片的變長碼（p.27）', 'a=0 b=100 c=101 d=110 e=1110 f=1111'],
    ['「更好」的碼（p.28）', 'a=0 b=1 c=00 d=01 e=10 f=11'],
    ['CLRS 的 Huffman 碼', 'a=0 b=101 c=100 d=111 e=1101 f=1100'],
  ];

  // Code tree for an arbitrary code; a codeword that sits on an internal node breaks the prefix rule.
  function codeTreeNode(t, bit) {
    const kids = ['0', '1'].filter((b) => t.children[b]).map((b) => codeTreeNode(t.children[b], b));
    const leaf = !kids.length;
    return {
      label: t.ch !== undefined ? t.ch : '', rect: t.ch !== undefined && leaf, children: kids, edgeLabel: bit,
      cls: t.ch !== undefined ? (leaf ? 'win' : 'hot') : null,
      title: t.ch !== undefined && !leaf ? `${t.ch} 的碼是別人的前綴` : null,
    };
  }

  /* Fixed vs variable length, prefix-freeness, and decoding. */
  W.prefixCode = function (el) {
    const codeIn = h('input', { type: 'text', value: el.dataset.code || CODES[1][1], spellcheck: 'false', style: 'width:380px', 'aria-label': '編碼' });
    const freqIn = h('input', { type: 'text', value: 'a=45 b=11 c=11 d=11 e=11 f=11', spellcheck: 'false', style: 'width:300px', 'aria-label': '頻率（K 次）' });
    const bitsIn = h('input', { type: 'text', value: el.dataset.bits || '0101', spellcheck: 'false', 'aria-label': '要解碼的位元', style: 'width:200px' });
    const err = h('div', { class: 'err' });
    const chips = h('div', { class: 'chips' }, CODES.map(([name, v]) => h('button', { type: 'button', onclick: () => { codeIn.value = v; run(); } }, name)));
    const out = h('div');
    const B = bench('試試看', '編碼要多少 bits？能不能唯一解碼？',
      h('div', { class: 'inputs' }, h('label', null, '每個字元的碼字', codeIn), h('label', null, '出現次數（K）', freqIn), h('label', null, '解碼這串 bits', bitsIn), err),
      chips, out);
    el.replaceWith(B.el);
    function run() {
      err.textContent = '';
      const codes = {};
      parsePairs(codeIn.value).forEach((x) => (codes[x.ch] = x.f));
      const freq = {};
      parsePairs(freqIn.value, true).forEach((x) => (freq[x.ch] = x.f));
      const bits = bitsIn.value.replace(/[^01]/g, '');
      if (!Object.keys(codes).length || Object.values(codes).some((c) => !/^[01]+$/.test(c))) { err.textContent = '碼字請寫成 a=0 b=10 … 只能用 0 和 1。'; return; }
      const missing = Object.keys(freq).filter((c) => codes[c] === undefined);
      if (missing.length) { err.textContent = `${missing.join(', ')} 沒有碼字。`; return; }
      const total = GR.codeCost(codes, freq), n = Object.keys(freq).length;
      const fixedBits = Math.ceil(Math.log2(Math.max(2, n))) * Object.values(freq).reduce((a, b) => a + b, 0);
      const clashPair = GR.prefixClash(codes);
      const parses = GR.allParses(bits, codes, 40);
      out.replaceChildren(
        h('div', { class: 'two', style: 'align-items:start;margin-top:14px' },
          h('div', null,
            h('h4', { style: 'margin-top:0' }, '儲存成本 Σ f·|w|'),
            h('p', { class: 'small', html: Object.keys(freq).map((c) => `${freq[c]}×${codes[c].length}`).join(' + ') + ` = <b>${total}K bits</b>` }),
            h('p', { class: 'small muted' }, `定長碼需要 ⌈lg ${n}⌉ = ${Math.ceil(Math.log2(Math.max(2, n)))} bits/字元 → ${fixedBits}K bits；` +
              (total < fixedBits ? `省了 ${Math.round((1 - total / fixedBits) * 100)}%。` : '沒有比較省。')),
            h('h4', null, '是 prefix code 嗎？'),
            h('p', null, clashPair
              ? h('span', null, h('span', { class: 'verdict bad' }, '不是'), ' ', h('span', { class: 'small' }, `${clashPair[0]} = ${codes[clashPair[0]]} 是 ${clashPair[1]} = ${codes[clashPair[1]]} 的前綴（黃色節點：字元落在內部節點上）。`))
              : h('span', null, h('span', { class: 'verdict' }, '是'), ' ', h('span', { class: 'small' }, '每個字元都在葉子上，沒有碼字是另一個的前綴。')))),
          h('div', null, h('div', { class: 'scroll-x' }, tree(codeTreeNode(GR.codeTree(codes), null), { gap: 38, levelH: 46, r: 12, w: 26, hgt: 24, aria: 'code tree' })))),
        h('h4', null, `解碼 ${bits || '（空）'}：共 ${parses.length >= 40 ? '40+' : parses.length} 種切法`),
        parses.length
          ? h('div', { class: 'parse-list' }, parses.map((p) => h('div', { class: 'rod-card' + (parses.length === 1 ? ' best' : '') },
            h('b', null, p.join('')), ' ', h('span', { class: 'bits' }, p.map((c) => h('span', null, codes[c]))))))
          : h('p', { class: 'small muted' }, '沒有任何切法能把整串 bits 切成碼字。'),
        h('p', { class: 'small muted' }, clashPair ? '同一串 bits 有多種解讀 → 無法還原原文。' : 'Prefix code 從左往右掃，一湊成碼字就輸出，最多只有一種解讀。'));
    }
    codeIn.onchange = freqIn.onchange = bitsIn.oninput = run;
    run();
  };

  const PRESETS = [
    ['CLRS 圖（投影片 p.42）', 'f:5 e:9 c:12 b:13 d:16 a:45'],
    ['投影片 p.26（a 45K，其餘各 11K）', 'a:45 b:11 c:11 d:11 e:11 f:11'],
    ['Fibonacci（15.3-3）', 'a:1 b:1 c:2 d:3 e:5 f:8 g:13 h:21'],
    ['8 個一樣多', 'a:1 b:1 c:1 d:1 e:1 f:1 g:1 h:1'],
  ];

  const HUFFCODE = [
    'n = |C|',
    'Q = C                  // min-priority queue',
    'for i = 1 to n - 1',
    '    allocate a new node z',
    '    z.left = x = EXTRACT-MIN(Q)',
    '    z.right = y = EXTRACT-MIN(Q)',
    '    z.freq = x.freq + y.freq',
    '    INSERT(Q, z)',
    'return EXTRACT-MIN(Q)  // 樹根',
  ];

  function toNode(t, mark, bit) {
    const leaf = t.ch !== undefined;
    return {
      label: leaf ? `${t.ch}:${t.f}` : t.f, rect: leaf, edgeLabel: bit, cls: mark(t),
      children: leaf ? [] : [toNode(t.left, mark, '0'), toNode(t.right, mark, '1')],
    };
  }
  W._huffNode = toNode;

  /* HUFFMAN(C), step by step: the forest, the queue, and the final code table. */
  W.huffman = function (el) {
    const inp = h('input', { type: 'text', value: el.dataset.freq || PRESETS[0][1], spellcheck: 'false', style: 'width:380px', 'aria-label': '字元:頻率' });
    const err = h('div', { class: 'err' });
    const chips = h('div', { class: 'chips' }, PRESETS.map(([name, v]) => h('button', { type: 'button', onclick: () => { inp.value = v; run(); } }, name)));
    const cd = code(HUFFCODE, 'HUFFMAN(C)');
    const pq = h('div', { class: 'pq' });
    const forest = h('div', { class: 'forest' });
    const result = h('div');
    const player = new StepPlayer({ code: cd, render });
    const B = bench('逐步執行', '每次把頻率最小的兩棵樹合併',
      h('div', { class: 'inputs' }, h('label', null, '字元:頻率', inp), err), chips,
      h('div', { class: 'bench-cols', style: 'margin-top:12px' }, h('div', null, pq, forest, legend(['cur', '剛取出的 x、y'], ['win', '新節點 z'])), cd.el),
      player.el, result);
    el.replaceWith(B.el);
    player.keys(B.el);
    let res, chars;
    function run() {
      err.textContent = '';
      chars = parsePairs(inp.value, true);
      if (chars.length < 2 || chars.some((c) => !(c.f > 0))) { err.textContent = '至少 2 個字元，格式 a:45 b:13 …，頻率要是正數。'; return; }
      if (new Set(chars.map((c) => c.ch)).size !== chars.length) { err.textContent = '字元不能重複。'; return; }
      if (chars.length > 16) { err.textContent = '最多 16 個字元。'; return; }
      res = GR.huffman(chars);
      player.load(res.steps);
      const n = chars.length, sum = chars.reduce((a, c) => a + c.f, 0), fixed = Math.ceil(Math.log2(n)) * sum;
      result.replaceChildren(h('h4', null, '結果：每個字元的碼字'),
        h('div', { class: 'scroll-x' }, h('table', { class: 'plain' },
          h('tr', null, h('th', null, '字元'), h('th', { class: 'num' }, '頻率 f'), h('th', null, '碼字'), h('th', { class: 'num' }, '長度'), h('th', { class: 'num' }, 'f × 長度')),
          chars.slice().sort((a, b) => b.f - a.f).map((c) => h('tr', null, h('td', null, c.ch), h('td', { class: 'num' }, c.f), h('td', null, h('code', null, res.codes[c.ch])),
            h('td', { class: 'num' }, res.codes[c.ch].length), h('td', { class: 'num' }, GR.fmt(c.f * res.codes[c.ch].length)))),
          h('tr', null, h('th', null, '合計'), h('th', { class: 'num' }, GR.fmt(sum)), h('th', null, ''), h('th', null, ''), h('th', { class: 'num' }, GR.fmt(res.cost))))),
        h('p', { class: 'small', html: `Huffman 成本 <b>${GR.fmt(res.cost)}</b>；定長碼 ⌈lg ${n}⌉ = ${Math.ceil(Math.log2(n))} bits → ${GR.fmt(fixed)}。` +
          ` 另一種算法（15.3-4）：所有內部節點的頻率加總 = ${res.steps.filter((s) => s.line === 8).map((s) => GR.fmt(s.z.f)).join(' + ')} = ${GR.fmt(GR.internalSum(res.root))}。` }));
    }
    function render(st) {
      const mark = (t) => (t === st.z ? 'win' : t === st.x || t === st.y ? 'hot' : null);
      const trees = st.forest.slice();
      if (st.x) trees.push(st.x, st.y);
      pq.replaceChildren(h('span', null, st.done ? '樹根：' : 'Q（小 → 大）：'),
        ...st.forest.map((t) => h('span', { class: 'pill' + (t === st.z ? ' new' : '') }, GR.label(t))),
        st.x ? h('span', null, '　取出：', h('span', { class: 'pill hot' }, GR.label(st.x)), h('span', { class: 'pill hot' }, GR.label(st.y))) : '');
      forest.replaceChildren(...trees.map((t) => tree(toNode(t, mark), { gap: 50, levelH: 46, r: 15, w: 42, hgt: 24, pad: 10, aria: 'Huffman tree' })));
    }
    inp.onchange = run;
    run();
  };
})();
