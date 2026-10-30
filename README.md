# 演算法筆記（Algorithms, 2026 Fall）

依上課投影片整理的互動式筆記，用 GitHub Pages 發布。

- `dp/` — Chapter 14 Dynamic Programming：Rod cutting、Matrix-chain、LCS、Optimal BST、練習與習題詳解
- `greedy/` — Chapter 15 Greedy Algorithms：Coin changing、Activity selection、Knapsack、Huffman code、習題 15.x 詳解
- `amortized/` — Chapter 16 Amortized Analysis：Aggregate method、Super stack、Binary counter、Amortized vs average-case、習題 16.1-x 詳解
- `assets/algos.js`（DP）、`assets/greedy.js`（Greedy）、`assets/amortized.js`（Amortized）— 純演算法（含逐步記錄），網頁與測試共用
- `assets/core.js` — 共用 UI：側欄（依 `data-chapter` 切換章節目錄）、逐步播放器、表格、樹狀圖
- `assets/w-*.js` — 各主題的互動元件

純靜態 HTML/JS，不需要 build。本機預覽：

```sh
python3 -m http.server 8000   # 然後開 http://localhost:8000/
```

測試（檢查演算法結果與投影片 / 課本答案一致）：

```sh
node tests/run.js
```
