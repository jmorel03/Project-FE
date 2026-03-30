import { test, expect } from '@playwright/test';

test('auth ui smoke: register, logout, login', async ({ page }) => {
  const unique = Date.now();
  const firstName = 'Smoke';
  const lastName = `User${unique}`;
  const email = `ui-smoke-${unique}@example.com`;
  const password = 'StrongPass1!';

  await page.goto('/register');

  await page.locator('input[name="firstName"]').fill(firstName);
  await page.locator('input[name="lastName"]').fill(lastName);
  await page.locator('input[name="companyName"]').fill('Smoke Co');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);

  await page.getByRole('button', { name: /Create free account/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByRole('button', { name: new RegExp(`${firstName} ${lastName}`) }).click();
  const signOutButton = page.locator('button').filter({ hasText: 'Sign Out' }).first();
  await expect(signOutButton).toBeVisible();
  await signOutButton.click();
  await expect(page).toHaveURL(/\/login/);

  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: /Sign in/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText('Financial Operations')).toBeVisible();
});
