# graphify-bench アーキテクチャ設計書

## 作成日: 2026-09-02
## ステータス: 確定
## 作成者: Claude Fable 5.1（Director）。リサーチは sonnet 4 名の並列調査に基づく

---

## 1. 概要

### 目的

Claude Code エージェントが中規模 Next.js コードベースに対して作業するとき、**graphify（AST 由来の知識グラフ + `graphify query` CLI）の有無でトークン消費がどれだけ変わるか**を、実セッションの計測値で示す。

### 背景

- graphify 自身の `graphify benchmark` は「ノード数 × 50 語」と固定 5 質問の BFS 結果から `chars/4` で推定する**合成値**であり、実エージェントセッションを一切測っていない（research-graphify.md §1）。ブログで流通する 71.5x / 79x はこの系譜の数字で、Claude Code の実消費とは比較できない。
- 直球の先行研究 arXiv:2608.13568（LSP vs grep）は、意味的検索ツールがモデルによっては**トークンを増やす**（Sonnet 4.6 で +118%）ことを示している（research-experiment-design.md §1.1）。「必ず減る」は前提にできない。
- よって本ベンチは **iso-accuracy（正答したランのみ）** で比較し、削減率と正答率をセットで報告する。

### スコープ

| 含む | 含まない |
|---|---|
| オリジナル Next.js 16 アプリ（≈350 ファイル）の生成と凍結 | 有名 OSS の流用（学習データ汚染回避のため） |
| 2 条件（baseline / graphify）× 15 タスク × 3 反復 の headless 実行 | 対話セッションでの人手計測 |
| トークン・コスト・ターン数・ツール呼び出し・正答率の収集と統計 | graphify 以外のツール（Serena 等）との横並び比較（将来拡張） |
| Sonnet 5 を主モデルとした計測 | 全モデル横断（Haiku は任意の追加条件） |

---

## 2. システム全体構成

```
graphify-bench/                      ← このリポジトリ（main 直コミット）
├── docs/plan/                       ← 本設計書・実施計画・調査書
├── corpus/taskflow/                 ← 被験コードベース（Next.js 16 "Taskflow"）
│   ├── src/ …                          ≈350 ファイル、Vitest ≈45 ファイル
│   ├── package.json, pnpm-lock.yaml    バージョン固定
│   └── (graphify-out/, .claude/, CLAUDE.md は overlay で注入。本体には置かない)
├── overlays/                        ← 条件ごとに corpus コピーへ上書きするファイル群
│   ├── baseline/    CLAUDE.md（最小の共通指示のみ）
│   └── graphify/    CLAUDE.md（同 + graphify セクション）, .claude/settings.json（hook）,
│                    .claude/skills/graphify/, graphify-out/（凍結済み graph.json 等）
├── tasks/                           ← タスク定義 + ground truth
│   ├── tasks.json                       id, category, prompt, grader, expected
│   └── keys/<task-id>.json              期待ファイル/シンボル集合、テストコマンド等
├── bench/                           ← 計測ハーネス（TypeScript, tsx で実行）
│   ├── run.ts         1 ラン実行（corpus コピー → overlay → claude -p → 収集）
│   ├── matrix.ts      タスク×条件×反復の実行計画生成と順序ランダム化
│   ├── collect.ts     result JSON + JSONL transcript からメトリクス抽出
│   ├── grade.ts       自動採点（集合一致 / テスト実行 / blind LLM-judge）
│   ├── analyze.ts     ペア差分・bootstrap CI・中央値/IQR・T2S
│   └── report.ts      results/REPORT.md と CSV の生成
├── results/                         ← 生データ（コミットする）
│   ├── runs/<run-id>/{result.json, transcript.jsonl, metrics.json, grade.json}
│   ├── summary.csv
│   └── REPORT.md
└── scripts/                         ← corpus 生成・凍結・検証の補助スクリプト
```

### 1 ランの流れ

```
matrix.ts が (task, condition, rep) を列挙し順序をシャッフル
        │
        ▼
run.ts ──① cp -c -R corpus/taskflow → $SCRATCH/<run-id>/   (APFS clonefile, node_modules 込み)
       ──② overlays/<condition>/ を上書き
       ──③ cd $SCRATCH/<run-id> && claude -p "<task prompt>" \
              --output-format json --model claude-sonnet-5 --effort high \
              --setting-sources project --permission-mode bypassPermissions \
              --max-turns 60 --max-budget-usd 4 --session-id <uuid>
       ──④ result.json を保存、~/.claude/projects/<encoded>/<uuid>.jsonl をコピー
       ──⑤ 編集系タスクは $SCRATCH 内で `pnpm vitest run <spec>` を実行し pass/fail を記録
       ──⑥ $SCRATCH/<run-id> を削除
        │
        ▼
collect.ts → grade.ts → analyze.ts → report.ts
```

