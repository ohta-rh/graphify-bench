# Phase 7: グラフ v2（コード + ドキュメント）・overlay v2・doc↔code タスクセット

計測日 2026-09-02 / graphifyy **0.9.53** / corpus `corpus-v2`（コード `corpus-v1` 凍結のまま + `docs/` 139 ファイル）。

[GRAPH.md](./GRAPH.md) がコードのみの v1 グラフの記録、本ファイルがドキュメント層を含む v2 の記録である。
コーパス側の記録は [DOCS-CORPUS.md](./DOCS-CORPUS.md)。

---

## 1. グラフ構築

v1 と同じく、追跡ファイルのみ（635 件、`node_modules` を含まない）のコピーをリポジトリ外の scratch に作って
実行した。`corpus/` は一切変更していない（`git status` clean）。

### 1.1 Step 2 — detect

```
Corpus: 632 files · ~427,692 words
  code:  493 files
  docs:  139 files
```

`total_files` が **500 を超えている**ので、SKILL.md Step 2 の分岐に従い skill は
「サブフォルダに絞るか」を利用者に問う警告を出す。本ビルドはヘッドレス（対話相手がいない）なので
**絞らずに全体を対象として続行**した。この判断は `GRAPH_REPORT.md` の Corpus Check セクションに
そのまま残っている（"Large corpus: 632 files · ~427,692 words ... Consider running on a subfolder."）。
コーパス全体を 1 つのグラフにするのがベンチの前提なので、分割は選択肢ではない。

検出は 0.2 秒。`skipped_sensitive` は 0 件。

### 1.2 Part A — コードの AST 抽出

```
AST: 2545 nodes, 11091 edges   (2.1 s, LLM 不使用・API コスト 0)
```

ノード数は v1 と一致する（2545）。エッジ 11091 は v1 の 10858 と差があるが、これは
0.9.53 の抽出キャッシュを新規に作り直したためで、コード自体は 1 バイトも動いていない。

### 1.3 Part B — ドキュメントの意味抽出（sonnet サブエージェント）

139 ファイルをディレクトリ単位でまとめて 7 チャンク（16〜24 ファイル）に分割し、
`references/extraction-spec.md` のプロンプトを**逐語**で渡した sonnet サブエージェントに
1 チャンクずつ割り当てた。`GEMINI_API_KEY` は未設定なので、skill の規定どおりホスト側の
サブエージェントが LLM を務めている。

抽出仕様に対して 1 点だけ**上乗せ**した指示がある。ドキュメントがバッククォートでコードパスを挙げている
箇所（`Implemented by:` / `Verified by:` / `Code:` / `Files:` の各フィールドと本文）については、
Part A が同じ root で生成済みの **AST ノード ID を宛先にした `implements` / `references` エッジを
必ず張ること**を明示した。doc↔code の横断エッジこそが v2 の存在理由なので、
「あれば張る」ではなく必須要件として渡している。

| チャンク | ファイル | nodes | edges | doc→code |
|---|---:|---:|---:|---:|
| 01 requirements + ルート直下 | 16 | 239 | 1764 | 687 |
| 02 design 前半 | 17 | 137 | 365 | 166 |
| 03 design 後半 | 17 | 125 | 352 | 199 |
| 04 adr | 23 | 23 | 277 | 181 |
| 05 api + db | 24 | 86 | 174 | 110 |
| 06a ops 前半 | 13 | 51 | 54 | 10 |
| 06b ops 後半 | 11 | 36 | 193 | — |
| 07 ui + test | 18 | 31 | 92 | 25 |

**チャンク 06 の扱い（正直に記録する）。** ops の 24 ファイルを担当したサブエージェントは
約 25 分経っても CHUNK_PATH に何も書かず、他の 6 チャンクが全て完了したあとも停滞した。
そこで 13 + 11 の 2 分割にして再ディスパッチし、前半（06a）は sonnet サブエージェントが完了、
後半（06b）は**ホストセッション自身が抽出を書いた**。06b のノード・エッジの中身
（どれを概念ノードとするか、`rationale` に何を書くか）はホストが著者であり、
スクリプトは ID 解決と JSON 直列化しかしていない。停滞したエージェントの遅延書き込みで
エッジが二重化しないよう、マージ側で `.graphify_chunk_06.json` を明示的に除外している。

