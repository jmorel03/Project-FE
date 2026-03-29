const storageKeys = {
  token: 'xpensist_admin_access_token',
  email: 'xpensist_admin_email',
};

const API_BASE = `${window.location.origin}/api`;

let state = {
  page: 1,
  limit: 20,
  search: '',
  planFilter: '',
  statusFilter: '',
  totalPages: 1,
  totalUsers: 0,
  refreshTimer: null,
};

const els = {
  loginScreen: document.getElementById('loginScreen'),
  appLayout: document.getElementById('appLayout'),
  loginForm: document.getElementById('loginForm'),
  loginError: document.getElementById('loginError'),
  loginBtn: document.getElementById('loginBtn'),
  email: document.getElementById('email'),
  password: document.getElementById('password'),
  totp: document.getElementById('totp'),
  togglePassword: document.getElementById('togglePassword'),
  logoutBtn: document.getElementById('logoutBtn'),
  adminEmail: document.getElementById('adminEmail'),
  sidebarAvatar: document.getElementById('sidebarAvatar'),
  metrics: document.getElementById('metrics'),
  recentUsers: document.getElementById('recentUsers'),
  healthList: document.getElementById('healthList'),
  usersBody: document.getElementById('usersBody'),
  usersMeta: document.getElementById('usersMeta'),
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  exportBtn: document.getElementById('exportBtn'),
  planFilter: document.getElementById('planFilter'),
  statusFilter: document.getElementById('statusFilter'),
  pagination: document.getElementById('pagination'),
  usersBadge: document.getElementById('usersBadge'),
  pageTitle: document.getElementById('pageTitle'),
  lastUpdated: document.getElementById('lastUpdated'),
  refreshBtn: document.getElementById('refreshBtn'),
  connStatus: document.getElementById('connectionStatus'),
  overviewView: document.getElementById('overviewView'),
  usersView: document.getElementById('usersView'),
  toastContainer: document.getElementById('toastContainer'),
  actionModal: document.getElementById('actionModal'),
  modalTitle: document.getElementById('modalTitle'),
  modalMessage: document.getElementById('modalMessage'),
  modalInputWrap: document.getElementById('modalInputWrap'),
  modalInputLabel: document.getElementById('modalInputLabel'),
  modalInput: document.getElementById('modalInput'),
  modalInputConfirmWrap: document.getElementById('modalInputConfirmWrap'),
  modalInputConfirmLabel: document.getElementById('modalInputConfirmLabel'),
  modalInputConfirm: document.getElementById('modalInputConfirm'),
  modalOutputWrap: document.getElementById('modalOutputWrap'),
  modalOutput: document.getElementById('modalOutput'),
  copyOutputBtn: document.getElementById('copyOutputBtn'),
  modalCancelBtn: document.getElementById('modalCancelBtn'),
  modalConfirmBtn: document.getElementById('modalConfirmBtn'),
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelative(dateStr) {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function initials(name) {
  return String(name || '?').trim().split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function setSession({ token, email }) {
  localStorage.setItem(storageKeys.token, token);
  localStorage.setItem(storageKeys.email, email);
}

function clearSession() {
  Object.values(storageKeys).forEach((k) => localStorage.removeItem(k));
}

function getSession() {
  return {
    token: localStorage.getItem(storageKeys.token) || '',
    email: localStorage.getItem(storageKeys.email) || '',
  };
}

function setConnected(ok) {
  els.connStatus.innerHTML = `<span class="conn-dot"></span> ${ok ? 'Connected' : 'Disconnected'}`;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 220);
  }, 2800);
}

let modalResolver = null;

function closeModal(payload = { confirmed: false, input: '', inputConfirm: '' }) {
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
  inputType = 'text',
  showInputConfirm = false,
  inputConfirmLabel = 'Confirm',
  inputConfirmValue = '',
  inputConfirmPlaceholder = '',
  inputConfirmType = 'text',
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
  els.modalInput.type = inputType;

  els.modalInputConfirmWrap.classList.toggle('hidden', !showInputConfirm);
  els.modalInputConfirmLabel.textContent = inputConfirmLabel;
  els.modalInputConfirm.value = inputConfirmValue;
  els.modalInputConfirm.placeholder = inputConfirmPlaceholder;
  els.modalInputConfirm.type = inputConfirmType;

  els.modalOutputWrap.classList.toggle('hidden', !showOutput);
  els.modalOutput.value = outputValue;

  els.modalConfirmBtn.className = `btn ${danger ? 'danger' : 'primary'}`;
  els.modalCancelBtn.classList.toggle('hidden', hideCancel);
  els.actionModal.classList.remove('hidden');

  return new Promise((resolve) => {
    modalResolver = resolve;
  });
}

