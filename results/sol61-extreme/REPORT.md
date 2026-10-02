# GPT-6.1 Sol: extreme, low / medium / high

12 unchanged tasks × 2 repetitions × 3 efforts = 72 graded runs. Measured 2026-10-01〜2026-10-02, codex-cli 0.159.0, concurrency 3. Estimated base standard list-price total: $18.3684.

| effort | 正解 | 費用中央値/実行 | 費用/正解 | wall 中央値 | wall 平均 |
|---|---:|---:|---:|---:|---:|
| low | 18/24 (75.0%) | $0.1715 | $0.2139 | 132.7 s | 153.8 s |
| medium | 19/24 (79.2%) | $0.2409 | $0.3030 | 273.3 s | 256.7 s |
| high | 21/24 (87.5%) | $0.3851 | $0.4172 | 466.0 s | 424.2 s |

今回の最多正解は high の 21/24。各effortは12問を2回ずつ測った観測値で、差の確かさは12問を単位にした対応比較で判断する。

Claude reference: matched low/medium/high cells only, 72 runs per model. Runtime, limits and dates differ.

| モデル | 正解 | 費用中央値/実行 | 費用/正解 | wall 中央値 | wall 平均 |
|---|---:|---:|---:|---:|---:|
| GPT-6.1 Sol | 58/72 (80.6%) | $0.2310 | $0.3167 | 256.0 s | 278.2 s |
| Opus 5.5 | 67/72 (93.1%) | $0.9987 | $1.1798 | 146.4 s | 163.0 s |
| Sonnet 5 | 51/72 (70.8%) | $2.1779 | $3.0706 | 476.5 s | 523.5 s |
| Sonnet 5.5 | 65/72 (90.3%) | $0.4398 | $0.5200 | 91.7 s | 97.6 s |

Paired task means: average the two repetitions per task, bootstrap the 12 tasks (10,000 resamples, seed 7, percentile 95% CI). Positive accuracy favors the first arm; negative cost/time favors the first arm. Intervals touching/crossing zero do not establish a difference.

| 比較（先 − 後） | 正答率差 [95% CI] | 費用差 [95% CI] | wall 差 [95% CI] |
|---|---:|---:|---:|
| Sol · high − Sol · medium | +8.3 pt [+0.0, +20.8] | $+0.1251 [+0.0935, +0.1580] | +167.5 s [+127.6, +210.0] |
| Sol · high − Sol · low | +12.5 pt [+0.0, +33.3] | $+0.2047 [+0.1701, +0.2355] | +270.4 s [+225.7, +312.8] |
| Sol · medium − Sol · low | +4.2 pt [+0.0, +12.5] | $+0.0795 [+0.0584, +0.1035] | +102.9 s [+74.9, +133.4] |
| Sol · low − Opus 5.5 · low | -20.8 pt [-45.8, +0.0] | $-0.4635 [-0.5476, -0.3837] | +64.3 s [+35.7, +96.0] |
| Sol · low − Sonnet 5 · low | +0.0 pt [-25.0, +25.0] | $-1.5073 [-1.7689, -1.2237] | -260.5 s [-309.7, -210.6] |
| Sol · low − Sonnet 5.5 · low | -8.3 pt [-20.8, +0.0] | $-0.1988 [-0.2485, -0.1452] | +77.8 s [+52.3, +107.5] |
| Sol · medium − Opus 5.5 · medium | -12.5 pt [-41.7, +16.7] | $-0.8857 [-1.0212, -0.7472] | +90.3 s [+55.4, +125.5] |
| Sol · medium − Sonnet 5 · medium | +12.5 pt [-16.7, +37.5] | $-2.0248 [-2.4442, -1.5883] | -300.4 s [-382.9, -224.2] |
| Sol · medium − Sonnet 5.5 · medium | -12.5 pt [-37.5, +8.3] | $-0.1949 [-0.2412, -0.1482] | +168.0 s [+124.4, +209.1] |
| Sol · high − Opus 5.5 · high | -4.2 pt [-29.2, +20.8] | $-1.1789 [-1.3964, -0.9525] | +191.1 s [+133.7, +255.1] |
| Sol · high − Sonnet 5 · high | +16.7 pt [-4.2, +37.5] | $-2.2277 [-2.6102, -1.8066] | -174.9 s [-251.4, -91.9] |
| Sol · high − Sonnet 5.5 · high | -8.3 pt [-29.2, +8.3] | $-0.2494 [-0.3443, -0.1563] | +296.2 s [+245.2, +349.0] |

