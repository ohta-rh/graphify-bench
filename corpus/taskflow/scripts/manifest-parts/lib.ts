import type { ExportSpec, ManifestEntry } from "../manifest-types";

/** Owner E — the remaining `src/lib` utilities, the email templates, the rest
 *  of `src/config`, and the whole Vitest suite. The cross-cutting core
 *  (permissions, event bus, feature flags, plan limits, slug, soft delete,
 *  tenant) is already frozen and must NOT be edited. */

const fn = (name: string, signature: string): ExportSpec => ({
  name,
  kind: "function",
  signature,
});
const type = (name: string, signature: string): ExportSpec => ({
  name,
  kind: "type",
  signature,
});
const konst = (name: string, signature: string): ExportSpec => ({
  name,
  kind: "const",
  signature,
});

type Spec = [
  path: string,
  responsibility: string,
  exports: ExportSpec[],
  mustUse?: string[],
  client?: boolean,
];

const LIB: Spec[] = [
  [
    "src/lib/id.ts",
    "ULID generation and validation. Every branded id in the app is produced here.",
    [
      fn("newId", "(): string"),
      fn("isUlid", "(value: string): boolean"),
      fn("idFactory", "(seed: number): () => string"),
    ],
  ],
  [
    "src/lib/date.ts",
    "Timestamp helpers: ISO round-tripping, relative formatting, due-date and digest-window arithmetic.",
    [
      fn("now", "(): IsoTimestamp"),
      fn("parseIso", "(value: IsoTimestamp): Date"),
      fn("formatRelative", "(value: IsoTimestamp, reference?: Date): string"),
      fn("formatDate", "(value: IsoTimestamp, timezone?: string): string"),
      fn("isOverdue", "(dueAt: IsoTimestamp | null, reference?: Date): boolean"),
      fn("addDays", "(value: IsoTimestamp, days: number): IsoTimestamp"),
      fn("digestWindow", "(digestHourUtc: number, reference: Date): { start: IsoTimestamp; end: IsoTimestamp }"),
    ],
  ],
  [
    "src/lib/format.ts",
    "Display formatting for money, counts, byte sizes and enum labels.",
    [
      fn("formatCents", "(cents: number, currency?: string): string"),
      fn("formatCount", "(value: number): string"),
      fn("formatBytes", "(bytes: number): string"),
      fn("formatLimit", "(limit: number): string"),
      fn("humanizeStatus", "(status: IssueStatus): string"),
      fn("humanizePriority", "(priority: IssuePriority): string"),
      fn("humanizeRole", "(role: Role): string"),
      fn("issueKey", "(projectKey: string, issueNumber: number): string"),
    ],
  ],
  [
    "src/lib/cn.ts",
    "Class-name merger used by every component.",
    [fn("cn", "(...values: readonly (string | false | null | undefined)[]): string")],
  ],
  [
    "src/lib/logger.ts",
    "Structured logger. The only place `console` is allowed.",
    [
      fn("createLogger", "(scope: string): Logger"),
      type("Logger", "{ debug: (message: string, fields?: LogFields) => void; info: (message: string, fields?: LogFields) => void; warn: (message: string, fields?: LogFields) => void; error: (message: string, fields?: LogFields) => void }"),
      type("LogFields", "Readonly<Record<string, string | number | boolean | null>>"),
    ],
  ],
  [
    "src/lib/errors.ts",
    "Maps thrown domain errors (`PermissionDeniedError`, `TenantScopeError`, `FeatureDisabledError`, `AlreadyArchivedError`, `InvalidSlugError`, `ZodError`) onto `AppErrorShape`. Every Server Action funnels failures through here.",
    [
      fn("toAppError", "(error: unknown): AppErrorShape"),
      fn("toActionResult", "(error: unknown): ActionResult<never>"),
      fn("isDomainError", "(error: unknown): boolean"),
      fn("fieldErrorsFromZod", "(error: ZodError): Readonly<Record<string, readonly string[]>>"),
      konst("HTTP_STATUS_BY_CODE", "Readonly<Record<ErrorCode, number>>"),
    ],
    ["PermissionDeniedError", "TenantScopeError", "AlreadyArchivedError", "InvalidSlugError"],
  ],
  [
    "src/lib/result.ts",
    "Ergonomics around the `Result` envelope: mapping, unwrapping and async lifting.",
    [
      fn("mapResult", "<T, U>(result: Result<T>, map: (value: T) => U): Result<U>"),
      fn("unwrapOr", "<T>(result: Result<T>, fallback: T): T"),
      fn("fromPromise", "<T>(promise: Promise<T>): Promise<Result<T>>"),
      fn("collectResults", "<T>(results: readonly Result<T>[]): Result<readonly T[]>"),
    ],
  ],
  [
    "src/lib/hash.ts",
    "Password and token hashing built on `node:crypto` scrypt. No external dependency.",
    [
      fn("hashPassword", "(password: string): Promise<string>"),
      fn("verifyPassword", "(password: string, hash: string): Promise<boolean>"),
      fn("hashToken", "(token: string): string"),
      fn("randomToken", "(bytes?: number): string"),
    ],
  ],
  [
    "src/lib/session.ts",
    "Session cookie access. In Next 16 `cookies()` is async — every function here is async for that reason.",
    [
      fn("getSessionToken", "(): Promise<string | null>"),
      fn("getSessionPrincipal", "(): Promise<SessionPrincipal | null>"),
      fn("setSessionCookie", "(token: string, expiresAt: IsoTimestamp): Promise<void>"),
      fn("clearSessionCookie", "(): Promise<void>"),
    ],
    ["SESSION_COOKIE_NAME"],
  ],
  [
    "src/lib/actor.ts",
    "Resolves the request's `Actor` for a given org slug, or throws `unauthorized`/`forbidden`. Every Server Action starts here.",
    [
      fn("getActor", "(orgSlug: string): Promise<Actor>"),
      fn("tryGetActor", "(orgSlug: string): Promise<Actor | null>"),
      fn("requireActorFor", "(orgId: OrgId): Promise<Actor>"),
    ],
    ["getSessionPrincipal", "assertOrgScope", "resolveActorForOrg"],
  ],
  [
    "src/lib/rate-limit.ts",
    "Token-bucket limiter applied to invites, comments, search and password resets.",
    [
      fn("consumeRateLimit", "(orgId: OrgId, bucketKey: string, cost?: number): Promise<RateLimitVerdict>"),
      fn("getBucketConfig", "(bucketKey: string): RateLimitConfig"),
      type("RateLimitVerdict", "{ allowed: boolean; remaining: number; resetAt: IsoTimestamp }"),
      type("RateLimitConfig", "{ capacity: number; refillPerMinute: number }"),
      konst("RATE_LIMIT_BUCKETS", "Readonly<Record<string, RateLimitConfig>>"),
    ],
    ["getPlanLimits"],
  ],
  [
    "src/lib/csv.ts",
    "RFC-4180 CSV writer used by both export routes.",
    [
      fn("toCsv", "(rows: readonly Readonly<Record<string, string | number | boolean | null>>[], columns: readonly string[]): string"),
      fn("escapeCsvValue", "(value: string | number | boolean | null): string"),
      fn("csvResponseHeaders", "(filename: string): Readonly<Record<string, string>>"),
    ],
  ],
  [
    "src/lib/mentions.ts",
    "Extracts `@handle` mentions from comment bodies and resolves them to member ids.",
    [
      fn("extractMentions", "(body: string): readonly string[]"),
      fn("resolveMentions", "(body: string, members: readonly MemberWithUser[]): readonly UserId[]"),
      fn("highlightMentions", "(body: string): string"),
    ],
  ],
  [
    "src/lib/markdown.ts",
    "Very small Markdown subset renderer for issue descriptions and comments.",
    [
      fn("renderMarkdown", "(source: string): string"),
      fn("stripMarkdown", "(source: string): string"),
      fn("excerpt", "(source: string, maxLength?: number): string"),
    ],
  ],
  [
    "src/lib/url.ts",
    "Builds every internal href so route shapes live in one place.",
    [
      fn("orgPath", "(orgSlug: string, ...segments: readonly string[]): string"),
      fn("projectPath", "(orgSlug: string, projectSlug: string, ...segments: readonly string[]): string"),
      fn("issuePath", "(orgSlug: string, projectSlug: string, issueNumber: number): string"),
      fn("settingsPath", "(orgSlug: string, section?: string): string"),
      fn("withSearchParams", "(path: string, params: Readonly<Record<string, string | number | undefined>>): string"),
    ],
  ],
  [
    "src/lib/cache.ts",
    "Cache tag vocabulary and revalidation helpers. Note Next 16 requires the cache-life profile as the second argument to `revalidateTag`.",
    [
      fn("orgTag", "(orgId: OrgId): string"),
      fn("projectTag", "(projectId: ProjectId): string"),
      fn("issueTag", "(issueId: IssueId): string"),
      fn("revalidateTagged", "(tags: readonly string[], profile?: string): void"),
      konst("CACHE_PROFILES", "Readonly<Record<'seconds' | 'minutes' | 'hours', string>>"),
    ],
  ],
  [
    "src/lib/validation.ts",
    "Thin wrappers turning a Zod parse into an `AppErrorShape` without throwing.",
    [
      fn("safeParse", "<TSchema extends ZodType>(schema: TSchema, raw: unknown): Result<unknown>"),
      fn("parseSearchParams", "<TSchema extends ZodType>(schema: TSchema, raw: Readonly<Record<string, string | string[] | undefined>>): unknown"),
    ],
    ["fieldErrorsFromZod"],
  ],
  [
    "src/lib/pagination.ts",
    "Turns a repository `Page` into what the pagination UI needs.",
    [
      fn("pageCount", "(total: number, perPage: number): number"),
      fn("emptyPage", "<T>(): Page<T>"),
      fn("sliceToPage", "<T>(items: readonly T[], limit: number, total: number, cursorOf: (item: T) => string): Page<T>"),
    ],
  ],
];

