# CORPUS.md — Taskflow コーパス凍結記録

## 作成日: 2026-09-02
## 対象: `corpus/taskflow/`
## 関連: [corpus-spec.md](./corpus-spec.md)（仕様・凍結契約レイヤ）、[CORPUS-PLAN.md](./CORPUS-PLAN.md)（並列生成の割り当て）

このファイルは**ベンチマークが対象とするコードの同一性**を記録する。ここに載っているツリーハッシュが
一致しない限り、二つの実行結果は比較できない。

---

## 1. 同一性

`scripts/freeze-corpus.sh` の出力（`corpus/taskflow/src` + `corpus/taskflow/tests`）:

| 項目 | 値 |
|---|---|
| **ツリーハッシュ** (sha256) | `4148d9b26fb31b95ab8424af1f88cfc7741bb655b3ad3bbb557a8c3c516c12da` |
| **ファイル数** | 477 |
| **行数** (`wc -l`) | 40,944 |
| **語数** (`wc -w`) | 137,867 |

再計算:

```bash
scripts/freeze-corpus.sh          # 人間向け
scripts/freeze-corpus.sh --json   # 機械向け
```

ハッシュの定義は `find corpus/taskflow/src corpus/taskflow/tests -type f | sort | xargs shasum -a 256 | shasum -a 256`。

### graphify detect

`corpus/taskflow` 全体（`src` / `tests` に限らず、設定ファイル・manifest を含む）を graphify が
どう数えるか。**グラフは構築していない**（`graphify-out/` は作らない）:

| 項目 | 値 |
|---|---|
| `total_files` | 493 |
| `total_words` | 165,983 |

```bash
$(uv tool run --from graphifyy python -c 'import sys;print(sys.executable)') -c \
  "from graphify.detect import detect; from pathlib import Path; import json; \
   r=detect(Path('corpus/taskflow')); print(json.dumps({k:r[k] for k in ('total_files','total_words')}))"
```

§1 の 477 と detect の 493 が食い違うのは対象範囲の差で、前者が `src`+`tests` のみ、
後者が `package.json` / `corpus-manifest.json` / `scripts/` などを含むため。

---

## 2. ディレクトリ別内訳

### `src/`

| ディレクトリ | ファイル | 行 |
|---|---|---|
| `src/app/` | 89 | 6,461 |
| `src/components/` — うち `ui/` 38、`domain/` 57 | 95 | 7,587 |
| `src/server/` — うち `repositories/` 24、`services/` 22、`db/` 16、`jobs/` 11 | 73 | 9,226 |
| `src/actions/` | 41 | 2,267 |
| `src/lib/` | 24 | 1,870 |
| `src/hooks/` | 22 | 1,165 |
| `src/schemas/` | 22 | 966 |
| `src/types/` | 14 | 953 |
| `src/emails/` | 10 | 601 |
| `src/config/` | 6 | 549 |
| `src/`（直下: `proxy.ts` / `instrumentation.ts`） | 2 | 81 |

### `tests/`

| ディレクトリ | ファイル | 行 |
|---|---|---|
| `tests/lib/` | 22 | 1,730 |
| `tests/components/` | 13 | 1,246 |
| `tests/server/` | 10 | 1,456 |
| `tests/services/` | 10 | 1,813 |
| `tests/schemas/` | 6 | 737 |
| `tests/ui/` | 4 | 301 |
| `tests/contract/` | 3 | 293 |
| `tests/repositories/` | 3 | 557 |
| `tests/config/` | 2 | 232 |
| `tests/helpers/` | 2 | 276 |
| `tests/jobs/` | 2 | 394 |
| `tests/emails/` | 1 | 182 |

---

## 3. 横断的関心事のハブ — 呼び出し箇所

ベンチマーク設問の主な源泉。「この一箇所を変えたら何が壊れるか」という問いが成立するのは、
実装が単一で呼び出しが分散しているからで、その分散の度合いがこの表:

| ハブ | 定義 | 呼び出し箇所 | 出現ファイル数 |
|---|---|---|---|
| `can(` | `src/lib/permissions.ts` | 170 | 102 |
| `assertOrgScope(` | `src/lib/tenant.ts` | 70 | 23 |
| `isEnabled(` | `src/lib/feature-flags.ts` | 67 | 39 |
| `assertCan(` | `src/lib/permissions.ts` | 58 | 18 |
| `getPlanLimits(` | `src/config/plan-limits.ts` | 43 | 34 |
| `emit(` | `src/lib/event-bus.ts` | 41 | 17 |

計数は `src` + `tests` から定義ファイル自身を除いたもの:

```bash
cd corpus/taskflow
grep -rEn "(^|[^A-Za-z0-9_.])can\(" src tests \
  | grep -vE '^src/lib/(permissions|feature-flags|event-bus|tenant)\.ts|^src/config/plan-limits\.ts' | wc -l
```

---

## 4. 検証ゲート

すべて `corpus/taskflow` から、終了コードを確認済み:

