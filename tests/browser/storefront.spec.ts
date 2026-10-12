import { test, expect } from "@playwright/test";
test("storefront → upload has accessible controls and no overflow", async ({
  page,
}) => {
  await page.goto("/high-elf-club");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your memories.",
  );
  await expect(page.locator("img").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/storefront-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Create your own" }).click();
  await expect(
    page.getByRole("heading", { name: "Choose a photo." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create your artwork" }),
  ).toBeDisabled();
  await page.getByLabel("Choose a photo", { exact: true }).setInputFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await expect(page.getByRole("alert")).toContainText("JPEG, PNG or WebP");
});
test("private artwork requires the browser capability", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "pluto_customer",
      value: "browser-test-secret",
      domain: "localhost",
      path: "/",
    },
  ]);
  await page.goto("/high-elf-club/create/44444444-4444-4444-8444-444444444444");
  await expect(
    page.getByRole("heading", { name: "Choose your favorite." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Artwork 0/ })).toHaveCount(3);
  await page.getByRole("button", { name: /Artwork 01/ }).click();
  await expect(page.getByRole("button", { name: "Order print" })).toBeEnabled();
  await page.screenshot({
    path: `test-results/artworks-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.goto(
    "/high-elf-club/create/44444444-4444-4444-8444-444444444444/poster?artwork=55555555-5555-4555-8555-555555555550",
  );
  await expect(page.getByRole("radio", { name: /A3 Poster/ })).toBeChecked();
  await page.getByRole("radio", { name: /A2 Poster/ }).check();
  await expect(
    page.getByRole("button", { name: "Continue to checkout" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/poster-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("another browser cannot read private artwork", async ({ page }) => {
  await page.goto("/high-elf-club/create/44444444-4444-4444-8444-444444444444");
  await expect(
    page.getByRole("heading", { name: "A small interruption." }),
  ).toBeVisible();
  await expect(page.getByAltText(/Your artwork/)).toHaveCount(0);
});
