import {
  aliceMainCommitCount,
  aliceMainCommitMessage,
  aliceMainHead,
  bobMainCommitCount,
  cobUrl,
  expect,
  markdownUrl,
  shortAliceHead,
  shortBobHead,
  sourceBrowsingRid,
  sourceBrowsingUrl,
  test,
} from "@tests/support/fixtures.js";
import { changeBranch, createRepo } from "@tests/support/repo";
import { expectUrlPersistsReload } from "@tests/support/router";

test("navigate to repo", async ({ page }) => {
  await page.goto(sourceBrowsingUrl);

  // Header.
  {
    const name = page.getByRole("link", { name: "source-browsing" }).nth(1);
    const id = page.getByText(sourceBrowsingRid);
    const description = page.getByText(
      "Git repository for source browsing tests",
    );

    await expect(name).toBeVisible();
    await expect(id).toBeVisible();
    await expect(description).toBeVisible();
  }

  // Repo menu shows default selected branch and commit and contributor counts.
  {
    await expect(page.getByTitle("Change branch")).toBeVisible();
    await expect(
      page
        .getByRole("button", {
          name: `${shortAliceHead} ${aliceMainCommitMessage}`,
        })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: `Commits ${aliceMainCommitCount}`,
      }),
    ).toBeVisible();
  }

  // Navigate to the repo README.md by default.
  await expect(page.locator(".filename")).toContainText("README.md");

  // Show a commit teaser.
  await expect(page.getByText("dd068e9 Add README.md")).toBeVisible();

  // Show rendered README.md contents.
  await expect(page.getByText("Git test repository")).toBeVisible();
});

test("repo description", async ({ page, peer }) => {
  const { rid } = await createRepo(peer, {
    name: "heartwood",
    description: "Radicle Heartwood Protocol & Stack",
  });
  await page.goto(peer.ridUrl(rid));
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByText("Radicle Heartwood Protocol & Stack"),
  ).toBeVisible();
});

test("show source tree at specific revision", async ({ page }) => {
  await page.goto(sourceBrowsingUrl);
  await page
    .getByRole("link", { name: `Commits ${aliceMainCommitCount}` })
    .click();

  await page
    .locator(".teaser", { hasText: "335dd6d" })
    .getByRole("button", {
      name: "Browse repo at this commit",
    })
    .click();

  await expect(page.getByTitle("Current HEAD")).toContainText("335dd6d");
  await expect(page.locator(".source-tree")).toHaveText("bin src");
  await expect(
    page.getByRole("link", {
      name: "Commits 2",
    }),
  ).toBeVisible();
});

test("source file highlighting", async ({ page }) => {
  await page.goto(sourceBrowsingUrl);

  await page.getByText("src").click();
  await page.getByText("true.c").click();

  await expect(page.getByText("return")).toHaveCSS(
    "color",
    "rgb(255, 123, 114)",
  );
});

test("navigate line numbers", async ({ page }) => {
  await page.goto(`${markdownUrl}/tree/main/cheatsheet.md`);
  await page.getByRole("button", { name: "Code" }).click();

  await page.getByRole("link", { name: "5", exact: true }).click();
  await expect(page.locator("#L5")).toHaveClass("line highlight");
  await expect(page).toHaveURL(`${markdownUrl}/tree/main/cheatsheet.md#L5`);

  await expectUrlPersistsReload(page);
  await expect(page.locator("#L5")).toHaveClass("line highlight");

  await page.getByRole("link", { name: "30", exact: true }).click();
  await expect(page.locator("#L5")).not.toHaveClass("line highlight");
  await expect(page.locator("#L30")).toHaveClass("line highlight");
  await expect(page).toHaveURL(`${markdownUrl}/tree/main/cheatsheet.md#L30`);

  // Check that we go back to the Markdown view when navigating to a different
  // file.
  await page.getByRole("link", { name: "footnotes.md" }).click();
  await expect(page.getByRole("button", { name: "Preview" })).toHaveClass(
    /selected/,
  );
});

