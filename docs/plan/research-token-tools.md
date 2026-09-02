# トークン削減系ツールの総合評価と次の計測候補

## 作成日: 2026-09-02
## 根拠: [research-tools-navigation.md](./research-tools-navigation.md) / [research-tools-compression.md](./research-tools-compression.md) / [research-tools-memory.md](./research-tools-memory.md)、および本リポジトリの実測（500 ラン、13 条件）

---

## 1. 結論

「トークン削減」を謳う道具のうち、**実エージェントセッションで第三者が削減を確認したものは一つもない**。主張は (a) ベンダー自己申告、(b) 「クエリ出力 vs 全文読み」の合成推定、(c) 会話記憶ベンチ（LongMemEval 等）の転用、のいずれか。唯一の統制実験（arXiv:2608.13568）と本リポジトリの実測は同じ構図を示す: 索引・意味検索は弱いモデル（Haiku）には効き、強いモデル（Sonnet 以上）では逆効果。

本リポジトリで実際に効いたのは道具ではなく設定で、Sonnet 5 でサブエージェントを禁止するだけでトークン −29%、コスト −35%、精度同等、実時間 +14%。

---

## 2. 格付け

| 順位 | 候補 | 種別 | 主張の根拠 | Sonnet 5 で効く見込み | ハーネス適合 | 判定 |
|---|---|---|---|---|---|---|
| 1 | **サブエージェント禁止**（`--disallowedTools Agent`） | 設定 | 本リポジトリ実測 | 実証済み（−29%） | 済み | 既に計測済み |
| 2 | **`--effort medium` / `low`** | 設定 | 公式仕様（thinking トークンは出力課金） | 高（削減は理論的に確実、精度が焦点） | フラグ 1 つ | **次に測る** |
| 3 | **Explore サブエージェントを Haiku に固定** | 設定 | ブログ 1 本（方法論薄い） | 中（委譲の利点を残してコストだけ削れるか） | `.claude/agents/*.md` | **次に測る** |
| 4 | **Claude Code 組み込み LSP プラグイン**（typescript-lsp） | 索引（公式） | 数値主張なし | 低〜中（先行研究では LSP は Sonnet で +118%） | プラグイン導入、MCP 不要 | 測る価値あり（公式機能なので） |
| 5 | **Serena**（LSP を MCP 越しに） | 索引 | 「最大 70%」は逸話 | 低（同上 + MCP ツール定義の固定費） | MCP、RAM 懸念 | #4 の比較対象として |
| 6 | Bash 出力圧縮 hook | 設定（自作） | 提案段階 | 中（本ベンチのタスクは Read 中心で Bash 出力が少ない） | hook | 保留 |
| 7 | Aider repo-map（RepoMapper） | 索引 | 数値主張なし | 低（graphify と機構が近い） | MCP | 保留 |
| 8 | MCP Code Execution パターン | 設計 | Anthropic 公式 + 独立再現（98%） | タスク依存（MCP ツール呼び出し中心のタスクのみ） | 要別タスクセット | 対象外 |
| 9 | Augment Context Engine | 索引（商用） | Terminal-Bench で −33%、ただし社外未再現と自認 | 不明 | クラウド、クローズド | 対象外 |
| 10 | Claude Context / codebase-memory-mcp / code-graph 系 | 索引 | 合成推定または単一逸話 | 低（graphify・MemPalace と同型） | 可 | 対象外（検証済みの型） |
| 11 | mem0 / claude-mem / Zep / Cognee / Supermemory | 記憶 | 会話記憶ベンチの転用 | 低（MemPalace で検証済みの型） | 可 | 対象外 |
| 12 | context editing API 直接制御 | API | 公式機構 | 不明 | `claude -p` から制御不可 | 対象外 |
| 13 | LLMLingua 系 | 圧縮 | 学術的には確立、コードでの実測薄い | 不明 | 実装コスト大 | 対象外 |

---

## 3. 次に計測する提案

### A. 設定レバー一式（推奨、約 $30、135 ラン）

同じコード 45 タスク、Sonnet 5:

| 条件 | 内容 |
|---|---|
| `effort-medium` | baseline + `--effort medium` |
| `effort-low` | baseline + `--effort low` |
| `haiku-explore` | baseline + プロジェクト `.claude/agents/explore.md` で Explore を `model: haiku` に固定 |

比較対象は既存の `baseline` と `baseline-nosub`。主指標は uncached_all、コスト、正答率、実時間。

### B. 公式 LSP と Serena（約 $35、135 ラン）

| 条件 | 内容 |
|---|---|
| `lsp` | typescript-lsp プラグイン（プロジェクトローカル導入）+ CLAUDE.md に「定義・参照の特定には LSP ツールを先に使う」の 1 行 |
| `haiku-lsp` | 同上、Haiku |
| `serena` | Serena MCP（`--mcp-config`）、Sonnet |

先行研究の「LSP は Haiku で効き Sonnet で逆効果」が公式プラグインでも再現するかを見る。

### 見送り

記憶/RAG 系、クラウド依存の商用索引、`claude -p` から制御できない API 機構。

---

## 4. 本リポジトリの知見との整合

- 索引系 2 種（AST グラフ、埋め込み）は Sonnet 5 のコードタスクで削減せず。業界側でも Claude Code 自身がベクトル RAG を廃止している（定量値は非公開）。
- 効いた条件は「探索が弱いモデル」と「文書↔コード横断」。これは索引系ツール全般の適用条件として一般化できる可能性が高い。
- 「MCP ツール定義がターン毎にコンテキストを消費する」固定費は、Claude Code 2.1.x では ToolSearch による遅延読み込みで約 750 トークンに抑えられていた（MemPalace 45 ツールで実測）。
