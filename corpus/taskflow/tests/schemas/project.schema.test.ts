/** Project slug/key validation and the archive scope extension. */
import { describe, expect, it } from "vitest";
import {
  archiveProjectSchema,
  createProjectSchema,
  listProjectsSchema,
  projectStatusSchema,
  projectVisibilitySchema,
  updateProjectSchema,
} from "@/schemas/project";
import { RESERVED_SLUGS } from "@/lib/slug";
import { ORG_A } from "../helpers/factories";

const PROJECT = "01HZZZPPPPPPPPPPPPPPPPPPPP";

function createInput(overrides: Record<string, unknown> = {}) {
  return {
    orgId: ORG_A,
    name: "Website relaunch",
    slug: "website-relaunch",
    key: "WEB",
    ...overrides,
  };
}

describe("schemas/project", () => {
  it("applies the documented defaults", () => {
    expect(createProjectSchema.parse(createInput())).toMatchObject({
      description: null,
      visibility: "org",
      leadId: null,
      color: "#6366f1",
      targetDate: null,
    });
  });

  it("accepts the visibility and status vocabularies", () => {
    for (const visibility of ["private", "org", "public"]) {
      expect(projectVisibilitySchema.safeParse(visibility).success, visibility).toBe(true);
    }
    for (const status of ["active", "paused", "completed"]) {
      expect(projectStatusSchema.safeParse(status).success, status).toBe(true);
    }
    expect(projectVisibilitySchema.safeParse("secret").success).toBe(false);
  });

  it("shares the slug rules with @/lib/slug", () => {
    expect(createProjectSchema.safeParse(createInput({ slug: "Website" })).success).toBe(
      false,
    );
    expect(createProjectSchema.safeParse(createInput({ slug: "web--site" })).success).toBe(
      false,
    );
    expect(createProjectSchema.safeParse(createInput({ slug: "a" })).success).toBe(false);
  });

  it("refuses a reserved slug", () => {
    for (const reserved of RESERVED_SLUGS.slice(0, 5)) {
      const result = createProjectSchema.safeParse(createInput({ slug: reserved }));
      expect(result.success, reserved).toBe(false);
    }
  });

  it("requires a 2-4 character uppercase project key", () => {
    expect(createProjectSchema.safeParse(createInput({ key: "WEB" })).success).toBe(true);
    expect(createProjectSchema.safeParse(createInput({ key: "W" })).success).toBe(false);
    expect(createProjectSchema.safeParse(createInput({ key: "WEBSITE" })).success).toBe(
      false,
    );
    expect(createProjectSchema.safeParse(createInput({ key: "web" })).success).toBe(false);
    expect(createProjectSchema.safeParse(createInput({ key: "1WE" })).success).toBe(false);
    expect(createProjectSchema.safeParse(createInput({ key: "W3B" })).success).toBe(true);
  });

  it("requires a #rrggbb colour", () => {
    expect(createProjectSchema.safeParse(createInput({ color: "#abcdef" })).success).toBe(
      true,
    );
    expect(createProjectSchema.safeParse(createInput({ color: "indigo" })).success).toBe(
      false,
    );
    expect(createProjectSchema.safeParse(createInput({ color: "#abc" })).success).toBe(
      false,
    );
  });

  it("bounds the name and description", () => {
    expect(createProjectSchema.safeParse(createInput({ name: "W" })).success).toBe(false);
    expect(
      createProjectSchema.safeParse(createInput({ name: "a".repeat(81) })).success,
    ).toBe(false);
    expect(
      createProjectSchema.safeParse(createInput({ description: "a".repeat(2_001) }))
        .success,
    ).toBe(false);
  });

  it("makes update fields optional but does not allow a slug or key change", () => {
    const parsed = updateProjectSchema.parse({ orgId: ORG_A, projectId: PROJECT });
    expect(parsed).toEqual({ orgId: ORG_A, projectId: PROJECT });
    expect("slug" in parsed).toBe(false);
    expect("key" in parsed).toBe(false);
  });

  it("defaults an archive to cascading over the project's issues", () => {
    expect(archiveProjectSchema.parse({ orgId: ORG_A, projectId: PROJECT })).toEqual({
      orgId: ORG_A,
      projectId: PROJECT,
      archiveIssues: true,
    });
    expect(
      archiveProjectSchema.parse({
        orgId: ORG_A,
        projectId: PROJECT,
        archiveIssues: false,
      }).archiveIssues,
    ).toBe(false);
  });

  it("extends the list schema with pagination and archive scope", () => {
    const parsed = listProjectsSchema.parse({ orgId: ORG_A });
    expect(parsed.limit).toBe(25);
    expect(parsed.includeArchived).toBeUndefined();
    expect(
      listProjectsSchema.parse({ orgId: ORG_A, includeArchived: true }).includeArchived,
    ).toBe(true);
  });
});