test("navigate deep file hierarchies", async ({ page }) => {
  await page.goto(sourceBrowsingUrl);

  const sourceTree = page.locator(".source-tree");

  await sourceTree.getByText("deep").click();
  await sourceTree.getByText("directory").click();
  await sourceTree.getByText("hierarchy").click();
  await sourceTree.getByText("is").click();
  await sourceTree.getByText("entirely").click();
  await sourceTree.getByText("possible").click();
  await sourceTree.getByText("in").nth(1).click();
  await sourceTree.getByRole("button", { name: "git" }).click();
  await sourceTree.getByText("repositories").click();
  await sourceTree.getByText(".gitkeep").click();
  await expect(
    page.getByText("0801ace Add a deeply nested directory tree"),
  ).toBeVisible();

  // After a page reload the tree browser is still expanded and we're still
  // showing the .gitkeep file.
  {
    await page.reload();

    const sourceTree = page.locator(".source-tree");

    await expect(sourceTree.getByText("deep")).toBeVisible();
    await expect(sourceTree.getByText("directory")).toBeVisible();
    await expect(sourceTree.getByText("hierarchy")).toBeVisible();
    await expect(sourceTree.getByText("is")).toBeVisible();
    await expect(sourceTree.getByText("entirely")).toBeVisible();
    await expect(sourceTree.getByText("possible")).toBeVisible();
    await expect(sourceTree.getByText("in").nth(1)).toBeVisible();
    await expect(sourceTree.getByText("git").nth(1)).toBeVisible();
    await expect(sourceTree.getByText("repositories")).toBeVisible();
    await expect(sourceTree.getByText(".gitkeep")).toBeVisible();

    await expect(
      page.getByText("0801ace Add a deeply nested directory tree"),
    ).toBeVisible();
  }
});

test("submodules", async ({ page }) => {
  await page.goto(sourceBrowsingUrl);
  await expect(page.getByText("rips @ 329dee9")).toBeVisible();
});

test("files with special characters in the filename", async ({ page }) => {
  await page.goto(sourceBrowsingUrl);

  const sourceTree = page.locator(".source-tree");
  await sourceTree.getByText("special").click();

  await sourceTree.getByText("+plus+").click();
  await expect(page.getByRole("banner")).toContainText("+plus");

  await sourceTree.getByText("-dash-").click();
  await expect(page.getByRole("banner")).toContainText("-dash-");

  await sourceTree.getByText(":colon:").click();
  await expect(page.getByRole("banner")).toContainText(":colon:");

  await sourceTree.getByText(";semicolon;").click();
  await expect(page.getByRole("banner")).toContainText(";semicolon;");

  await sourceTree.getByText("@at@").click();
  await expect(page.getByRole("banner")).toContainText("@at@");

  await sourceTree.getByText("_underscore_").click();
  await expect(page.getByRole("banner")).toContainText("_underscore_");

  // TODO: fix these errors in `radicle-httpd` for the following edge cases.
  //
  // await sourceTree.getByText("back\\slash").click();
  // await expect(page.locator(".filename")).toContainText("back\\slash");
  // await sourceTree.getByText("qs?param1=value?param2=value2#hash").click();
  // await expect(page.locator(".filename")).toContainText(
  //   "qs?param1=value?param2=value2#hash",
  // );

  await sourceTree.getByText("spaces are okay").click();
  await expect(page.getByRole("banner")).toContainText("spaces are okay");

  await sourceTree.getByText("~tilde~").click();
  await expect(page.getByRole("banner")).toContainText("~tilde~");

  await sourceTree.getByText("👹👹👹").click();
  await expect(page.getByRole("banner")).toContainText("👹👹👹");
});

test("binary files", async ({ page }) => {
  await page.goto(sourceBrowsingUrl);

  await page.getByText("bin").click();
  await page.getByText("true").click();

  await expect(page.getByText("Binary file")).toBeVisible();
});

test("empty files", async ({ page }) => {
  await page.goto(sourceBrowsingUrl);

  await page.getByText("special").click();
  await page.getByText("_underscore_").click();

  await expect(page.getByText("Empty file")).toBeVisible();
});

test("hidden files", async ({ page }) => {
  await page.goto(sourceBrowsingUrl);

  await page.getByText(".hidden").click();

  await expect(page.getByText("I'm a hidden file.")).toBeVisible();
});

test("markdown files", async ({ page }) => {
  await page.goto(`${markdownUrl}/tree/main/cheatsheet.md`);

  await expect(
    page.getByText("This is intended as a quick reference and showcase."),
  ).toBeVisible();

  // Switch between raw and rendered modes.
  {
    await expect(page.getByRole("button", { name: "Preview" })).toHaveClass(
      /selected/,
    );
    await expect(page.getByRole("button", { name: "Code" })).toHaveClass(
      /not-selected/,
    );
    await page.getByRole("button", { name: "Code" }).click();
    await expect(page.getByRole("button", { name: "Preview" })).toHaveClass(
      /not-selected/,
    );
    await expect(page.getByRole("button", { name: "Code" })).toHaveClass(
      /selected/,
    );
    await expect(page.getByText("##### Table of Contents")).toBeVisible();
    await page.getByRole("button", { name: "Preview" }).click();
  }

  // Internal links go to anchor.
  {
    await page.getByRole("link", { name: "YouTube Videos" }).click();
    await expect(page).toHaveURL(
      `${markdownUrl}/tree/main/cheatsheet.md#videos`,
    );
  }
});

