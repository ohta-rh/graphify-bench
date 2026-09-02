# DOCS-CORPUS.md — Taskflow ドキュメントコーパス記録

## 作成日: 2026-09-02
## 対象: `corpus/taskflow/docs/`
## 関連: [corpus-spec.md](./corpus-spec.md)（ドメイン仕様）、[CORPUS.md](./CORPUS.md)（コード凍結記録）

コード側 (`corpus/taskflow/src` + `tests`、477 ファイル、`corpus-v1`) は**一切変更していない**。
このファイルはその凍結コードに対して後付けした**ドキュメント層**の記録である。狙いは
doc↔code 設問 — 「この仕様はどのコードで実装されているか」「この設計文書とコードは食い違って
いないか」— を成立させることで、grep ではノイズが多く、意味的な抽出と文書間リンクが効くはずの
領域を作ることにある。

---

## 1. 規模

| 項目 | 値 |
|---|---|
| ファイル数 (`*.md`) | **139** |
| 総語数 (`wc -w`) | **261,709** |
| 平均 | 約 1,883 語/ファイル |

コード側との比較: `src`+`tests` が 137,867 語なので、ドキュメントはコードの約 1.9 倍の分量。

### ディレクトリ別

| ディレクトリ | ファイル | 語数 | 内容 |
|---|---|---|---|
| `requirements/` | 13 | 32,070 | 12 ドメインの要求仕様 + index |
| `design/` | 34 | 76,661 | 基本設計 8 + サービス詳細 13 + リポジトリ 6 + アクション 6 + index |
| `adr/` | 23 | 29,684 | ADR 22 本 + index |
| `api/` | 14 | 27,460 | Server Action / Route Handler カタログ |
| `ops/` | 24 | 30,116 | runbook 5、ポストモーテム 4、議事録 14、index |
| `ui/` | 12 | 20,526 | 画面仕様 23 画面分 + conventions + index |
| `db/` | 10 | 19,293 | テーブル定義書 + conventions + index |
| `test/` | 6 | 13,330 | テスト戦略と REQ→テスト対応表 |
| ルート直下 | 3 | 12,569 | `index.md`、`glossary.md`、`traceability.md` |

---

## 2. ID 体系と範囲

ID は 3 名前空間。**「見出しの先頭に ID を書いた箇所が定義、それ以外は参照」**という単純な規約で
統一してあり、`scripts/check-docs-corpus.ts` がこれを機械的に検証する。

| 名前空間 | 範囲 | 定義数 | 定義場所 |
|---|---|---|---|
| `REQ-###` | REQ-001 .. REQ-231 | **168** | `requirements/` の 12 ファイル |
| `DES-###` | DES-001 .. DES-259 | **228** | `design/` の 33 ファイル |
| `ADR-###` | ADR-001 .. ADR-022 | **22** | `adr/` の 22 ファイル（1 ファイル 1 ADR） |

REQ の割り当て（ドメインごとに連番、間は将来用の予約帯）:

| ドメイン | 範囲 | 数 |
|---|---|---|
| organizations | REQ-001 – REQ-014 | 14 |
| membership & roles | REQ-020 – REQ-034 | 15 |
| projects | REQ-040 – REQ-054 | 15 |
| issues | REQ-060 – REQ-079 | 20 |
| comments & mentions | REQ-090 – REQ-102 | 13 |
| notifications & digests | REQ-110 – REQ-124 | 15 |
| billing & plan limits | REQ-130 – REQ-144 | 15 |
| webhooks | REQ-150 – REQ-161 | 12 |
| search | REQ-170 – REQ-181 | 12 |
| feature flags | REQ-185 – REQ-195 | 11 |
| auth & sessions | REQ-200 – REQ-213 | 14 |
| audit & activity | REQ-220 – REQ-231 | 12 |

DES は基本設計 DES-001–077、サービス詳細 DES-100–179、リポジトリ DES-180–219、
アクション DES-220–259 に分割して割り当てた。

---

## 3. 相互参照の密度

| 指標 | 値 |
|---|---|
| 定義された ID 総数 | 418 |
| ID 参照の総出現数 | 5,840 |
| **平均参照密度** | **14.0 参照/ID** |
| 参照ゼロの ID | **0** |
| 本文中で言及される実在コードパス（ユニーク） | 362 |

