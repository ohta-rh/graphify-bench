# Phase 10: 実行時レバー（索引もツールも足さない条件）

計測日 2026-09-02 / Claude Code **2.1.258** / corpus `corpus-v1`（code-45） /
main model `claude-sonnet-5`。設計の根拠は
[`research-token-tools.md`](./research-token-tools.md) §3-A。

---

## 1. なぜこの条件を足したのか

Phase 2〜9 が測ってきたのは、すべて**エージェントに何かを与える**条件だった —
AST グラフ (`graphify`)、意味検索インデックス (`mempalace`)、それを強制する
hook (`*-strict`)。9 フェーズ・500 ラン後の結果は一貫している: Sonnet 5 の
コードタスクでは、与えたインデックスはどれもトークンを減らさなかった。

一方、このリポジトリで**実際にトークンを減らした唯一の条件**は道具ではなく設定
だった。`baseline-nosub`（`--disallowedTools Agent`）は baseline より 75k トークン・
$0.073 安く、精度は同等である。つまりこれまでの計測が示していたのは
「インデックスは効かない」であると同時に「**呼び出し方は効く**」でもあった。

Phase 10 はその後者だけを、インデックスを一切足さずに測る。
[`research-token-tools.md`](./research-token-tools.md) の格付けで 2 位・3 位に
入った二つのレバーが対象である。

| # | レバー | 主張の根拠 | 未知だったもの |
|---|---|---|---|
| 2 | `--effort medium` / `low` | 公式仕様（thinking トークンは出力課金） | 削減量ではなく**精度**。減ることは算術的に確実 |
| 3 | Explore サブエージェントを Haiku 固定 | ブログ 1 本、方法論薄い | 委譲の利点を残したままコストだけ削れるか |

「削減を主張するツール」ではなく「**削減が構造的に確実な設定**」を測るので、
問うべきは「減るか」ではなく「**何を代償に減るか**」である。

---

## 2. 条件設計

`bench/conditions.ts` に 3 アームを登録した。いずれも corpus は v1、
main model は `claude-sonnet-5`、比較対象は既存の `baseline` と
`baseline-nosub` である。

| condition | overlay | model | effort | CLI 差分 |
|---|---|---|---|---|
| `effort-medium` | `overlays/baseline` | `claude-sonnet-5` | **medium** | `--effort medium` |
| `effort-low` | `overlays/baseline` | `claude-sonnet-5` | **low** | `--effort low` |
| `haiku-explore` | `overlays/haiku-explore` | `claude-sonnet-5` | high | **なし** |

### 2.1 `effort-*` — overlay はバイト単位で baseline と同一

この二つは baseline の overlay をそのまま使う。したがって
**run ディレクトリを見ても baseline のランと区別がつかない** — 唯一の違いは
`claude -p` に渡した `--effort` だけである。これは黙って壊れうる設計なので、
`effectiveModel` と対になる `effectiveEffort` を足し、
`run.meta.json` の `env.effort` と `claude.argv` の両方に実際に渡した値が
残るようにした。「treatment が適用されなかった baseline の再計測」を
高い金を払って踏むのが、この arm の唯一かつ致命的な失敗モードである。

### 2.2 `haiku-explore` — CLAUDE.md は baseline とバイト単位で同一

overlay は baseline の `CLAUDE.md` をそのままコピーしたものに、
`.claude/agents/Explore.md` を 1 枚足しただけである。

```yaml
---
name: Explore
description: ...（組み込み Explore の説明文をそのまま）
tools: Read, Grep, Glob, Bash
model: haiku
---
```

指示文を 1 語も変えていないことが重要である。CLAUDE.md に
「探索は Haiku に委譲せよ」と書いてしまうと、測っているものが
「**誰が探索するか**」から「**何を指示したか**」に変わってしまう。
この arm の主張は前者に限られる。

`tools` を読み取り専用（+ `Bash`）に絞ったのも同じ理由で、Edit できる
探索エージェントは「誰が探索するか」ではなく「誰が作業するか」の実験になる。

---

## 3. 機構の検証（本計測の前に実施）