06a の doc→code が 10 本と薄いのは手抜きではない。前半 13 ファイルがバッククォートで挙げている
実在コードパスはユニークで **7 本しかない**（`grep -oE` で確認）ので、これはほぼ上限である。
ops は runbook と postmortem が後半に集中しており、コード引用もそちらに偏っている。

### 1.4 意味抽出の結果

```
Extraction complete - 710 nodes, 3244 edges, 21 hyperedges
```

| 指標 | 値 |
|---|---|
| ノードを 1 つ以上生んだドキュメント | **139 / 139**（全ファイル） |
| `file_type` の内訳 | document 368 / rationale 268 / concept 63 / code 11 |
| リレーション上位 | `implements` 1643 / `references` 1556 / `shares_data_with` 21 / `semantically_similar_to` 19 |
| confidence | EXTRACTED 3195 / INFERRED 41 / AMBIGUOUS 8 |

`rationale` が 268 と多いのは、抽出仕様が「なぜその判断をしたか」を独立ノードではなく
概念ノードの属性として持たせよと指示しているため。ADR とポストモーテムが素直にこの形に落ちる。

### 1.5 Part C / Step 4 / Step 4.5

```
Merged:  3245 nodes, 14335 edges  (2545 AST + 710 semantic)
Graph:   3245 nodes, 13014 edges, 139 communities   (build 0.3 s / cluster 0.4 s / export+report 0.7 s = 1.3 s)
```

v1 との比較:

| | v1（コードのみ） | v2（コード + docs） |
|---|---:|---:|
| nodes | 2,545 | **3,245** |
| edges | 10,202 | **13,014** |
| communities | 120 | **139** |
| EXTRACTED / INFERRED / AMBIGUOUS | 100% / 0% / 0% | **99% / 1% / 0%** |
| INFERRED エッジ数 | 36（平均確信度 0.85） | **77（平均確信度 0.85）** |

**doc↔code の横断エッジは 1,429 本**、doc↔doc のエッジは 1,466 本がグラフに残っている
（どちらも端点が実在するものだけを数えた）。これが `tasks-docs.json` の設問がたどる経路である。

### 1.6 Graph health（Step 4.5）

`GRAPH HEALTH WARNING` が出た。内訳と評価:

| 指標 | 値 | 評価 |
|---|---:|---|
| `missing_endpoint_edges` | 0 | OK |
| `self_loop_edges` | 0 | OK |
| `dangling_endpoint_edges` | **816** | 内 **467 は AST 単体でも発生する**（`ref_react` / `ref_vitest` など外部モジュール参照に対応するノードを AST が作らない、0.9.53 の既存挙動。v1 も同じ）。残り **349 は意味抽出由来**（意味エッジ 3,244 本の 10.8%）で、サブエージェントがフルパス形式でない ID（`des_052`、`req_157` など）を宛先にした、あるいは他チャンクが実際には作らなかった DES ノードを指した分 |
| collapsed (directed / undirected) | 446 / 547 | 同一端点対に `imports_from` と `re_exports` が両方立つ AST の既存挙動。v1 と同種 |

つまり **v2 で新たに増えた不整合は「意味エッジの 10.8% が宛先を外している」の 1 点**で、
それ以外の警告は v1 から持ち越しの graphify 側の既知の性質である。グラフは使用可能だが、
この 349 本は張られたはずの doc↔doc リンクの取りこぼしなので、数字として記録しておく。

### 1.7 Step 5 — コミュニティ命名

`graphify label` は LLM バックエンドを要するので使わず、v1 と同じくホストが
`.graphify_analysis.json` の **139 コミュニティすべて**に 2〜5 語の名前を付け、
`report.generate` でレポートを再生成し、`export.to_json` で `graph.json` の各ノードに
`community_name` を焼き直した。

ドキュメントとコードが同じコミュニティに落ちているのが v2 の特徴で、命名にもそれが出る:

