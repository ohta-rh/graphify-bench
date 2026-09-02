# Rubric — how an issue gets its number

Five elements, one point each. The grader has not seen the codebase or the
documentation; everything needed to judge is stated here. Award the point when
the answer conveys the substance, even if worded differently. Do **not** award a
point for naming a document or file without the behaviour it carries.

1. **The requirement that defines the scope.** `REQ-061` — "Issue numbers are
   allocated per project and never reused" — in
   `corpus/taskflow/docs/requirements/issues.md`. The number is scoped to the
   **project**, not the organization, and retired numbers are never recycled
   because a permalink or comment reference to an old number must not later
   resolve to a different issue. Award the point for naming the requirement (by
   id or by document) and for the scope being per project.

2. **The allocation step in code.** `nextIssueNumber(orgId, projectId)` in
   `src/server/repositories/issue-repository.ts` selects
   `max(issues.number)` filtered by the org-scope predicate **and**
   `eq(issues.projectId, projectId)`, then returns that maximum plus one — over
   every row rather than only live ones, which is what keeps an archived
   issue's number retired. Award the point for naming the function and for the
   max-over-all-rows-plus-one behaviour scoped to the project.

3. **The insert, and why it is a separate step.** `insertIssue(input, authorId,
   issueNumber)` in the same repository takes the number as an explicit
   argument rather than deriving it, so allocation and insertion are two
   distinct, separately testable steps; the issue-creation path in the issue
   service calls one and then the other. Award the point for the number being
   passed in rather than computed inside the insert.

4. **The database constraint that enforces it.**
   `src/server/db/schema/issues.ts` declares
   `uniqueIndex("issues_project_number_idx").on(table.projectId, table.number)`
   — the unique index covers **(project_id, number)**. Award the point for
   naming the unique index and its actual columns.

5. **The documents do not all describe the constraint the same way.**
   `docs/db/tables-issues.md` lists `issues_project_number_idx` over
   `org_id, number` and glosses it as "enforced per organization so a number is
   unique across the whole tenant" — which contradicts both the schema and
   `REQ-061`. The design and the requirement agree with the schema; the DB
   dictionary is the outlier. Award the point for stating plainly that the two
   accounts disagree **and** for resolving it in favour of the schema's
   `(project_id, number)`. An answer that reports both without choosing does not
   earn this point. Naming the verifying specs
   (`tests/repositories/issue-repository.test.ts`,
   `tests/server/soft-delete.test.ts`) is a bonus, not required.
