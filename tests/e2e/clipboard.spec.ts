import type { Page } from "@playwright/test";
import { test, expect, remote, rid } from "@tests/support/fixtures.js";

const sourceBrowsingFixture = `/seeds/0.0.0.0/rad:${rid}`;

async function expectClipboard(content: string, page: Page) {
  const clipboardContent = await page.evaluate<string>(
    "navigator.clipboard.readText()",
  );
  expect(clipboardContent).toBe(content);
}

// We explicitly run all clipboard tests withing the context of a single test
// so that we don't run into race conditions, because there is no way to isolate
// the clipboard in Playwright yet.
test("copy to clipboard", async ({ page, browserName, context }) => {
  // These tests only work in Chromium, because other browsers don't support
  // changing permissions.
  if (browserName !== "chromium") {
    test.skip();
  }
  context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.goto(sourceBrowsingFixture);

  // Reset system clipboard to a known state.
  await page.evaluate<string>("navigator.clipboard.writeText('')");

  // Project ID.
  {
    await page.locator(".id > .clipboard").click();
    const clipboardContent = await page.evaluate<string>(
      "navigator.clipboard.readText()",
    );
    expect(clipboardContent).toBe(`rad:${rid}`);
  }

  // `rad clone` URL.
  {
    await page.getByText("Clone").click();
    await page
      .locator(`text=rad clone rad://0.0.0.0/${rid.substring(0, 6)}`)
      .hover();
    await page
      .locator(".clone-url-wrapper > span")
      .first()
      .locator(".clipboard")
      .click();
    await expectClipboard(`rad clone rad://0.0.0.0/${rid}`, page);
  }

  // `git clone` URL.
  {
    await page.getByText("Clone").click();
    await page.locator(`text=https://0.0.0.0/${rid.substring(0, 6)}`).hover();
    await page
      .locator(".clone-url-wrapper > span")
      .last()
      .locator(".clipboard")
      .click();
    await expectClipboard(`https://0.0.0.0/${rid}.git`, page);
  }

  await page.goto("/seeds/radicle.local");
  // Seed address.
  {
    await page.locator(".clipboard").first().click();
    await expectClipboard("0.0.0.0", page);

    await page.locator(".clipboard").last().click();
    await expectClipboard(remote, page);
  }

  // Clear the system clipboard contents so developers don't wonder why there's
  // random stuff in their clipboard after running tests.
  await page.evaluate<string>("navigator.clipboard.writeText('')");
});