- `Permission Matrix and Role Rules` … `permissions.ts` + `ROLE_MATRIX` + REQ-020〜025 + 2 本の spec
- `Webhook Delivery and Retry Policy` … `webhook-delivery-job.ts` + `backoffMs()` + ADR-018 + REQ-156/157
- `Runbooks and Postmortems` … 4 件のインシデントと 2 件の議事録
- `Requirements Documentation Index` … 要求文書 12 本と索引

**ビルドルートのディレクトリ名がレポートに漏れる問題**を 1 件つぶしてある。`GRAPH_REPORT.md` の
見出しはスキャンルートのディレクトリ名（v1 は `taskflow`）なので、scratch を `gv2-build` の
まま使うと `# Graph Report - gv2-build` になり、エージェントの視界に v1 と違う文字列が入る。
ディレクトリを `taskflow` にリネームし、サイドカーの絶対パスを書き換えてから再ビルドした。
リネーム後もクラスタリング結果は完全に一致する（139 コミュニティのメンバーが `diff` で無差分）ので、
命名はやり直していない。

### 1.8 コスト

**この数字は実測ではなく比例推定である。** skill は「各 Agent 実行結果の `usage` フィールドから
実トークン数を読んでチャンク JSON に書き戻せ」と指示しているが、本セッションには
バックグラウンド実行したサブエージェントの `usage` が返ってきていない。そのため
input = (抽出プロンプト + そのチャンクのファイルのバイト数) / 4、
output = 出力チャンク JSON のバイト数 / 4 という **chars/4 の代理値**を書き込んである。

| | 値 |
|---|---:|
| input（代理） | ~491,521 tok |
| output（代理） | ~359,214 tok |
| sonnet 定価換算 | **~$6.86** |

構築の実時間は、AST 2.1 秒 + ビルド 1.3 秒 + レポート再生成が数秒。**支配的なのは意味抽出の待ち時間**で、
6 チャンクは 4〜9 分で終わったが、停滞したチャンク 06 の切り分けと再実行を含めて全体で約 35 分かかった。
v1 が LLM 不使用で 4.6 秒だったのと比べると、ドキュメント層を入れた瞬間に
「無料で数秒」から「有料で数十分」に変わる、というのが v2 の最大の性質である。

---

## 2. Sanity クエリ

overlay を当てた新品コーパスコピーで実測（`graphify query` / `graphify path`）。

**(1) doc ノードと code ノードが同時に返ること:**

```
$ graphify query "webhook retry policy requirement"
Graph: graphify-out/graph.json (3245 nodes) | BFS depth=2 | 494 nodes found
NODE Webhooks requirements               [src=docs/requirements/webhooks.md      community=Requirements Documentation Index]
NODE Webhook Delivery and Retry Runbook  [src=docs/ops/runbook-webhook-retries.md community=Webhook Endpoint Management]
NODE webhook-service.ts                  [src=src/server/services/webhook-service.ts loc=L1 community=Webhook Endpoint Management]
NODE webhook-delivery-job.ts             [src=src/server/jobs/webhook-delivery-job.ts loc=L1 community=Webhook Delivery and Retry Policy]
...
```

ドキュメント側とコード側が同じ結果に混在している。出力は 6,535 chars / 57 行 ≈ **1,634 トークン**で、
既定 budget 2000 の範囲に収まる（v1 の 6,474 chars とほぼ同じ）。

**(2) doc → code のパスが引けること:**

```
$ graphify path "REQ-157: A delivery is abandoned after a fixed attempt ceiling" "runWebhookDeliveryJob()"
Shortest path (1 hops):
  REQ-157: ... --implements [EXTRACTED]--> runWebhookDeliveryJob()

$ graphify path "Webhook Delivery Backlog Incident" "backoffMs()"
Shortest path (2 hops):
  Webhook Delivery Backlog Incident --references--> queue.ts --contains--> backoffMs()
```

要求からコードへ 1 ホップ、ポストモーテムからコードへ 2 ホップ。トレーサビリティが
グラフの構造として引ける状態になっている。

---

## 3. Overlay

### 3.1 `overlays/graphify-v2/`（フル）

