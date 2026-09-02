/**
 * Deterministic development seed: two organizations on different plans, members in all four roles, projects, issues (including archived and overdue) and comments.
 *
 * Must call (do not reimplement): uniqueSlug, getPlanLimits
 */
import { getPlanLimits } from "@/config/plan-limits";
import { idFactory } from "@/lib/id";
import { uniqueSlug } from "@/lib/slug";
import { getDb } from "@/server/db";
import {
  comments,
  issues,
  labels,
  members,
  organizationUsage,
  organizations,
  projects,
  subscriptions,
  users,
} from "@/server/db";
import { runMigrations } from "./migrate";
import type { IssuePriority, IssueStatus } from "@/types/issue";
import type { PlanId } from "@/types/billing";
import type { Role } from "@/types/member";

export type SeedSummary = {
  organizations: number;
  users: number;
  projects: number;
  issues: number;
  comments: number;
};

/**
 * Fixed epoch so every seeded row — and therefore every snapshot test built on
 * this data — has the same timestamps on every machine.
 */
const EPOCH = Date.UTC(2026, 0, 5, 9, 0, 0);
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Ids come from a seeded generator, so the whole fixture is reproducible. */
const nextId = idFactory(20_260_105);

const ORG_SPECS: readonly {
  name: string;
  slug: string;
  plan: PlanId;
  projects: readonly { name: string; slug: string; key: string }[];
}[] = [
  {
    name: "Northwind Labs",
    slug: "northwind",
    plan: "growth",
    projects: [
      { name: "Platform", slug: "platform", key: "PLAT" },
      { name: "Mobile App", slug: "mobile-app", key: "MOB" },
    ],
  },
  {
    name: "Acme Robotics",
    slug: "acme",
    plan: "free",
    projects: [{ name: "Firmware", slug: "firmware", key: "FIRM" }],
  },
];

const ROLE_SPECS: readonly { role: Role; name: string }[] = [
  { role: "owner", name: "Ada Owner" },
  { role: "admin", name: "Bo Admin" },
  { role: "member", name: "Cy Member" },
  { role: "viewer", name: "Di Viewer" },
];

const STATUS_CYCLE: readonly IssueStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
];

const PRIORITY_CYCLE: readonly IssuePriority[] = [
  "none",
  "low",
  "medium",
  "high",
  "urgent",
];

/** Issues per project; two orgs × three projects gives roughly forty issues. */
const ISSUES_PER_PROJECT = 13;

/**
 * Writes the fixture. Idempotent in the sense that it migrates first and then
 * clears every table it owns, so running it twice leaves the same database
 * rather than a doubled one.
 */
