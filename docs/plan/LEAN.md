# Phase 12: 三つの軸をさらに削る（`lean-tools` / `few-turns` / `haiku-nosub` / `all-in`）

計測日 2026-09-02 / Claude Code **2.1.258** / corpus `corpus-v1`（code-45） /
main model は arm により `claude-sonnet-5` または `claude-haiku-4-5`。
前段は [`LEVERS.md`](./LEVERS.md)（Phase 10–11）。

---

## 1. 出発点

Phase 11 までで最も安かった条件は `effort-low-nosub`
（`--effort low` + `--disallowedTools Agent`）である —
uncached_all 中央値 142,566 トークン、コスト中央値 $0.098、正答率 84.4%。
索引もツールも足さない、ただ削るだけの条件が、11 フェーズ・680 ランを通じて
最も安かった。

ではその先はどこを削れるのか。残っているコストは大きく三つに分解できる。

| # | 軸 | 何を削るか | Phase 12 のアーム |
|---|---|---|---|
| 1 | **ターンあたりの固定費** | 毎ターン再送される system prompt + ツール定義 | `lean-tools` |
| 2 | **ターン数** | 探索の往復回数そのもの | `few-turns` |
| 3 | **モデル単価** | Sonnet 5 → Haiku 4.5 | `haiku-nosub` |
| — | 全部 | 上の三つを同時に | `all-in` |

三つとも「エージェントに何かを与える」条件ではない。Phase 2–9 が測った
索引系がすべて外れた以上、残る問いは「削り方をどこまで積めるか」である。

---

## 2. 条件設計

`bench/conditions.ts` に 4 アームを登録した。corpus はすべて v1、
比較対象は `effort-low-nosub`（Phase 11 の最良条件）と、
Haiku 側は `haiku-baseline`（Phase 6）である。

| condition | overlay | model | effort | CLI 差分 |
|---|---|---|---|---|
| `lean-tools` | `overlays/baseline` | `claude-sonnet-5` | low | `--tools Read,Grep,Glob,Bash,Edit` + `--disallowedTools Agent` |
| `few-turns` | **`overlays/few-turns`** | `claude-sonnet-5` | low | `--disallowedTools Agent` |
| `haiku-nosub` | `overlays/baseline` | **`claude-haiku-4-5`** | （既定 high、下記 §3.2） | `--disallowedTools Agent` |
| `all-in` | **`overlays/few-turns`** | **`claude-haiku-4-5`** | （既定 high） | `--tools ...` + `--disallowedTools Agent` |

各アームが「名乗った軸ちょうど」であることは `bench/conditions.test.ts` の
`phase 12 lean arms` ブロックで、既存アームの spec と突き合わせて検証している。
`all-in` は他の三つの**厳密な合併**であり、第四の差分を含まない。

### 2.1 `few-turns` — CLAUDE.md は baseline の**バイト単位の拡張**

`overlays/few-turns/CLAUDE.md` は `overlays/baseline/CLAUDE.md` の全文が
そのまま先頭に来て、その後ろに `## Working economy` 節が 1 つ足されているだけである
（テストが `startsWith` で検証している）。追記した内容は次の 5 点で、
いずれも**手数の使い方**の話であり、解答フォーマット契約には一切触れていない。

- `Grep -n`（または `Glob`）で場所を特定してから読む。中身を見るためにファイルを開かない
- 行番号が分かったら `Read` の `offset` / `limit` で範囲だけ読む
- 互いに独立したツール呼び出しは 1 ターンにまとめて出す
- 一度読んだものを読み直さない
- 証拠が十分になった時点で答える

契約部分を 1 バイトでも書き換えれば、測っているものが「ターン数」から
「グレーダに渡す入力」に変わってしまう。それを防ぐのが上記のテストである。

### 2.2 `lean-tools` — なぜ `--tools` であって `--allowedTools` ではないのか

§3.1 で実測したとおり、リクエストからツール定義そのものを消すのは
`--tools`（組み込みセットを**置き換える**許可リスト）だけである。
`--allowedTools` は権限フィルタで、ツールはモデルに提示されたまま残る。
`Edit` を残したのは `fix` カテゴリがコーパスのテスト実行で採点されるからで、
Edit のないアームは構成上 0/9 になり、自分の設定ミスを測るだけになる。

`--disallowedTools Agent` は `--tools` の許可リストに `Agent` が無い時点で
冗長だが、`claude.argv` を見たときに `effort-low-nosub` からの系譜が読めるよう
残してある。

---

## 3. 機構の検証（本計測の前に実施）

### 3.1 `--tools` は本当にツール定義を消すのか

空ディレクトリ・1 語のプロンプト・`claude-haiku-4-5`・`--max-turns 1` で
`claude -p` を回し、**キャッシュ済みプレフィクス全体**
（`cache_creation_input_tokens` + `cache_read_input_tokens`）を比較した。
キャッシュが温まると同じ内容が creation から read へ移るので、
`cache_creation` 単独では比較にならない — これがこの検証の一番の落とし穴である。