**ポイント**: 毎ランを新品のコピーで始めるので、graphify の `graphify-out/memory/` と `reflections/LESSONS.md` によるセッション間学習が自然に遮断され、編集タスクの副作用も残らない。

---

## 3. 技術スタック選定

| コンポーネント | 選定 | 根拠 |
|---|---|---|
| 被験アプリ | Next.js 16.3.4 / React 19.2.8 / **TypeScript 5.9.3** | TS 7.0.2（latest）は @typescript-eslint の peer `<6.1.0` と非互換。Next 16 は async request API 必須・`proxy.ts` 改名などが LLM 生成コードの典型的バグ源なので spec に明記（research-nextjs-corpus.md §1） |
| DB 層 | Drizzle ORM 0.45.2 + better-sqlite3 13.0.3 | N-API 化済みで Node 25 対応、オフライン安全。Prisma は `latest` が RC を指す罠があり不採用 |
| テスト | Vitest 4.1.11 + @testing-library/react 16.3.3 | Playwright はブラウザ DL が要るため除外 |
| graphify | graphifyy **0.9.53 に更新して固定**（現行 0.9.50） | ほぼ毎日パッチが出ており TS 抽出のバグ修正が入っている。`uv tool install graphifyy==0.9.53` |
| 実行主体 | Claude Code 2.1.258 `claude -p --output-format json` | `usage.*` / `modelUsage` / `num_turns` / `total_cost_usd` を実測で確認済み（appendix-claude-p-json-sample.md） |
| 主モデル | claude-sonnet-5、`--effort high` 固定 | $2 / $10 per M。90 ラン想定で $150〜300 |
| ハーネス | TypeScript（tsx）、Node 25 | corpus と同じ toolchain。pnpm 10.28.2 |
| 統計 | 自前実装（bootstrap B=2000、Wilcoxon は任意） | 依存を増やさない |
| トークン計測補助 | `/v1/messages/count_tokens`（無料） | ツール結果テキストのサイズを cache 非依存で比較する際に使用 |

### コスト見積もり（1 サイクル）

| 項目 | 金額 |
|---|---|
| corpus 生成（sonnet サブエージェント 5〜6 体 + 修正パス） | 約 $30〜60 |
| パイロット（2 タスク × 2 条件 × 1 反復） | 約 $6 |
| 本計測 90 ラン × 中央値 $1.5 | 約 $135（上限 $4/ラン × 90 = $360 で頭打ち） |
| LLM-judge（haiku、カテゴリ 3 のみ 18 ラン） | < $1 |
| **合計** | **約 $170〜430** |

---

## 4. 比較条件の定義

| 条件 | 内容 | overlay |
|---|---|---|
| **A: baseline** | 素の Claude Code。`--setting-sources project` でユーザーレベルの `~/.claude/skills/graphify` と `~/.claude/CLAUDE.md` を遮断。プロジェクト `CLAUDE.md` は共通指示（回答フォーマット等）のみ | `overlays/baseline/` |
| **B: graphify（既定）** | `graphify install --project` 相当。`CLAUDE.md` の graphify セクション + PreToolUse hook（nudge のみ）+ プロジェクト内 skill + 凍結済み `graphify-out/` | `overlays/graphify/` |
| C: graphify strict（任意） | B + `hook-guard read --strict`（初回生 Read をブロック） | `overlays/graphify-strict/` |
| D: Haiku 4.5（任意） | A/B を `--model claude-haiku-4-5` で再実行。先行研究でモデル依存性が示されているため | 同上 |

条件 B を主条件とする理由: これが `/graphify` を導入したユーザーが実際に得る既定状態であり、CLAUDE.md だけの条件は無視されて効果を過小評価しやすく、MCP は Claude Code の主流経路ではない（research-graphify.md §3, 補記）。

### 両条件で共通に固定するもの