const CONFIG: Spec[] = [
  [
    "src/config/site.ts",
    "Product name, description, support links and the marketing metadata defaults.",
    [
      konst("SITE_CONFIG", "SiteConfig"),
      type("SiteConfig", "{ name: string; tagline: string; description: string; url: string; supportEmail: string; docsUrl: string }"),
    ],
  ],
  [
    "src/config/nav.ts",
    "Declarative navigation tree. Each item names the permission and flag that gate it, which is how the sidebar stays role-aware without ad-hoc conditionals.",
    [
      konst("SIDEBAR_NAV", "readonly NavItem[]"),
      konst("SETTINGS_NAV", "readonly NavItem[]"),
      fn("visibleNav", "(items: readonly NavItem[], actor: Actor, flags: FeatureFlagSnapshot): readonly NavItem[]"),
      type("NavItem", "{ key: string; label: string; segment: string; icon?: string; action?: PermissionAction; flag?: FeatureFlagKey; children?: readonly NavItem[] }"),
    ],
    ["can", "isEnabled"],
  ],
  [
    "src/config/env.ts",
    "Validated environment access. Nothing else reads `process.env`.",
    [
      konst("env", "AppEnv"),
      type("AppEnv", "{ nodeEnv: 'development' | 'test' | 'production'; databasePath: string; appUrl: string; digestEnabled: boolean }"),
      fn("loadEnv", "(source?: NodeJS.ProcessEnv): AppEnv"),
    ],
  ],
  [
    "src/config/constants.ts",
    "Cross-cutting constants that are neither plan limits nor flags (page sizes, edit windows, retry counts).",
    [
      konst("DEFAULT_PAGE_SIZE", "number"),
      konst("MAX_PAGE_SIZE", "number"),
      konst("COMMENT_EDIT_WINDOW_MINUTES", "number"),
      konst("WEBHOOK_MAX_ATTEMPTS", "number"),
      konst("DIGEST_MAX_ENTRIES", "number"),
      konst("OVERDUE_LOOKAHEAD_HOURS", "number"),
    ],
  ],
];