合計 **6.4 MB / 21 ファイル**。指示面（`CLAUDE.md`、`.claude/CLAUDE.md`、`.claude/settings.json`、
`.claude/skills/graphify/**`）は `overlays/graphify/` と**バイト一致**にしてある。
プロンプト面とグラフを同時に動かすと、v1 と v2 の差をグラフに帰属できなくなるため。

| ファイル | v1 | v2 |
|---|---:|---:|
| `graphify-out/graph.json` | 4,824,780 | **6,206,327** |
| `graphify-out/.graphify_analysis.json` | 139,361 | 178,266 |
| `graphify-out/manifest.json` | 90,202 | 135,931 |
| `graphify-out/GRAPH_REPORT.md` | 25,863 | 51,267 |
| `graphify-out/.graphify_labels.json` | 4,055 | 4,804 |

`graph.json` は 6.2 MB で、**15 MB のしきい値には届いていない**。ただし約 155 万トークン相当なので、
v1 と同じく 200K のコンテキストには読み切れない。`collect.ts` の `read_graph_json` フラグで
部分読みによる浪費を検出する体制は据え置き。

`memory/`、`reflections/`、`graph.html`、`cache/`、`.vocab.txt` は v1 同様**含めていない**
（architecture.md §8 のセッション間学習リーク対策）。scratch のディレクトリ名が成果物に
残っていないことを `grep` で確認済み（`graph.json` / `manifest.json` / `.graphify_analysis.json`
いずれも 0 件）。

### 3.2 `overlays/graphify-strict-v2/`（デルタ）

**12 KB / 3 ファイル**。`graphify install --project --strict` が書く設定との差は
実行ファイルの絶対パス化のみ（差分は `--strict` フラグが `Read|Glob` フックに付く 1 行）。

デルタ overlay の仕組みは本フェーズで新設した。`overlays/<condition>/.overlay-base` に
土台にする overlay 名を 1 行書くと、`bench/lib/copy.ts#resolveOverlayChain` が
「土台 → デルタ」の順に展開し、`run.ts` がその順で適用する（衝突時はデルタが勝つ）。
`.overlay-base` 自体は適用時に除かれるのでエージェントには届かない。

これを入れた理由は単純で、フック 1 行のために 6.2 MB の `graph.json` をもう 1 部持ちたくないから。
**土台が無い・循環しているは即エラー**にしてある。「strict のつもりが土台の nudge 設定で
計測されていた」という静かな劣化が、この仕組みが防ごうとしている唯一の障害だからである。

### 3.3 条件レジストリ `bench/conditions.ts`

条件は overlay ディレクトリ名だが、それだけだと `--conditions grahpify-v2` のような打ち間違いが
「ディレクトリが無い」で落ちるまで分からない。4 条件（`baseline` / `graphify` / `graphify-v2` /
`graphify-strict-v2`）を意味・対象コーパス世代・土台つきで宣言し、`matrix.ts` が
`--conditions` を照合するようにした。宣言した `base` と実際の `.overlay-base` が食い違えば
テストが落ちる（レジストリが実態と乖離した説明書になるくらいなら、無い方がましなので）。

`scripts/patch-overlay.ts` は `overlays/*` を走査して**すべての** overlay の設定ファイルの
実行ファイルパスを書き換えるようにした。デルタ overlay は設定ファイルしか持たないので、
まさに書き換え漏れが起きやすい対象である。`--check` は clean。

---

## 4. タスクセット `tasks/tasks-docs.json`

20 問、5 カテゴリ × 4 問。`fix` を落として `discrepancy` を入れてある。
設計意図と鍵の作り方は [tasks/README.md](../../tasks/README.md) に詳しい。