- モデル、effort、`--max-turns`、`--max-budget-usd`、`--permission-mode bypassPermissions`
- corpus のツリーハッシュ（`corpus-v1` タグ）
- プロンプト末尾の回答フォーマット指示（採点のため。例: 「最後に `ANSWER:` 行でファイルパスをカンマ区切りで列挙せよ」）
- 実行順序: (task, condition, rep) をシャッフルし、時間帯変動を両条件に分散

---

## 5. データフロー（メトリクス）

### 収集元とフィールド

| メトリクス | 由来 | 備考 |
|---|---|---|
| `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens` | result JSON `usage` | 実測で確認済み |
| `uncached_equivalent` = input + cache_creation + cache_read | 派生 | **情報量の主指標**。キャッシュヒットのタイミング差を除去 |
| `total_cost_usd` | result JSON | **実コストの主指標** |
| `num_turns`, `duration_ms`, `duration_api_ms` | result JSON | |
| `modelUsage.*` | result JSON | サブエージェント込みの帰属 |
| ツール呼び出し回数（Read / Grep / Glob / Bash / Bash(graphify …) 別） | JSONL `tool_use` | 「探索行動そのもの」の差 |
| ツール結果バイト数（ツール別合計） | JSONL `tool_result` | 何を読んだかの代理指標 |
| `graphify-out/graph.json` を Read したか | JSONL | 逆効果検出フラグ |
| graphify skill 発火回数 | JSONL `attributionSkill` | 条件 B の妥当性チェック |
| 正答（0/1 または F1） | grade.ts | カテゴリ別に採点方式が異なる |
| **T2S**（Tokens-to-Success）= 成功ラン総トークン ÷ 成功ラン数 | analyze.ts | arXiv:2608.13568 の主指標 |

### 固定オーバーヘッドの扱い

空ディレクトリでの `claude -p` でも system prompt + tool 定義で約 21k トークンがキャッシュ側に載る（appendix 参照）。条件 B は CLAUDE.md と skill 分だけ固定コストが増える。**これは graphify の実コストの一部なので差し引かない**。ただし内訳として「初回ターンの cache_creation」を別掲し、読者が分離できるようにする。

---

## 6. タスク設計

5 カテゴリ × 3 タスク = 15 タスク。corpus 凍結後に、Taskflow の 15 の横断的関心事（権限チェック `can()`、イベントバス、フィーチャーフラグ、プラン上限、ソフトデリート等。research-nextjs-corpus.md §3）から具体化する。

| # | カテゴリ | 例 | 採点 |
|---|---|---|---|
| 1 | シンボル特定（RepoQA 型） | 「組織のシート数上限を超えたときに招待を拒否するロジックはどこか」 | 期待ファイル/シンボル集合との一致（自動） |
| 2 | 参照網羅・データフロー追跡 | 「`can()` を呼んでいる箇所を全列挙せよ」 | Precision/Recall/F1、F1 ≥ 0.9 を成功（自動） |
| 3 | アーキテクチャ説明 | 「Issue 作成から通知メール下書きまでの流れを説明せよ」 | blind LLM-judge（haiku、ルーブリック、条件名を伏せる）+ 20% 人手検証 |
| 4 | 影響範囲分析 | 「`PlanLimits` の型にフィールドを追加したら修正が必要なファイルは」 | 期待集合との一致（自動）。`graphify affected` が効きやすい領域 |
| 5 | 小規模バグ修正 | 意図的に注入したテナントスコープ漏れを修正 | Vitest の該当 spec pass/fail（自動） |

設計上の注意:

- カテゴリ 1・3 の設問は関数名をそのまま書かず自然言語で記述する（grep 一発で解けないように）。ただし `graphify query` は同義語展開をしないため、graph のノードラベルに現れる語彙を **1 語以上は含める**（不当に不利にしない）。
- カテゴリ 5 のバグは corpus 凍結後に `tasks/bugs/<id>.patch` として管理し、ラン時に適用する。corpus 本体は常に緑。
- 「ツールが要らない簡単なタスク」も 1〜2 件意図的に含め、差が消える条件を示す。

---

## 7. ローカル開発環境構成

### 前提

| ツール | バージョン |
|---|---|
| Node | 25.5.0 |
| pnpm | 10.28.2 |
| Claude Code | 2.1.258（`claude --version` を results に記録） |
| graphifyy | 0.9.53（uv tool） |
| macOS APFS | `cp -c` による高速クローンに依存。Linux では `cp -R --reflink=auto`（btrfs/xfs）か rsync にフォールバック |

