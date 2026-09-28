"""Build docs/report-opus-ja.html from easy.json / hard.json (extract.py output)."""
import json, sys

import os
HERE = os.path.dirname(os.path.abspath(__file__))
# easy.json / hard.json come from extract.py (results/opus, results/hard); pass their dir as argv[2].
S = sys.argv[2] if len(sys.argv) > 2 else HERE
E = json.load(open(S + "/easy.json"))
H = json.load(open(S + "/hard.json"))
head = open(os.path.join(HERE, "head.html")).read()
OUT = sys.argv[1]

NAME = {
    "opus-effort-low": "Opus 5.5 · low",
    "opus-effort-medium": "Opus 5.5 · medium",
    "opus-effort-high": "Opus 5.5 · high",
    "opus-effort-xhigh": "Opus 5.5 · xhigh",
    "effort-low-nosub": "Sonnet 5 · low · 委譲禁止",
    "effort-low": "Sonnet 5 · low",
    "effort-medium": "Sonnet 5 · medium",
    "effort-high": "Sonnet 5 · high",
    "effort-xhigh": "Sonnet 5 · xhigh",
}
ORDER = list(NAME)


def usd(v, sign=False):
    s = f"{abs(v):.3f}"
    if sign:
        return ("−" if v < 0 else "+") + "$" + s
    return "$" + s


def sec(v, sign=False):
    s = f"{abs(v):.0f} s"
    if sign:
        return ("−" if v < 0 else "+") + s
    return s


def ktok(v, sign=False):
    s = f"{abs(v)/1000:,.0f}k"
    if sign:
        return ("−" if v < 0 else "+") + s
    return s


def pct(ok, n):
    return f"{100*ok/n:.1f}%"


def arm_table(D, cats):
    rows = []
    for a in ORDER:
        v = D["arms"][a]
        catcells = "".join(
            f'<td class="n">{v["bycat"].get(c, [0, 0])[0]}/{v["bycat"].get(c, [0, 0])[1]}</td>' for c in cats
        )
        sub = f'{v["sub_runs"]}/{v["n"]}' if not a.startswith("opus") and a != "effort-low-nosub" else ("—" if a == "effort-low-nosub" else f'{v["sub_runs"]}/{v["n"]}')
        rows.append(
            f'<tr><td>{NAME[a]}</td><td class="n"><b>{v["acc"]}/{v["graded"]}</b></td>{catcells}'
            f'<td class="n">{usd(v["cost_med"])}</td><td class="n">{usd(v["cost_per_success"])}</td>'
            f'<td class="n">{ktok(v["tok_med"])}</td><td class="n">{sec(v["wall_med"])}</td>'
            f'<td class="n">{v["turns_med"]:g}</td><td class="n">{sub}</td></tr>'
        )
    cathead = "".join(f'<th class="n">{c}</th>' for c in cats)
    return (
        '<div class="tbl"><table class="rep"><thead><tr><th>arm</th><th class="n">正解</th>'
        + cathead
        + '<th class="n">cost</th><th class="n">$/正解</th><th class="n">tokens</th>'
        '<th class="n">wall</th><th class="n">turns</th><th class="n">委譲</th></tr></thead><tbody>'
        + "".join(rows)
        + "</tbody></table></div>"
    )


PAIRS = [
    ("opus-effort-low|effort-low", "Opus low − Sonnet low"),
    ("opus-effort-medium|effort-medium", "Opus medium − Sonnet medium"),
    ("opus-effort-high|effort-high", "Opus high − Sonnet high"),
    ("opus-effort-xhigh|effort-xhigh", "Opus xhigh − Sonnet xhigh"),
    ("opus-effort-low|effort-xhigh", "Opus low − Sonnet xhigh"),
    ("opus-effort-low|effort-low-nosub", "Opus low − Sonnet low 委譲禁止"),
    ("opus-effort-medium|effort-low-nosub", "Opus medium − Sonnet low 委譲禁止"),
    ("opus-effort-medium|opus-effort-low", "Opus medium − Opus low"),
    ("opus-effort-high|opus-effort-low", "Opus high − Opus low"),
    ("opus-effort-xhigh|opus-effort-low", "Opus xhigh − Opus low"),
    ("effort-xhigh|effort-low", "Sonnet xhigh − Sonnet low"),
    ("effort-low-nosub|effort-low", "Sonnet 委譲禁止 − Sonnet 委譲あり"),
]


