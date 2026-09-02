# コンテキスト圧縮・トークン削減 レバー調査（2026-09-02時点）

対象: graphify-bench の次回ベンチマーク候補。既知の唯一の実測有効レバーは「Agent (subagent) tool を disallow」（baseline tokens -29%, cost -35%, 精度同等, wall time +4s, Sonnet 5, `claude -p` 実測）。これを上回る、あるいは補完する候補を探した。

## 比較表

| # | レバー/ツール | 機構 | 主張・数値 | エビデンス品質 | ハーネス適合 | 判定 |
|---|---|---|---|---|---|---|
| 1 | `disallowedTools`（Agent除外・再掲） | サブエージェント起動自体を禁止し委譲コストを消す | 自前実測: tokens -29%, cost -35% | **実測（自前ベンチ）** | settings.json一行 | 既知・ベースライン |
| 2 | Explore agent の Haiku ルーティング | 探索専用サブエージェントを Haiku で走らせる | 10ドメインベンチで Opus比 raw token 1.37M→80k（17倍減）だが「Haiku単体は使い物にならない」、Haiku+Sonnetハイブリッドで精度Opus同等・コスト-60%程度 | Anecdotal（ブログ、方法論詳細薄い） | `.claude/agents/*.md` で `model: haiku` 指定、CLAUDE.mdのHaiku委譲テーブルと同型 | **要検証・有望**（ただし既存CLAUDE.mdルールは既にsonnet実装/haiku機械作業に固定運用済みなのでベンチ設計要） |
| 3 | Context editing API (`context_management`, `clear_tool_uses_20250919`, `clear_thinking_20251015`) | 古いtool_use/thinkingブロックを閾値超過時に自動でAPI側からクリア | Anthropic公式Docs: agentic loopの長時間化に有効。ユーザー実装での申告値「20-40%コスト減、3-7万トークン回収」 | 公式機構だが**数値は要望Issue投稿者の申告**（未検証） | **不適合**: Claude Code CLIは`context_management`パラメータを内部で使っている形跡があるが、ユーザー設定として公開されていない。公開要望 Issue #26215 は "closed as not planned"。`claude -p`からは直接制御不可 → ベンチ対象外（API直叩きなら別） | 見送り（ハーネス非対応） |
| 4 | Auto-compaction 閾値調整（`autoCompactEnabled`, `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`） | コンテキストが閾値（デフォルト約83%）に達すると要約置換 | 実例ブログ: 5チケットのワークフローで204k→82kトークン（-58.6%、2回のcompaction発火）| Anecdotal（単一ブログ、再現性不明） | env var一つで閾値を早める設定が可能、`claude -p`のセッション内でも有効 | **要検証**（短命なコード課題では発火しない可能性、閾値操作の効果はタスク長依存） |
| 5 | PreToolUse/PostToolUseフックによるtool出力圧縮（テスト結果・build logの型認識圧縮） | Bashコマンド出力をタイプ別コンプレッサ経由でClaudeに渡す前に削る。exit codeは保持 | 定性例: cargo testの出力500トークンのうち有用なのは約100トークンのみ、という指摘 | Anecdotal / 提案段階（Issue #44319, #31279は未実装のFeature Request） | settings.jsonのhooksで完全に自作・自前実装可能、ハーネス親和性は高い（disallowedTools同様の設定ファイルレバー） | **有望（自作条件として設計可能）** |
| 6 | MCP Code Execution パターン（ツールをAPIとしてコード実行環境に渡し、結果だけ返す） | MCPツールをモデルが直接呼ぶのではなく、サンドボックスでコードとして実行し最終結果のみモデルに返す | Anthropic公式ブログ実証 + 独立検証（GitHub Discussion）で「150k→2kトークン（98.7%減）」「70k→800トークン（98%減、本番実装で再現）」 | **中〜高**（Anthropic公式の設計思想記事＋サードパーティの独立再現。ただし再現は限定的なユースケース＝MCP経由の大量ツール呼び出しタスクに偏る） | 現行ハーネスは`--mcp-config`でMCPサーバ導入可。ただしgraphify-benchのタスクがMCPツール呼び出し中心でなければ効果小 | **タスク依存で有望**（MCPヘビーなタスクセットがあれば次点候補） |
| 7 | サブエージェント要約パターン（Anthropic公式記事: 委譲先が1000-2000トークンの要約のみ返す） | 探索を子エージェントに閉じ込め、親コンテキストには要約のみ返す | Anthropic公式「Effective context engineering」記事の記述、定量値は「1000-2000トークン/要約」のみ、削減率の数値なし | 公式ガイダンスだが定量比較なし | 既にCLAUDE.mdの委譲ルール（general-purpose/haikuダイジェスト）と同型実装 | 参考情報止まり（レバー2と重複） |
| 8 | LLMLingua系プロンプト圧縮（LLMLingua-2, LongLLMLingua） | 小型モデルでperplexityスコアに基づき低情報トークンを除去、最大20倍圧縮 | Microsoft Research公式、独立ベンチマーク複数。ただしコーディングエージェントのツール出力・コードへの適用は精度劣化リスクが指摘されている | 中（学術的には確立、コード領域での実測は限定的） | Claude Code自体に統合機構なし。独自にローカル圧縮モデルをフックに挟む必要があり実装コスト大 | 見送り（実装コスト対効果が悪い） |
| 9 | サードパーティ「token-saver」系ツール群（token-saver-mcp, cc_token_saver_mcp, claude-token-saver等） | ①出力監視・警告、②小タスクをローカルLLMに委譲、③grep/catをベクトル検索に置換 | GitHubリポジトリの自己申告のみ、スター数少・実運用実績データなし | **Anecdotal〜None**（利用実績を示す一次データなし） | 個別インストール要、ハーネスの「設定ファイル/hook/MCPのみ」方針と相性が悪いものが多い | 見送り |
| 10 | 「Local-Splitter」7手法測定論文（arxiv 2604.12301） | プロンプトキャッシュ／ローカル推論／LLMLingua圧縮／コンテキスト刈込／RAG最適化／早期停止／ハイブリッドルーティングの7手法を比較 | 論文自称値（各手法20-55%削減）だが要約時点でメソドロジー記述が薄く、プレプリント未査読、SWE-Bench実測と称するが詳細検証できず | **低（未査読プレプリント、要約経由で二次確認不可）** | 個別手法として#2#5#6と重複 | 参考情報止まり・単体では非採用 |
| 11 | `--max-turns` / `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | ターン数上限・出力トークン上限で暴走を打ち切る | 公式フラグとして存在（headless向け）、削減量の測定値は見つからず | Anecdotal（フラグの存在は一次情報だが効果測定なし） | ハーネスから即座に付与可能 | 補助レバー（単体で本命にはならない） |
| 12 | Effort levels（`/effort`, `--effort`） | 推論・thinkingトークン量を段階的に絞る | 公式Docs: Sonnet 5はデフォルトhigh。低effortでthinkingトークン減、`MAX_THINKING_TOKENS`環境変数でも調整可 | 公式仕様だが定量的な削減率の実測は未提示 | `claude -p --effort <level>`で直接指定可、既存ハーネスと完全整合 | **有望（設定一発、既存ハーネスにそのまま乗る）** |

## 各見出しの一次情報

- Context editing（API仕様）: https://platform.claude.com/docs/en/build-with-claude/context-editing
- Claude Code側の未公開状態: https://github.com/anthropics/claude-code/issues/26215 （closed, not planned）
- Auto-compaction実測ブログ（-58.6%事例）: https://ianlpaterson.com/blog/stop-claude-code-from-lobotomizing-itself-mid-task/
- Anthropic公式「Effective context engineering for AI agents」: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- MCP Code Execution公式+ 独立検証: 公式パターンの解説記事群（Medium/TowardsAI要約経由）と独立再現 https://github.com/orgs/modelcontextprotocol/discussions/629
- Explore/Haikuサブエージェント比較（17倍・ハイブリッド-60%）: https://dev.to/suraj_khaitan_f893c243958/... （方法論の詳細開示は薄い、要注意）
- Effort仕様: https://platform.claude.com/docs/en/build-with-claude/effort
- Hooksによる出力圧縮の提案段階Issue: https://github.com/anthropics/claude-code/issues/44319, https://github.com/anthropics/claude-code/issues/31279
- LLMLingua公式: https://www.microsoft.com/en-us/research/blog/llmlingua-innovating-llm-efficiency-with-prompt-compression/
- プロンプトキャッシュ料金体系: https://platform.claude.com/docs/en/build-with-claude/prompt-caching

## 推奨: 次にベンチすべきTOP3

1. **PreToolUse/PostToolUseフックによるBash出力圧縮**（表#5）。理由: 設定ファイル/hookのみで実装でき、`disallowedTools`と同じ「ランタイムレバー」の型にきれいに嵌る。graphify-benchのコードタスクはテスト実行・grep・catのようなノイズの多いBash出力を大量に含むと想定され、機構的な妥当性が高い。ただし公式実測値がないため、自前でcondition設計→計測が必要。
   - **具体的な条件設計**: `.claude/settings.json`の`hooks.PreToolUse`に`Bash`用フックを追加し、コマンドが`npm test`/`pytest`/`grep -r`等のパターンにマッチしたら`| tail -n 100`相当の要約整形スクリプトを介在させる（exit codeは保持、失敗時は失敗箇所を先頭に残す）。対照群は同一タスクでフックなし。比較指標はbaselineベンチと同じ（total tokens, cost, wall time, accuracy）。
2. **Effort level引き下げ**（表#12）。理由: `claude -p --effort medium`（または`low`）一発で切替でき、既存ハーネスの条件定義（CLI flags）にそのまま追加できる最軽量の実験。公式に「thinkingトークンが出力トークンとして課金される」ことが明言されており、削減方向は理論的に保証されている。精度低下とのトレードオフを見るのが目的。
3. **Haikuサブエージェントルーティング（探索系タスクのみ）**（表#2）。理由: `disallowedTools`でAgent自体を禁止する既知の勝ち筋の「次の一手」として、Agent自体は許すがモデルをHaikuに固定する条件を作れば、委譲の効用を保ちながらコストを削れるか検証できる。ただしエビデンスがブログ一本のみで精度劣化リスクの指摘もあるため、accuracy計測を主指標にする。

見送り推奨: Context editing API直接制御（Claude Code CLIから到達不可）、LLMLingua系（実装コスト対効果が悪い）、サードパーティtoken-saver系ツール群（実績データなし、ハーネスの「設定/hook/MCPのみ」方針と不整合）。
