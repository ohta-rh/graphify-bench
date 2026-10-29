# GPT-6.1 Sol: brownfield, low / medium / high / xhigh

6 unchanged tasks × 2 repetitions × 4 efforts = 48 graded runs. Measured 2026-10-10〜2026-10-14, codex-cli 0.159.0, concurrency 3. Estimated base standard list-price amount: $11.0096（使用量不明の実行を除いた小計）.

| effort | 正解 | 費用中央値/実行 | 費用/正解 | wall 中央値 | wall 平均 |
|---|---:|---:|---:|---:|---:|
| low | 8/12 (66.7%) | $0.1491 | N/A | 102.1 s | 1003.6 s |
| medium | 6/12 (50.0%) | $0.2038 | N/A | 127.7 s | 1111.7 s |
| high | 6/12 (50.0%) | $0.3062 | N/A | 261.0 s | 1244.0 s |
| xhigh | 8/12 (66.7%) | $0.4072 | $0.6184 | 492.8 s | 488.2 s |

今回の最多正解は low・xhigh の 8/12。各effortは6問を2回ずつ測った観測値で、差の確かさは6問を単位にした対応比較で判断する。

Reference models: matched low/medium/high/xhigh cells only, 48 runs per model. Runtime, limits and dates differ.

| モデル | 正解 | 費用中央値/実行 | 費用/正解 | wall 中央値 | wall 平均 | 測定日（JST） |
|---|---:|---:|---:|---:|---:|---:|
| GPT-6.1 Sol | 28/48 (58.3%) | $0.2892 | N/A | 272.2 s | 961.9 s | 2026-10-10〜2026-10-14 |
| Opus 5.5 | 37/48 (77.1%) | $1.1629 | $1.7309 | 192.5 s | 233.9 s | 2026-10-09 |
| Sonnet 5 | 17/48 (35.4%) | $1.9880 | $6.1485 | 579.3 s | 637.4 s | 2026-10-09 |
| Sonnet 5.5 | 29/48 (60.4%) | $0.4290 | $1.0749 | 115.8 s | 168.6 s | 2026-10-09 |
| Haiku 5.5 | 38/48 (79.2%) | $0.1989 | $0.3422 | 221.8 s | 268.1 s | 2026-10-09 |
| GPT-6 Luna | 15/48 (31.2%) | $0.0189 | N/A | 147.2 s | 824.9 s | 2026-10-10 |

Paired task means: average the two repetitions per task, bootstrap the 6 tasks (10,000 resamples, seed 7, percentile 95% CI). Positive accuracy favors the first arm; negative cost/time favors the first arm. Intervals touching/crossing zero do not establish a difference.

| 比較（先 − 後） | 正答率差 [95% CI] | 費用差 [95% CI] | wall 差 [95% CI] |
|---|---:|---:|---:|
| Sol · xhigh − Sol · high | +16.7 pt [+0.0, +50.0] | N/A | -755.8 s [-1968.2, +261.8] |
| Sol · xhigh − Sol · medium | +16.7 pt [+0.0, +33.3] | N/A | -623.5 s [-1320.6, +53.7] |
| Sol · xhigh − Sol · low | +0.0 pt [-25.0, +25.0] | N/A | -515.4 s [-1252.4, +199.5] |
| Sol · high − Sol · medium | +0.0 pt [-41.7, +33.3] | N/A | +132.3 s [-1193.2, +1709.1] |
| Sol · high − Sol · low | -16.7 pt [-33.3, +0.0] | N/A | +240.4 s [-261.5, +838.9] |
| Sol · medium − Sol · low | -16.7 pt [-41.7, +16.7] | N/A | +108.1 s [-1044.0, +1260.2] |
| Sol · low − Opus 5.5 · low | -16.7 pt [-33.3, +0.0] | N/A | +916.8 s [+177.9, +1680.7] |
| Sol · low − Sonnet 5 · low | +50.0 pt [+0.0, +91.7] | N/A | +625.2 s [-49.6, +1363.5] |
| Sol · low − Sonnet 5.5 · low | +25.0 pt [+8.3, +41.7] | N/A | +932.3 s [+199.4, +1695.5] |
| Sol · low − Haiku 5.5 · low | -8.3 pt [-33.3, +16.7] | N/A | +871.4 s [+147.9, +1630.7] |
| Sol · low − GPT-6 Luna · low | +66.7 pt [+33.3, +91.7] | N/A | +352.9 s [-459.9, +1276.8] |
| Sol · medium − Opus 5.5 · medium | -33.3 pt [-66.7, -8.3] | N/A | +942.5 s [+271.0, +1647.1] |
| Sol · medium − Sonnet 5 · medium | +25.0 pt [-8.3, +66.7] | N/A | +604.7 s [+2.2, +1210.9] |
| Sol · medium − Sonnet 5.5 · medium | -8.3 pt [-25.0, +0.0] | N/A | +1027.4 s [+341.2, +1766.1] |
| Sol · medium − Haiku 5.5 · medium | -25.0 pt [-41.7, -8.3] | N/A | +914.2 s [+219.4, +1649.3] |
| Sol · medium − GPT-6 Luna · medium | +16.7 pt [+0.0, +33.3] | N/A | +666.1 s [-12.9, +1416.6] |
| Sol · high − Opus 5.5 · high | -16.7 pt [-50.0, +0.0] | N/A | +1007.9 s [-8.8, +2251.1] |
| Sol · high − Sonnet 5 · high | -8.3 pt [-50.0, +33.3] | N/A | +496.8 s [-578.1, +1801.3] |
| Sol · high − Sonnet 5.5 · high | -16.7 pt [-58.3, +16.7] | N/A | +1084.2 s [+77.8, +2316.6] |
| Sol · high − Haiku 5.5 · high | -41.7 pt [-75.0, -8.3] | N/A | +973.0 s [-38.5, +2217.3] |
| Sol · high − GPT-6 Luna · high | +0.0 pt [-25.0, +25.0] | N/A | +536.5 s [+89.8, +1081.8] |
| Sol · xhigh − Opus 5.5 · xhigh | -8.3 pt [-25.0, +0.0] | $-2.0387 [-2.3177, -1.7486] | +44.8 s [+9.3, +75.8] |
| Sol · xhigh − Sonnet 5 · xhigh | +25.0 pt [-16.7, +66.7] | $-2.7332 [-3.5165, -2.1282] | -429.0 s [-609.2, -261.4] |
| Sol · xhigh − Sonnet 5.5 · xhigh | -8.3 pt [-25.0, +0.0] | $-0.9242 [-1.1026, -0.7577] | +129.1 s [+72.3, +187.8] |
| Sol · xhigh − Haiku 5.5 · xhigh | -8.3 pt [-25.0, +0.0] | $-0.2084 [-0.3535, -0.0598] | +16.5 s [-65.1, +100.3] |
| Sol · xhigh − GPT-6 Luna · xhigh | +25.0 pt [+8.3, +41.7] | N/A | -1007.5 s [-1700.9, -307.8] |

