# ベンチマーク実験設計の調査（先行事例・統計・タスク設計）
## 調査日: 2026-09-02
---

## 1. 先行事例: コードナビゲーション/コンテキストツールのトークン削減測定

### 1.1 最重要の先行研究: "Does a Language Server Save Tokens for Coding Agents?"

[arXiv:2608.13568](https://arxiv.org/html/2608.13568)（"A Measurement Methodology and Preliminary Study"）は、今回のgraphify vs no-graphify実験と構造がほぼ同一の先行研究であり、方法論の土台として最も参考になる。

- **リサーチクエスチョン**: 「タスク成功率を揃えた上で（iso-accuracy）、意味的検索（LSP）は語彙的検索（grep）に比べ何トークン少なくコンテキストに積むか、そしてその差がマイナスに転じる条件は何か」
- **主指標**: **Tokens-to-Success (T2S)** = 成功したロールアウト全体の総消費トークン ÷ 成功ロールアウト数。単純な平均トークンではなく「成功時のみ」で正規化する点が重要（失敗した安いランを混ぜると見かけ上の効率が歪む）。
- **5アーム比較**: (A) grepのみ, (B) LSPのみ, (C) grep+LSP自由選択（現実的な設定）, (D) 意味検索を強制, (E) 静的repo-map（未検証）
- **タスク分類**: シンボル特定(localization)、参照網羅性(reference-completeness)、単一ファイル編集、複数ファイルにまたがるリネーム — SWE-benchシリーズから客観的に検証可能な形で抽出
- **モデル**: Claude Opus 4.8 / Sonnet 4.6 / Haiku 4.5、各タスク**2〜3反復**（タスク数はlocalization 6件、reference 5〜6件、edit 6件、rename 6件と小規模）
- **統計**: F1平均・precision/recall分解・変化率(%)を報告するのみで、**信頼区間や有意性検定は行っていない**（著者自身が「preliminary, small N」と明言）

**結果（意味的検索は常に得とは限らない、が本調査の核心）**:

| モデル | grepのみ | LSPのみ | 差分 |
|---|---|---|---|
| Opus 4.8 | 920 tokens | 971 tokens | **+6%（LSPの方が高い）** |
| Sonnet 4.6 | 606 tokens | 1,319 tokens | **+118%（LSPの方が高い）** |
| Haiku 4.5 | 11,911 tokens | 8,799 tokens | **−26%（LSPが節約）** |

自由選択条件では、モデルは自発的にほぼgrepを選び続けた（意味検索ツールの使用率0〜6%）。複数ファイルリネームでは、grepのみが**100%成功**したのに対し、LSPの「位置情報のみ」提供では**67%成功**まで低下（呼び出し箇所を取りこぼす）。LSPの結果にテキスト文脈を埋め込むと83%まで回復した。

**含意**: 「grepノイズ量（grep precision）」が低いタスクほどLSP/意味検索の恩恵が大きく（相関係数の傾き ≈ −0.49）、逆に的が絞れているタスクでは意味検索は無駄であることが定量的に示された。→ graphifyベンチでも**タスクの多様性**（曖昧検索が要るタスク／シンボルが一意なタスク）を意図的に混在させ、「常に勝つ」という単純化した結論を避けるべき。

### 1.2 ManoMano Tech "Project Aegis": Claude Code vs Serena MCP（36,407行のJavaコードベース）

[Medium記事](https://medium.com/manomano-tech/project-aegis-benchmarking-ai-agents-and-why-serena-is-our-new-must-have-311673db35dd)（本文は403でWebFetch不可のため検索スニペット経由。一次情報の完全性は限定的な点に留意）。

- Vanilla Claude／Claude Code内蔵LSP／Claude + Serena MCPの3系統を、実運用規模の決済サービス（Java, 36K行）でリファクタリングタスクとして比較。
- Serena構成: 完走45分、コスト$27.30、全テスト成功でビルドも通過。サブエージェント生成数はわずか4（Vanilla Claudeは無秩序に多数のサブエージェントを乱立させ迷子になった、との記述）。
- 単純な「関数の使用箇所探索」タスクでは素のClaudeとSerenaで**差がほぼ無かった**（コスト・精度とも同等）— 簡単なタスクでツールの恩恵は消える、という重要な反証。
- Claude Code内蔵LSPは**同名メソッドを取り違えるハルシネーションが発生**し、自律タスクには非推奨と結論。
- 深い改修（アーキテクチャ変更・テスト作成含む編集タスク）では意味検索ツールが「必須」レベルで有利、という結論だが、**反復数・統計処理は不明**（企業ブログであり査読なし、N=1試行の可能性が高い）。→ 数値の再現性・信頼区間は保証されない参考情報として扱う。

### 1.3 Aiderのrepo-map

[aider.chat/docs/repomap.html](https://aider.chat/docs/repomap.html) / [aider.chat/2023/10/22/repomap.html](https://aider.chat/2023/10/22/repomap.html)

- tree-sitterでファイル間の依存関係グラフを構築し、PageRank類似のグラフランキングでトークン予算内（デフォルト`--map-tokens`=1024）に収まる「最重要な断片」だけをコンテキストに注入する仕組み。全文を読ませない設計思想はgraphifyと共通。
- Aider公式のpolyglotベンチマークは225問の固定問題セットをモデルごとに走らせ、ドル建てコストを公表する方式。ただし**Aider自身の問題セット・自前ハーネス**であり、SWE-benchなど第三者ベンチマークとの直接比較は非推奨と明言されている（自社ツール優位に出やすい設計バイアスへの注意）。
- 「Aiderはトークン4.2倍少ない」という主張は[morphllm.comの比較記事](https://www.morphllm.com/comparisons/morph-vs-aider-diff)由来だが、これは競合ツールベンダーのマーケティング記事であり方法論の開示が薄い。**引用には注意**（信頼度: 低）。

### 1.4 Anthropic公式: コンテキストエンジニアリング関連の技術記事

- [Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp): ツール定義とツール結果を都度コンテキストに流し込む代わりに、エージェントにコードを書かせてMCPサーバ呼び出しをコード内で完結させ、要約のみをコンテキストに返す方式。自社の例示で**150,000トークン→2,000トークン（約98.7%削減）**。GitHub MCPサーバへの実装展開でも98%削減を維持したとの追試報告あり（[modelcontextprotocol/discussions#629](https://github.com/orgs/modelcontextprotocol/discussions/629)）。ただしこれは「ツール結果の中間データをコンテキストに全部流すか否か」の比較であり、**コードナビゲーション（grep vs グラフ問い合わせ）とは軸が異なる**点に注意 — graphifyの主張（AST由来知識グラフでファイル全文read削減）とは別カテゴリの削減源。
- [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents): コンテキストは希少資源であり収穫逓減するという前提の下、compaction／tool-result clearing／memoryの3戦略を提示。定量ベンチマークではなく設計原則の提示に留まる。

### 1.5 先行事例比較表

| ツール/研究 | 主張された削減 | 測定方法 | 留意点・批判 |
|---|---|---|---|
| arXiv 2608.13568（LSP vs grep） | タスク依存で **−26%〜+118%**（一貫した勝者なし） | Tokens-to-Success（成功時正規化）、5アーム比較、2〜3反復/タスク | 著者自ら「preliminary, small N」と明記。信頼区間なし。Python限定、TypeScript未検証 |
| ManoMano Project Aegis（Serena） | 大規模改修で有利（時間・コスト・信頼性）、単純タスクは**差なし** | 実運用コードベース1本での比較、反復数不明 | 査読なし企業ブログ、N不明で統計的裏付けが弱い |
| Aider repo-map | 自称「4.2倍少ない」（第三者記事） | 225問の自社ベンチ（他社比較は競合ブログ由来で方法論不透明） | 自前ハーネスにつき他ベンチとの直接比較非推奨と公式が明言。マーケ記事の数字は信頼度低 |
| Anthropic Code execution with MCP | **約98.7%削減**（150k→2k tokens） | 自社デモ例＋GitHub MCPでの追試 | ツール結果の中間データ削減が主眼で、コードナビゲーション手法の比較ではない |

---

## 2. タスク設計に使えるアカデミック/業界ベンチマーク

### 2.1 SWE-bench Verified

[Epoch AI](https://epoch.ai/benchmarks/swe-bench-verified) / [OpenAI発表](https://openai.com/index/introducing-swe-bench-verified/)

- 実際のGitHub issueと対応する修正PRのペアから、人手検証済みの**500件**に絞ったサブセット。
- 手順: issue記述＋リポジトリを与える → パッチ(unified diff)を生成 → リポジトリに適用 → テストスイートを実行 → 全テスト成功で成功と判定。
- 主指標: **% Resolved**（解決率）のみ。トークン数やコストは標準的には計測対象外（別途計測が必要）。
- 示唆: 「issueを渡して修正パッチを作らせ、テストで自動採点する」という**客観的な正誤判定パターン**は本ベンチマークにもそのまま流用できる（バグ修正カテゴリのタスクに最適）。

### 2.2 RepoQA

[arXiv:2406.06025](https://arxiv.org/abs/2406.06025) / [evalplus.github.io/repoqa.html](https://evalplus.github.io/repoqa.html)

- **Searching Needle Function (SNF)**タスク: 自然言語の説明文だけから該当関数を探し当てさせる。500問、50リポジトリ、5言語。
- 単純な「haystack内の文字列を一致検索する」テストと違い、**コードの意味理解を要求**する設計（コメントを消すと成績が下がる、など）。
- 示唆: 「シンボル特定」カテゴリのタスク文言を、直接の関数名ではなく**自然言語の機能記述**にすることで、grep一発では解けない・グラフ探索の価値が出やすいタスクを作れる。

### 2.3 タスクカテゴリの整理（本ベンチマークへの適用案）

先行研究を踏まえ、以下5分類がコード理解エージェントの評価で繰り返し登場するパターンである。

1. **シンボル特定 / ローカライゼーション** — 「Xを実装している箇所はどこか」
2. **データフロー / 呼び出し関係のトレース** — 「この関数を呼んでいる箇所を全て挙げよ」（多対多の参照網羅性、grepが弱い領域）
3. **アーキテクチャ説明** — 「このモジュールの責務と依存関係を説明せよ」（RepoQA的な意味理解寄り）
4. **影響範囲分析 (impact analysis)** — 「このインターフェースを変更した場合に影響するファイル一覧」
5. **小規模バグ修正 / 機能追加** — SWE-bench型、テストで客観的に正誤判定可能

---

## 3. 実験設計上の統制事項と交絡要因

### 3.1 プロンプトキャッシュの交絡

[Don't Break the Cache](https://arxiv.org/html/2601.06007)（長期タスクにおけるプロンプトキャッシュの評価）が指摘する要点:

- **ターン間キャッシュはエージェント構成次第で機能しない場合がある** — 同論文の観測では、`claude-sonnet-4-6`使用時にターンをまたいだキャッシュ読み取りが起きず、毎ターン全文を書き込み続けるケースが報告されている。一方、1ターン内のサブターン（ツール呼び出しの連鎖）ではキャッシュ読み取りが機能する。
- **含意**: with/without graphifyの2条件を比較する際、システムプロンプト長やツール定義の差でキャッシュヒット率自体が変わり、「入力トークン数」だけでなく「キャッシュ読み取り分と新規書き込み分の内訳」も分けて記録しないと、コスト比較が歪む。**課金は cache write/read/通常inputで単価が異なる**ため、生トークン数だけでなくUSDベースでも報告すべき。

### 3.2 モデルがコードベースを「知っている」ことによる交絡

- 有名OSSリポジトリ（Next.jsの実サンプルアプリ、著名なボイラープレート等）を対象にすると、モデルが**事前学習で構造を覚えている**可能性があり、grep/読み込みなしでも正答できてしまう（[data contamination](https://arxiv.org/html/2502.14425v2)の一般的な問題として、HumanEval/MBPPでも指摘されている汚染問題と同型）。
- **対策**: 中規模Next.js/TypeScriptコードベースは、ゼロから合成生成した独自コードベース（有名ライブラリのクローンでなく、独自の命名・ディレクトリ構成を持つオリジナル実装）を使うべき。これにより「知識グラフを引いたから分かった」のか「元々知っていた」のかを切り分けられる。

### 3.3 正答率とトークン削減のトレードオフ

- 1.1のarXiv論文が示す通り、**トークンが減っても正答率が落ちるなら比較として無意味**（LSPの位置情報のみでリネームタスクの成功率が100%→67%に落ちた例）。
- 必須設計: 各タスクに**客観的な正誤判定基準（ground truthキー、または自動テスト実行）**を用意し、**iso-accuracy**（正答したランのみ）でトークン数を比較する。LLM-as-judgeを使う場合は、判定基準を明文化したルーブリックと、判定者モデルをwith/without双方から独立させる（同一モデルの出力を採点しない）。

---

## 4. 小N・ペア比較の統計手法

- ブートストラップ信頼区間が現在の標準的手法（[Bootstrap CIs for LLM eval](https://dev.to/marcuswwchen/bootstrap-confidence-intervals-for-your-llm-eval-metrics-3599), [Indeed Engineering](https://engineering.indeedblog.com/blog/2026/07/bootstrap-confidence-intervals-for-llm-evaluation/)）。
- 手順: タスクごとにwith/withoutのペア差分（トークン数、コスト）を算出 → タスクをリサンプリング（復元抽出）しつつ、各タスク内の反復ランも一緒に持ち回る → 平均ペア差分を再計算 → **B=2,000回程度**のリサンプリングで2.5〜97.5パーセンタイルを95%信頼区間とする。
- 分布が歪みやすい（トークン数は裾の重い分布になりがち）ため、**中央値とIQR（四分位範囲）**を主要な要約統計として併記し、平均値だけに頼らない。
- **効果量**: ペア差分を分母（withoutの中央値）で正規化した相対削減率（%）に加え、Wilcoxon符号順位検定のr値や、単純なCliff's deltaなどノンパラメトリックな効果量を報告すると頑健。
- **妥当なN**: 費用対効果を踏まえ、**タスク15〜20件 × 各3反復**（実行順はwith/withoutをタスクごとに交互配置してランダム化、時間帯によるAPI側の変動も分散させる）を推奨。上記1.1の先行研究がタスクあたり2〜3反復で「preliminary」を自認している水準感とも整合する。反復を増やすほどブートストラップCIは狭まるが、コストとのトレードオフになる（次節）。

---

## 5. コスト試算（Claude Sonnet 5, 2026年9月時点）

[Anthropic公式Pricingページ](https://platform.claude.com/docs/en/about-claude/pricing)に基づく確認済み単価:

- 入力トークン: **$2 / 1Mトークン**
- 出力トークン: **$10 / 1Mトークン**
- キャッシュ読み取り: **$0.20 / 1Mトークン**
- バッチ入力: **$1 / 1Mトークン**

（2026年8月10日にAnthropicは当初予定していた$3/$15への値上げを撤回し、$2/$10を恒久価格として確定 — [pricepertoken.com](https://pricepertoken.com/pricing-page/model/anthropic-claude-sonnet-5), [spendline.ai](https://www.spendline.ai/pricing/anthropic/claude-sonnet-5/) 等の複数の価格集計サイトが同一の数字を報告）

### 試算（1タスク1ランあたり200k〜800kトークン想定、入力:出力=約9:1、キャッシュ考慮せず保守的に見積もり）

| 入力トークン想定 | 入力コスト | 出力コスト目安(10%) | 1ラン概算 |
|---|---|---|---|
| 200,000 | $0.40 | 出力20k→$0.20 | 約 **$0.60** |
| 500,000 | $1.00 | 出力50k→$0.50 | 約 **$1.50** |
| 800,000 | $1.60 | 出力80k→$0.80 | 約 **$2.40** |

**タスク15件 × 3反復 × with/without 2条件 = 90ラン**として、1ランあたり中央値$1.50と仮定すると総額は約**$135**。ここにキャッシュ効果（キャッシュ読み取り$0.20/M適用で実際はより安価になる可能性が高い）を加味すれば実費はこれより下振れしやすく、逆に大規模コードベースを繰り返し全文読みさせる「withoutグラフ」条件はキャッシュヒットしにくく上振れしやすい点に注意（3.1参照）。**$150〜300程度を予算上限の目安**とするのが現実的。

---

## 6. レポーティングの型と再現性

- **結果表の型**: タスクID×条件（with/without）を行に、入力トークン・出力トークン・総コスト(USD)・ターン数・ツール呼び出し回数・正誤・壁時計時間を列に持つロング形式の生データ表を必ず残し、集計表（カテゴリ別中央値＋ブートストラップ95%CI）は別途要約として提示する。
- **図**: タスクごとのペア差分をカテゴリ別に箱ひげ図または点+誤差棒（95%CI）で示すのが、SWE-bench系論文でも一般的な提示形式。
- **再現性の担保**: (1) Claude Codeのバージョン・モデルID（例: `claude-sonnet-5`固定、日付明記）、(2) graphifyのバージョン/コミットハッシュ、(3) 対象コードベースのコミットハッシュ、(4) 実行スクリプトとプロンプトテンプレートをリポジトリにコミット、(5) 各ランの生JSONログ（トークン内訳・ツール呼び出しログ）をリポジトリまたはartifactとして保存 — これらを揃えて初めて「同じ条件で再実行すれば同じ傾向が出る」ことを主張できる。

---

## 7. 推奨・結論

### タスクタクソノミー（5カテゴリ × 3〜4タスク、計15〜18タスク）

1. **シンボル特定**（3タスク）: 自然言語記述から関数/コンポーネントの実装箇所を特定させる（RepoQA型、grep一発で解けない曖昧な表現を意図的に使う）
2. **参照網羅 / データフロー追跡**（4タスク）: 「このAPIエンドポイントを呼んでいる全てのコンポーネントを列挙」「この型を使っている箇所を全て挙げよ」（1.1のarXiv論文でgrepとLSPの差が最も出た領域）
3. **アーキテクチャ説明**（3タスク）: 「この機能のリクエストからDBまでの流れを説明せよ」等、複数ファイルにまたがる俯瞰理解
4. **影響範囲分析**（3〜4タスク）: 「この関数のシグネチャを変更した場合に修正が必要なファイル一覧」（正誤判定はground truthのファイルリストとの一致率で自動採点可能）
5. **小規模バグ修正/機能追加**（3〜4タスク）: SWE-bench型。テスト自動実行でpass/failを客観判定

### 反復数・統計

- 各タスク×各条件で**3反復**（15〜18タスク×2条件×3反復＝90〜108ラン）
- タスク単位でペア差分をブートストラップ（B=2,000）し、95%CIと中央値・IQRを報告。平均だけに頼らない。
- 実行順序はwith/withoutを交互にランダム化し、時間帯・APIレイテンシ変動を両条件に均等配分。

### 正誤判定

- カテゴリ1・2・4は**自動採点**（ground truthのファイル/シンボルリストとの一致率、Precision/Recall/F1）が可能で望ましい。恣意性が入らずiso-accuracy比較がしやすい。
- カテゴリ3（説明系）と5（バグ修正で複数の妥当解がありうる場合）は、ルーブリックを用いた**LLM-as-judge**（採点用モデルはwith/without両条件から独立させ、graphify使用の有無を判定プロンプトに含めない= blind評価）を併用し、人手サンプル検証（全体の20%程度を人間が再チェック）で判定の妥当性を担保する。
- **トークン削減の主張は必ずiso-accuracy（正答したランのみ）で行う**。正答率が条件間で異なる場合は、削減率の数字ではなく「正答率×トークン効率」を主要な結論とする。

### コスト・汚染対策

- 対象コードベースは**独自合成生成のNext.js/TypeScriptアプリ**とし、有名OSSの流用は避ける（学習データ汚染の排除）。
- 総予算目安は**$150〜300**（Claude Sonnet 5、$2/$10単価、キャッシュ効果込みでこれより安価になる可能性が高い）。

---

## 参考リンク

- [Does a Language Server Save Tokens for Coding Agents? A Measurement Methodology and Preliminary Study (arXiv:2608.13568)](https://arxiv.org/html/2608.13568)
- [Project Aegis: Benchmarking AI Coding Agents — ManoMano Tech](https://medium.com/manomano-tech/project-aegis-benchmarking-ai-agents-and-why-serena-is-our-new-must-have-311673db35dd)
- [oraios/serena — GitHub](https://github.com/oraios/serena)
- [Aider Repository map](https://aider.chat/docs/repomap.html)
- [Building a better repository map with tree sitter — aider](https://aider.chat/2023/10/22/repomap.html)
- [Introducing SWE-bench Verified — OpenAI](https://openai.com/index/introducing-swe-bench-verified/)
- [SWE-bench Verified — Epoch AI](https://epoch.ai/benchmarks/swe-bench-verified)
- [RepoQA: Evaluating Long Context Code Understanding (arXiv:2406.06025)](https://arxiv.org/abs/2406.06025)
- [RepoQA project page](https://evalplus.github.io/repoqa.html)
- [Code execution with MCP — Anthropic Engineering](https://www.anthropic.com/engineering/code-execution-with-mcp)
- [Effective context engineering for AI agents — Anthropic Engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Production Results: MCP Server for GitHub Validates Anthropic's Code-First Pattern (98% Token Reduction)](https://github.com/orgs/modelcontextprotocol/discussions/629)
- [Claude Platform Pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- [Claude Sonnet 5 API Pricing — pricepertoken.com](https://pricepertoken.com/pricing-page/model/anthropic-claude-sonnet-5)
- [Claude Sonnet 5 Pricing — Spendline](https://www.spendline.ai/pricing/anthropic/claude-sonnet-5/)
- [Don't Break the Cache: An Evaluation of Prompt Caching for Long-Horizon Agentic Tasks (arXiv:2601.06007)](https://arxiv.org/html/2601.06007)
- [A Survey on Data Contamination for Large Language Models (arXiv:2502.14425)](https://arxiv.org/html/2502.14425v2)
- [Bootstrap confidence intervals for your LLM eval metrics — DEV Community](https://dev.to/marcuswwchen/bootstrap-confidence-intervals-for-your-llm-eval-metrics-3599)
- [Bootstrap Confidence Intervals for LLM Evaluation — Indeed Engineering Blog](https://engineering.indeedblog.com/blog/2026/07/bootstrap-confidence-intervals-for-llm-evaluation/)
