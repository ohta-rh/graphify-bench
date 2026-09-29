"""Build docs/report-opus-ja.html: Opus 5.5 / Sonnet 5 / Sonnet 5.5 across four task sets.

Usage: python3 scripts/report-opus/build_html.py <out.html> <dir with f-code45.json f-hard.json f-ultra.json f-extreme.json>
Each f-<set>.json is extract.py output for that set's results dir.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT, DATA = sys.argv[1], sys.argv[2]
SETS = [
    ("code45", "45 問", "results/opus"),
    ("hard", "難問", "results/hard"),
    ("ultra", "超難問", "results/ultra"),
    ("extreme", "極難問", "results/models/extreme"),
]
D = {k: json.load(open(os.path.join(DATA, f"f-{k}.json"))) for k, _, _ in SETS}
head = open(os.path.join(HERE, "head.html")).read()

EFFORTS = ["low", "medium", "high", "xhigh"]
FAM = [("opus-effort", "Opus 5.5", "m-opus"), ("effort", "Sonnet 5", "m-s5"), ("sonnet55-effort", "Sonnet 5.5", "m-s55")]


def arm(prefix, e):
    return f"{prefix}-{e}"


def usd(v, sign=False):
    s = f"${abs(v):.2f}"
    return (("−" if v < 0 else "+") + s) if sign else s


def sec(v, sign=False):
    s = f"{abs(v):.0f} s"
    return (("−" if v < 0 else "+") + s) if sign else s


def pt(v):
    return f"{v*100:+.0f}pt".replace("-", "−")


def rng(P, x, y, key, fmt):
    """Smallest..largest magnitude of the paired mean difference over the four efforts.

    Unsigned: the sentence around it says which way ("安く", "高く", "速い", "遅い")."""
    vals = sorted(abs(P[f"{x}-{e}|{y}-{e}"][key]["mean"]) for e in EFFORTS if f"{x}-{e}|{y}-{e}" in P)
    return f"{fmt(vals[0])}〜{fmt(vals[-1])}"


def fam_total(k, prefix):
    arms = [D[k]["arms"][arm(prefix, e)] for e in EFFORTS if arm(prefix, e) in D[k]["arms"]]
    ok = sum(a["acc"] for a in arms)
    n = sum(a["graded"] for a in arms)
    cost = sum(a["cost_sum"] for a in arms)
    return ok, n, cost / max(ok, 1)


def cicell(m, fmt, good_negative=True):
    crosses = m["lo"] <= 0 <= m["hi"]
    if crosses:
        cls = "q"
    else:
        better = m["mean"] < 0 if good_negative else m["mean"] > 0
        cls = "g" if better else "b"
    return (
        f'<td class="n {cls}">{fmt(m["mean"], True) if fmt is not pt else pt(m["mean"])}'
        f'<span class="q">[{fmt(m["lo"], True) if fmt is not pt else pt(m["lo"])}, '
        f'{fmt(m["hi"], True) if fmt is not pt else pt(m["hi"])}]</span></td>'
    )


def arm_table(k):
    rows = []
    for prefix, name, cls in FAM:
        for e in EFFORTS:
            a = D[k]["arms"].get(arm(prefix, e))
            if not a:
                continue
            rows.append(
                f'<tr><td><i class="dot {cls}"></i>{name} · {e}</td><td class="n"><b>{a["acc"]}/{a["graded"]}</b></td>'
                f'<td class="n">{usd(a["cost_med"])}</td><td class="n">{usd(a["cost_per_success"])}</td>'
                f'<td class="n">{sec(a["wall_med"])}</td><td class="n">{a["turns_med"]:g}</td>'
                f'<td class="n">{a["sub_runs"]}/{a["n"]}</td></tr>'
            )
    ns = D[k]["arms"].get("effort-low-nosub")
    if ns:
        rows.append(
            f'<tr class="aside"><td><i class="dot m-s5"></i>Sonnet 5 · low · 委譲禁止</td><td class="n">{ns["acc"]}/{ns["graded"]}</td>'
            f'<td class="n">{usd(ns["cost_med"])}</td><td class="n">{usd(ns["cost_per_success"])}</td>'
            f'<td class="n">{sec(ns["wall_med"])}</td><td class="n">{ns["turns_med"]:g}</td><td class="n">—</td></tr>'
        )
    return (
        '<div class="tbl"><table class="rep"><thead><tr><th>arm</th><th class="n">正解</th><th class="n">cost</th>'
        '<th class="n">$/正解</th><th class="n">wall</th><th class="n">turns</th><th class="n">委譲</th></tr></thead><tbody>'
        + "".join(rows)
        + "</tbody></table></div>"
    )


def pair_table(k):
    rows = []
    for x, y, label in [("sonnet55-effort", "effort", "Sonnet 5.5 − Sonnet 5"), ("opus-effort", "sonnet55-effort", "Opus 5.5 − Sonnet 5.5")]:
        for e in EFFORTS:
            p = D[k]["pairs"].get(f"{arm(x, e)}|{arm(y, e)}")
            if not p:
                continue
            rows.append(
                f"<tr><td>{label} · {e}</td>{cicell(p['ok'], pt, good_negative=False)}"
                f"{cicell(p['cost'], usd)}{cicell(p['wall'], sec)}</tr>"
            )
    return (
        '<div class="tbl"><table class="rep"><thead><tr><th>同じ問題同士の差（左 − 右、1 本あたり）</th>'
        '<th class="n">正解率</th><th class="n">cost</th><th class="n">wall</th></tr></thead><tbody>'
        + "".join(rows)
        + "</tbody></table></div>"
    )


def scatter_data(k):
    pts = []
    for prefix, name, cls in FAM:
        for e in EFFORTS:
            a = D[k]["arms"].get(arm(prefix, e))
            if a:
                pts.append({"m": cls, "label": f"{name} {e}", "x": round(a["cost_per_success"], 3),
                            "y": round(100 * a["acc"] / a["graded"], 1)})
    return pts


# ---- headline numbers used in the prose -------------------------------------------------
tot = {k: {name: fam_total(k, prefix) for prefix, name, _ in FAM} for k, _, _ in SETS}
X = D["extreme"]["pairs"]
C = D["code45"]["pairs"]
H = D["hard"]["pairs"]
U = D["ultra"]["pairs"]
pp = [100 * (tot[k]["Opus 5.5"][0] / tot[k]["Opus 5.5"][1] - tot[k]["Sonnet 5.5"][0] / tot[k]["Sonnet 5.5"][1]) for k in ("hard", "ultra", "extreme")]
_xr = [D[k]["arms"]["sonnet55-effort-xhigh"]["cost_med"] / D[k]["arms"]["sonnet55-effort-high"]["cost_med"] for k in D]
xh_ratio_lo, xh_ratio_hi = min(_xr), max(_xr)
_oc = [D[k]["arms"][f"opus-effort-{e}"]["cost_med"] / D[k]["arms"][f"sonnet55-effort-{e}"]["cost_med"] for k in D for e in ("high", "xhigh")]
oc_lo, oc_hi = min(_oc), max(_oc)
all_runs = sum(a["n"] for k in D for a in D[k]["arms"].values())
all_cost = sum(a["cost_sum"] for k in D for a in D[k]["arms"].values())


def famrow(k, lbl):
    cells = "".join(
        f'<td class="n">{ok}/{n}<span class="q">{100*ok/n:.0f}% · {usd(c)}/正解</span></td>' for (ok, n, c) in tot[k].values()
    )
    return f"<tr><td>{lbl}</td>{cells}</tr>"


summary_table = (
    '<div class="tbl"><table class="rep"><thead><tr><th>セット（4 effort の合計）</th>'
    '<th class="n"><i class="dot m-opus"></i>Opus 5.5</th><th class="n"><i class="dot m-s5"></i>Sonnet 5</th>'
    '<th class="n"><i class="dot m-s55"></i>Sonnet 5.5</th></tr></thead><tbody>'
    + "".join(famrow(k, lbl) for k, lbl, _ in SETS)
    + "</tbody></table></div>"
)

sets_overview = """<div class="tbl"><table class="rep"><thead><tr><th>セット</th><th>規模</th><th>問題</th><th>プロンプトの書き方</th><th>採点</th><th>作成</th><th>上限</th></tr></thead><tbody>
<tr><td>45 問</td><td>45 × 1 回</td><td>場所探し・参照列挙・説明・影響範囲・小さな修正</td><td>短い質問（約 400 字）</td><td>ファイル一致 F1 / Haiku judge / 見えるテスト</td><td>最初期</td><td>60 ターン / $4</td></tr>
<tr><td>難問</td><td>16 × 2 回</td><td>修正 8・実装 8（3 ファイル以上・2 層以上）</td><td>症状、または名前を指定した仕様（約 1,300 字）</td><td>隠しテスト</td><td>Opus</td><td>60 / $4</td></tr>
<tr><td>超難問</td><td>12 × 2 回</td><td>修正 6・実装 6（5 ファイル以上・3 層以上、欠陥 3〜4 個）</td><td>詳しい仕様。関数名もルールも全部（約 3,300 字、コード名 14 個）</td><td>隠しテスト</td><td>Opus</td><td>120 / $8</td></tr>
<tr><td>極難問</td><td>12 × 2 回</td><td>修正 6・実装 6（8 ファイル以上・3 層以上、罠 1 つ）</td><td>症状だけの障害報告か PM 仕様。既存のコード名なし</td><td>隠しテスト</td><td>Fable 5.1</td><td>120 / $8</td></tr>
</tbody></table></div>"""


def set_section(k, lbl, path):
    return f"""
  <h2 class="col">{lbl}</h2>
  {arm_table(k)}
  <p class="cap">cost・wall・turns は 1 本あたりの中央値。$/正解 = arm の総費用 ÷ 正解数。委譲 = subagent を起動した run の数。</p>
  {pair_table(k)}
  <p class="cap">緑 = 左が有利で 95% CI が 0 をまたがない、赤 = 左が不利で CI が 0 をまたがない、灰色 = 差があるとは言えない。データ: <code>{path}</code></p>
  <div class="chart" id="sc-{k}"><div class="chart-head"><strong>{lbl}: $/正解 と正答率</strong><span class="legend"><span><i class="dot m-opus"></i>Opus 5.5</span><span><i class="dot m-s5"></i>Sonnet 5</span><span><i class="dot m-s55"></i>Sonnet 5.5</span></span></div><svg role="img" aria-label="{lbl} の arm ごとの 正解 1 件あたりコストと正答率"></svg></div>