要求 1 件あたりのメタデータは 5 フィールド固定（`Priority` / `Status` / `Related` /
`Implemented by` / `Verified by`）で、168 件すべてが埋まっている。`Implemented by` は実在の
ファイルパスと実在のエクスポート名、`Verified by` は実在のテストファイル、または
「`none — covered indirectly`」（28 件）。

`traceability.md` は手書きではなく**文書自身から生成**している
（`Implemented by` / `Verified by` / `Satisfies` / `Code` フィールドを機械抽出）。
そのため穴がそのまま可視化される:

| 指標 | 値 |
|---|---|
| 設計要素が紐付いている要求 | 148 / 168 |
| 専用テストが紐付いている要求 | 140 / 168 |
| コードパスが紐付いている設計要素 | 大半（`traceability.md` §Counts 参照） |

---

## 4. 意図的な不一致（12 件）

検出系タスクの素材として、**ちょうど 12 箇所**だけドキュメントがコードと食い違うように
仕込んである。それ以外はすべて正確であることを意図している。

- **記録先: `tasks/keys/docs-discrepancies.json`**
- `index.md` からはリンクしておらず、名前も中立（レビュー用メモに見える）
- 拡張子が `.json` なので `check-docs-corpus.ts` の走査対象（`*.md`）から外れる。加えて
  スクリプト側でも `IGNORED_BASENAMES` に明示的に入れてある
- **ベンチマーク実行時はオーバーレイでエージェントの視界から除外すること**

各エントリは `{id, doc_path, doc_claim, code_path, code_truth}` の 5 フィールド。内訳:

| ID | 文書 | 種類 |
|---|---|---|
| D01 | `requirements/comments-and-mentions.md` | 権限（Viewer がコメント可と主張 / 実際は member） |
| D02 | `requirements/notifications-and-digests.md` | ジョブ周期（1440 分と主張 / 実際は 60） |
| D03 | `db/tables-webhooks-search-and-infra.md` | 存在しないインデックスを記載 |
| D04 | `api/actions-projects.md` | 返らないエラーコード `rate_limited` を記載 |
| D05 | `requirements/billing-and-plan-limits.md` | free プランの projects を 3 と記載 / 実際は 2 |
| D06 | `api/actions-flags.md` | ロールアウト率 50% / 実際は 25% |
| D07 | `requirements/projects.md` | `project:archive` を owner と記載 / 実際は admin |
| D08 | `requirements/webhooks.md` | 定数の出所を `config/constants.ts` と記載 / 実際はジョブ内ハードコード |
| D09 | `requirements/auth-and-sessions.md` | セッション TTL 14 日 / 実際は 30 日 |
| D10 | `api/actions-comments.md` | レート制限の補充 10/分 / 実際は 20/分 |
| D11 | `ui/screen-settings-billing-flags-webhooks.md` | フラグ画面が member 以上と記載 / 実際は admin |
| D12 | `db/tables-issues.md` | ユニークインデックスの列を `(org_id, number)` と記載 / 実際は `(project_id, number)` |

配置の方針:
- 分野を散らす（要求 5 / API 3 / DB 2 / UI 1 / 要求内の実装参照 1）
- **同一文書内で自己矛盾しない箇所を選ぶ** — 正しい値が他所に一度も書かれていない、
  または離れた文書にしか書かれていない箇所に置いた。文書間の食い違い（例: D12 の
  `db/tables-issues.md` と REQ-061）は現実のドキュメントでも起きるので許容している
- D08 は生成中に見つかった**実在の記述ミス**をそのまま採用したもの。`WEBHOOK_MAX_ATTEMPTS`
  は `src/config/constants.ts` に 5 で存在するが誰も読んでおらず、ジョブ側は 6 を直書き
  している、という現実的な形になっている

---

## 5. コードとの突き合わせ方法

### 5.1 生成前 — 共有ブリーフ

全ワーカーに同じ「Product facts」を渡した。ROLE_MATRIX 全 29 行、4 プランの全数値、
フラグ 10 件の戦略、イベントキー 21 件、ジョブ 7 種の cadence、レート制限バケット 6 種、
エラーコード 9 種、`SESSION_TTL_DAYS = 30`、`MAX_ATTEMPTS = 6` などを、**Director が
実ファイルを読んで転記**したうえでブリーフに埋め込んでいる。

同時に配布したもの:
- `corpus-manifest.json` を領域別に分解したダイジェスト（パス → 責務 → エクスポート → mustUse）
- 実在ファイル 477 件の一覧（`filelist.txt`）
- REQ / ADR の ID カタログ（Director が事前採番。DES は wave 1 の実出力から機械生成して wave 2 へ）