| id | cat | grader | key | 備考 |
|---|---|---|---:|---|
| `DLOC1-issue-number-scope` | locate | set-f1 | 1 | DB 辞書側が誤記（仕込み D12）なので grep 最短ヒットは罠 |
| `DLOC2-webhook-retry-decision` | locate | set-f1 | 1 | 決定した文書と引用した文書の区別 |
| `DLOC3-subscriber-isolation` | locate | set-f1 | 1 | 仕組みを規定した 1 要素だけ |
| `DLOC4-webhook-delivery-history-screen` | locate | set-f1 | 1 | 唯一 ID 定義に依らない locate（画面仕様） |
| `DREF1-webhook-service-requirements` | reference | set-f1 | 2 | `Implemented by` の主張のみ。言及 8 文書から 2 本 |
| `DREF2-digest-cadence-adrs` | reference | set-f1 | 2 | 設計→`Decided in`→ADR の 2 ホップ |
| `DREF3-permission-matrix-verified-by` | reference | set-f1 | 8 | `Verified by` の主張のみ |
| `DREF4-adr017-references` | reference | set-f1 | 9 | **grep 自明の対照**（ID リテラル） |
| `DEXP1-webhook-attempt-ceiling-chain` | explain | llm-judge | 5 要素 | 鎖の末端が仕込み D08 で切れている |
| `DEXP2-flags-screen-permission-chain` | explain | llm-judge | 5 要素 | 画面仕様の最低ロールが D11 で誤り |
| `DEXP3-digest-cadence-chain` | explain | llm-judge | 5 要素 | cadence と per-org 時刻の混同（D02） |
| `DEXP4-issue-number-allocation-chain` | explain | llm-judge | 5 要素 | 文書間矛盾（D12）をスキーマ側で解決できるか |
| `DIMP1-error-code-union` | impact | set-f1 | 15 | doc 7 + code 8 |
| `DIMP2-job-cadence-table` | impact | set-f1 | 7 | doc 6 + code 1（ドキュメント偏重） |
| `DIMP3-notification-kind-union` | impact | set-f1 | 6 | doc 1 + code 5（コード偏重、DIMP2 の鏡像） |
| `DIMP4-req157-renumber` | impact | set-f1 | 9 | **grep 自明の対照**（ID リテラル）。doc only |
| `DDIS1-permissions-and-role-gates` | discrepancy | set-f1 | 3 | D01 / D07 / D11 |
| `DDIS2-time-and-retry-constants` | discrepancy | set-f1 | 3 | D02 / D08 / D09 |
| `DDIS3-schema-indexes` | discrepancy | set-f1 | 2 | D03 / D12 |
| `DDIS4-quotas-flags-and-rate-limits` | discrepancy | set-f1 | 4 | D04 / D05 / D06 / D10 |

4 つの discrepancy ドメインで**仕込み 12 件すべてを重複なく網羅**している（テストで検証）。
閾値は 0.6。3 件中 2 件を見つけたら F1 は 0.8 で成功、1 件なら 0.5 で不成功、という刻みになる。
0.9 だとこのカテゴリはほぼ一律ゼロになり、何も測れない。

`grade.ts` は**一行も変えていない**。`discrepancy` は新しいカテゴリであって新しい採点器ではなく、
`set-f1` でドキュメントパスを採点する。`tasks.schema.ts` の `CategorySchema` と
`bench/tasks.test.ts` だけを拡張した。

### 鍵の機械化

`scripts/derive-keys.ts` に doc 系 5 種 + 合成 1 種を足した。適用する規約は
`scripts/check-docs-corpus.ts` が検証しているものと同一（見出し先頭の ID が定義、
バッククォート付き `src/`・`tests/`・`scripts/` パスがコード引用）なので、
鍵と `pnpm docs:check` が食い違うことは構造的に起きない。

**doc 側の除外規則: `docs/traceability.md`・`docs/glossary.md`・全 `index.md` は鍵に入れない。**
`traceability.md` は他文書のメタデータから**生成**されたもので、索引類ともどもコーパス中の
ほぼ全 ID・全パスを引用している。入れると設問に関係なく毎回同じ 3〜4 ファイルが答えに現れる。
コード側の `tests/**` 除外と同じ性格の規則である。

discrepancy の鍵は `tasks/keys/docs-discrepancies.json` の**射影**であって、
ドキュメントを読み直した結果ではない。正解は矛盾を仕込んだ時点で固定されているので、
後から読んだ人が気づいた範囲に鍵が引きずられることがない。

`pnpm keys:derive --check` は旧 18 件 + 新 16 件 = **34 件すべてを無差分で再現**する。

