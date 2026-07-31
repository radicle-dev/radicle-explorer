import { describe, expect, test } from "vitest";
import { isOid, repoRouteToPath } from "@app/views/repos/router";
import { testExports } from "@app/views/repos/loads";

// Defining the window.origin value, since vitest doesn't provide one.
window.origin = "http://localhost:3000";

describe("isOid", () => {
  test.each([
    { oid: "a64ae9c6d572e0ad906faa9a4a7a8d43f113278c", expected: true },
    { oid: "a64ae9c", expected: false },
  ])("isOid $oid => $expected", ({ oid, expected }) => {
    expect(isOid(oid)).toEqual(expected);
  });
});

describe("repo alias in routes", () => {
  const node = { hostname: "localhost", port: 8080, scheme: "http" };
  const rid = "rad:z3gqcJUoA1n9HaHKufZs5FCSGazv5";

  test.each([
    { segment: "heartwood", description: "an alias" },
    { segment: rid, description: "a RID" },
  ])(
    "preserves $description as the repo segment in generated paths",
    ({ segment }) => {
      // Links are built from the segment (alias or RID) the user navigated in
      // with, so in-repo links keep whichever form was used.
      expect(
        repoRouteToPath({ resource: "repo.issues", node, repo: segment }),
      ).toContain(`/${segment}/issues`);
    },
  );
});

describe("detectRevision", () => {
  const branches = {
    main: "a64ae9c6d572e0ad906faa9a4a7a8d43f113278c",
    "feature/nested": "b64ae9c6d572e0ad906faa9a4a7a8d43f113278c",
  };

  test("branch only", () => {
    expect(testExports.detectRevision("main", branches)).toEqual({
      revision: "main",
      path: "/",
    });
  });

  test("branch with path", () => {
    expect(testExports.detectRevision("main/src/lib.rs", branches)).toEqual({
      revision: "main",
      path: "src/lib.rs",
    });
  });

  test("branch name containing slashes", () => {
    expect(
      testExports.detectRevision("feature/nested/README.md", branches),
    ).toEqual({
      revision: "feature/nested",
      path: "README.md",
    });
  });

  test("commit oid with path", () => {
    expect(
      testExports.detectRevision(
        "c64ae9c6d572e0ad906faa9a4a7a8d43f113278c/src/lib.rs",
        branches,
      ),
    ).toEqual({
      revision: "c64ae9c6d572e0ad906faa9a4a7a8d43f113278c",
      path: "src/lib.rs",
    });
  });

  test("plain path with no matching revision", () => {
    expect(testExports.detectRevision("src/lib.rs", branches)).toEqual({
      path: "src/lib.rs",
    });
  });
});