| 問題 | low | medium | high |
|---|---:|---:|---:|
| EFX1-membership-lifecycle | 2/2 | 2/2 | 2/2 |
| EFX2-audit-trail | 0/2 | 1/2 | 2/2 |
| EFX3-signing-in-and-out | 2/2 | 2/2 | 2/2 |
| EFX4-former-members | 2/2 | 2/2 | 2/2 |
| EFX5-closed-workspace | 0/2 | 0/2 | 0/2 |
| EFX6-foreign-references | 2/2 | 2/2 | 2/2 |
| EIM1-ownership-handover | 2/2 | 2/2 | 2/2 |
| EIM2-issue-import | 0/2 | 0/2 | 1/2 |
| EIM3-out-of-office | 2/2 | 2/2 | 2/2 |
| EIM4-member-suspension | 2/2 | 2/2 | 2/2 |
| EIM5-workspace-lock | 2/2 | 2/2 | 2/2 |
| EIM6-workspace-deletion | 2/2 | 2/2 | 2/2 |

- 既存の極難問12問（fix 6・implement 6）を各2反復。問題・回答契約・バグパッチ・hidden test・採点基準は変更していない。hidden testはモデル終了後にインストールし、そのspec全体がexit 0なら正解。
- 毎回コードのみのcorpus-v1を複製。baselineの回答契約をAGENTS.mdとCLAUDE.mdに置いた。順序は問題・effort・反復を混ぜて固定。個人設定・Web検索・subagentは無効。
- Claudeの参考行は同じ12問×2反復×low/medium/highの72実行だけを集計し、xhighを除外。CLI・ツール・システムプロンプト・委譲・並列度・測定日が異なるため、モデル単体の効果は分離できない。
- Solは30分のwall上限。従来のClaudeの120モデルターン/$8上限はCodex exec JSONLでは同じ方法で強制できない。時間上限に達した実行は失敗として保持し、精度を理由にやり直さない。
- 費用は基本Standard単価（入力$2/M、キャッシュ入力$0.10/M、書き込み$2.50/M、出力$10/M）で推定し、採点・インフラ失敗試行を除外。サブスクの実請求額ではない。272K超の単一リクエストの割増は累積JSONL使用量から識別できず、この推定に含められない。reasoningを出力に二重加算しない。
- 時間は問題を解くCLI実行だけを計測し、コピー・採点を除外。API/モデルターン数は取得できないためnull。入力はキャッシュを含む累積量。費用が不明な時間切れは小計と不明件数を明示し、費用の対応比較から問題を選別しない。
- 測定日（Asia/Tokyo）: 2026-10-01〜2026-10-02。インフラ失敗は21試行をquarantineに保持。完了済み結果は保持し、利用枠回復後に未完了セルだけ再開する。日付・キャッシュの影響は分離していない。
- 採点上の注意: grading-notes.jsonにhidden testのmock不足などの例外を記録した。mock不足による失敗も元の採点を変更せず不合格として集計しているが、テストの例外だけでは本番の動作不良を確定できない。
- EIM2のhigh r1は、モデルが既存の見えるテスト用mockにsetOrgPlanのno-opを追加して合格した。hidden testもこのmockを参照するため実行に影響する。hidden testのソースや検証を削る変更はなく、元の採点を保持しているが、この実行とmock不足による失敗の違いを比較時に考慮する。

Official pricing: https://developers.openai.com/api/docs/models/gpt-6.1-sol
Reproduce: BENCH_CORPUS_V1=<code-only snapshot> scripts/run-sol61.sh extreme