def cell(m, fmt):
    crosses = m["lo"] <= 0 <= m["hi"]
    cls = "q" if crosses else ("g" if m["mean"] < 0 else "b")
    return f'<td class="n {cls}">{fmt(m["mean"], True)} <span class="q">[{fmt(m["lo"], True)}, {fmt(m["hi"], True)}]</span></td>'


def okcell(m):
    crosses = m["lo"] <= 0 <= m["hi"]
    p = lambda v: f"{v*100:+.1f}pt".replace("+-", "−").replace("-", "−")
    cls = "q" if crosses else ("g" if m["mean"] > 0 else "b")
    return f'<td class="n {cls}">{p(m["mean"])} <span class="q">[{p(m["lo"])}, {p(m["hi"])}]</span></td>'


def pair_table(D):
    rows = []
    for k, label in PAIRS:
        p = D["pairs"][k]
        rows.append(
            f'<tr><td>{label}</td>{cell(p["cost"], usd)}{cell(p["wall"], sec)}{cell(p["tok"], ktok)}{okcell(p["ok"])}</tr>'
        )
    return (
        '<div class="tbl"><table class="rep"><thead><tr><th>比較（タスク対応の平均差）</th><th class="n">cost / 本</th>'
        '<th class="n">wall / 本</th><th class="n">tokens / 本</th><th class="n">正解率</th></tr></thead><tbody>'
        + "".join(rows)
        + "</tbody></table></div>"
    )


def chart_rows(key):
    rows = []
    for setname, D in (("45 問", E), ("難問 16", H)):
        for k, label in PAIRS[:4] + [PAIRS[5]]:
            m = D["pairs"][k][key]
            rows.append({"label": f"{setname}　{label}", "point": m["mean"], "lo": m["lo"], "hi": m["hi"],
                         "crossesZero": m["lo"] <= 0 <= m["hi"]})
    return rows


ea, ha = E["arms"], H["arms"]
ep, hp = E["pairs"], H["pairs"]
OPUS = [a for a in ORDER if a.startswith("opus")]
SON = [a for a in ORDER if not a.startswith("opus")]
o_ok = sum(ha[a]["acc"] for a in OPUS); o_n = sum(ha[a]["graded"] for a in OPUS)
s_ok = sum(ha[a]["acc"] for a in SON); s_n = sum(ha[a]["graded"] for a in SON)
easy_cost = sum(v["cost_sum"] for v in ea.values())
hard_cost = sum(v["cost_sum"] for v in ha.values())


def card(a, cls, res):
    v = ha[a]
    return f'''<div class="card {cls}"><div class="who">{NAME[a]}<small>難問 16 問 × 2 回</small></div>
  <div class="res">{res}</div>
  <div class="kv"><span>正解</span><b>{v["acc"]}/{v["graded"]}</b><span>cost 中央値</span><b>{usd(v["cost_med"])}</b>
  <span>wall 中央値</span><b>{sec(v["wall_med"])}</b><span>turns 中央値</span><b>{v["turns_med"]:g}</b></div></div>'''