async function apiFetch(path, opts = {}) {
  const { token } = getSession();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

function planBadge(planKey, cancelAtPeriodEnd) {
  const key = String(planKey || 'starter').toLowerCase();
  const cls = cancelAtPeriodEnd ? 'cancels' : key;
  const label = cancelAtPeriodEnd ? `${key} (cancels)` : key;
  return `<span class="plan-badge ${cls}">${label}</span>`;
}

function statusBadge(user, sub) {
  if (user.isSuspended) return '<span class="badge suspended">Suspended</span>';
  const s = String(sub?.status || 'free').toLowerCase();
  if (s === 'active') return '<span class="badge active">Active</span>';
  if (s === 'trialing') return '<span class="badge trialing">Trial</span>';
  return '<span class="badge free">Free</span>';
}

function renderOverview(data) {
  const items = [
    { label: 'Total Users', value: data.usersTotal },
    { label: 'Total Invoices', value: data.invoicesTotal },
    { label: 'Overdue Invoices', value: data.overdueInvoices },
    { label: 'Paid Subs', value: data.activeSubscriptions },
    { label: 'Revenue (this mo)', value: formatCurrency(data.monthlyRevenue) },
    { label: 'Reminders (7d)', value: data.remindersLast7Days },
  ];

  els.metrics.innerHTML = items.map((x) => `
    <div class="metric-card">
      <div class="metric-label">${x.label}</div>
      <div class="metric-value">${x.value}</div>
    </div>
  `).join('');

  const overduePct = data.invoicesTotal > 0 ? ((data.overdueInvoices / data.invoicesTotal) * 100).toFixed(1) : '0.0';
  const paidConv = data.usersTotal > 0 ? ((data.activeSubscriptions / data.usersTotal) * 100).toFixed(1) : '0.0';
  els.healthList.innerHTML = [
    `Overdue Rate|${overduePct}%`,
    `Paid Conversion|${paidConv}%`,
    `Active Subs|${data.activeSubscriptions}`,
    `Overdue Invoices|${data.overdueInvoices}`,
    `Last Refreshed|${new Date().toLocaleTimeString()}`,
  ].map((row) => {
    const [label, value] = row.split('|');
    return `<div class="health-item"><span>${label}</span><strong>${value}</strong></div>`;
  }).join('');
}

function renderRecentUsers(users) {
  if (!users || users.length === 0) {
    els.recentUsers.innerHTML = '<p class="muted" style="padding: 12px;">No users found.</p>';
    return;
  }

  els.recentUsers.innerHTML = users.slice(0, 6).map((user) => `
    <div class="recent-item">
      <div class="user-avatar">${initials(user.name)}</div>
      <div>
        <div class="user-cell-name">${user.name}</div>
        <div class="user-cell-email">${user.email}</div>
      </div>
      <span class="muted">${formatRelative(user.createdAt)}</span>
    </div>
  `).join('');
}

let allUsersData = [];

function renderUsers(payload) {
  allUsersData = payload.users || [];
  state.totalUsers = payload.total || 0;
  state.totalPages = payload.totalPages || 1;

  els.usersBadge.textContent = String(payload.total || '');
  els.usersMeta.textContent = `Showing ${allUsersData.length} of ${payload.total || 0} users`;

  if (allUsersData.length === 0) {
    els.usersBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:28px;color:#64748b;">No users found</td></tr>';
    renderPagination();
    return;
  }

  els.usersBody.innerHTML = allUsersData.map((user) => {
    const sub = user.subscription;
    const isActivePlan = sub?.status === 'active' || sub?.status === 'trialing';
    const planKey = isActivePlan ? (sub.planKey || 'starter') : 'starter';
    const periodEnd = isActivePlan && sub.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : '-';

    return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-avatar">${initials(user.name)}</div>
            <div>
              <div class="user-cell-name">${user.name}</div>
              <div class="user-cell-email">${user.email}</div>
            </div>
          </div>
        </td>
        <td>${planBadge(planKey, isActivePlan && sub?.cancelAtPeriodEnd)}</td>
        <td>${statusBadge(user, sub)}</td>
        <td>${user.invoiceCount ?? '-'}</td>
        <td>${periodEnd}</td>
        <td>${formatDate(user.createdAt)}</td>
        <td>
          <div class="action-btns">
            <button class="btn sm" data-action="suspend" data-user-id="${user.id}" data-user-email="${user.email}" data-suspended="${user.isSuspended}">${user.isSuspended ? 'Unsuspend' : 'Suspend'}</button>
            <button class="btn sm" data-action="reset-password" data-user-id="${user.id}" data-user-email="${user.email}">Reset PW</button>
            ${isActivePlan && !sub?.cancelAtPeriodEnd ? `<button class="btn sm" data-action="cancel-sub" data-user-id="${user.id}" data-user-email="${user.email}">Cancel Sub</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination();
}

function renderPagination() {
  const { page, totalPages } = state;
  if (totalPages <= 1) {
    els.pagination.innerHTML = '';
    return;
  }

  let html = `<button class="page-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}><</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 2) {
      html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
  }
  html += `<button class="page-btn" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>></button>`;
  els.pagination.innerHTML = html;
}

async function loadOverview() {
  const overview = await apiFetch('/admin/overview');
  renderOverview(overview);
  return overview;
}

async function loadUsers() {
  const params = new URLSearchParams({ page: state.page, limit: state.limit });
  if (state.search) params.set('search', state.search);
  if (state.planFilter) params.set('plan', state.planFilter);
  if (state.statusFilter) params.set('status', state.statusFilter);

  const data = await apiFetch(`/admin/users?${params.toString()}`);
  renderUsers(data);
  renderRecentUsers(data.users);
  return data;
}

async function loadDashboard() {
  const [overview, users] = await Promise.all([loadOverview(), loadUsers()]);
  els.lastUpdated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  setConnected(true);
  return { overview, users };
}

function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.remove('active'));
  document.querySelector(`.nav-item[data-tab="${tab}"]`)?.classList.add('active');
  els.overviewView.classList.toggle('hidden', tab !== 'overview');
  els.usersView.classList.toggle('hidden', tab !== 'users');
  els.pageTitle.textContent = tab === 'overview' ? 'Overview' : 'Users';
}

function exportCSV() {
  if (!allUsersData.length) {
    showToast('No data to export', 'error');
    return;
  }

  const header = ['Name', 'Email', 'Company', 'Plan', 'Status', 'Invoices', 'Period End', 'Joined'];
  const rows = allUsersData.map((u) => {
    const sub = u.subscription;
    const isActive = sub?.status === 'active' || sub?.status === 'trialing';
    return [
      u.name,
      u.email,
      u.companyName || '',
      isActive ? (sub.planKey || 'starter') : 'starter',
      u.isSuspended ? 'suspended' : (isActive ? sub.status : 'free'),
      u.invoiceCount ?? 0,
      isActive && sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '',
      new Date(u.createdAt).toLocaleDateString(),
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `xpensist-users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();

  showToast('CSV exported');
}

async function handleUserAction(event) {
  const target = event.target.closest('[data-action]');
  if (!target) return;

  const { action, userId, userEmail } = target.dataset;
  const isSuspended = target.dataset.suspended === 'true';

  try {
    if (action === 'suspend') {
      const shouldSuspend = !isSuspended;
      const result = await openModal({
        title: shouldSuspend ? 'Suspend User' : 'Unsuspend User',
        message: shouldSuspend
          ? `Suspend ${userEmail}? They will be logged out immediately.`
          : `Restore access for ${userEmail}?`,
        confirmLabel: shouldSuspend ? 'Suspend' : 'Unsuspend',
        showInput: shouldSuspend,
        inputLabel: 'Reason (internal)',
        inputValue: 'Suspended by admin',
        danger: shouldSuspend,
      });
      if (!result.confirmed) return;

      await apiFetch(`/admin/users/${userId}/suspend`, {
        method: 'POST',
        body: JSON.stringify(
          shouldSuspend
            ? { suspended: true, reason: result.input || 'Suspended by admin' }
            : { suspended: false }
        ),
      });

      showToast(shouldSuspend ? `${userEmail} suspended` : `${userEmail} unsuspended`);
    }

    if (action === 'reset-password') {
      const result = await openModal({
        title: 'Set New Password',
        message: `Set a new password directly for ${userEmail}. It must include at least 8 characters, one uppercase letter, and one special character.`,
        confirmLabel: 'Update Password',
        showInput: true,
        inputLabel: 'New Password',
        inputPlaceholder: 'Type new password',
        inputType: 'password',
        showInputConfirm: true,
        inputConfirmLabel: 'Confirm New Password',
        inputConfirmPlaceholder: 'Retype new password',
        inputConfirmType: 'password',
      });
      if (!result.confirmed) return;

      const nextPassword = String(result.input || '');
      const confirmPassword = String(result.inputConfirm || '');
      if (!nextPassword || !confirmPassword) {
        showToast('Both password fields are required', 'error');
        return;
      }
      if (nextPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }

      await apiFetch(`/admin/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: nextPassword }),
      });

      showToast(`Password updated for ${userEmail}`);
    }

    if (action === 'cancel-sub') {
      const result = await openModal({
        title: 'Cancel Subscription',
        message: `Schedule ${userEmail}'s subscription to cancel at end of period?`,
        confirmLabel: 'Schedule Cancellation',
        danger: true,
      });
      if (!result.confirmed) return;

      await apiFetch(`/admin/users/${userId}/cancel-subscription`, { method: 'POST' });
      showToast(`Cancellation scheduled for ${userEmail}`);
    }

    await loadUsers();
  } catch (error) {
    showToast(error.message || 'Action failed', 'error');
  }
}

