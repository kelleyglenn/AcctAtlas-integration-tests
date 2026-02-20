import { APIRequestContext, Page, expect } from "@playwright/test";

const API_URL = process.env.API_URL || "http://localhost:8080/api/v1";

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  response: Response;
}

export async function createTestUser(
  request: APIRequestContext,
  overrides: Partial<Omit<TestUser, "response">> = {},
): Promise<TestUser> {
  const userData = {
    email: `test-${Date.now()}@example.com`,
    password: "TestPass123!",
    displayName: "Test User",
    ...overrides,
  };

  const response = await request.post(`${API_URL}/auth/register`, {
    data: userData,
  });

  return { ...userData, response };
}

export async function loginViaUI(
  page: Page,
  email: string,
  password: string,
  browserName: string,
): Promise<void> {
  await page.goto("/login");
  const emailField = page.getByLabel("Email");
  const passwordField = page.getByLabel("Password");

  if (browserName === "webkit") {
    await emailField.click();
    await emailField.fill(email);
    await passwordField.click();
    await passwordField.fill(password);
  } else {
    await emailField.fill(email);
    await passwordField.fill(password);
  }
  await page
    .locator("form")
    .getByRole("button", { name: /Sign In/i })
    .click();
  await expect(page).toHaveURL("/");
}

export async function loginAs(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });

  const body = await response.json();
  return body.accessToken;
}