---

## 5. 検証

| ゲート | 結果 |
|---|---|
| `pnpm keys:derive --check` | **PASS**（34 鍵すべて無差分） |
| `pnpm test` | **PASS** |
| `pnpm typecheck` | **PASS** |
| `pnpm docs:check` | **PASS**（139 files / 261,709 words / 未定義 ID 0 / 不在パス 0） |
| `pnpm exec tsx scripts/patch-overlay.ts --check` | **PASS**（3 overlay とも一致） |

`bench/tasks.test.ts` に足した doc セット向けの検査:
20 問 / カテゴリ 4 問ずつ / 3 ファイル横断で ID 一意（65 問）/ 鍵ファイル実在・整列・重複なし /
locate・discrepancy・explain のプロンプトに**パスも ID も混入していない**（末尾の回答形式行は
`CLAUDE.md` を名指しするので本文のみ検査）/ 集約文書が鍵に入っていない /
impact の鍵が doc と code の両方を含む（対照 1 問を除く）/ discrepancy 閾値が 0.6 /
仕込み 12 件の網羅と重複なし。

`bench/conditions.test.ts` は、レジストリと `overlays/` の実態一致、デルタ展開の順序、
土台欠落・循環・パス指定のエラー、そしてデルタ適用時に土台のファイルを継承しつつ
衝突ファイルはデルタが勝ち `.overlay-base` は届かないことを検査する。

採点器の空撃ちも tasks.test.ts に入れてある: discrepancy の満点 1.0、3 件中 2 件で 0.8（成功）、
1 件で 0.5（不成功）、矛盾している**コード**ファイルを答えると 0、`ANSWER:` 無しで 0。
ドキュメントパスの正規化がソースパスと同じに効くことも確認している。

### 5.1 haiku スモークラン 1 本

`DDIS3-schema-indexes` を `graphify-v2` で 1 本だけ回した。
`BENCH_MODEL=claude-haiku-4-5`、`BENCH_MAX_TURNS=14`、`BENCH_MAX_BUDGET_USD=0.3`、
結果はリポジトリ外（`BENCH_RESULTS_DIR`）。**支出 $0.197 / 76.9 秒 / 15 turns。**

目的は overlay v2 が実際に適用されること、および `graphify query` が doc ノードを返すことの確認で、
正答性ではない（14 turns の上限は安く済ませるための意図的な設定）。

| 確認項目 | 結果 |
|---|---|
| overlay v2 が適用された | **YES** — `overlay_chain` に `overlays/graphify-v2` 1 件、`overlay_files` 20 件 |
| hook の nudge が transcript に出た | **YES** — 24 回 |
| `graphify query` が実行された | **YES** — 2 回（`"database dictionary indexes schema"` / `"index columns table"`） |
| **query 結果に doc ノードが含まれた** | **YES** — ツール結果中に `src=docs/...` 行が 16 本 |
| `graph.json` の直読み | **なし**（`read_graph_json: false`, 0 events） |
| `permission_denials` | 0 |
| サブエージェント起動 | 0 |

`terminal_reason` は `max_turns`（`error_max_turns`）で、**最終回答には到達していない**ので
このランに採点結果は無い。v1 の hook 実証（GRAPH.md §4.2）と同じ性格のランである。

---

## 6. 引き継ぎ

- 本フェーズでは **sonnet の本計測ランは実行していない**（Director が別マトリクス完了後に着手する）。
  実施したのは haiku 1 本のスモークのみ。
- 意味抽出の 349 本の宙ぶらりんエッジは、次に overlay を作り直すなら潰す価値がある。
  原因はサブエージェントが宛先 ID をフルパス形式で組み立てそこねる点に集中しているので、
  抽出プロンプトに「宛先 ID は必ず定義元ファイルのフルパス由来で組むこと」を明示するのが
  最小の対策になる。
- チャンク 06 の停滞は再現性が不明である。ops のような散文中心・引用の薄いチャンクで
  サブエージェントが長考する傾向があるのかもしれない。次に回すときは最初から
  12 ファイル前後に割ってよい。
