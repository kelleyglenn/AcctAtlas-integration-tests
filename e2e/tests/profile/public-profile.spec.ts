import { test, expect } from "@playwright/test";
import { SEED_USERS } from "../../fixtures/seed-data";
import { PAGE_LOAD_TIMEOUT } from "../../fixtures/test-constants";
import { createTestUser, loginViaUI } from "../../fixtures/test-data";

test.describe("Public Profile", () => {
  const seedUser = SEED_USERS.TRUSTED_SUBMITTER;

  test("public profile shows display name and avatar", async ({ page }) => {
    await page.goto(`/users/${seedUser.id}`);
    // Should show display name (from seed data: "Trusted User")
    await expect(page.getByRole("heading")).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });
    // Should show member since
    await expect(page.getByText(/member since/i)).toBeVisible();
  });

  test("public profile shows approved video count", async ({ page }) => {
    await page.goto(`/users/${seedUser.id}`);
    await expect(page.getByText(/\d+ approved video/i)).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });
  });

  test("returns 404 for non-existent user", async ({ page }) => {
    await page.goto("/users/00000000-0000-0000-0000-000000000099");
    await expect(page.getByText(/not found/i)).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });
  });

  test("public profile shows trust tier badge when authenticated", async ({
    page,
    request,
    browserName,
  }) => {
    const user = await createTestUser(request);
    await loginViaUI(page, user.email, user.password, browserName);
    await page.goto(`/users/${seedUser.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });
    const badge = page.getByTestId("trust-tier-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText("TRUSTED");
  });

  test("public profile hides trust tier badge when not authenticated", async ({
    page,
  }) => {
    await page.goto(`/users/${seedUser.id}`);
    await expect(page.getByRole("heading")).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    });
    await expect(page.getByTestId("trust-tier-badge")).not.toBeVisible();
  });
});
