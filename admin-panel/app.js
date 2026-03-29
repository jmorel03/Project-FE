const storageKeys = {
  apiBase: 'xpensist_admin_api_base',
  token: 'xpensist_admin_access_token',
  email: 'xpensist_admin_email',
};

const els = {
  loginCard: document.getElementById('loginCard'),
  dashboard: document.getElementById('dashboard'),
  loginForm: document.getElementById('loginForm'),
  loginError: document.getElementById('loginError'),
  apiBase: document.getElementById('apiBase'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  logoutBtn: document.getElementById('logoutBtn'),
  adminEmail: document.getElementById('adminEmail'),
  metrics: document.getElementById('metrics'),
  usersBody: document.getElementById('usersBody'),
  usersMeta: document.getElementById('usersMeta'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Number(value || 0));
}

function cleanApiBase(raw) {
  return String(raw || '').trim().replace(/\/+$/, '');
}

function setSession({ apiBase, token, email }) {
  localStorage.setItem(storageKeys.apiBase, apiBase);
  localStorage.setItem(storageKeys.token, token);
  localStorage.setItem(storageKeys.email, email);
}

function clearSession() {
  localStorage.removeItem(storageKeys.apiBase);
  localStorage.removeItem(storageKeys.token);
  localStorage.removeItem(storageKeys.email);
}

function getSession() {
  return {
    apiBase: localStorage.getItem(storageKeys.apiBase) || '',
    token: localStorage.getItem(storageKeys.token) || '',
    email: localStorage.getItem(storageKeys.email) || '',
  };
}

async function apiFetch(path, opts = {}) {
  const { apiBase, token } = getSession();
  const res = await fetch(`${apiBase}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) errorMessage = body.error;
    } catch (error) {
      // Ignore body parse errors.
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

function showDashboard(email) {
  els.loginCard.classList.add('hidden');
  els.dashboard.classList.remove('hidden');
  els.adminEmail.textContent = email || '';
}

function showLogin(message = '') {
  els.dashboard.classList.add('hidden');
  els.loginCard.classList.remove('hidden');
  els.loginError.textContent = message;
  els.adminEmail.textContent = '';
}

function renderOverview(data) {
  const cards = [
    ['Users', data.usersTotal],
    ['Invoices', data.invoicesTotal],
    ['Overdue', data.overdueInvoices],
    ['Active Subscriptions', data.activeSubscriptions],
    ['Monthly Revenue', formatCurrency(data.monthlyRevenue)],
  ];

  els.metrics.innerHTML = cards.map(([label, value]) => `
    <article class="metric">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
    </article>
  `).join('');
}

function renderUsers(payload) {
  const users = payload.users || [];
  els.usersBody.innerHTML = users.map((user) => `
    <tr>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td>${user.companyName || '-'}</td>
      <td>${user.subscription?.planKey || 'starter'}</td>
      <td>${user.subscription?.status || 'free'}</td>
      <td>${new Date(user.createdAt).toLocaleDateString()}</td>
    </tr>
  `).join('');

  els.usersMeta.textContent = `Showing ${users.length} of ${payload.total} users`;
}

async function loadDashboard(search = '') {
  const [overview, users] = await Promise.all([
    apiFetch('/admin/overview'),
    apiFetch(`/admin/users?limit=25${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  ]);

  renderOverview(overview);
  renderUsers(users);
}

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  els.loginError.textContent = '';

  const apiBase = cleanApiBase(els.apiBase.value);
  const email = String(els.email.value || '').trim().toLowerCase();
  const password = els.password.value;

  try {
    const res = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || 'Login failed');

    setSession({ apiBase, token: body.accessToken, email });
    await loadDashboard();
    showDashboard(email);
  } catch (error) {
    showLogin(error.message || 'Unable to sign in');
  }
});

els.logoutBtn.addEventListener('click', () => {
  clearSession();
  showLogin();
});

els.searchBtn.addEventListener('click', async () => {
  try {
    await loadDashboard(els.searchInput.value);
  } catch (error) {
    showLogin(error.message || 'Session expired');
  }
});

(async function bootstrap() {
  const session = getSession();
  els.apiBase.value = session.apiBase || 'http://localhost:4000/api';

  if (!session.token || !session.apiBase) {
    showLogin();
    return;
  }

  try {
    await loadDashboard();
    showDashboard(session.email);
  } catch (error) {
    clearSession();
    showLogin(error.message || 'Please sign in again');
  }
})();
