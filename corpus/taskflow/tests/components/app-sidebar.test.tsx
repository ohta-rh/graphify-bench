/**
 * Hides nav items the actor cannot access.
 *
 * Owner B implements `@/components/domain/nav/app-sidebar`. The filtering rule
 * itself is covered by `tests/config/nav.test.ts`; these assert the rendering.
 */
import { describe, it } from "vitest";

describe("components/app-sidebar", () => {
  // The sidebar renders exactly the labels visibleNav() returns for the actor.
  it.todo("renders one link per visible nav item");

  // A viewer's sidebar has no Activity link, because activity:read is member+.
  it.todo("omits a nav item the actor lacks the permission for");

  // With the kanban_board flag off, the Board child link is absent.
  it.todo("omits a nav item whose flag is off in the snapshot");

  // Child items render nested under their parent.
  it.todo("nests child items under their parent");

  // hrefs come from @/lib/url, not from string concatenation in the component.
  it.todo("builds hrefs through the url helpers");
});