export async function seedDatabase(
  databasePath?: string,
): Promise<SeedSummary> {
  await runMigrations(databasePath);

  const db = getDb(databasePath);
  const summary: SeedSummary = {
    organizations: 0,
    users: 0,
    projects: 0,
    issues: 0,
    comments: 0,
  };

  clear();

  const takenSlugs: string[] = [];

  for (const [orgIndex, spec] of ORG_SPECS.entries()) {
    const slug = uniqueSlug(spec.slug, takenSlugs);
    takenSlugs.push(slug);

    const orgId = nextId();
    const created = stamp(orgIndex);
    const limits = getPlanLimits(spec.plan);

    const seededUsers = ROLE_SPECS.map((roleSpec, roleIndex) => {
      const userId = nextId();
      db.insert(users)
        .values({
          id: userId,
          email: `${roleSpec.role}@${slug}.test`,
          name: roleSpec.name,
          passwordHash: `seed$${roleSpec.role}`,
          avatarUrl: null,
          timezone: "UTC",
          emailVerifiedAt: created,
          createdAt: created,
          updatedAt: created,
        })
        .run();
      summary.users += 1;

      db.insert(members)
        .values({
          id: nextId(),
          orgId,
          userId,
          role: roleSpec.role,
          status: "active",
          invitedBy: null,
          joinedAt: created,
          lastSeenAt: created,
          createdAt: created,
          updatedAt: created,
        })
        .run();

      return { userId, role: roleSpec.role, index: roleIndex };
    });

    const ownerId = seededUsers[0]?.userId ?? nextId();

    db.insert(organizations)
      .values({
        id: orgId,
        name: spec.name,
        slug,
        ownerId,
        plan: spec.plan,
        logoUrl: null,
        trialEndsAt: null,
        digestHourUtc: 7 + orgIndex,
        enabledFlagOverrides: JSON.stringify(
          limits.includedFlags.slice(0, 1),
        ),
        createdAt: created,
        updatedAt: created,
      })
      .run();
    summary.organizations += 1;

    db.insert(subscriptions)
      .values({
        id: nextId(),
        orgId,
        plan: spec.plan,
        interval: "monthly",
        status: "active",
        seats: seededUsers.length,
        currentPeriodStart: created,
        currentPeriodEnd: stamp(orgIndex + 30),
        cancelAt: null,
        createdAt: created,
        updatedAt: created,
      })
      .run();

    const labelIds = ["bug", "feature", "chore"].map((name) => {
      const labelId = nextId();
      db.insert(labels)
        .values({
          id: labelId,
          orgId,
          name,
          color: "#94a3b8",
          description: null,
          createdAt: created,
          updatedAt: created,
        })
        .run();
      return labelId;
    });
    void labelIds;

    for (const [projectIndex, projectSpec] of spec.projects.entries()) {
      const projectId = nextId();

      db.insert(projects)
        .values({
          id: projectId,
          orgId,
          name: projectSpec.name,
          slug: projectSpec.slug,
          key: projectSpec.key,
          description: `${projectSpec.name} work for ${spec.name}`,
          visibility: projectIndex === 0 ? "org" : "private",
          status: "active",
          leadId: ownerId,
          color: "#6366f1",
          startsAt: created,
          targetDate: stamp(orgIndex + 60),
          createdAt: created,
          updatedAt: created,
        })
        .run();
      summary.projects += 1;

      for (let n = 1; n <= ISSUES_PER_PROJECT; n += 1) {
        const issueId = nextId();
        const author = seededUsers[n % seededUsers.length];
        const assignee = seededUsers[(n + 1) % seededUsers.length];
        const status = STATUS_CYCLE[n % STATUS_CYCLE.length] ?? "backlog";

        // Every fourth issue is archived and every fifth is overdue, so the
        // soft-delete filters and the overdue job both have data to find.
        const archived = n % 4 === 0;
        const overdue = n % 5 === 0;

        db.insert(issues)
          .values({
            id: issueId,
            orgId,
            projectId,
            number: n,
            title: `${projectSpec.key}-${n}: ${STATUS_CYCLE[n % STATUS_CYCLE.length] ?? "backlog"} work`,
            description: `Seeded issue ${n} in ${projectSpec.name}.`,
            status,
            priority: PRIORITY_CYCLE[n % PRIORITY_CYCLE.length] ?? "none",
            authorId: author?.userId ?? ownerId,
            assigneeId: n % 3 === 0 ? null : (assignee?.userId ?? ownerId),
            parentId: null,
            estimate: n % 8,
            dueAt: overdue ? stamp(-(n + 1)) : stamp(orgIndex + n),
            startedAt: status === "backlog" ? null : created,
            completedAt: status === "done" ? created : null,
            createdAt: stamp(orgIndex + projectIndex + n / 100),
            updatedAt: created,
            archivedAt: archived ? created : null,
          })
          .run();
        summary.issues += 1;

        if (n % 3 !== 0) continue;

        db.insert(comments)
          .values({
            id: nextId(),
            orgId,
            issueId,
            authorId: assignee?.userId ?? ownerId,
            body: `Picking this up. cc @${ROLE_SPECS[0]?.name ?? "owner"}`,
            parentId: null,
            editedAt: null,
            mentionedUserIds: JSON.stringify([ownerId]),
            createdAt: created,
            updatedAt: created,
          })
          .run();
        summary.comments += 1;
      }
    }

    db.insert(organizationUsage)
      .values({
        orgId,
        seatsUsed: seededUsers.length,
        projectsUsed: spec.projects.length,
        issuesUsed: spec.projects.length * ISSUES_PER_PROJECT,
        storageMbUsed: 0,
        measuredAt: created,
      })
      .onConflictDoNothing()
      .run();
  }

  return summary;
}

/** Offsets from the fixed epoch, so timestamps are ordered but stable. */
function stamp(dayOffset: number): string {
  return new Date(EPOCH + dayOffset * MS_PER_DAY).toISOString();
}

/** Empties the tables the seed owns, newest dependency first. */
function clear(): void {
  const db = getDb();
  db.delete(comments).run();
  db.delete(issues).run();
  db.delete(labels).run();
  db.delete(projects).run();
  db.delete(members).run();
  db.delete(subscriptions).run();
  db.delete(organizationUsage).run();
  db.delete(organizations).run();
  db.delete(users).run();
}

/** `pnpm db:seed` runs this file directly; importing it must stay inert. */
if (process.argv[1]?.endsWith("seed.ts") === true) {
  const summary = await seedDatabase();
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}
