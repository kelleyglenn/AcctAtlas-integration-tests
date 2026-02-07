import { APIRequestContext } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:8080/api/v1';

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  response: Response;
}

export async function createTestUser(
  request: APIRequestContext,
  overrides: Partial<Omit<TestUser, 'response'>> = {}
): Promise<TestUser> {
  const userData = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    displayName: 'Test User',
    ...overrides,
  };

  const response = await request.post(`${API_URL}/auth/register`, {
    data: userData,
  });

  return { ...userData, response };
}

export async function loginAs(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });

  const body = await response.json();
  return body.accessToken;
}