function showApp(email) {
  els.loginScreen.classList.add('hidden');
  els.appLayout.classList.remove('hidden');
  els.adminEmail.textContent = email;
  els.sidebarAvatar.textContent = initials(email.split('@')[0]);
}

function showLogin(message = '') {
  els.appLayout.classList.add('hidden');
  els.loginScreen.classList.remove('hidden');
  els.loginError.textContent = message;
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
}

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  els.loginBtn.textContent = 'Signing in...';
  els.loginBtn.disabled = true;
  els.loginError.textContent = '';

  try {
    const email = els.email.value.trim().toLowerCase();
    const password = els.password.value;
    const totp = els.totp.value.trim();

    const res = await fetch(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, totp }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.error || 'Login failed');

    setSession({ token: body.accessToken, email });
    showApp(email);
    await loadDashboard();
    state.refreshTimer = setInterval(loadOverview, 60000);
  } catch (error) {
    els.loginError.textContent = error.message || 'Unable to sign in';
  } finally {
    els.loginBtn.textContent = 'Sign In';
    els.loginBtn.disabled = false;
  }
});

els.togglePassword?.addEventListener('click', () => {
  const isText = els.password.type === 'text';
  els.password.type = isText ? 'password' : 'text';
  els.togglePassword.textContent = isText ? 'Show' : 'Hide';
});