type EmailSpec = [file: string, component: string, props: string, responsibility: string];

const EMAILS: EmailSpec[] = [
  ["_components/email-layout", "EmailLayout", "{ preview: string; heading: string; children?: ReactNode }", "Shared react-email shell: header, body container and footer."],
  ["_components/email-button", "EmailButton", "{ href: string; label: string }", "Call-to-action button used by every template."],
  ["welcome-email", "WelcomeEmail", "{ userName: string; orgName: string; dashboardUrl: string }", "Sent after registration."],
  ["invite-email", "InviteEmail", "{ inviterName: string; orgName: string; role: Role; acceptUrl: string; expiresAt: IsoTimestamp }", "Organization invitation with the accept link."],
  ["mention-email", "MentionEmail", "{ actorName: string; issueTitle: string; excerpt: string; issueUrl: string }", "Sent when someone is @-mentioned in a comment."],
  ["digest-email", "DigestEmail", "{ recipientName: string; orgName: string; entries: readonly DigestEntry[]; inboxUrl: string }", "Daily digest built by `DigestService`."],
  ["overdue-email", "OverdueEmail", "{ recipientName: string; issues: readonly { title: string; url: string; dueAt: IsoTimestamp }[] }", "Overdue-issue reminder produced by the overdue job."],
  ["invoice-email", "InvoiceEmail", "{ orgName: string; invoiceNumber: string; amountCents: number; periodEnd: IsoTimestamp; invoiceUrl: string }", "Invoice notice for the billing contact."],
  ["password-reset-email", "PasswordResetEmail", "{ userName: string; resetUrl: string; expiresAt: IsoTimestamp }", "Password reset link."],
];