"""


x_ok = {e: X[f"sonnet55-effort-{e}|effort-{e}"]["ok"] for e in EFFORTS}
body = f"""
<style>
  :root{{--m-opus:#3E4B9A;--m-s5:#8A9190;--m-s55:#0B8C7F}}
  @media (prefers-color-scheme: dark){{:root:not([data-theme="light"]){{--m-opus:#9AA6E8;--m-s5:#7C8683;--m-s55:#3DB3A5}}}}
  :root[data-theme="dark"]{{--m-opus:#9AA6E8;--m-s5:#7C8683;--m-s55:#3DB3A5}}
  .dot{{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;vertical-align:0}}
  .m-opus{{background:var(--m-opus)}} .m-s5{{background:var(--m-s5)}} .m-s55{{background:var(--m-s55)}}
  tr.aside td{{color:var(--ink-2)}}
  .opinion{{margin:24px 0;padding:18px 22px;border-left:3px solid var(--m-s55);background:var(--panel)}}
  .opinion p{{margin:8px 0}}
  .tag{{font-family:"IBM Plex Mono",monospace;font-size:11.5px;letter-spacing:.08em;color:var(--ink-2);text-transform:uppercase}}
</style>
<body>
<div class="wrap">
  <p class="eyebrow">graphify-bench · モデル比較 · 2026-09-25〜29</p>
  <h1>Sonnet 5.5 は、症状だけの難しい修正で Opus 5.5 とほぼ同じ正答率を、約半分のコストで出した。</h1>
  <p class="lede col">Opus 5.5・Sonnet 5・Sonnet 5.5 を、それぞれ <code>--effort</code> low・medium・high・xhigh の 4 段階で、難しさと問題の書き方が違う 4 つの問題セットに解かせた。どれも素の Claude Code（<code>claude -p</code>）で、変えたのはモデルと effort だけ。{all_runs:,} run、定価換算で ${all_cost:,.0f}。</p>

  <h2 class="col">サマリと見解</h2>
  {summary_table}
  <p class="cap">各セルは 4 effort の合計の正解数 / 本数、正答率、$/正解。</p>

  <p class="tag col">測定された事実</p>
  <ul class="col">
    <li><b>症状だけの極難問で、Sonnet 5 → 5.5 の差が一番大きい。</b>同じ effort 同士で比べると、Sonnet 5.5 の方が 1 本あたり {rng(X, 'sonnet55-effort', 'effort', 'cost', usd)} 安く、{rng(X, 'sonnet55-effort', 'effort', 'wall', sec)} 速い（どれも CI が 0 をまたがない）。正解率は medium・high・xhigh で {pt(x_ok['medium']['mean'])}〜{pt(x_ok['xhigh']['mean'])}（CI が 0 をまたがない）。Sonnet 5 は 60〜90 ターン回り、low・medium の約 8 割の run で subagent に委譲していた。Sonnet 5.5 は 12〜34 ターンで、一度も委譲していない。</li>
    <li><b>極難問では、Opus 5.5 と Sonnet 5.5 の正答率に、はっきりした差はない。</b>{tot['extreme']['Opus 5.5'][0]}/96 対 {tot['extreme']['Sonnet 5.5'][0]}/96。一方で Opus は、どの effort でも 1 本あたり {rng(X, 'opus-effort', 'sonnet55-effort', 'cost', usd)} 高く、{rng(X, 'opus-effort', 'sonnet55-effort', 'wall', sec)} 遅い（CI が 0 をまたがない）。wall をきれいに比べられるのは、全アームを同時に測ったこのセットだけ。</li>
    <li><b>難問でも Sonnet 5.5 が最安。</b>{tot['hard']['Sonnet 5.5'][0]}/128 正解で、1 本 {usd(D['hard']['arms']['sonnet55-effort-low']['cost_med'])}〜{usd(D['hard']['arms']['sonnet55-effort-xhigh']['cost_med'])}。Opus 5.5（{tot['hard']['Opus 5.5'][0]}/128）は、同じ effort 同士で {rng(H, 'opus-effort', 'sonnet55-effort', 'cost', usd)} 高い。</li>
    <li><b>仕様を細かく書いた超難問では、Sonnet 5 と 5.5 のコストと時間に差がない</b>（どの effort でも CI が 0 をまたぐ）。正答率は 5.5 が {tot['ultra']['Sonnet 5.5'][0]}/96、5 が {tot['ultra']['Sonnet 5'][0]}/96 で、5.5 がわずかに低い（CI の上限がちょうど 0）。Opus は同じ effort 同士で {rng(U, 'opus-effort', 'sonnet55-effort', 'cost', usd)} 高い。</li>
    <li><b>45 問は、どのモデルも 78〜89% の天井に張り付く。</b>その中では Sonnet 5.5 の正解が最も多く（{tot['code45']['Sonnet 5.5'][0]}/180。Opus 5.5 は {tot['code45']['Opus 5.5'][0]}/180）、コストも最も低い（同じ effort 同士で Opus が {rng(C, 'opus-effort', 'sonnet55-effort', 'cost', usd)} 高い）。</li>
    <li><b>Sonnet 5.5 の xhigh は割に合わない。</b>high と比べてコストが {xh_ratio_lo:.1f}〜{xh_ratio_hi:.1f} 倍になるのに、正答率はどのセットでも上がらない（±1 本）。</li>
  </ul>

  <div class="opinion col">
    <p class="tag">見解</p>
    <p><b>既定の候補は 2 つで、どちらでもいい。Sonnet 5.5 の high と、Opus 5.5 の low。</b>4 つのセットを通して、この 2 つの正答率はほぼ同じ。極難問はどちらも 23/24、難問はどちらも 32/32、超難問は 22/24 対 21/24、45 問は 39/45 対 38/45。コストも、Sonnet 5.5 high の方が少し安いか同じくらい。違うのは速さで、全アームを同時に測った極難問では Opus 5.5 low の方が 1 本あたり約 4 分の 1 速かった（{sec(D['extreme']['arms']['opus-effort-low']['wall_med'])} 対 {sec(D['extreme']['arms']['sonnet55-effort-high']['wall_med'])}）。待ち時間を減らしたいなら Opus low、1 本あたりのコストを削りたいなら Sonnet 5.5 high、という選び方になるわ。</p>
    <p><b>定型の作業なら、Sonnet 5.5 の low で十分。</b>45 問で {D['code45']['arms']['sonnet55-effort-low']['acc']}/45、難問で {D['hard']['arms']['sonnet55-effort-low']['acc']}/32 を、1 本 {usd(D['code45']['arms']['sonnet55-effort-low']['cost_med'])}・{usd(D['hard']['arms']['sonnet55-effort-low']['cost_med'])} で出している。</p>
    <p><b>Opus 5.5 の high・xhigh を選ぶのは、一度で正しいことが何より大事なときだけ。</b>合計の正答率では、隠しテストの 3 セットで Opus が Sonnet 5.5 を {min(pp):.1f}〜{max(pp):.1f}pt 上回る。ただ、同じ問題同士の CI ではほとんどが 0 をまたいでいて、1 本あたりのコストは同じ effort の Sonnet 5.5 の {oc_lo:.1f}〜{oc_hi:.1f} 倍よ。</p>
    <p><b>Sonnet 5 を選ぶ理由は、もうない。</b>仕様が細かい問題では Sonnet 5.5 と同等で、症状だけの問題では正答率・コスト・時間のすべてで大きく劣る。</p>
    <p><b>何が変わったのか（仮説）。</b>前回まで、Opus の強みは「症状から原因の場所を、少ない手数で探し当てる力」だと読んでいた。その証拠が、症状だけの問題で Sonnet 5 に大差をつけていたことよ。Sonnet 5.5 は、まさにその部分が伸びた。症状だけの極難問ではターン数が 1/3〜1/5 になって委譲もなくなり、正答率が上がった。一方、探索の要らない超難問ではほとんど変わっていない。これは測定からの推論で、モデルの中身を確かめたわけじゃないわ。</p>
  </div>

  <h2 class="col">4 つのセット</h2>
  {sets_overview}
  <p class="cap">共通のルール: 隠しテストはエージェントが終わってから差し込む（バグを仕込んだ状態でも見えるテストは全部通る）。全問を模範解答で独立に検証済み。カンニング禁止をプロンプトに明記し、<code>scripts/audit-scope.py</code> で全 run を監査した（違反 0）。成績を見て問題を選んだことはない。</p>
  {''.join(set_section(k, lbl, p) for k, lbl, p in SETS)}

  <h2 class="col">限界</h2>
  <ul class="col">
    <li><b>比較の条件はセットで違う。</b>極難問は 12 アームすべてを同じ CLI（2.1.284）で、同じ時期に交互に走らせた。45 問・難問・超難問は、Opus 5.5 と Sonnet 5 が CLI 2.1.282・並列度 3（2026-09-25〜28）で、Sonnet 5.5 だけを CLI 2.1.284・並列度 6（2026-09-29）で追加した。この 3 セットでは、とくに Sonnet 5.5 の wall に並列度の違いが混ざる。コストと正答率は並列度の影響を受けない。</li>
    <li><b>問題の作成者。</b>難問と超難問は Opus の subagent、極難問は Fable 5.1 の subagent が作り、全問を独立に再検証した。それでも、作成者の考え方に合う問題に偏っている可能性は否定できない。</li>
    <li><b>本数。</b>各 arm は 24〜45 本。正答率の数 pt の差は、多くの場合 CI の範囲内。</li>
    <li><b>費用は定価換算。</b><code>total_cost_usd</code> の値で、サブスクリプションで動かした分の実際の請求額とは一致しない。</li>
    <li><b>難問の上限は 60 ターン。</b>Sonnet 5 の一部の run は上限まで回った（正解した run もある）。上限を変えると結果も変わりうる。</li>
    <li><b>利用上限での中断。</b>極難問の計測では 5 本が利用上限で止まった。それらは <code>quarantine/</code> に移して、解除後にやり直している。以前、中断を成功と数えていた不具合は修正済み。</li>
  </ul>

  <p class="foot">データ: <code>results/opus</code>（45 問）・<code>results/hard</code>・<code>results/ultra</code>・<code>results/models/extreme</code>。問題: <code>tasks/tasks*.json</code>、<code>tasks/{{hard,ultra,extreme}}/&lt;ID&gt;/</code>。実行: <code>scripts/run-models.sh</code>。前回まで: <a href="report-ja.html">graphify 対 素の Claude Code</a>・<a href="report-cgr-ja.html">code-graph-rag</a>。</p>
</div>
<div class="tip" id="tip" hidden></div>
<script>
const SC = {json.dumps({k: scatter_data(k) for k, _, _ in SETS}, ensure_ascii=False)};
function css(v){{return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}}
function drawScatter(k){{
  const pts=SC[k]; const svg=document.querySelector('#sc-'+k+' svg'); const W=880,H=320,l=56,r=24,t=34,b=40;
  svg.setAttribute('viewBox',`0 0 ${{W}} ${{H}}`);
  const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
  const x0=0, x1=Math.max(...xs)*1.1, y0=Math.max(0,Math.floor((Math.min(...ys)-5)/10)*10), y1=100;
  const X=v=>l+(v-x0)/(x1-x0)*(W-l-r), Y=v=>t+(y1-v)/(y1-y0)*(H-t-b);
  const ink2=css('--ink-2'), rule=css('--rule-2');
  let s='';
  const step=x1>3?1:x1>1?0.5:0.1;
  for(let v=0;v<=x1+1e-9;v+=step){{s+=`<line x1="${{X(v)}}" y1="${{t}}" x2="${{X(v)}}" y2="${{H-b}}" stroke="${{rule}}"/><text x="${{X(v)}}" y="${{H-b+18}}" font-size="11" fill="${{ink2}}" text-anchor="middle">$${{v.toFixed(step<1?1:0)}}</text>`;}}
  for(let v=y0;v<=100;v+=10){{s+=`<line x1="${{l}}" y1="${{Y(v)}}" x2="${{W-r}}" y2="${{Y(v)}}" stroke="${{rule}}"/><text x="${{l-8}}" y="${{Y(v)+4}}" font-size="11" fill="${{ink2}}" text-anchor="end">${{v}}%</text>`;}}
  s+=`<text x="${{(W+l)/2}}" y="${{H-4}}" font-size="11" fill="${{ink2}}" text-anchor="middle">正解 1 件あたりのコスト（左ほど安い）</text>`;
  pts.forEach((p,i)=>{{const c=css('--'+p.m);
    s+=`<g class="hit" data-k="${{k}}" data-i="${{i}}"><circle cx="${{X(p.x)}}" cy="${{Y(p.y)}}" r="11" fill="transparent"/><circle cx="${{X(p.x)}}" cy="${{Y(p.y)}}" r="6" fill="${{c}}" stroke="${{css('--panel')}}" stroke-width="2"/><text x="${{X(p.x)+9}}" y="${{Y(p.y)-8}}" font-size="10.5" fill="${{ink2}}">${{p.label.split(' ').pop()}}</text></g>`;}});
  svg.innerHTML=s;
}}
const tip=document.getElementById('tip');
function bind(){{document.querySelectorAll('.hit').forEach(g=>{{
  g.addEventListener('mousemove',e=>{{const p=SC[g.dataset.k][g.dataset.i]; tip.hidden=false; tip.textContent=`${{p.label}}: 正答率 ${{p.y}}% · $${{p.x.toFixed(2)}}/正解`; tip.style.left=(e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px'; tip.style.opacity=1;}});
  g.addEventListener('mouseleave',()=>{{tip.hidden=true;}});}});}}
function drawAll(){{Object.keys(SC).forEach(drawScatter); bind();}}
drawAll();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',drawAll);
</script>
</body>
</html>
"""
title_fix = head.replace("<title>Opus 5.5 対 Sonnet 5</title>", "<title>Opus・Sonnet モデル比較</title>")
open(OUT, "w").write("\n".join(line.rstrip() for line in (title_fix + body).split("\n")))
print("wrote", OUT)
