import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('finguard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('finguard_token');
      localStorage.removeItem('finguard_role');
      localStorage.removeItem('finguard_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const finguardApi = {
  // Authentication
  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data.token) {
      localStorage.setItem('finguard_token', res.data.token);
      localStorage.setItem('finguard_role', res.data.role);
      localStorage.setItem('finguard_user', res.data.username);
    }
    return res.data;
  },

  getCurrentUser: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  logout: () => {
    localStorage.removeItem('finguard_token');
    localStorage.removeItem('finguard_role');
    localStorage.removeItem('finguard_user');
  },

  // Batches
  getBatches: async () => {
    const res = await api.get('/batches');
    return res.data;
  },

  getLatestBatch: async () => {
    const res = await api.get('/batches/latest');
    return res.data;
  },

  // Summary metrics for dashboard
  getDashboardSummary: async (batchId) => {
    const params = batchId ? { batchId } : {};
    const res = await api.get('/dashboard/summary', { params });
    return res.data;
  },

  // Risk distribution
  getRiskDistribution: async (batchId) => {
    const params = batchId ? { batchId } : {};
    const res = await api.get('/dashboard/risk-distribution', { params });
    return res.data;
  },

  // Real Risk Trend with hourly, daily, or batch aggregation
  getRiskTrend: async (batchId, aggregation = 'hour') => {
    const params = { aggregation };
    if (batchId) params.batchId = batchId;
    const res = await api.get('/dashboard/risk-trend', { params });
    return res.data;
  },

  // Top Risk Drivers
  getTopRiskDrivers: async (batchId) => {
    const params = batchId ? { batchId } : {};
    const res = await api.get('/dashboard/top-risk-drivers', { params });
    return res.data;
  },

  // Alerts queue with optional filters, sorting, batch, & pagination
  getAlerts: async ({ batchId, riskLevel, status, search, sortBy, direction, page = 0, size = 20 } = {}) => {
    const params = { page, size };
    if (batchId) params.batchId = batchId;
    if (riskLevel && riskLevel !== 'ALL') params.riskLevel = riskLevel;
    if (status && status !== 'ALL') params.status = status;
    if (search && search.trim()) params.search = search.trim();
    if (sortBy) params.sortBy = sortBy;
    if (direction) params.direction = direction;
    const res = await api.get('/alerts', { params });
    return res.data;
  },

  // Single alert details
  getAlertById: async (id) => {
    const res = await api.get(`/alerts/${id}`);
    return res.data;
  },

  // Audit history for an alert
  getAlertHistory: async (id) => {
    const res = await api.get(`/alerts/${id}/history`);
    return res.data;
  },

  // Alert queue summary statistics for real badge counts
  getAlertStats: async (batchId) => {
    const params = batchId && batchId !== 'ALL' ? { batchId } : {};
    const res = await api.get('/alerts/stats', { params });
    return res.data;
  },

  // Update alert status (decision support mutation)
  updateAlertStatus: async (id, status, analystNotes = '') => {
    const res = await api.patch(`/alerts/${id}/status`, { status, analystNotes });
    return res.data;
  },


  // List all customers with pagination
  getAllCustomers: async (page = 0, size = 12, search = '', sortBy = 'customerId', direction = 'asc') => {
    const params = { page, size, search, sortBy, sortDirection: direction };
    const res = await api.get('/customers', { params });
    return res.data;
  },

  // Customer profile and recent transactions
  getCustomer: async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },

  // Customer behaviour baseline
  getCustomerBaseline: async (id) => {
    const res = await api.get(`/customers/${id}/baseline`);
    return res.data;
  },

  // Customer risk profile alias
  getCustomerRisk: async (id) => {
    const res = await api.get(`/customers/${id}/risk`);
    return res.data;
  },

  // Transaction details by ID
  getTransactionById: async (transactionId) => {
    const res = await api.get(`/transactions/${transactionId}`);
    return res.data;
  },

  // Transaction-specific SHAP explanation
  getTransactionExplanation: async (transactionId) => {
    const res = await api.get(`/transactions/${transactionId}/explanation`);
    return res.data;
  },

  // SHAP explanations for customer (with optional transactionId)
  getCustomerExplanations: async (id, transactionId = null) => {
    const params = transactionId ? { transactionId } : {};
    const res = await api.get(`/customers/${id}/explanation`, { params });
    return res.data;
  },

  // User management (Admin RBAC)
  getUsers: async () => {
    const res = await api.get('/users');
    return res.data;
  },

  updateUserRole: async (id, role) => {
    const res = await api.patch(`/users/${id}/role`, { role });
    return res.data;
  },

  updateUserStatus: async (id, isActive) => {
    const res = await api.patch(`/users/${id}/status`, { isActive });
    return res.data;
  },

  // Model metrics & experiment tracking
  getLatestModel: async () => {
    const res = await api.get('/models/latest');
    return res.data;
  },
};

export default finguardApi;