### 5.2 生成中 — 2 波構成

| wave | 担当 | 出力 |
|---|---|---|
| 1 | requirements / adr / design 基本 / design サービス / design データ | 70 ファイル、134,820 語 |
| 2 | api / db / ui / test / ops | 66 ファイル |
| 追補 | requirements の `Implemented by` / `Verified by` 補完 | 149 ブロック |

いずれも sonnet のサブエージェント。ID の衝突を避けるため、定義してよい範囲を排他的に割り当て、
wave 2 は**一切 ID を定義しない**（参照のみ）ルールにした。

### 5.3 生成後 — 機械検証

`scripts/check-docs-corpus.ts`（`pnpm docs:check`）が以下を検証する。**赤なら exit 1**。

1. 参照されている `REQ`/`DES`/`ADR` ID が**ちょうど 1 箇所で定義**されているか
   （未定義参照・重複定義を検出）
2. 文書中でバッククォート付きで言及された `src/...` / `tests/...` / `scripts/...` の
   **実在**（`corpus/taskflow` 配下）。glob（`src/lib/*.ts`）は散文として正当なので除外
3. ファイル数・語数をディレクトリ別に出力、参照密度と参照ゼロ ID も報告

初回実行で検出・修正した実際の不備:
- 未定義 ID 参照 4 件（`requirements/index.md` が予約帯の番号を実在 ID のように書いていた）
- 存在しないパス `src/server/instrumentation.ts`（正しくは `src/instrumentation.ts`）
- サブエージェントが frontmatter のスラッグ（`DES-TENANT` 等）を ID と取り違えた 15 件
  （`db/` 担当が自己修正）

### 5.4 個別に読み合わせた箇所

Director が実ソースを直接読んで裏取りした主なもの:
`src/lib/permissions.ts`（判定順序・所有権エスカレーション 5 件）、`src/config/plan-limits.ts`、
`src/config/feature-flags.ts`、`src/types/event.ts`（イベント 21 件）、
`src/server/jobs/scheduler.ts`、`src/server/jobs/webhook-delivery-job.ts`、
`src/lib/rate-limit.ts`、`src/lib/session.ts`、`src/server/services/session-service.ts`、
`src/server/services/search-service.ts`、`src/lib/errors.ts`、
`src/actions/projects/create-project.ts`、`src/actions/webhooks/delete-webhook.ts`、
`src/app/(dashboard)/[orgSlug]/settings/webhooks/page.tsx`、`src/lib/event-bus.ts`、
全 12 スキーマファイルのインデックス定義。

`design/event-bus.md` の `Promise.allSettled` による分離、
`design/action-auth-profile-search-webhooks.md` の DES-258（delete はフラグゲートしない）
などは、疑わしく見えたので実装を確認したうえで**正しいと確認して残した**ものである。

---

## 6. 既知の性質（設問設計時に効く）

- **レイヤ例外がドキュメント側にも書いてある**。`CORPUS.md` §5.1 の 5 ファイルの
  サービス層バイパスは `design/module-map.md` に明記した。「この画面はサービス層を
  通っているか」型の設問はドキュメントからも到達できる
- **`auth-service.ts` の未消化 `mustUse: emit`** も `design/service-auth-and-session.md` に
  記録済み
- **UI の実挙動と設計意図のズレ**を 1 件、正直に書いてある（フラグ off 時に
  `WebhookManager` ごと描画されないため、ダウングレード後に削除導線が無い）。これは
  仕込みではなく実コードの性質で、`docs-discrepancies.json (tasks/keys)` には含めていない
- `traceability.md` は**再生成可能**。要求や設計にフィールドを足したら作り直せば追随する

---

## 7. 検証ゲート

リポジトリルートから、いずれも終了コードを確認済み:

| ゲート | コマンド | 結果 |
|---|---|---|
| ドキュメント整合 | `pnpm docs:check` | **PASS** — 139 files / 261,709 words / 未定義 ID 0 / 不在パス 0 |
| 型 | `pnpm typecheck` | **PASS** |
| テスト | `pnpm test` | **PASS** |

`corpus/taskflow` 側のツリーハッシュは変更していない（`docs/` は `src`/`tests` の
ハッシュ対象外）。`scripts/freeze-corpus.sh` の出力は `CORPUS.md` §1 と一致したまま。
