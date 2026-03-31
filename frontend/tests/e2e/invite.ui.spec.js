import { test, expect } from '@playwright/test';

const token = '1234567890abcdef12345678abcdef12';

test('invite ui: signed-out user sees sign-in and register actions', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();

    if (url.endsWith('/api/auth/refresh') && req.method() === 'POST') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Refresh token is required' }),
      });
      return;
    }

    if (url.includes(`/api/team/invites/preview/${token}`) && req.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invite: {
            id: 'invite-1',
            email: 'invitee@example.com',
            role: 'worker',
            status: 'pending',
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
          workspace: {
            ownerName: 'Acme Ops',
          },
        }),
      });
      return;
    }

    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not mocked' }) });
  });

  await page.goto(`/invite/${token}`);

  await expect(page.getByText('Team Invitation')).toBeVisible();
  await expect(page.getByText('Acme Ops')).toBeVisible();
  await expect(page.getByText('invitee@example.com')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign In to Accept' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create Account and Accept' })).toBeVisible();
});

test('invite ui: signed-in invited user auto-accepts and redirects to dashboard', async ({ page }) => {
  let acceptCalled = false;

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();

    if (url.endsWith('/api/auth/refresh') && req.method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: 'token-123' }),
      });
      return;
    }

    if (url.endsWith('/api/auth/me') && req.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'u-1',
          email: 'invitee@example.com',
          firstName: 'Invited',
          lastName: 'User',
          workspace: {
            ownerUserId: 'u-1',
            role: 'admin',
            actorUserId: 'u-1',
            isTeamMember: false,
          },
        }),
      });
      return;
    }

    if (url.includes(`/api/team/invites/preview/${token}`) && req.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invite: {
            id: 'invite-2',
            email: 'invitee@example.com',
            role: 'admin',
            status: 'pending',
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
          },
          workspace: {
            ownerName: 'Acme Ops',
          },
        }),
      });
      return;
    }

    if (url.endsWith('/api/team/invites/accept') && req.method() === 'POST') {
      acceptCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Invite accepted',
          workspace: {
            ownerUserId: 'owner-1',
            role: 'admin',
          },
        }),
      });
      return;
    }

    if (url.includes('/api/dashboard/') && req.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
      return;
    }

    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not mocked' }) });
  });

  await page.goto(`/invite/${token}`);

  await expect.poll(() => acceptCalled).toBe(true);
  await expect(page).toHaveURL(/\/dashboard/);
});

test('invite ui: expired invite displays inactive message', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();

    if (url.endsWith('/api/auth/refresh') && req.method() === 'POST') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Refresh token is required' }),
      });
      return;
    }

    if (url.includes(`/api/team/invites/preview/${token}`) && req.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invite: {
            id: 'invite-3',
            email: 'invitee@example.com',
            role: 'worker',
            status: 'expired',
            expiresAt: new Date(Date.now() - 86400000).toISOString(),
          },
          workspace: {
            ownerName: 'Acme Ops',
          },
        }),
      });
      return;
    }

    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not mocked' }) });
  });

  await page.goto(`/invite/${token}`);

  await expect(page.getByText('This invite is no longer active. Ask your workspace admin for a new invite link.')).toBeVisible();
});
