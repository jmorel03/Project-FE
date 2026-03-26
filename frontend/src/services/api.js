import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach access token ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`,
          { refreshToken },
        );
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        api.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
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
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me').then((r) => r.data),
  updateProfile: (data) => api.put('/auth/me', data).then((r) => r.data),
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
  revenue: () => api.get('/dashboard/revenue').then((r) => r.data),
  activity: () => api.get('/dashboard/activity').then((r) => r.data),
};

export const billingService = {
  getPlans: () => api.get('/billing/plans').then((r) => r.data),
  getSummary: () => api.get('/billing/summary').then((r) => r.data),
  createCheckoutSession: (planKey) => api.post('/billing/checkout-session', { planKey }).then((r) => r.data),
  createPortalSession: () => api.post('/billing/portal-session').then((r) => r.data),
};
