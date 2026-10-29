# GPT-6.1 Sol: ultra, low / medium / high / xhigh

12 unchanged tasks × 2 repetitions × 4 efforts = 96 graded runs. Measured 2026-10-09〜2026-10-10, codex-cli 0.159.0, concurrency 3. Estimated base standard list-price total: $21.2704.

| effort | 正解 | 費用中央値/実行 | 費用/正解 | wall 中央値 | wall 平均 |
|---|---:|---:|---:|---:|---:|
| low | 20/24 (83.3%) | $0.1109 | $0.1245 | 59.5 s | 76.9 s |
| medium | 21/24 (87.5%) | $0.1546 | $0.1932 | 84.8 s | 100.1 s |
| high | 23/24 (95.8%) | $0.2244 | $0.2677 | 137.0 s | 197.1 s |
| xhigh | 23/24 (95.8%) | $0.3733 | $0.3725 | 247.8 s | 290.8 s |

今回の最多正解は high・xhigh の 23/24。各effortは12問を2回ずつ測った観測値で、差の確かさは12問を単位にした対応比較で判断する。

Reference models: matched low/medium/high/xhigh cells only, 96 runs per model. Runtime, limits and dates differ.

| モデル | 正解 | 費用中央値/実行 | 費用/正解 | wall 中央値 | wall 平均 | 測定日（JST） |
|---|---:|---:|---:|---:|---:|---:|
| GPT-6.1 Sol | 87/96 (90.6%) | $0.1655 | $0.2445 | 106.7 s | 166.2 s | 2026-10-09〜2026-10-10 |
| Opus 5.5 | 92/96 (95.8%) | $0.8904 | $1.2512 | 161.8 s | 203.5 s | 2026-09-28 |
| Sonnet 5 | 92/96 (95.8%) | $0.3936 | $0.6105 | 85.4 s | 137.1 s | 2026-09-28 |
| Sonnet 5.5 | 87/96 (90.6%) | $0.4089 | $0.6235 | 83.4 s | 132.8 s | 2026-09-29 |
| Haiku 5.5 | 88/96 (91.7%) | $0.1556 | $0.2471 | 207.1 s | 237.0 s | 2026-10-08 |
| GPT-6 Luna | 79/96 (82.3%) | $0.0164 | $0.0254 | 91.3 s | 117.6 s | 2026-10-08 |

Paired task means: average the two repetitions per task, bootstrap the 12 tasks (10,000 resamples, seed 7, percentile 95% CI). Positive accuracy favors the first arm; negative cost/time favors the first arm. Intervals touching/crossing zero do not establish a difference.

| 比較（先 − 後） | 正答率差 [95% CI] | 費用差 [95% CI] | wall 差 [95% CI] |
|---|---:|---:|---:|
| Sol · xhigh − Sol · high | +0.0 pt [-12.5, +12.5] | $+0.1005 [+0.0725, +0.1279] | +93.6 s [+47.1, +142.3] |
| Sol · xhigh − Sol · medium | +8.3 pt [+0.0, +20.8] | $+0.1879 [+0.1440, +0.2293] | +190.7 s [+123.5, +257.4] |
| Sol · xhigh − Sol · low | +12.5 pt [+0.0, +33.3] | $+0.2532 [+0.1929, +0.3148] | +213.9 s [+141.0, +285.2] |
| Sol · high − Sol · medium | +8.3 pt [+0.0, +25.0] | $+0.0875 [+0.0525, +0.1253] | +97.1 s [+44.2, +155.2] |
| Sol · high − Sol · low | +12.5 pt [-8.3, +37.5] | $+0.1527 [+0.1053, +0.2048] | +120.3 s [+62.1, +182.4] |
| Sol · medium − Sol · low | +4.2 pt [-12.5, +25.0] | $+0.0653 [+0.0428, +0.0916] | +23.2 s [+12.0, +35.0] |
| Sol · low − Opus 5.5 · low | -4.2 pt [-29.2, +20.8] | $-0.3955 [-0.4858, -0.3082] | -2.9 s [-13.8, +8.2] |
| Sol · low − Sonnet 5 · low | -12.5 pt [-37.5, +8.3] | $-0.1824 [-0.2347, -0.1340] | +16.3 s [+7.5, +26.0] |
| Sol · low − Sonnet 5.5 · low | -8.3 pt [-33.3, +16.7] | $-0.1794 [-0.2284, -0.1339] | +19.5 s [+8.1, +32.7] |
| Sol · low − Haiku 5.5 · low | -4.2 pt [-33.3, +25.0] | $+0.0401 [+0.0122, +0.0668] | -45.1 s [-63.2, -27.7] |
| Sol · low − GPT-6 Luna · low | +20.8 pt [-8.3, +50.0] | $+0.0834 [+0.0591, +0.1083] | -11.2 s [-34.5, +6.1] |
| Sol · medium − Opus 5.5 · medium | -8.3 pt [-25.0, +0.0] | $-0.7593 [-0.9767, -0.5527] | -47.1 s [-70.2, -27.6] |
| Sol · medium − Sonnet 5 · medium | -4.2 pt [-25.0, +12.5] | $-0.1556 [-0.2115, -0.1039] | +34.6 s [+18.8, +52.1] |
| Sol · medium − Sonnet 5.5 · medium | +4.2 pt [-20.8, +25.0] | $-0.1414 [-0.1862, -0.0998] | +28.9 s [+13.3, +44.1] |
| Sol · medium − Haiku 5.5 · medium | +0.0 pt [-20.8, +16.7] | $+0.0317 [-0.0165, +0.0750] | -72.6 s [-95.8, -49.7] |
| Sol · medium − GPT-6 Luna · medium | +4.2 pt [-25.0, +29.2] | $+0.1568 [+0.1159, +0.2060] | +37.8 s [+16.7, +62.0] |
| Sol · high − Opus 5.5 · high | -4.2 pt [-12.5, +0.0] | $-0.8986 [-1.1232, -0.6789] | -6.9 s [-46.3, +36.4] |
| Sol · high − Sonnet 5 · high | -4.2 pt [-12.5, +0.0] | $-0.2393 [-0.3183, -0.1624] | +71.0 s [+20.2, +122.9] |
| Sol · high − Sonnet 5.5 · high | +4.2 pt [+0.0, +12.5] | $-0.2313 [-0.3199, -0.1489] | +83.8 s [+34.9, +138.2] |
| Sol · high − Haiku 5.5 · high | +4.2 pt [+0.0, +12.5] | $+0.0407 [+0.0014, +0.0772] | -36.1 s [-78.4, +11.4] |
| Sol · high − GPT-6 Luna · high | +4.2 pt [-8.3, +16.7] | $+0.2381 [+0.1712, +0.3099] | +92.3 s [+35.1, +151.4] |
| Sol · xhigh − Opus 5.5 · xhigh | -4.2 pt [-12.5, +0.0] | $-1.8565 [-2.3127, -1.4405] | -92.4 s [-163.2, -20.6] |
| Sol · xhigh − Sonnet 5 · xhigh | +0.0 pt [-12.5, +12.5] | $-0.8766 [-1.2822, -0.5291] | -5.5 s [-60.7, +47.5] |
| Sol · xhigh − Sonnet 5.5 · xhigh | +0.0 pt [-12.5, +12.5] | $-0.8216 [-1.1850, -0.4954] | +1.4 s [-50.6, +56.5] |
| Sol · xhigh − Haiku 5.5 · xhigh | -4.2 pt [-12.5, +0.0] | $-0.1323 [-0.2551, -0.0263] | -129.3 s [-199.4, -56.0] |
| Sol · xhigh − GPT-6 Luna · xhigh | +4.2 pt [-8.3, +16.7] | $+0.3243 [+0.2496, +0.4003] | +75.5 s [+18.5, +138.1] |