| 問題 | low | medium | high | xhigh |
|---|---:|---:|---:|---:|
| BFX1-search-queries | 1/2 | 2/2 | 0/2 | 2/2 |
| BFX2-issue-filters | 1/2 | 0/2 | 0/2 | 0/2 |
| BFX3-sign-up | 2/2 | 1/2 | 2/2 | 2/2 |
| BIM1-issue-relocation | 2/2 | 2/2 | 2/2 | 2/2 |
| BIM2-workspace-slug | 2/2 | 1/2 | 2/2 | 2/2 |
| BIM3-project-cloning | 0/2 | 0/2 | 0/2 | 0/2 |

- 既存のbrownfield6問（fix 3・implement 3）を各2反復。問題・回答契約・バグパッチ・hidden test・採点基準は変更していない。hidden testはモデル終了後にインストールし、そのspec全体がexit 0なら正解。
- brownfieldの既存low/medium/high 36実行は元の日時・採点を保持して再利用。元の入力ハッシュは未保存であり、新測定と時期が異なる。apexは全48実行が今回の新測定。
- 毎回コードのみのcorpus-v1を複製。baselineの回答契約をAGENTS.mdとCLAUDE.mdに置いた。順序は問題・effort・反復を混ぜて固定。個人設定・Web検索・subagentは無効。
- 4設定すべてが揃ったモデルだけを参考比較に含める。未測定の設定をゼロ点として補完しない。
- 比較モデルの参考行は同じ6問×2反復×low/medium/high/xhighの48実行だけを集計し、CLI・ツール・システムプロンプト・委譲・並列度・測定日が異なるため、モデル単体の効果は分離できない。
- 同じeffort名はモデル間の同じ計算量・費用を意味しない。信頼区間はこの6問の再標本化によるもので、他のコードベースへの一般化を保証しない。多数の比較に対する補正は行っていない。
- Solは30分のwall上限。従来のClaudeの160モデルターン/$12上限はCodex exec JSONLでは同じ方法で強制できない。時間上限に達した実行は失敗として保持し、精度を理由にやり直さない。
- 費用は基本Standard単価（入力$2/M、キャッシュ入力$0.10/M、書き込み$2.50/M、出力$10/M）で推定し、採点・インフラ失敗試行を除外。サブスクの実請求額ではない。272K超の単一リクエストの割増は累積JSONL使用量から識別できず、この推定に含められない。reasoningを出力に二重加算しない。
- 時間は問題を解くCLI実行だけを計測し、コピー・採点を除外。API/モデルターン数は取得できないためnull。入力はキャッシュを含む累積量。費用が不明な時間切れは小計と不明件数を明示し、費用の対応比較から問題を選別しない。
- 測定日（Asia/Tokyo）: 2026-10-10〜2026-10-14。インフラ失敗は7試行をquarantineに保持。完了済み結果は保持し、利用枠回復後に未完了セルだけ再開する。日付・キャッシュの影響は分離していない。
- 時間切れ9実行は失敗として保持。観測wallは32.4〜84.2分。30分の設定を超えた終了遅延があり、原因は未確定。時間制御・実行環境の影響が含まれるため、この合計をモデル単体の正答能力に帰属させない。
- 費用不明は9実行。表示額$11.0096（使用量不明の実行を除いた小計）は既知分の小計で総費用ではない。費用中央値も使用量が得られた実行のみから算出。

Official pricing: https://developers.openai.com/api/docs/models/gpt-6.1-sol
Reproduce: BENCH_CORPUS_V1=<code-only snapshot> bash scripts/run-sol61-additional.sh