| ゲート | コマンド | 結果 |
|---|---|---|
| 型 | `pnpm typecheck`（`next typegen && tsc --noEmit`） | **PASS** |
| Lint | `pnpm lint`（`eslint .`） | **PASS** |
| テスト | `pnpm test`（`vitest run`） | **PASS** — 617 passed / 73 files / **0 todo・0 skipped** |
| ビルド | `pnpm build`（Next 16 / Turbopack） | **PASS** |

リポジトリルート:

| ゲート | 結果 |
|---|---|
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** — 53 passed / 4 files |

### ランタイムスモーク

`pnpm db:migrate && pnpm db:seed && pnpm build && pnpm start -p 3123` の実機確認。
SQLite は `data/taskflow.db`（`.gitignore` 済み）:

- シード: organizations 2 / users 8 / projects 3 / issues 39 / comments 12
- 未認証: `/` `/pricing` `/login` `/register` `/reset-password` `/changelog` `/api/health` → いずれも **200**
- 認証済み（`owner@northwind.test`）: `/orgs` → 307 → `/northwind`、`/northwind/projects`
  `/northwind/issues` `/northwind/search` `/northwind/inbox` `/northwind/activity`
  `/northwind/projects/platform/{board,issues,issues/new,issues/1,settings}`
  `/northwind/profile`
  `/northwind/settings/{,billing,billing/invoices,danger,flags,labels,members,members/invitations,notifications,webhooks}`
  → **全 34 ルート 200**、サーバーエラー **0 件**

統合時に実機でしか出なかった不具合を 3 件直した（詳細は該当コミット）:
`seed.ts` がパスワードハッシュにリテラルを書いていてシードユーザーが一切ログインできなかった件、
`BillingPlanCard` と `IssueRow` に `"use client"` が無く Server Component 側で
`onClick` を描画して React が投げていた件（2 ルートで 28 件のエラー → 0 件）。

セッションの取得方法: `loginAction` は Next の Server Action（`Next-Action` ヘッダに
ビルド時のアクション ID が要る）なので curl から直接叩くのは現実的でない。代わりに同じ
コードパス — `authService.login({ email, password })` — をそのまま呼んでトークンを発行し、
`Cookie: taskflow_session=<token>` を付けて GET した。検証されないのは Server Action の
RPC 封筒だけで、資格情報の検証・セッション発行・`resolveActorForOrg`・テナントレイアウトの
レンダリングはすべて実物を通っている。

シードアカウントの共有パスワードは `SEED_PASSWORD`（`src/server/db/seed.ts`）。

---

## 5. 既知のレイヤ例外

**意図的に残している**。現実の SaaS コードベースにはこの手のほつれが必ずあり、
「この画面はサービス層を通っているか」という設問が成立するのはむしろこれがあるからである。
修正すると設問の素材が消える。

### 5.1 `src/app/**` / `src/actions/**` からリポジトリを直接呼んでいる箇所

宣言上のレイヤ境界は `app/ + actions/ → server/services/ → server/repositories/`。
以下の 5 ファイル・7 import はサービス層を飛ばしている:

| ファイル | 直接呼んでいるリポジトリ関数 |
|---|---|
| `src/actions/profile/update-profile.ts` | `userRepository.updateUser` |
| `src/app/(dashboard)/[orgSlug]/profile/page.tsx` | `userRepository.findUserById` |
| `src/app/(dashboard)/[orgSlug]/settings/members/invitations/page.tsx` | `invitationRepository.listPendingInvitations` |
| `src/app/(dashboard)/[orgSlug]/settings/notifications/page.tsx` | `notificationPreferenceRepository.listPreferences` |
| `src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/[issueNumber]/page.tsx` | `issueRepository.findIssueByNumber`、`activityRepository.listActivityForSubject`、`userRepository.findUserById` |

いずれも読み取り（`update-profile.ts` を除く）で、テナントスコープは呼び出し前の
`loadTenantContext()` / `getActor()` が担保している。プロフィール系にはそもそも
対応するサービスが存在しない。

### 5.2 `auth-service.ts` の未消化 `mustUse: emit`

`src/server/services/auth-service.ts` のヘッダは `emit` を「呼ぶべき」と宣言しているが、
`TaskflowEventMap`（`src/types/event.ts`、凍結契約）に認証系イベントが 1 つも無いため
呼びようがない。イベントキーは 21 個あり、いずれも `billing.` / `comment.` / `digest.` /
`flag.` / `issue.` / `member.` / `project.` / `search.` / `webhook.` の接頭辞を持つ。

登録時のイベントは `member.joined` として `organization-service.createOrganization` が
発火しており、実質の穴埋めにはなっている。この矛盾はファイル自身のヘッダにも記録済み。

---

## 6. 凍結手順

Director がマージ後にタグを打つ:

```bash
scripts/freeze-corpus.sh          # ハッシュがこのファイルの §1 と一致することを確認
git tag corpus-v1
```

ハッシュが一致しない場合、`corpus/taskflow/src` か `tests` に差分がある。タグを打つ前に
このファイルを更新すること。