| 問題 | low | medium | high | xhigh |
|---|---:|---:|---:|---:|
| UFX1-comment-delete-search | 2/2 | 2/2 | 2/2 | 2/2 |
| UFX2-attachment-storage | 2/2 | 1/2 | 1/2 | 2/2 |
| UFX3-issue-lifecycle-overdue | 2/2 | 2/2 | 2/2 | 2/2 |
| UFX4-search-ghosts | 2/2 | 2/2 | 2/2 | 2/2 |
| UFX5-sweep-starvation | 2/2 | 2/2 | 2/2 | 2/2 |
| UFX6-plan-drift | 0/2 | 2/2 | 2/2 | 2/2 |
| UIM1-issue-dependencies | 2/2 | 2/2 | 2/2 | 2/2 |
| UIM2-recurring-issues | 2/2 | 2/2 | 2/2 | 2/2 |
| UIM3-api-tokens | 2/2 | 2/2 | 2/2 | 2/2 |
| UIM4-workspace-time-zone | 2/2 | 2/2 | 2/2 | 2/2 |
| UIM5-project-muting | 2/2 | 2/2 | 2/2 | 2/2 |
| UIM6-issue-trash | 0/2 | 0/2 | 2/2 | 1/2 |

- 既存の超難問12問（fix 6・implement 6）を各2反復。問題・回答契約・バグパッチ・hidden test・採点基準は変更していない。hidden testはモデル終了後にインストールし、そのspec全体がexit 0なら正解。
- 毎回コードのみのcorpus-v1を複製。baselineの回答契約をAGENTS.mdとCLAUDE.mdに置いた。順序は問題・effort・反復を混ぜて固定。個人設定・Web検索・subagentは無効。
- Grokはultra xhighの既存測定が揃っていないため、4設定合計の参考比較には含めていない。
- 比較モデルの参考行は同じ12問×2反復×low/medium/high/xhighの96実行だけを集計し、CLI・ツール・システムプロンプト・委譲・並列度・測定日が異なるため、モデル単体の効果は分離できない。
- 同じeffort名はモデル間の同じ計算量・費用を意味しない。信頼区間はこの12問の再標本化によるもので、他のコードベースへの一般化を保証しない。多数の比較に対する補正は行っていない。
- Solは30分のwall上限。従来のClaudeの120モデルターン/$8上限はCodex exec JSONLでは同じ方法で強制できない。時間上限に達した実行は失敗として保持し、精度を理由にやり直さない。
- 費用は基本Standard単価（入力$2/M、キャッシュ入力$0.10/M、書き込み$2.50/M、出力$10/M）で推定し、採点・インフラ失敗試行を除外。サブスクの実請求額ではない。272K超の単一リクエストの割増は累積JSONL使用量から識別できず、この推定に含められない。reasoningを出力に二重加算しない。
- 時間は問題を解くCLI実行だけを計測し、コピー・採点を除外。API/モデルターン数は取得できないためnull。入力はキャッシュを含む累積量。費用が不明な時間切れは小計と不明件数を明示し、費用の対応比較から問題を選別しない。
- 測定日（Asia/Tokyo）: 2026-10-09〜2026-10-10。インフラ失敗は9試行をquarantineに保持。完了済み結果は保持し、利用枠回復後に未完了セルだけ再開する。日付・キャッシュの影響は分離していない。

Official pricing: https://developers.openai.com/api/docs/models/gpt-6.1-sol
Reproduce: BENCH_CORPUS_V1=<code-only snapshot> bash scripts/run-sol61-ultra.sh
