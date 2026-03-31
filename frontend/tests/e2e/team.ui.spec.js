import { test, expect } from '@playwright/test';

function baseUser(overrides = {}) {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'owner@example.com',
    firstName: 'Team',
    lastName: 'Owner',
    workspace: {
      ownerUserId: '11111111-1111-1111-1111-111111111111',
      role: 'admin',
      actorUserId: '11111111-1111-1111-1111-111111111111',
      isTeamMember: false,
    },
    ...overrides,
  };
}

function baseTeam(overrides = {}) {
  return {
    workspace: {
      ownerUserId: '11111111-1111-1111-1111-111111111111',
      actorUserId: '11111111-1111-1111-1111-111111111111',
      actorRole: 'admin',
    },
    plan: { key: 'business', seatLimit: 5 },
    seats: { used: 2, limit: 5, remaining: 3 },
    ownerSeat: { role: 'admin' },
    members: [
      {
        role: 'worker',
        user: {
          id: '22222222-2222-2222-2222-222222222222',
          firstName: 'Worker',
          lastName: 'One',
          email: 'worker.one@example.com',
        },
      },
    ],
    invites: [],
    ...overrides,
  };
}

test('team ui: business admin can assign seat and sees admin badge', async ({ page }) => {
  let teamPayload = baseTeam();

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();

    if (url.endsWith('/api/auth/refresh') && req.method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ accessToken: 'token' }) });
      return;
    }

    if (url.endsWith('/api/auth/me') && req.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(baseUser()) });
      return;
    }

    if (url.endsWith('/api/team') && req.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(teamPayload) });
      return;
    }

    if (url.endsWith('/api/team/members') && req.method() === 'POST') {
      teamPayload = {
        ...teamPayload,
        seats: { used: 3, limit: 5, remaining: 2 },
        members: [
          ...teamPayload.members,
          {
            role: 'worker',
            user: {
              id: '33333333-3333-3333-3333-333333333333',
              firstName: 'New',
              lastName: 'Member',
              email: 'new.member@example.com',
            },
          },
        ],
      };
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ message: 'Team member assigned' }) });
      return;
    }

    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not mocked' }) });
  });

  await page.goto('/settings/team');

  await expect(page.getByText('admin').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assign Seat' })).toBeEnabled();

  await page.locator('input[type="email"]').fill('new.member@example.com');
  await page.getByRole('button', { name: 'Assign Seat' }).click();

  await expect(page.getByText('3 / 5')).toBeVisible();
  await expect(page.getByText('new.member@example.com')).toBeVisible();
});

test('team ui: worker cannot manage seats', async ({ page }) => {
  const workerUser = baseUser({
    firstName: 'Worker',
    lastName: 'Viewer',
    workspace: {
      ownerUserId: '11111111-1111-1111-1111-111111111111',
      role: 'worker',
      actorUserId: '44444444-4444-4444-4444-444444444444',
      isTeamMember: true,
    },
  });

  const workerTeam = baseTeam({
    workspace: {
      ownerUserId: '11111111-1111-1111-1111-111111111111',
      actorUserId: '44444444-4444-4444-4444-444444444444',
      actorRole: 'worker',
    },
  });

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();

    if (url.endsWith('/api/auth/refresh') && req.method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ accessToken: 'token' }) });
      return;
    }

    if (url.endsWith('/api/auth/me') && req.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(workerUser) });
      return;
    }

    if (url.endsWith('/api/team') && req.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(workerTeam) });
      return;
    }

    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not mocked' }) });
  });

  await page.goto('/settings/team');

  await expect(page.getByText('worker').first()).toBeVisible();
  await expect(page.getByText('Only Admin users can manage seats and role assignments.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assign Seat' })).toHaveCount(0);
});

test('team ui: seat limit reached disables assignment', async ({ page }) => {
  const fullTeam = baseTeam({
    seats: { used: 5, limit: 5, remaining: 0 },
    members: [
      {
        role: 'admin',
        user: {
          id: '22222222-2222-2222-2222-222222222222',
          firstName: 'Admin',
          lastName: 'Two',
          email: 'admin.two@example.com',
        },
      },
      {
        role: 'worker',
        user: {
          id: '33333333-3333-3333-3333-333333333333',
          firstName: 'Worker',
          lastName: 'Three',
          email: 'worker.three@example.com',
        },
      },
      {
        role: 'worker',
        user: {
          id: '44444444-4444-4444-4444-444444444444',
          firstName: 'Worker',
          lastName: 'Four',
          email: 'worker.four@example.com',
        },
      },
      {
        role: 'worker',
        user: {
          id: '55555555-5555-5555-5555-555555555555',
          firstName: 'Worker',
          lastName: 'Five',
          email: 'worker.five@example.com',
        },
      },
    ],
  });

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url();

    if (url.endsWith('/api/auth/refresh') && req.method() === 'POST') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ accessToken: 'token' }) });
      return;
    }

    if (url.endsWith('/api/auth/me') && req.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(baseUser()) });
      return;
    }

    if (url.endsWith('/api/team') && req.method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fullTeam) });
      return;
    }

    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'Not mocked' }) });
  });

  await page.goto('/settings/team');

  await expect(page.getByText('5 / 5')).toBeVisible();
  await expect(page.getByText('Seat limit reached: Business supports up to 5 seats total (owner + 4 members).')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assign Seat' })).toBeDisabled();
});
