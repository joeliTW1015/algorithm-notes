/* Widgets for the brain-teasers at the end of Lecture 14-3. */
(function () {
  'use strict';
  const { h, StepPlayer, bench } = UI;
  const W = (window.Widgets = window.Widgets || {});

  /* Pirate game solved backwards: 1 pirate left, 2 left, ..., all N. */
  W.pirates = function (el) {
    const nIn = h('input', { type: 'number', min: 2, max: 10, value: 5, 'aria-label': '海盜人數' });
    const cIn = h('input', { type: 'number', min: 10, max: 100000, value: 1000, 'aria-label': '金幣數' });
    const tie = h('select', { 'aria-label': '沒差時怎麼投' }, h('option', { value: 'no' }, '投反對（課堂常見設定）'), h('option', { value: 'yes' }, '投贊成'));
    const row = h('div', { class: 'pirates' });
    const player = new StepPlayer({ render });
    const B = bench('倒推', '從「只剩最後一個海盜」開始往回推',
      h('div', { class: 'inputs' }, h('label', null, '海盜人數', nIn), h('label', null, '金幣', cIn), h('label', null, '分到的一樣多時', tie)),
      row, player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    let N, coins;
    function run() {
      N = Math.max(2, Math.min(10, Number(nIn.value) || 2));
      coins = Math.max(N, Number(cIn.value) || 1000);
      const stages = DP.pirates(N, coins, tie.value).slice().reverse(); // smallest game first
      const steps = stages.map((st) => {
        const others = [];
        for (let r = st.first + 1; r <= N; r++) others.push(r);
        let msg = `<b>剩 ${st.k} 人</b>（Rank-${st.first} 到 Rank-${N}），由 Rank-${st.first} 提案，需要至少一半 = ${st.need} 票（含自己）。`;
        if (st.k === 1) msg += ` 只有自己一個人，自己投贊成就通過：全部 ${coins} 枚歸 Rank-${st.first}。`;
        else {
          msg += ` 如果提案被否決，Rank-${st.first} 出局，接下來就是上一步算好的分法：${st.prev.slice(st.first + 1).map((x, i) => `R${st.first + 1 + i}=${x}`).join('、')}。`;
          if (st.need - 1 === 0) msg += ' 自己一票就過半，不必收買任何人。';
          else msg += ` 還差 ${st.need - 1} 票，最便宜的是收買「否決後拿最少」的人，每人給${tie.value === 'yes' ? '和否決後一樣多' : '比否決後多 1 枚'}：收買 ${st.bought.map((r) => `R${r}`).join('、')}。`;
          msg += ` 結果：Rank-${st.first} 拿 <b>${st.pay[st.first]}</b>。`;
        }
        return Object.assign({ msg }, st);
      });
      steps.push(Object.assign({}, stages[stages.length - 1], { final: true,
        msg: `回到真正的遊戲（${N} 人全在）：Rank-1 的提案會通過，分配為 ${stages[stages.length - 1].pay.slice(1).map((x, i) => `R${i + 1}=${x}`).join('、')}。<b>Rank-1 拿最多</b>——「先提案」反而佔優勢，因為他能預測所有人在每個子問題的結果。` }));
      player.load(steps);
    }
    function render(st) {
      row.replaceChildren(...Array.from({ length: N }, (_, i) => {
        const r = i + 1;
        const out = r < st.first;
        const yes = r === st.first || st.bought.includes(r);
        return h('div', { class: 'pirate' + (out ? ' out' : '') + (r === st.first ? ' prop' : '') + (!out && yes && st.k > 1 ? ' yes' : '') },
          h('div', { class: 'face', 'aria-hidden': 'true' }, out ? '✕' : '☠'),
          h('div', null, `Rank-${r}`),
          h('div', { class: 'coins' }, out ? '出局' : st.pay[r]),
          h('div', { class: 'small muted' }, out ? '' : r === st.first ? '提案者' : yes ? '贊成' : '反對'));
      }));
    }
    nIn.oninput = cIn.oninput = tie.onchange = run;
    run();
  };

  /* The unfaithful-husbands village (common-knowledge induction). */
  W.village = function (el) {
    const mIn = h('input', { type: 'range', min: 1, max: 50, value: 50, 'aria-label': '外遇的丈夫人數' });
    const mLab = h('b');
    const grid = h('div', { style: 'display:grid;grid-template-columns:repeat(25, 1fr);gap:4px;max-width:620px;margin:8px 0' });
    const player = new StepPlayer({ render });
    const B = bench('模擬', '皇后宣布之後，每一晚發生什麼事？',
      h('div', { class: 'inputs' }, h('label', null, h('span', null, '50 對夫妻中，外遇的丈夫有 ', mLab, ' 位'), mIn)),
      grid, h('p', { class: 'small muted' }, '紅 = 外遇的丈夫，灰 = 忠實；✕ = 當晚被殺。'), player.el);
    el.replaceWith(B.el);
    player.keys(B.el);
    let m;
    function run() {
      m = Number(mIn.value);
      mLab.textContent = m;
      const steps = [{ night: 0, msg: `皇后宣布「至少有一位丈夫不忠」。外遇丈夫的妻子各自看到 <b>${m - 1}</b> 個外遇的男人；忠實丈夫的妻子看到 <b>${m}</b> 個。` }];
      for (let d = 1; d <= m; d++) {
        let msg;
        if (d < m) {
          msg = `第 ${d} 晚：沒有人能確定，平安無事。` + (d === 1 && m > 1 ? ' 若只有 1 個外遇丈夫，他的妻子會發現自己一個都沒看到 → 一定是自己丈夫，當晚就會殺。沒有人動手 → 大家知道外遇的人 ≥ 2。' : ` 大家因此知道外遇的人 ≥ ${d + 1}。`);
        } else {
          msg = `第 ${d} 晚：每個外遇丈夫的妻子推理：「我看到 ${m - 1} 個。如果我丈夫是忠實的，外遇的就只有 ${m - 1} 個，那他們的妻子應該在第 ${m - 1} 晚就動手了${m === 1 ? '（m = 1 時：我看到 0 個，但皇后說至少 1 個 → 就是我丈夫）' : '。昨晚沒人動手，所以外遇的不只 ' + (m - 1) + ' 個'}。」→ 確定自己丈夫外遇，<b>${m} 位妻子同時在第 ${m} 晚動手</b>。`;
          if (m < 50) msg += ` 忠實丈夫的妻子看到 ${m} 個，在第 ${m} 晚看到事件發生後就知道自己丈夫是忠實的。`;
        }
        steps.push({ night: d, msg });
      }
      player.load(steps);
    }
    function render(st) {
      grid.replaceChildren(...Array.from({ length: 50 }, (_, i) => {
        const bad = i < m;
        const dead = bad && st.night >= m;
        return h('span', { title: bad ? '外遇' : '忠實', style: `aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 11px var(--f-mono);border:1.5px solid var(--ink);background:${bad ? (dead ? '#5c1d1d' : '#e9786a') : '#dfe5e1'};color:#fff` }, dead ? '✕' : '');
      }));
    }
    mIn.oninput = run;
    run();
  };
})();