body = f'''
<body>
<div class="wrap">
  <p class="eyebrow">graphify-bench · モデル比較 · 2026-09-25〜26</p>
  <h1>Opus 5.5 は low から xhigh まで難問を全問正解した。Sonnet 5 が同じ正答率に届くのは xhigh だけで、そのとき 1 本あたり約 3 倍のコストと 7 倍の時間がかかる。</h1>
  <p class="lede col">Opus 5.5 と Sonnet 5 を、<code>--effort</code> の low・medium・high・xhigh の 4 段階でそれぞれ比べた。Taskflow コーパスで 2 つの問題セットを解かせている。既存の 45 問（場所探し・参照列挙・説明・影響範囲・小さな修正）で 405 run、新しく作った難問 16 問（隠しテストで採点）を 2 回ずつで 288 run。合計 693 run、API 実費 ${easy_cost + hard_cost:.2f}。外部ツールは入れていない素の Claude Code 同士の比較で、変えたのは <code>--model</code> と <code>--effort</code> だけ。</p>
  <p class="kicker col">Sonnet 側には <code>--disallowedTools Agent</code>（subagent への委譲禁止）の arm も置いた。Sonnet の遅さと高さの大半が委譲から来ていたので、モデルの差と委譲の差を切り分けるためだ。</p>

  <h2 class="col">難問 16 問の結果</h2>
  <div class="col"><p>難問は、見えるテストでは欠陥が分からないように作ってある。採点用のテストはエージェントが終わってから差し込むので、エージェントは読めない。修正 8 問（複数の欠陥を仕込んだもの、症状と原因が離れた単一の欠陥）と実装 8 問（新機能、横断的な仕様変更）で、どれも 3 ファイル以上・2 層以上にまたがる。</p></div>
  <div class="board">
    {card("opus-effort-low", "win", "全問正解・最安・最速")}
    {card("opus-effort-xhigh", "draw", "全問正解・low の約 3 倍")}
    {card("effort-low", "lose", "2 本落とす")}
    {card("effort-xhigh", "lose", "全問正解・最も高く遅い")}
  </div>
  {arm_table(H, ["fix", "implement"])}
  <p class="cap">cost・tokens・wall・turns は 1 本あたりの中央値。$/正解 = arm の総費用 ÷ 正解数。turns は main セッションのターン数で、subagent の中のターンは数えない。委譲の列は subagent を 1 回以上起動した run の数。</p>

  <div class="verdict col">
    <p><b>正答率。</b>Opus は 4 段階すべてで 32/32、合計 {o_ok}/{o_n}。Sonnet は 5 arm 合計で {s_ok}/{s_n}（{pct(s_ok, s_n)}）で、片側 Fisher 検定で p ≈ 0.015。失敗 7 本のうち 6 本は HFX8 に集中していて、Sonnet の HFX8 の成績は effort を上げるほど良くなる（low 0/2 → medium 1/2 → high 1/2 → xhigh 2/2）。</p>
    <p><b>速さとコスト。</b>Opus low はどの Sonnet arm よりも、同じタスク同士で安くて速い。一番手強い委譲禁止の Sonnet low と比べても {usd(hp["opus-effort-low|effort-low-nosub"]["cost"]["mean"], True)}/本、{sec(hp["opus-effort-low|effort-low-nosub"]["wall"]["mean"], True)}/本で、どちらも CI が 0 をまたがない。</p>
    <p><b>effort を揃えて比べても Opus が勝つ。</b>high 同士で {usd(hp["opus-effort-high|effort-high"]["cost"]["mean"], True)}/本、{sec(hp["opus-effort-high|effort-high"]["wall"]["mean"], True)}/本。xhigh 同士でも {usd(hp["opus-effort-xhigh|effort-xhigh"]["cost"]["mean"], True)}/本、{sec(hp["opus-effort-xhigh|effort-xhigh"]["wall"]["mean"], True)}/本。Sonnet が全問正解に届く xhigh と Opus low を比べると、Opus low の方が {usd(hp["opus-effort-low|effort-xhigh"]["cost"]["mean"], True)}/本、{sec(hp["opus-effort-low|effort-xhigh"]["wall"]["mean"], True)}/本。</p>
    <p><b>Opus の effort。</b>high は low より {usd(hp["opus-effort-high|opus-effort-low"]["cost"]["mean"], True)}/本、xhigh は {usd(hp["opus-effort-xhigh|opus-effort-low"]["cost"]["mean"], True)}/本高いのに、正答率は 32/32 のまま。この問題セットは Opus にとってはまだ天井で、effort の効き目は測れなかった。</p>
  </div>

  <h3>タスクで対応を取った差（難問、16 タスク、2 回の平均、95% bootstrap CI）</h3>
  {pair_table(H)}
  <p class="cap">緑 = 左の arm が有利で CI が 0 をまたがない。赤 = 不利で CI が 0 をまたがない。灰色 = 差があるとは言えない。正解率は「左が解けた割合 − 右が解けた割合」。</p>

  <h3>Sonnet が落とした問題</h3>
  <ul class="col">
    <li><b>HFX8（設定の部分保存で他の設定がリセットされる）</b>で Sonnet は 1/6、Opus は 4/4。Sonnet は、送られてこなかった設定がリセットされる問題は直せていた。一方で、わざと送った <code>0</code>（深夜 0 時の digest）や <code>[]</code> まで既定値（digest 時刻の 7 時など）に戻ってしまう点を見落としている。zod 4 の <code>.partial()</code> はデフォルト値を残すという落とし穴そのものだ。失敗した 5 本はどれも 4〜11 ターンで「直った」と判断して終わっていた。唯一の正解は、subagent に丸投げした Sonnet medium の 1 本（$0.90、213 s）。</li>
    <li><b>HIM2（ラベル統合）</b>で Sonnet の委譲禁止 arm が 1/2。Opus は 4 本とも 4〜7 ターン、約 $0.18〜0.25 で解いた。</li>
  </ul>

  <h3>重い問題ではターン数が 4〜5 倍に開く</h3>
  <div class="col">
    <p>横断的な仕様変更の 3 問（HIM5 席課金、HIM6 非公開プロジェクト、HIM7 unassign イベント）で、Sonnet はどの arm も 44〜61 ターンを使った。Opus は 8〜19 ターン。Sonnet の 4 本は <code>--max-turns 60</code> の上限に達して <code>error_max_turns</code> で終わっている（上限前に修正が済んでいたので、4 本とも隠しテストは通った）。上限がもう少し低ければ、これらは不正解になっていた。</p>
  </div>

  <h2 class="col">既存 45 問の結果</h2>
  <div class="col"><p>こちらは天井に張り付いている。9 arm すべてが 35〜39/45（78〜87%）の範囲に収まり、以前の計測では Haiku 4.5 ですら 80% だった。この問題セットではモデルの賢さは比べられない。差が出るのは速さとコストで、その原因は委譲にある。</p></div>
  {arm_table(E, ["locate", "reference", "explain", "impact", "fix"])}
  <p class="cap">列の意味は難問の表と同じ（1 本あたりの中央値）。locate〜fix は各 9 問の正解数。</p>
  {pair_table(E)}

  <h3>Sonnet が遅くて高かったのは、委譲のせい</h3>
  <div class="col">
    <p>素の Sonnet は 45 問で、low と medium で 26 本（58%）、high で 22 本、xhigh で 18 本の run で <code>Agent</code> を呼び、探索を subagent（中身も Sonnet）に丸投げしていた。Opus は 4 段階の effort を通して 308 run（45 問 180 本、難問 128 本）で一度も委譲していない。並列に投げるわけではなく 1 体に渡して待つだけで、戻ってきた結果を main がもう一度確かめる。だから委譲した run は遅くて高い。</p>
  </div>
  <div class="tbl"><table class="rep"><thead><tr><th>Sonnet arm</th><th class="n">自分でやった run の wall</th><th class="n">委譲した run の wall</th></tr></thead><tbody>
    <tr><td>45 問 · low</td><td class="n">{sec(ea["effort-low"]["wall_self"])}</td><td class="n">{sec(ea["effort-low"]["wall_sub"])}</td></tr>
    <tr><td>45 問 · medium</td><td class="n">{sec(ea["effort-medium"]["wall_self"])}</td><td class="n">{sec(ea["effort-medium"]["wall_sub"])}</td></tr>
    <tr><td>45 問 · high</td><td class="n">{sec(ea["effort-high"]["wall_self"])}</td><td class="n">{sec(ea["effort-high"]["wall_sub"])}</td></tr>
    <tr><td>45 問 · xhigh</td><td class="n">{sec(ea["effort-xhigh"]["wall_self"])}</td><td class="n">{sec(ea["effort-xhigh"]["wall_sub"])}</td></tr>
    <tr><td>難問 · low</td><td class="n">{sec(ha["effort-low"]["wall_self"])}</td><td class="n">{sec(ha["effort-low"]["wall_sub"])}</td></tr>
    <tr><td>難問 · medium</td><td class="n">{sec(ha["effort-medium"]["wall_self"])}</td><td class="n">{sec(ha["effort-medium"]["wall_sub"])}</td></tr>
    <tr><td>難問 · high</td><td class="n">{sec(ha["effort-high"]["wall_self"])}</td><td class="n">{sec(ha["effort-high"]["wall_sub"])}</td></tr>
    <tr><td>難問 · xhigh</td><td class="n">{sec(ha["effort-xhigh"]["wall_self"])}</td><td class="n">{sec(ha["effort-xhigh"]["wall_sub"])}</td></tr>
  </tbody></table></div>
  <div class="col">
    <p>委譲を禁止すると、Sonnet は 45 問では最安になる（cost 中央値 {usd(ea["effort-low-nosub"]["cost_med"])}、Opus low は {usd(ea["opus-effort-low"]["cost_med"])}）。同じタスク同士でも Opus low は {usd(ep["opus-effort-low|effort-low-nosub"]["cost"]["mean"], True)}/本高く、速さは互角。ただし難問では、委譲禁止にしても Opus low に負ける。<b>委譲を禁止する運用は実務では現実的でない</b>（長いセッションでのコンテキスト保護、並列の調べもの）。なので委譲禁止の arm は推奨ではなく、「委譲を判断する力がどれだけ効いているか」を見るための参照値として置いている。</p>
  </div>

  <h2 class="col">差の一覧</h2>
  <div class="col"><p>Opus − Sonnet の 1 本あたりの差を、effort を揃えた 4 組と、Opus low 対 委譲禁止の Sonnet low で並べた。マイナスが Opus 有利。点が平均、帯が 95% CI。</p></div>
  <div>
    <div class="chart" id="ci-cost"><div class="chart-head"><strong>cost / 本（USD）</strong></div><svg role="img" aria-label="Opus と Sonnet のコスト差と信頼区間"></svg></div>
    <div class="chart" id="ci-wall"><div class="chart-head"><strong>wall / 本（秒）</strong></div><svg role="img" aria-label="Opus と Sonnet の wall 差と信頼区間"></svg></div>
  </div>
  <div class="tip" id="tip" hidden></div>

  <h2 class="col">CursorBench との比較</h2>
  <div class="col"><p>Cursor の <a href="https://cursor.com/ja/cursorbench">CursorBench 4.0</a>（2026-09-10 版）は、Cursor の agent に長い作業をさせるベンチマークで、同じ 2 モデルを effort 別に測っている。ハーネスも問題も違うが、比べると方向の一致と、このベンチの限界が同時に見える。</p></div>
  <div class="tbl"><table class="rep"><thead><tr><th>CursorBench 4.0</th><th class="n">score</th><th class="n">cost / task</th><th class="n">steps / task</th></tr></thead><tbody>
    <tr><td>Opus 5.5 · High</td><td class="n">56.0%</td><td class="n">$3.97</td><td class="n">68</td></tr>
    <tr><td>Opus 5.5 · Medium</td><td class="n">52.5%</td><td class="n">$2.91</td><td class="n">54</td></tr>
    <tr><td>Opus 5.5 · Low</td><td class="n">43.7%</td><td class="n">$1.17</td><td class="n">28</td></tr>
    <tr><td>Sonnet 5 · High</td><td class="n">30.8%</td><td class="n">$3.48</td><td class="n">85</td></tr>
    <tr><td>Sonnet 5 · Medium</td><td class="n">28.0%</td><td class="n">$2.31</td><td class="n">65</td></tr>
    <tr><td>Sonnet 5 · Low</td><td class="n">24.1%</td><td class="n">$1.39</td><td class="n">46</td></tr>
  </tbody></table></div>
  <p class="cap">出典: cursor.com/ja/cursorbench（2026-09-26 取得）。Cursor 公表の単価をトークン数に掛けたコスト。</p>
  <ul class="col">
    <li><b>一致した点：Opus low は Sonnet low より安い。</b>CursorBench では $1.17 対 $1.39、こちらの難問では {usd(ha["opus-effort-low"]["cost_med"])} 対 {usd(ha["effort-low"]["cost_med"])}。単価は約 2 倍なのに、手数が少ないので安くなる。手数の比（Opus low ÷ Sonnet low）も、CursorBench の steps で 0.61、こちらの turns で {ha["opus-effort-low"]["turns_med"]/ha["effort-low"]["turns_med"]:.2f} とほぼ同じ。</li>
    <li><b>一致した点：Opus low は Sonnet のどの effort にも勝つ。</b>CursorBench では Sonnet High（30.8%、$3.48）より高得点で、コストは 3 分の 1。</li>
    <li><b>違った点：正答率の差の大きさ。</b>CursorBench では Opus low と Sonnet low の差が約 20pt、こちらは 100% 対 93.8%。こちらの難問は、まだ天井に近すぎる。</li>
    <li><b>違った点：effort の効き方。</b>こちらでは Opus の正答率が low から xhigh まで 32/32 で変わらず、Sonnet は 30/32 → 32/32 と effort に応じて少しずつ上がった。つまり、この難問は Opus にとってはまだ天井だ。CursorBench では low → medium で +8.8pt、medium → high で +3.5pt 上がり、Extra High は High と同じ 56.0% でコストが 1.75 倍になる。長い作業なら medium か high が得になり、費用対効果の山は High にある。</li>
    <li><b>ハーネスの違い。</b>Sonnet が subagent に委譲して遅くなる現象は Claude Code に固有で、CursorBench には現れない。</li>
  </ul>

  <h2 class="col">結論</h2>
  <div class="pair">
    <div><b>Opus 5.5 low を既定にする</b><ul>
      <li>難問では Sonnet のどの effort にも、正答率・コスト・速さのすべてで勝った。Sonnet が全問正解に届く xhigh と比べると、コストは約 1/3、時間は約 1/7。</li>
      <li>45 問でも、同じ effort の Sonnet とコストは同等で、1 本あたり 23〜73 s 速い。</li>
      <li>このベンチでは effort は low で足りた。ただし CursorBench の長い作業では medium と high がはっきり上回るので、難しい作業には high を使う。</li>
    </ul></div>
    <div><b>Sonnet 5 に残る役割</b><ul>
      <li>単純な調べものを大量に回すなら、委譲禁止の Sonnet が最安（45 問で Opus low より約 2〜3 割安い）。</li>
      <li>ただし委譲を禁止しない限りこの利点は消えるし、禁止は実務の既定には向かない。</li>
      <li>「一度で正しく、少ないターンで終わる」必要がある作業では、Sonnet を選ぶ理由は見つからなかった。</li>
    </ul></div>
  </div>

  <h2 class="col">限界</h2>
  <ul class="col">
    <li><b>難問は 16 問 × 2 回。</b>正答率の差（100% 対 93.8%）は p ≈ 0.044 と際どく、しかも失敗は HFX8 の 1 問に集中している。「Sonnet は HFX8 の落とし穴に弱い」以上の一般化はまだできない。</li>
    <li><b>難問の作成者は Opus。</b>問題は Opus の subagent 4 体が作り、隠しテストと模範解答まで書いた。すべて独立に再検証している（バグを仕込んだ状態では見えるテストが全部通り、隠しテストは落ちる。模範解答なら両方通る）。それでも、Opus の考え方に合う問題に偏っている可能性は否定できない。</li>
    <li><b>max は測っていない。</b>比べたのは low・medium・high・xhigh の 4 段階。</li>
    <li><b>CLI は 2.1.282 の 1 版だけ。</b>この版では <code>Agent</code> が非同期で動き、<code>result.json</code> の <code>duration_ms</code> が subagent の完了を待たずに止まる。wall はハーネスが測ったプロセス全体の時間（<code>claude.wall_ms</code>）で報告している。</li>
    <li><b>並列度 3 で 1 台のマシン。</b>wall には混雑の影響が入る。arm は交互に走らせているので偏りは小さいはずだが、トークンとコストほど確かな数字ではない。</li>
    <li><b>ターン上限は 60。</b>Sonnet の 4 本が上限に達しながら正解している。上限を変えると Sonnet の正答率も変わる。</li>
  </ul>

  <p class="foot">データ: <a href="../results/opus/REPORT.md">results/opus</a>（45 問、225 run、${easy_cost:.2f}）・<a href="../results/hard/REPORT.md">results/hard</a>（難問、160 run、${hard_cost:.2f}）。問題: <code>tasks/tasks-hard.json</code> と <code>tasks/hard/&lt;ID&gt;/</code>（隠しテスト、仕込みパッチ、模範解答、検証記録）。実行: <code>scripts/run-opus.sh</code>・<code>scripts/run-hard.sh</code>。前回まで: <a href="report-ja.html">graphify 対 素の Claude Code</a>・<a href="report-cgr-ja.html">code-graph-rag</a>。</p>
</div>
<script>
const DATA = {{cost: {json.dumps(chart_rows("cost"), ensure_ascii=False)}, wall: {json.dumps(chart_rows("wall"), ensure_ascii=False)}}};
function css(v){{return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}}
function draw(id, key, fmt, step){{
  const rows=DATA[key]; const svg=document.querySelector('#'+id+' svg'); const W=880, rowH=30, top=18, left=320, right=24;
  const H=top+rows.length*rowH+30; svg.setAttribute('viewBox',`0 0 ${{W}} ${{H}}`);
  const vals=rows.flatMap(r=>[r.lo,r.hi,0]); const lo=Math.floor(Math.min(...vals)/step)*step, hi=Math.ceil(Math.max(...vals)/step)*step;
  const x=v=>left+(v-lo)/(hi-lo)*(W-left-right);
  const good=css('--good'), bad=css('--bad'), nd=css('--nd'), ink2=css('--ink-2'), rule=css('--rule-2');
  let s='';
  for(let t=lo;t<=hi+1e-9;t+=step){{ s+=`<line x1="${{x(t)}}" y1="${{top-8}}" x2="${{x(t)}}" y2="${{H-24}}" stroke="${{rule}}"/><text x="${{x(t)}}" y="${{H-8}}" font-size="10" fill="${{ink2}}" text-anchor="middle">${{fmt(t)}}</text>`; }}
  s+=`<line x1="${{x(0)}}" y1="${{top-8}}" x2="${{x(0)}}" y2="${{H-24}}" stroke="${{ink2}}"/>`;
  rows.forEach((r,i)=>{{ const y=top+i*rowH+rowH/2; const c=r.crossesZero?nd:(r.point<0?good:bad);
    s+=`<text x="${{left-8}}" y="${{y+4}}" font-size="11" fill="${{ink2}}" text-anchor="end">${{r.label}}</text>`;
    s+=`<g class="hit" data-i="${{i}}" data-k="${{key}}"><rect x="${{left}}" y="${{y-rowH/2}}" width="${{W-left-right}}" height="${{rowH}}" fill="transparent"/><line x1="${{x(r.lo)}}" y1="${{y}}" x2="${{x(r.hi)}}" y2="${{y}}" stroke="${{c}}" stroke-width="6" stroke-opacity=".28" stroke-linecap="round"/><circle cx="${{x(r.point)}}" cy="${{y}}" r="5" fill="${{c}}" stroke="${{css('--panel')}}" stroke-width="2"/></g>`; }});
  svg.innerHTML=s;
}}
const FMT={{cost:v=>(Math.abs(v)<1e-9?'$0':(v<0?'−':'')+'$'+Math.abs(v).toFixed(2)), wall:v=>(Math.abs(v)<1e-9?'0s':(v<0?'−':'')+Math.abs(v).toFixed(0)+'s')}};
function drawAll(){{ draw('ci-cost','cost',FMT.cost,0.1); draw('ci-wall','wall',FMT.wall,30); bind(); }}
const tip=document.getElementById('tip');
function bind(){{ document.querySelectorAll('.hit').forEach(g=>{{
  g.addEventListener('mousemove',e=>{{ const r=DATA[g.dataset.k][g.dataset.i]; const f=FMT[g.dataset.k];
    tip.hidden=false; tip.textContent=`${{r.label}}: ${{f(r.point)}} [${{f(r.lo)}}, ${{f(r.hi)}}]${{r.crossesZero?'（差があるとは言えない）':''}}`;
    tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px'; tip.style.opacity=1; }});
  g.addEventListener('mouseleave',()=>{{tip.hidden=true;}});
}}); }}
drawAll();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',drawAll);
</script>
</body>
</html>
'''
open(OUT, "w").write(head + body)
print("wrote", OUT)
