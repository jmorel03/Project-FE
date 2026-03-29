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
  totp: document.getElementById('totp'),
  logoutBtn: document.getElementById('logoutBtn'),
  adminEmail: document.getElementById('adminEmail'),
  metrics: document.getElementById('metrics'),
  usersBody: document.getElementById('usersBody'),
  usersMeta: document.getElementById('usersMeta'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  notice: document.getElementById('notice'),
  actionModal: document.getElementById('actionModal'),
  modalTitle: document.getElementById('modalTitle'),
  modalMessage: document.getElementById('modalMessage'),
  modalInputWrap: document.getElementById('modalInputWrap'),
  modalInputLabel: document.getElementById('modalInputLabel'),
  modalInput: document.getElementById('modalInput'),
  modalOutputWrap: document.getElementById('modalOutputWrap'),
  modalOutput: document.getElementById('modalOutput'),
  copyOutputBtn: document.getElementById('copyOutputBtn'),
  modalCancelBtn: document.getElementById('modalCancelBtn'),
  modalConfirmBtn: document.getElementById('modalConfirmBtn'),
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

let modalResolver = null;

function showNotice(message, tone = 'success') {
  els.notice.textContent = message;
  els.notice.classList.remove('hidden', 'error');
  if (tone === 'error') els.notice.classList.add('error');
  window.setTimeout(() => {
    els.notice.classList.add('hidden');
  }, 3500);
}

function closeModal(payload = { confirmed: false, input: '' }) {
  els.actionModal.classList.add('hidden');
  if (modalResolver) {
    modalResolver(payload);
    modalResolver = null;
  }
}

function openModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  showInput = false,
  inputLabel = 'Details',
  inputValue = '',
  inputPlaceholder = '',
  showOutput = false,
  outputValue = '',
  danger = false,
  hideCancel = false,
}) {
  els.modalTitle.textContent = title;
  els.modalMessage.textContent = message;
  els.modalConfirmBtn.textContent = confirmLabel;
  els.modalCancelBtn.textContent = cancelLabel;

  els.modalInputWrap.classList.toggle('hidden', !showInput);
  els.modalInputLabel.textContent = inputLabel;
  els.modalInput.value = inputValue;
  els.modalInput.placeholder = inputPlaceholder;

  els.modalOutputWrap.classList.toggle('hidden', !showOutput);
  els.modalOutput.value = outputValue;

  els.modalConfirmBtn.classList.toggle('primary', !danger);
  els.modalConfirmBtn.classList.toggle('danger-btn', danger);
  els.modalCancelBtn.classList.toggle('hidden', hideCancel);

  els.actionModal.classList.remove('hidden');

  return new Promise((resolve) => {
    modalResolver = resolve;
  });
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
      <td>${user.isSuspended ? 'suspended' : (user.subscription?.status || 'free')}</td>
      <td>${new Date(user.createdAt).toLocaleDateString()}</td>
      <td>
        <div class="row gap-sm">
          <button class="btn" data-action="suspend" data-user-id="${user.id}" data-user-email="${user.email}">${user.isSuspended ? 'Unsuspend' : 'Suspend'}</button>
          <button class="btn" data-action="reset-password" data-user-id="${user.id}" data-user-email="${user.email}">Reset Password</button>
          <button class="btn" data-action="cancel-sub" data-user-id="${user.id}" data-user-email="${user.email}">Cancel Sub</button>
        </div>
      </td>
    </tr>
  `).join('');

  els.usersMeta.textContent = `Showing ${users.length} of ${payload.total} users`;
}

async function handleUserAction(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.action;
  const userId = target.dataset.userId;
  const userEmail = target.dataset.userEmail;

  if (!action || !userId) return;

  try {
    if (action === 'suspend') {
      const shouldSuspend = target.textContent !== 'Unsuspend';
      const prompt = await openModal({
        title: shouldSuspend ? 'Suspend User' : 'Unsuspend User',
        message: shouldSuspend
          ? `Suspend ${userEmail}? They will be logged out immediately.`
          : `Unsuspend ${userEmail} and restore access?`,
        confirmLabel: shouldSuspend ? 'Suspend' : 'Unsuspend',
        showInput: shouldSuspend,
        inputLabel: 'Suspension reason',
        inputValue: 'Suspended by admin',
        inputPlaceholder: 'Reason shown internally',
        danger: shouldSuspend,
      });
      if (!prompt.confirmed) return;

      const reason = shouldSuspend ? (prompt.input || 'Suspended by admin') : '';
      await apiFetch(`/admin/users/${userId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ suspended: shouldSuspend, reason }),
      });
      showNotice(shouldSuspend ? `User ${userEmail} suspended.` : `User ${userEmail} unsuspended.`);
    }

    if (action === 'reset-password') {
      const confirm = await openModal({
        title: 'Create Password Reset Link',
        message: `Create a one-time reset token for ${userEmail}?`,
        confirmLabel: 'Create Link',
      });
      if (!confirm.confirmed) return;

      const result = await apiFetch(`/admin/users/${userId}/reset-password`, { method: 'POST' });

      await openModal({
        title: 'Reset Link Created',
        message: `Share this link securely. It expires at ${new Date(result.expiresAt).toLocaleString()}.`,
        confirmLabel: 'Done',
        hideCancel: true,
        showOutput: true,
        outputValue: result.resetUrl,
      });

      showNotice(`Reset link generated for ${userEmail}.`);
    }

    if (action === 'cancel-sub') {
      const confirm = await openModal({
        title: 'Cancel Subscription',
        message: `Cancel subscription at period end for ${userEmail}?`,
        confirmLabel: 'Schedule Cancellation',
        danger: true,
      });
      if (!confirm.confirmed) return;

      await apiFetch(`/admin/users/${userId}/cancel-subscription`, { method: 'POST' });
      showNotice(`Subscription cancellation scheduled for ${userEmail}.`);
    }

    await loadDashboard(els.searchInput.value);
  } catch (error) {
    showNotice(error.message || 'Action failed', 'error');
  }
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
  const totp = String(els.totp.value || '').trim();

  try {
    const res = await fetch(`${apiBase}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, totp }),
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

els.usersBody.addEventListener('click', handleUserAction);

els.modalConfirmBtn.addEventListener('click', () => {
  closeModal({ confirmed: true, input: els.modalInput.value.trim() });
});

els.modalCancelBtn.addEventListener('click', () => {
  closeModal({ confirmed: false, input: '' });
});

els.actionModal.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.dataset.closeModal === 'true') {
    closeModal({ confirmed: false, input: '' });
  }
});

els.copyOutputBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(els.modalOutput.value);
    showNotice('Reset URL copied to clipboard.');
  } catch (error) {
    showNotice('Unable to copy URL automatically.', 'error');
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