els.logoutBtn.addEventListener('click', () => {
  clearSession();
  showLogin();
});

els.refreshBtn.addEventListener('click', async () => {
  els.refreshBtn.classList.add('spinning');
  try {
    await loadDashboard();
    setConnected(true);
  } catch (_) {
    setConnected(false);
  }
  els.refreshBtn.classList.remove('spinning');
});

document.querySelectorAll('.nav-item').forEach((item) => {
  item.addEventListener('click', () => switchTab(item.dataset.tab));
});

els.searchBtn.addEventListener('click', () => {
  state.page = 1;
  state.search = els.searchInput.value.trim();
  state.planFilter = els.planFilter.value;
  state.statusFilter = els.statusFilter.value;
  loadUsers();
});

els.searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.searchBtn.click();
});

els.planFilter.addEventListener('change', () => {
  state.page = 1;
  state.planFilter = els.planFilter.value;
  loadUsers();
});

els.statusFilter.addEventListener('change', () => {
  state.page = 1;
  state.statusFilter = els.statusFilter.value;
  loadUsers();
});

els.exportBtn.addEventListener('click', exportCSV);

els.pagination.addEventListener('click', (e) => {
  const btn = e.target.closest('.page-btn');
  if (!btn || btn.disabled) return;
  const p = parseInt(btn.dataset.page, 10);
  if (!Number.isNaN(p) && p >= 1 && p <= state.totalPages) {
    state.page = p;
    loadUsers();
  }
});

els.usersBody.addEventListener('click', handleUserAction);

els.modalConfirmBtn.addEventListener('click', () => closeModal({
  confirmed: true,
  input: els.modalInput.value.trim(),
  inputConfirm: els.modalInputConfirm.value.trim(),
}));
els.modalCancelBtn.addEventListener('click', () => closeModal({ confirmed: false, input: '', inputConfirm: '' }));

els.actionModal.addEventListener('click', (e) => {
  if (e.target.dataset.closeModal === 'true') closeModal();
});

els.copyOutputBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(els.modalOutput.value);
    showToast('Copied');
  } catch (_) {
    showToast('Could not copy automatically', 'error');
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.actionModal.classList.contains('hidden')) closeModal();
});

(async function bootstrap() {
  const session = getSession();

  if (!session.token) {
    showLogin();
    return;
  }

  try {
    showApp(session.email);
    await loadDashboard();
    state.refreshTimer = setInterval(loadOverview, 60000);
  } catch (error) {
    clearSession();
    showLogin(error.message || 'Session expired, please sign in again');
  }
})();