test("clone modal", async ({ page }) => {
  await page.goto(sourceBrowsingUrl);

  await page.getByRole("button", { name: "Clone" }).click();
  await expect(page.getByText(`rad clone ${sourceBrowsingRid}`)).toBeVisible();
  await page.getByRole("button", { name: "Git" }).click();
  await expect(
    page.getByText(
      `http://localhost/${sourceBrowsingRid.replace("rad:", "")}.git`,
    ),
  ).toBeVisible();
});

test("peer and branch switching", async ({ page }) => {
  await page.goto(sourceBrowsingUrl);

  // Alice's peer.
  {
    await changeBranch("alice", `main ${shortAliceHead}`, page);
    await expect(page.getByTitle("Change branch")).toHaveText(/alice/);

    // Default `main` branch.
    {
      await expect(page.getByTitle("Change branch")).toHaveText(/main/);
      await expect(
        page
          .getByRole("button", {
            name: `${shortAliceHead} ${aliceMainCommitMessage}`,
          })
          .first(),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: `Commits ${aliceMainCommitCount}`,
        }),
      ).toBeVisible();
    }

    // Feature branch with a slash in the name.
    {
      await changeBranch("alice", "feature/branch", page);
      await page.getByTitle("Change branch").click();
      await page.getByText("feature/branch").click();

      await expect(
        page.getByRole("button", { name: "feature/branch" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "1aded56 Add subconscious file" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: "Commits 9",
        }),
      ).toBeVisible();
    }

    // Branch without a history or files in it.
    {
      await changeBranch("alice", "orphaned-branch", page);

      await expect(
        page.getByRole("button", { name: "orphaned-branch" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "af3641c Add empty orphaned" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: "Commits 1",
        }),
      ).toBeVisible();

      await expect(page.getByText("No files at this revision")).toBeVisible();
    }
  }

  // Reset the source browser by clicking the repo title.
  {
    await page.getByRole("link", { name: "source-browsing" }).nth(1).click();

    await expect(page.getByTitle("Change branch")).not.toContainText("alice");
    await expect(page.getByTitle("Change branch")).not.toContainText("bob");

    await expect(page.getByTitle("Change branch")).toBeVisible();
    await expect(
      page
        .getByRole("button", {
          name: `${shortAliceHead} ${aliceMainCommitMessage}`,
        })
        .first(),
    ).toBeVisible();
    await expect(page.getByText("Git test repository")).toBeVisible();
  }

  // Bob's peer.
  {
    await changeBranch("bob", `main ${shortBobHead}`, page);
    await expect(
      page.getByRole("button", { name: "avatar bob / main" }),
    ).toBeVisible();

    // Default `main` branch.
    {
      await expect(page.getByRole("button", { name: "main" })).toBeVisible();
      await expect(
        page
          .getByRole("button", { name: `${shortBobHead} Update readme` })
          .first(),
      ).toBeVisible();
      await expect(
        page.getByRole("link", {
          name: `Commits ${bobMainCommitCount}`,
        }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("button", { name: `${shortBobHead} Update readme` })
          .first(),
      ).toBeVisible();
    }
  }
});

test("only one modal can be open at a time", async ({ page }) => {
  await page.goto(sourceBrowsingUrl);

  await changeBranch("alice", `main ${shortAliceHead}`, page);

  await page.getByText("Clone").click();
  await expect(page.getByText("Code font")).not.toBeVisible();
  await expect(page.getByText("Use the Radicle CLI")).toBeVisible();
  await expect(page.getByText("bob")).not.toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByText("Code font")).toBeVisible();
  await expect(page.getByText("Use the Radicle CLI")).not.toBeVisible();
  await expect(page.getByText("bob")).not.toBeVisible();

  await page.getByTitle("Change branch").click();
  await expect(page.getByText("Code font")).not.toBeVisible();
  await expect(page.getByText("Use the Radicle CLI")).not.toBeVisible();
  await expect(page.getByText("bob")).toBeVisible();
});

