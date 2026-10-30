# Terra 時間切れ40件の再測定

40/40件採点済み、35件合格。

| セット | 元の時間切れ | 再採点済み | 合格 |
|---|---:|---:|---:|
| hard | 1 | 1 | 1 |
| ultra | 19 | 19 | 17 |
| apex | 20 | 20 | 17 |

30分でのsolver強制終了を外し、実行中のidle/system sleepをcaffeinateで抑止。ログを逐次保存する。手動スリープや蓋を閉じる操作を防げる保証はない。通信・利用上限による不完全試行のみ隔離して再開し、採点済みの精度失敗は再試行しない。

元の596件・462件合格の成果物はoriginal-publicationに退避保存。ユーザー許可により再測定40件を主結果へ反映する。時間切れだけを選び時間上限も変更した追加実験なので、更新した596件は時間条件が混在する。均一条件のモデル順位とは解釈しない。

可視テスト差分の要注意事項（元のhidden採点を保持）:
- UIM4-workspace-time-zone__terra61-effort-medium__r1 / tests/jobs/digest-email-job.test.ts: REVIEW_ISSUE: Manually reviewed: replaces the existing DIGEST_MAX_ENTRIES cap expectation with DIGEST_MAX_ENTRIES+5 and renames test to include all unread window entries. UIM4 exact-window wording may explain interpretation, but removing the cap is not explicitly requested and may exceed nothing-else-changes scope. Preserve strict original hidden grade, no rescore/retry; disclose this questionable test change alongside prior analogous cases.
- UIM4-workspace-time-zone__terra61-effort-medium__r2 / tests/jobs/digest-email-job.test.ts: REVIEW_ISSUE: Manually reviewed: replaces the existing DIGEST_MAX_ENTRIES cap expectation with DIGEST_MAX_ENTRIES+5 and renames test to include all unread window entries. UIM4 exact-window wording may explain interpretation, but removing the cap is not explicitly requested and may exceed nothing-else-changes scope. Preserve strict original hidden grade, no rescore/retry; disclose this questionable test change alongside prior analogous cases.

HTML構造・データ・リンクを検証する。ブラウザー描画は既存file://アクセス制限により未確認。迂回しない。
