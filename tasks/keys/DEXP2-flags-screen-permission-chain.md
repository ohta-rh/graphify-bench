# Rubric — who may open the feature-flag settings screen

Five elements, one point each. The grader has not seen the codebase or the
documentation; everything needed to judge is stated here. Award the point when
the answer conveys the substance, even if worded differently. Do **not** award a
point for naming a document or file without the behaviour it carries.

1. **The screen specification and what it claims.** The screen is specified in
   `corpus/taskflow/docs/ui/screen-settings-billing-flags-webhooks.md`, whose
   entry for the flags page gives `- **Permission required:** org:manage_flags
   (member and above) — 404 otherwise`, and names
   `src/app/(dashboard)/[orgSlug]/settings/flags/page.tsx` with its list
   component `flag-toggle-list.tsx` under `Files`. Award the point for locating
   the screen specification and reporting the minimum it states.

2. **The requirement and design behind the permission.**
   `docs/requirements/feature-flags.md` states that flag management is gated on
   `org:manage_flags` whose `ROLE_MATRIX` minimum is `admin`, and
   `docs/design/service-feature-flag-and-support.md` records `toggleFlag` as
   requiring `org:manage_flags`; `docs/design/action-members-billing-and-flags.md`
   covers the action-side check, and `docs/adr/ADR-003-single-permission-entry-point.md`
   is the decision that every such check goes through one module. Award the
   point for reaching at least the requirement (or the service/action design)
   and reporting the minimum it states as `admin`.

3. **Where the decision is actually made in code.** The page calls
   `can(actor, "org:manage_flags", { kind: "organization", orgId: org.id })`
   from `src/lib/permissions.ts`, after `loadTenantContext(orgSlug)` resolves the
   organization and the actor. `ROLE_MATRIX["org:manage_flags"]` is `"admin"`.
   Award the point for naming the permission module and the matrix entry as the
   place the minimum is defined, and for the page consulting it via `can()`
   rather than reimplementing a role comparison.

4. **What happens to a user who fails the check.** The page does not render an
   error or a "you do not have access" panel: when `can()` returns false it calls
   `notFound()` from `next/navigation`, so a member sees a 404 and cannot
   distinguish "this page does not exist" from "you are not allowed here." The
   screen specification's own state table records this as `permission denied →
   notFound()` for all four settings screens. Award the point for the 404 /
   `notFound()` outcome.

5. **The specification contradicts the code, and the contradiction is local.**
   The screen specification's "member and above" is wrong: `org:manage_flags` is
   `admin`, so a member fails the check and gets the 404. This is a
   contradiction inside one document rather than a system-wide inconsistency —
   the same document describes the sibling billing (`org:manage_billing`) and
   webhook (`webhook:manage`) screens' minimums correctly, and
   `docs/requirements/feature-flags.md` states `admin` correctly. Award the
   point for saying plainly that the stated minimum does not match the code and
   for resolving the conflict in favour of the code; noting that the neighbouring
   entries in the same document are correct is a bonus, not required.