test.describe("browser error handling", () => {
  test("error appears when folder can't be loaded", async ({ page }) => {
    await page.route(
      ({ pathname }) =>
        pathname.startsWith(
          `/api/v1/repos/${sourceBrowsingRid}/tree/${aliceMainHead}/src`,
        ),
      route => route.fulfill({ status: 500 }),
    );

    await page.goto(sourceBrowsingUrl);

    const sourceTree = page.locator(".source-tree");
    await sourceTree.getByText("src").click();

    await expect(page.getByText("No README found.")).toBeVisible();
  });
  test("error appears when file can't be loaded", async ({ page }) => {
    await page.route(
      ({ pathname }) =>
        pathname ===
        `/api/v1/repos/${sourceBrowsingRid}/blob/${aliceMainHead}/.hidden`,
      route => route.fulfill({ status: 500 }),
    );

    await page.goto(sourceBrowsingUrl);
    await page.getByText(".hidden").click();

    await expect(page.getByText("File not found")).toBeVisible();
  });
  test("error appears when README can't be loaded", async ({ page }) => {
    await page.route(
      ({ pathname }) =>
        pathname ===
        `/api/v1/repos/${sourceBrowsingRid}/readme/${aliceMainHead}`,
      route => route.fulfill({ status: 500 }),
    );

    await page.goto(sourceBrowsingUrl);
    await expect(page.getByText("No README found.")).toBeVisible();
  });
  test("error appears when navigating to missing file", async ({ page }) => {
    await page.route(
      ({ pathname }) =>
        pathname ===
        `/api/v1/repos/${sourceBrowsingRid}/blob/${aliceMainHead}/.hidden`,
      route => route.fulfill({ status: 500 }),
    );

    await page.goto(`${sourceBrowsingUrl}/tree/master/.hidden`);

    await expect(page.getByText("File not found")).toBeVisible();
  });
});

test("external markdown link", async ({ context, page }) => {
  await context.route("https://example.com/**", route => {
    return route.fulfill({ body: "hello", contentType: "text/plain" });
  });
  await page.goto(`${markdownUrl}/tree/main/footnotes.md`);
  const pagePromise = context.waitForEvent("page");
  await page.getByRole("link", { name: "https://example.com" }).click();
  const newPage = await pagePromise;
  await expect(newPage).toHaveURL("https://example.com");
});

test("absolute markdown link", async ({ page }) => {
  await page.goto(markdownUrl);
  await page.getByRole("link", { name: "Nested Linked File" }).click();
  await expect(page).toHaveURL(
    `${markdownUrl}/tree/relative-files/linked-file.md`,
  );
  await page.goBack();
  await expect(page).toHaveURL(markdownUrl);
  await page.getByRole("link", { name: "Link Files" }).click();
  await page.getByRole("link", { name: "Absolute Link" }).click();
  await expect(page).toHaveURL(
    `${markdownUrl}/tree/relative-files/linked-file.md`,
  );
  await page.getByRole("link", { name: "nested file", exact: true }).click();
  await expect(page).toHaveURL(
    `${markdownUrl}/tree/relative-files/nested-file.md`,
  );
  await page.goBack();
  await page.getByRole("link", { name: "nested file with" }).click();
  await expect(page).toHaveURL(
    `${markdownUrl}/tree/relative-files/nested-file.md`,
  );
  await page.goBack();
  await page.getByRole("link", { name: "Back to link-files with" }).click();
  await expect(page).toHaveURL(`${markdownUrl}/tree/link-files.md`);
});

test("internal file markdown link", async ({ page }) => {
  await page.goto(`${markdownUrl}/tree/main/link-files.md`);
  await page.getByRole("link", { name: "Markdown Cheatsheet" }).click();
  await expect(page).toHaveURL(`${markdownUrl}/tree/main/cheatsheet.md`);
  await expect(page.getByText("cheatsheet.md").nth(2)).toBeVisible();

  await page.goto(markdownUrl);
  await page.getByRole("link", { name: "Link Files" }).click();
  await page.getByRole("button", { name: "Files", exact: true }).click();
  await page.getByRole("link", { name: "Link Files" }).click();
  await expect(page).toHaveURL(`${markdownUrl}/tree/link-files.md`);
  await expect(page.getByText("link-files.md").nth(2)).toBeVisible();

  await page.goto(`${markdownUrl}/tree/main/link-files.md`);
  await page.getByRole("link", { name: "black square" }).click();
  await expect(page).toHaveURL(
    `${markdownUrl}/tree/main/assets/black-square.png`,
  );
  await expect(page.getByText("assets/black-square.png").nth(1)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "black-square.png" }),
  ).toBeVisible();
});

test("diff selection de-select", async ({ page }) => {
  await page.goto(`${cobUrl}/patches`);
  await page
    .getByRole("link", { name: "Taking another stab at the README" })
    .click();
  await page.getByRole("link", { name: "Changes" }).click();
  await page
    .getByRole("row", { name: "+ # Cobs Repo" })
    .locator("div")
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp("tab=changes#README.md:H0L1$"));
  // Click outside.
  await page
    .getByText("1 file modified with 5 insertions and 1 deletion")
    .click();
  await expect(page).toHaveURL(new RegExp("tab=changes$"));
});