| 呼び方 | プレフィクス合計 | creation | read |
|---|---|---|---|
| 既定（フラグなし） | 21,138 | 7,356 | 13,782 |
| `--disallowedTools Agent` | 18,235 | 6,766 | 11,469 |
| `--tools Read,Grep,Glob,Bash,Edit` | **18,854** | 4,746 | 14,108 |
| 同上（再実行） | 18,858 | 4,750 | 14,108 |
| `--tools Read` | 14,143 | 14,143 | 0 |
| `--tools ""` | **13,457** | 13,457 | 0 |

`--tools ""` の 13,457 が system prompt だけの床であり、ここまで落ちること自体が
「`--tools` はスキーマを実際に落としている」ことの証明である
（既定との差 7,681 トークンが組み込みツール定義の総量）。

**ただし、この実験にとって重要なのは 3 行目である。** 5 ツールに絞ると固定
プレフィクスは 18,854 で、`--disallowedTools Agent` だけの 18,235 より
**約 620 トークン大きい**。つまり `lean-tools` はこのホストにおいて
固定費レバーではない。`--tools` を渡すと deferred（名前だけ提示）だった
ツールも含めて指定分のスキーマが完全な形で載るためで、
既定セットが常に全ツールのフルスキーマを積んでいるわけではない、ということである。

したがって `lean-tools` の主張は「固定費が減る」ではなく
「**手数の選択肢が減ることで挙動が変わるか**」に置き換わる。
測る前に主張が変わったので、そのままそれを測った。

### 3.2 Haiku 4.5 は `--effort` を尊重するか — しない

`--effort` を付けてもエラーにはならないので、無視されているかどうかは
thinking トークンを見るしかない。同一プロンプト（`--tools ""`）で:

| model | `--effort` | thinking トークン |
|---|---|---|
| `claude-haiku-4-5` | low | 202 |
| `claude-haiku-4-5` | max | 172 |
| `claude-haiku-4-5` | （なし） | 690 |
| `claude-sonnet-5` | low | **0** |
| `claude-sonnet-5` | max | **192** |

Sonnet では low → max が 0 → 192 と単調に動くのに対し、Haiku では
low が max より**多い**。単調性がなく、フラグ無しが一番大きい。
公式ドキュメント（`model-config.md`）も Haiku を effort 対応モデルとして
挙げていない。**Haiku は `--effort` を尊重しない**と判定した。

その帰結として、Haiku 系 2 アームには `--effort` の override を**置かなかった**。
LEVERS.md §2.1 が書いているとおり、このリポジトリで唯一致命的な失敗モードは
「`run.meta.json` に、モデルに届かなかった treatment が記録されること」である。
`haiku-low-nosub` という名前は Director の指示にあったが、`low` が適用されない以上
その名前は嘘になるので、**`haiku-nosub` に改名した**。ハーネス既定（`high`）を
そのまま受けるのは `haiku-baseline` と同じで、この一致が
`haiku-nosub` − `haiku-baseline` を単一変数の比較にしている。

---

## 4. 計測

```
BENCH_RESULTS_DIR=results/lean pnpm bench:full -- \
  --tasks tasks/tasks.json,tasks/tasks-ext.json \
  --conditions lean-tools,few-turns,haiku-nosub,all-in \
  --reps 1 --concurrency 3 --corpus <corpus-v1 スナップショット>
```

`scripts/run-lean.sh` がこの呼び出しそのものである。`--reps 1`、concurrency 3、
`--max-turns 60`、`--max-budget-usd 4`。corpus は Phase 9–11 と同一の
docs を含まない corpus-v1 スナップショットで、`src` / `tests` が現在の
`corpus/taskflow` と `diff -rq` で完全一致することを再確認した。

---

## 5. 結果

（本節は計測完了後に埋める。）

---

## 6. 判定

（本節は計測完了後に埋める。）

---

## 7. ハーネス側の変更

- `LEAN_TOOLS` / `LEAN_TOOLS_ARGS` と 4 アーム（`bench/conditions.ts`）。
  §3.1 の実測値はコメントとしてそのまま残してある — 「`--tools` は固定費を
  下げる」という直感が**間違っている**ことは、次に読む人が最も踏みやすい罠だからである。
- `overlays/few-turns/`（`CLAUDE.md` は baseline の全文 + `## Working economy`）。
- `bench/report.ts` の `tokenDecompositionBlock` と `--token-decomposition` フラグ。
  `--model-mix` と同じくフラグの後ろに置いたので、Phase 11 までの 5 本のレポート
  (`combined` / `structural` / `docs` / `mempalace` / `levers`) は
  `REPORT.md`・`summary.csv` ともバイト単位で再生成される（確認済み）。
- `scripts/sanity-lean.py`（treatment が argv に届いたか、許可リスト外の
  `tool_use` が無いか、モデル、コスト整合、秘密情報スキャン）。
- `package.json` に `bench:analyze:lean` / `bench:report:lean`。
