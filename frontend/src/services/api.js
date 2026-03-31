import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Access token: held in memory only (never localStorage)
export function setAccessToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
// ─── Response interceptor: auto-refresh on 401 ───────────────────────────────
let isRefreshing = false;
let waitQueue = [];

const processQueue = (error, token = null) => {
  waitQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  waitQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retry
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return api(original);
          })
          .catch(Promise.reject);
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // Cookie is sent automatically via withCredentials
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        setAccessToken(data.accessToken);
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// ─── Typed service helpers ────────────────────────────────────────────────────

export const authService = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  silentRefresh: () => api.post('/auth/refresh').then((r) => r.data),
  getMe: () => api.get('/auth/me').then((r) => r.data),
  updateProfile: (data) => api.put('/auth/me', data).then((r) => r.data),
  changePassword: (data) => api.post('/auth/change-password', data).then((r) => r.data),
};

export const clientService = {
  list: (params) => api.get('/clients', { params }).then((r) => r.data),
  get: (id) => api.get(`/clients/${id}`).then((r) => r.data),
  create: (data) => api.post('/clients', data).then((r) => r.data),
  update: (id, data) => api.put(`/clients/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/clients/${id}`),
};

export const invoiceService = {
  list: (params) => api.get('/invoices', { params }).then((r) => r.data),
  get: (id) => api.get(`/invoices/${id}`).then((r) => r.data),
  create: (data) => api.post('/invoices', data).then((r) => r.data),
  update: (id, data) => api.put(`/invoices/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/invoices/${id}`),
  send: (id) => api.post(`/invoices/${id}/send`).then((r) => r.data),
  sendReminder: (id, data) => api.post(`/invoices/${id}/remind`, data).then((r) => r.data),
  recordPayment: (id, data) => api.post(`/invoices/${id}/payments`, data).then((r) => r.data),
  pdfUrl: (id) => `${import.meta.env.VITE_API_URL || '/api'}/invoices/${id}/pdf`,
};

export const expenseService = {
  list: (params) => api.get('/expenses', { params }).then((r) => r.data),
  get: (id) => api.get(`/expenses/${id}`).then((r) => r.data),
  create: (data) => api.post('/expenses', data).then((r) => r.data),
  update: (id, data) => api.put(`/expenses/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/expenses/${id}`),
  getCategories: () => api.get('/expenses/categories').then((r) => r.data),
  createCategory: (data) => api.post('/expenses/categories', data).then((r) => r.data),
  deleteCategory: (id) => api.delete(`/expenses/categories/${id}`),
  uploadReceipt: (id, file) => {
    const fd = new FormData();
    fd.append('receipt', file);
    return api.post(`/expenses/${id}/receipt`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};

export const dashboardService = {
  stats: () => api.get('/dashboard/stats').then((r) => r.data),
  finance: (params) => api.get('/dashboard/finance', { params }).then((r) => r.data),
  revenue: () => api.get('/dashboard/revenue').then((r) => r.data),
  activity: () => api.get('/dashboard/activity').then((r) => r.data),
  insights: () => api.get('/dashboard/insights').then((r) => r.data),
};

export const billingService = {
  getPublicPlans: () => api.get('/billing/plans/public').then((r) => r.data),
  getPlans: () => api.get('/billing/plans').then((r) => r.data),
  getSummary: () => api.get('/billing/summary').then((r) => r.data),
  createCheckoutSession: (planKey) => api.post('/billing/checkout-session', { planKey }).then((r) => r.data),
  finalizeCheckoutSession: (sessionId) => api.post('/billing/checkout-session/finalize', { sessionId }).then((r) => r.data),
  createPortalSession: () => api.post('/billing/portal-session').then((r) => r.data),
  createSetupIntent: () => api.post('/billing/setup-intent').then((r) => r.data),
  setDefaultPaymentMethod: (paymentMethodId) => api.post('/billing/set-default-payment-method', { paymentMethodId }).then((r) => r.data),
  deletePaymentMethod: (paymentMethodId) => api.post('/billing/delete-payment-method', { paymentMethodId }).then((r) => r.data),
  cancelSubscription: () => api.post('/billing/cancel-subscription').then((r) => r.data),
};

export const teamService = {
  getTeam: () => api.get('/team').then((r) => r.data),
  addMember: (data) => api.post('/team/members', data).then((r) => r.data),
  createInvite: (data) => api.post('/team/invites', data).then((r) => r.data),
  revokeInvite: (inviteId) => api.delete(`/team/invites/${inviteId}`).then((r) => r.data),
  previewInvite: (token) => api.get(`/team/invites/preview/${token}`).then((r) => r.data),
  acceptInvite: (token) => api.post('/team/invites/accept', { token }).then((r) => r.data),
  updateMemberRole: (memberUserId, role) => api.patch(`/team/members/${memberUserId}`, { role }).then((r) => r.data),
  removeMember: (memberUserId) => api.delete(`/team/members/${memberUserId}`).then((r) => r.data),
};

export const supportService = {
  sendMessage: (subject, message) => api.post('/support/contact', { subject, message }).then((r) => r.data),
  sendPublicMessage: ({ name, email, subject, message }) => api.post('/support/contact-public', {
    name,
    email,
    subject,
    message,
  }).then((r) => r.data),
};