「プロジェクトの `.claude/agents/` は組み込みサブエージェントを上書きするか」は
仮定で進めてよい話ではないので、**ドキュメントと実測の両方**で確認した。

### 3.1 ドキュメント

[`sub-agents.md`](https://code.claude.com/docs/en/sub-agents.md) が明示している:

> A user or project subagent named `Explore` overrides the built-in and keeps its
> own `model` field, so define one with `model: haiku` to keep exploration on a
> lower-cost model.

優先順位は managed settings → `--agents` → `.claude/agents/`（プロジェクト）→
`~/.claude/agents/`（ユーザ）→ プラグインで、組み込み定義はこのすべての下にある。
なお `--bare` は `.claude/agents/` を読まないので、この機構は無効になる —
本ハーネスは `--bare` を使わない。

Claude Code 2.1.198 以降、組み込み Explore は **main model を継承する**
（もはや Haiku 既定ではない）。したがって上書きしない限り、
baseline の Explore は Sonnet で走る。

### 3.2 実測（scratchpad、`results/` の外、budget $0.3〜$0.6）

4 ランのスモークで、`result.json` の `modelUsage` を直接確認した。

| run | `subagent_stats.spawned` | haiku tokens | sonnet tokens |
|---|---|---|---|
| `XLOC1-retry-throttle` | 0 | 985 | 90k |
| `XIMP3-issue-status-union` | 0 | 1,005 | 330k |
| `EXP1-issue-create-flow` | **1** | **1.30M** | 276k |
| `XEXP6-overdue-sweep` | **2** | **1.59M** | 468k |

同時に、既存の `results/runs` の baseline 30 ラン**全部**に
`claude-haiku-4-5` が ~1,000 トークンで現れることも確認した。これは
Claude Code 自身の背景ヘルパー呼び出しであって委譲ではない。
つまり「modelUsage に haiku がいる」だけでは検証にならず、
**桁が 3 つ違うこと**が検証になる。委譲が起きたランでのみ Haiku が
100 万トークン規模を負担し、main session は `claude-sonnet-5` のままである
という対応が取れたので、機構は確認済みとした。

この「baseline にも haiku 行が出る」注記は `--model-mix` セクションの
本文にも書いてある。読者が同じ罠を踏むからである。

---

## 4. 計測

```
BENCH_RESULTS_DIR=results/levers pnpm bench:full -- \
  --tasks tasks/tasks.json,tasks/tasks-ext.json \
  --conditions effort-medium,effort-low,haiku-explore \
  --reps 1 --concurrency 3 --corpus <corpus-v1 スナップショット>
```

`--reps 1`、concurrency 3、`--max-turns 60`、`--max-budget-usd 4`。
他の計測セットと同一の設定である。

### 4.1 corpus-v1 の再現

比較対象の `baseline` / `baseline-nosub` は `results/runs`・`results/ext`・
`results/structural` にあり、いずれも **docs/ を含まないコーパス**で走っている。
`corpus/taskflow` は現在 corpus-v2 なので、Phase 9 と同じくリポジトリ外の
corpus-v1 スナップショットを `--corpus` で渡した。使用したスナップショットの
`src`/`tests` が現在の `corpus/taskflow/src`・`tests` と完全一致することを
`diff -rq` で確認済みで、`scripts/freeze-corpus.sh` の tree hash
`4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da`（477 ファイル）
も Phase 9 から動いていない。

---

## 5. 結果

| | |
|---|---|
| runs | **135 / 135** 成功（`subtype` は全ラン `success`） |
| harness エラー | **0** |
| 所要 | 57.9 分（concurrency 3） |
| API 実費 | **$28.68**（`total_cost_usd` と `modelUsage` の合計が小数以下まで一致） |

### 5.1 アーム別

`baseline` / `baseline-nosub` は既存の計測（`results/runs`・`results/ext`・
`results/structural`）の値で、再計測していない。

| arm | uncached_all 中央値 | cost 中央値 | turns | 委譲 | thinking 比 | 正答率 | wall 中央値 |
|---|---|---|---|---|---|---|---|
| `baseline` | 260,561 | $0.197 | 5.0 | 23/45 | 37.0% | **84.4%** (38/45) | 29.5 s |
| `baseline-nosub` | 230,081 | $0.134 | 8.0 | 0/45 | 38.7% | **84.4%** (38/45) | 33.5 s |
| `effort-medium` | 238,378 | $0.181 | 2.0 | 29/45 | **20.1%** | 80.0% (36/45) | **15.7 s** |
| `effort-low` | 189,614 | $0.132 | 4.0 | 23/45 | **15.8%** | 80.0% (36/45) | **16.2 s** |
| `haiku-explore` | 243,863 | $0.172 | 5.0 | 23/45 | 38.1% | 80.0% (36/45) | 19.6 s |

thinking 比が high 37% → medium 20% → low 16% と単調に落ちている。
これがレバーが実際に効いていることの一次証拠である
（`--effort` が無視されていれば動かないはずの数字）。

### 5.2 6 つの比較（対応のあるタスク平均差、95% ブートストラップ CI）

`uncached_equivalent_all` と `total_cost_usd`。iso は正答率を揃えた
36 タスク部分集合。

| 比較 | tokens | cost | 判定 |
|---|---|---|---|
| `effort-medium` − `baseline` | **−80,977 [−138,003, −31,125]** (−9.2%) | **−$0.049 [−0.082, −0.022]** | 両方とも削減、有意 |
| `effort-low` − `baseline` | **−133,338 [−192,247, −80,095]** (−24.9%) | **−$0.087 [−0.119, −0.059]** | 両方とも削減、有意 |
| `effort-medium` − `baseline-nosub` | −5,598 [−58,384, +42,688] | **+$0.023 [+0.002, +0.044]** | コストは**悪化** |
| `effort-low` − `baseline-nosub` | **−57,959 [−118,337, −4]** | −$0.014 [−0.036, +0.008] | トークンのみ僅かに有利 |
| `haiku-explore` − `baseline` | **+269,860 [+103,945, +465,792]** (+59%) | +$0.019 [−0.021, +0.064] | トークン**激増**、コストは横ばい |
| `haiku-explore` − `baseline-nosub` | **+345,239 [+178,886, +526,438]** (+101%) | **+$0.091 [+0.056, +0.132]** | 両方とも**悪化** |

iso 部分集合でも符号と有意性は全て同じで、削減幅はむしろ拡大する
（`effort-low` − `baseline` は iso で −156,036 [−226,500, −94,750]、−27.9%）。

### 5.3 精度の代償はどこに出たか

3 アームとも 36/45（80.0%）で、`baseline` の 38/45（84.4%）から 2 タスク落ちた。
落ちた場所はカテゴリ単位できれいに分かれている。

| arm | locate | reference | explain | impact | fix |
|---|---|---|---|---|---|
| `baseline` | **8/9** | 9/9 | 9/9 | 4/9 | 8/9 |
| `effort-medium` | 6/9 | 9/9 | 9/9 | 4/9 | 8/9 |
| `effort-low` | 6/9 | 9/9 | 9/9 | 4/9 | 8/9 |
| `haiku-explore` | 7/9 | 9/9 | **8/9** | 4/9 | 8/9 |

`effort-*` の損失は **`locate` に全部乗っている**。しかも二つのアームが落とした
のは同じ 2 タスク（`LOC3-digest-window`、`XLOC6-menu-entry-visibility`）で、
baseline が落とす 7 タスクはそのまま共有している。つまり effort を下げて壊れる
のは「広く探して漏れなく列挙する」タイプであって、推論の深さそのものではない。
`reference` / `explain` / `impact` / `fix` は effort high と完全に同じ成績である。

n=45・反復 1 回なので、2 タスクの差は CI を付ければゼロと区別できない。
「精度は落ちていない」とは言えないが、「精度が落ちた」とも言い切れない、が
正しい読み方である。

### 5.4 `haiku-explore`: 機構は動いた、しかし逆効果だった

委譲した 23 ランのうち、`by_type` が `Explore` だった **15 ラン**では
Haiku が 150k〜3.35M トークンを負担した。上書きは**外れなし**である。

一方、残る 8 ランは `general-purpose` エージェントを選んでおり、
そちらは Sonnet を継承したままだった（Haiku は例の ~1k のみ）。
**このレバーが覆うのは `Explore` だけで、モデルが汎用エージェントを選んだ場合は
何も起きない。** これは overlay の不備ではなく、レバーの適用範囲そのものである。

アーム全体では Haiku がトークンの **54.2%**（15.46M）、コストの **27.8%**（$3.39）
を負担した。それでもトークン総量は baseline より +59%、`baseline-nosub` より
+101% 増えている。理由は単純で、**Haiku の探索は Sonnet の探索より圧倒的に
非効率**だからである（1 ラン最大 3.35M トークン）。単価が安いのでコストは
baseline と横ばいまで戻るが、それ以上には下がらない。`baseline-nosub`
と比べれば +$0.091 で明確な悪化である。

`haiku-baseline`（main も Haiku）の 25.5M トークン・$6.13 と比べると、
「Haiku に探索だけ任せる」は「全部 Haiku にする」より確かにマシではある。
だが baseline より良くはならない。

---

## 6. 判定

**`--effort` は本物のレバーである。** `baseline` に対して medium で −9%、
low で −25% のトークン削減が、CI がゼロを跨がない形で出た。コストも同率で下がり、
実時間はほぼ半減する（29.5 s → 16 s）。thinking 比が 37% → 20% → 16% と
単調に動いていることが、削減が実際に thinking トークンの削減であることを裏付ける。
代償は `locate` に限定された 2 タスクで、この N では有意ではない。

**ただし、既知のレバーには勝てない。** `baseline-nosub`（サブエージェント禁止）を
基準に取ると `effort-medium` はコストが**悪化**し、`effort-low` でようやく
トークンで僅かに上回る程度である。Phase 8 で見つかった「サブエージェント禁止」が
依然としてこのリポジトリで最も強い単一レバーであり、`--effort` はそれと
同じ土俵で戦って負けている。

**`haiku-explore` は採用しない。** 機構は設計どおり動き（`Explore` 委譲の
15/15 で Haiku に乗った）、それでもトークンは baseline 比 +59%、
`baseline-nosub` 比 +101%、コストは `baseline-nosub` 比 +$0.091 で悪化した。
弱い探索者は安いが、安さを食い潰すほど非効率に探索する — これは Phase 6 の
`haiku-baseline` と同じ結論で、探索の一部だけを Haiku に移しても向きは変わらない。

**全体として、Phase 9 までの構図は変わらない。** Sonnet 5 のコードタスクで
効くのは「エージェントに何かを与えること」ではなく「エージェントの動きを
削ること」である。今回もその系列で、最も効いたのは最も何も足さない条件だった。
ただし `--effort` の削減は `baseline-nosub` と**独立ではない**（どちらも
探索・思考の総量を削る）ので、両方掛けたときに加算されるかは未計測である。
これが次に測る価値のある唯一の組み合わせだと考える。

---

## 7. ハーネス側の変更

- `ConditionSpec.effort` と `effectiveEffort()`（`bench/conditions.ts`）。
  `effectiveModel` と同型で、`run.meta.json` に実効値を残すためのもの。
- `RunRow.thinking_tokens` / `model_tokens` / `model_cost`、および
  `ConditionSummary.thinking_share` ほか（`bench/analyze.ts`）。
  thinking トークンは出力課金の**内数**なので、レポートには総量ではなく
  比率で出す。モデル別内訳は `modelUsage` 由来 —
  サブエージェントのトラフィックが見える唯一のフィールドである。
- `bench/report.ts` の `--model-mix` セクション。**フラグの後ろに置いた**ので、
  この arm が存在する前に書かれた 4 本のレポート
  (`combined` / `structural` / `docs` / `mempalace`) は
  `REPORT.md`・`summary.csv` ともバイト単位で再生成される（確認済み）。
- `package.json` に `bench:analyze:levers` / `bench:report:levers`。