### 環境変数

| 変数 | 用途 |
|---|---|
| `ANTHROPIC_API_KEY` | `count_tokens` 補助計測のみ（`claude -p` は既存ログインを使用） |
| `BENCH_SCRATCH` | ランごとのコピー先（既定: scratchpad 配下） |
| `BENCH_MODEL` | 既定 `claude-sonnet-5` |
| `BENCH_MAX_BUDGET_USD` | 既定 `4` |
| `GRAPHIFY_HOOK_STRICT` | 条件 C のとき `1` |

### 起動手順

```bash
pnpm install                                   # bench/ の依存
(cd corpus/taskflow && pnpm install --frozen-lockfile && pnpm build)
pnpm bench:pilot                               # 2 タスク × 2 条件 × 1 反復
nohup pnpm bench:full > results/full.log 2>&1 &   # 本計測はバックグラウンド必須
pnpm bench:report
```

---

## 8. リスクと対策

| リスク | 影響 | 対策 |
|---|---|---|
| 条件 B のエージェントが `graph.json`（数百 KB〜MB）を直読みして逆にトークンを浪費 | 高 | hook は `graphify-out/` を対象外にするため防げない。`collect.ts` で検出してフラグ化し、発生率を結果に明記。CLAUDE.md overlay に「graph.json を直接読まない」を 1 行追加（graphify の既定文言に含まれないため、条件 B' として区別して記録） |
| `graphify-out/memory/`・`LESSONS.md` の持ち越し | 高 | 毎ラン新品コピー。overlay の `graphify-out/` に memory/ を含めない |
| corpus をモデルが学習済み | 中 | オリジナル生成。命名も一般的すぎない語（Taskflow 固有）にする |
| corpus が graphify の 500 ファイル / 50 万語 閾値に触れ、絞り込みプロンプトでフローが崩れる | 中 | 目標 395 ファイル・20〜30 万語。graph は事前ビルドして凍結するので、ラン中に build は走らない |
| TS 7 / Prisma RC / Next 15 流の同期 API など生成時の環境罠 | 中 | バージョンを spec に明示ピン留め、契約ファイルを先に凍結、統合後に tsc/eslint/vitest/build の全緑ゲート |
| 反復間のばらつきが差より大きい | 中 | 3 反復 + bootstrap CI。CI が 0 をまたぐなら「差なし」と報告する（ゼロ結果も成果） |
| 正答率が条件間で異なる | 中 | iso-accuracy と T2S で報告。削減率単独の主張はしない |
| `--max-turns` 到達や budget 超過 | 低 | `is_error` / `terminal_reason` を記録し失敗ランとして扱う。iso-accuracy から除外 |
| `claude -p` の JSON スキーマ変更 | 低 | `claude --version` を固定記録。`collect.ts` は欠損キーを null で通す |
| JSONL transcript の場所が cwd 依存 | 低 | `--session-id` を指定し、encoded cwd を計算してコピー |
| 長時間フォアグラウンド実行の SIGKILL | 中 | 本計測は `nohup` + ログファイル。1 ランずつ結果をディスクに書き、再開可能にする |

---

## 9. 将来の拡張

- 条件 C（strict hook）、条件 D（Haiku 4.5 / Opus 5）
- graphify MCP サーバー（`--mcp`）条件
- 他ツール（Serena、Claude Code 内蔵 LSP、Aider repo-map 相当）の横並び
- corpus 規模を 2 倍（≈700 ファイル、閾値超え時の挙動込み）にした場合の再計測
- `count_tokens` による「Read したファイルの実トークン」と「graphify query 出力の実トークン」の静的比較を補助指標として追加

---

## 参考リンク

- 調査書: [research-token-measurement.md](./research-token-measurement.md), [research-graphify.md](./research-graphify.md), [research-experiment-design.md](./research-experiment-design.md), [research-nextjs-corpus.md](./research-nextjs-corpus.md)
- 実測: [appendix-claude-p-json-sample.md](./appendix-claude-p-json-sample.md)
- [Does a Language Server Save Tokens for Coding Agents? (arXiv:2608.13568)](https://arxiv.org/html/2608.13568)
- [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) / [graphifyy on PyPI](https://pypi.org/project/graphifyy/)
- [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference) / [Monitoring usage](https://code.claude.com/docs/en/monitoring-usage)
- [Token counting API](https://platform.claude.com/docs/en/build-with-claude/token-counting) / [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