const TESTS: [path: string, responsibility: string][] = [
  ["tests/lib/permissions.matrix.test.ts", "Exhaustive role×action sweep of `ROLE_MATRIX`, including ownership escalations and the cross-tenant denial."],
  ["tests/lib/permissions.ownership.test.ts", "Author/assignee escalations for issues and comments."],
  ["tests/lib/tenant.test.ts", "`assertOrgScope` / `scopedOrNull` / `withOrgScope` behaviour."],
  ["tests/lib/event-bus.test.ts", "Subscribe/emit/unsubscribe, handler isolation and `subscriberCount`."],
  ["tests/lib/feature-flags.test.ts", "Every rollout strategy plus the org override path."],
  ["tests/lib/soft-delete.test.ts", "Archive/restore patches and `applyArchiveScope`."],
  ["tests/lib/slug.test.ts", "`slugify`, reserved slugs and `uniqueSlug` suffixing."],
  ["tests/lib/date.test.ts", "Relative formatting, overdue detection and the digest window."],
  ["tests/lib/format.test.ts", "Money, byte and enum-label formatting, including the unlimited case."],
  ["tests/lib/errors.test.ts", "Domain-error to `AppErrorShape` mapping for every error class."],
  ["tests/lib/rate-limit.test.ts", "Token-bucket refill and exhaustion."],
  ["tests/lib/csv.test.ts", "Quoting, embedded newlines and column ordering."],
  ["tests/lib/mentions.test.ts", "Mention extraction and resolution against a member list."],
  ["tests/config/plan-limits.test.ts", "Plan ordering, `wouldExceedLimit` and the enterprise unlimited sentinel."],
  ["tests/config/nav.test.ts", "`visibleNav` filters by permission and by flag."],
  ["tests/schemas/issue.schema.test.ts", "`createIssueSchema` defaults, bounds and error paths."],
  ["tests/schemas/project.schema.test.ts", "Project slug/key validation and the archive scope extension."],
  ["tests/schemas/comment.schema.test.ts", "Comment body limits and mention array bounds."],
  ["tests/schemas/member.schema.test.ts", "Invitable roles and the bulk-invite cap."],
  ["tests/schemas/billing.schema.test.ts", "Plan/interval enums and seat bounds."],
  ["tests/schemas/auth.schema.test.ts", "Password policy and the confirm-password refinement."],
  ["tests/services/issue-service.test.ts", "Issue creation authorization, quota refusal and emitted events."],
  ["tests/services/issue-service.scope.test.ts", "An actor from another org cannot read or mutate an issue."],
  ["tests/services/project-service.test.ts", "Project quota, slug suggestion and the archive cascade."],
  ["tests/services/comment-service.test.ts", "Comment authoring, edit window and soft delete."],
  ["tests/services/member-service.test.ts", "Role changes and the last-owner invariant."],
  ["tests/services/invitation-service.test.ts", "Seat quota and invite rate limiting."],
  ["tests/services/billing-service.test.ts", "`checkLimit` arithmetic and downgrade refusal."],
  ["tests/services/notification-service.test.ts", "Fan-out honours preferences and the digest flag."],
  ["tests/services/activity-service.test.ts", "One audit row per domain event; day grouping."],
  ["tests/services/search-service.test.ts", "Index maintenance on issue and comment writes."],
  ["tests/repositories/issue-repository.test.ts", "Every query filters by `orgId` and by `archived_at`."],
  ["tests/repositories/project-repository.test.ts", "Slug uniqueness and archive/restore round-trip."],
  ["tests/repositories/comment-repository.test.ts", "Thread assembly and soft-deleted rows."],
  ["tests/jobs/digest-email-job.test.ts", "Runs only for orgs whose digest hour has arrived and whose plan includes it."],
  ["tests/jobs/overdue-issue-job.test.ts", "Emits `issue.overdue` exactly once per overdue issue."],
  ["tests/components/issue-card.test.tsx", "Renders title, status and assignee."],
  ["tests/components/permission-gate.test.tsx", "Renders children only when `can()` allows the action."],
  ["tests/components/usage-meter.test.tsx", "Shows the exceeded state at and above the quota."],
  ["tests/components/app-sidebar.test.tsx", "Hides nav items the actor cannot access."],
];

