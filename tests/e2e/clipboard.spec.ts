import {
  expect,
  sourceBrowsingUrl,
  sourceBrowsingRid,
  test,
  cobUrl,
} from "@tests/support/fixtures.js";

// We explicitly run all clipboard tests withing the context of a single test
// so that we don't run into race conditions, because there is no way to isolate
// the clipboard in Playwright yet.
test("copy to clipboard", async ({ page, browserName, context }) => {
  if (browserName === "chromium") {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  } else if (browserName === "webkit") {
    // We aren't able to programmatically change the permissions in webkit.
    test.skip();
  }

  async function expectClipboard(content: string) {
    const clipboardContent = await page.evaluate<string>(
      "navigator.clipboard.readText()",
    );
    expect(clipboardContent).toBe(content);
  }

  await page.goto(sourceBrowsingUrl);

  // Reset system clipboard to a known state.
  await page.evaluate<string>("navigator.clipboard.writeText('')");

  // Repo ID.
  {
    await page.getByLabel("repo-id").click();
    await expectClipboard(sourceBrowsingRid);
  }

  // `rad clone` URL.
  {
    await page.getByRole("button", { name: "Clone" }).first().click();
    await page.getByText("rad clone").locator(".clipboard").first().click();
    await expectClipboard(`rad clone ${sourceBrowsingRid}`);
  }

  // `git clone` URL.
  {
    await page.getByRole("button", { name: "Git" }).click();
    await page.getByText("git clone").locator(".clipboard").first().click();
    await expectClipboard(
      `git clone http://localhost/${sourceBrowsingRid.replace(
        "rad:",
        "",
      )}.git source-browsing`,
    );
  }

  // After switching the patch or issue listing the `<Id>` components should return new COB ids.
  {
    await page.goto(`${cobUrl}/patches`);
    await page.getByRole("button", { name: "59a0821", exact: true }).click();
    await expectClipboard("59a0821edc73630bce540596cffc7854da557365");

    await page.getByLabel("filter-dropdown").click();
    await page.getByRole("button", { name: "Draft" }).click();
    await page.getByRole("button", { name: "783d33c", exact: true }).click();
    await expectClipboard("783d33c5b14e13234d4d7affa98bd0b52d1b1ea3");
  }

  // Clear the system clipboard contents so developers don't wonder why there's
  // random stuff in their clipboard after running tests.
  await page.evaluate<string>("navigator.clipboard.writeText('')");
});