export const libEntries: ManifestEntry[] = [
  ...LIB.map(([path, responsibility, exports, mustUse]) => ({
    path,
    owner: "E" as const,
    responsibility,
    exports,
    mustUse: mustUse && mustUse.length > 0 ? mustUse : undefined,
  })),
  ...CONFIG.map(([path, responsibility, exports, mustUse]) => ({
    path,
    owner: "E" as const,
    responsibility,
    exports,
    mustUse: mustUse && mustUse.length > 0 ? mustUse : undefined,
  })),
  ...EMAILS.map(([file, component, props, responsibility]) => ({
    path: `src/emails/${file}.tsx`,
    owner: "E" as const,
    responsibility,
    exports: [
      { name: `${component}Props`, kind: "type" as const, signature: props },
      {
        name: component,
        kind: "component" as const,
        signature: `(props: ${component}Props): ReactElement | null`,
      },
    ],
  })),
  {
    path: "src/emails/render.ts",
    owner: "E",
    responsibility:
      "Renders a react-email component to the `{ subject, html, text }` triple `EmailService` sends.",
    exports: [
      fn("renderTemplate", "(template: EmailTemplate, props: Readonly<Record<string, unknown>>): Promise<RenderedEmail>"),
      fn("subjectFor", "(template: EmailTemplate, props: Readonly<Record<string, unknown>>): string"),
    ],
  },
  {
    path: "tests/helpers/factories.ts",
    owner: "E",
    responsibility:
      "Deterministic factories for actors, orgs, projects, issues and comments used across the suite.",
    exports: [
      fn("makeActor", "(overrides?: Partial<Actor>): Actor"),
      fn("makeOrganization", "(overrides?: Partial<Organization>): Organization"),
      fn("makeProject", "(overrides?: Partial<Project>): Project"),
      fn("makeIssue", "(overrides?: Partial<Issue>): Issue"),
      fn("makeComment", "(overrides?: Partial<Comment>): Comment"),
      fn("makeMember", "(overrides?: Partial<MemberWithUser>): MemberWithUser"),
      fn("makeLimitCheck", "(overrides?: Partial<LimitCheck>): LimitCheck"),
    ],
  },
  {
    path: "tests/helpers/db.ts",
    owner: "E",
    responsibility:
      "In-memory SQLite fixture: migrate, seed a tenant pair, reset between tests.",
    exports: [
      fn("setupTestDb", "(): Promise<void>"),
      fn("resetTestDb", "(): Promise<void>"),
      fn("seedTwoTenants", "(): Promise<{ orgA: Organization; orgB: Organization }>"),
    ],
  },
  ...TESTS.map(([path, responsibility]) => ({
    path,
    owner: "E" as const,
    responsibility,
    exports: [],
  })),
];
