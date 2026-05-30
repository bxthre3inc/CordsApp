import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  refreshToken: () => apiClient.post('/auth/refresh-token')
};

export const userService = {
  getProfile: () => apiClient.get('/users/profile'),
  updateProfile: (data) => apiClient.put('/users/profile', data),
  getById: (id) => apiClient.get(`/users/${id}`)
};

export const productService = {
  create: (data) => apiClient.post('/products', data),
  getById: (id) => apiClient.get(`/products/${id}`),
  getBySupplier: (supplierId) => apiClient.get(`/products/supplier/${supplierId}`),
  getNearby: (latitude, longitude, radius, woodType) =>
    apiClient.get('/products/nearby', {
      params: { latitude, longitude, radius, woodType }
    }),
  getAveragePrice: (woodType, latitude, longitude, radius) =>
    apiClient.get('/products/price/average', {
      params: { woodType, latitude, longitude, radius }
    }),
  update: (id, data) => apiClient.put(`/products/${id}`, data)
};

export const orderService = {
  create: (data) => apiClient.post('/orders', data),
  getById: (id) => apiClient.get(`/orders/${id}`),
  getBuyerOrders: () => apiClient.get('/orders/buyer/orders'),
  getSupplierOrders: () => apiClient.get('/orders/supplier/orders'),
  updateStatus: (id, status) => apiClient.put(`/orders/${id}/status`, { status }),
  assignDeliveryTeam: (id, deliveryTeamId) =>
    apiClient.put(`/orders/${id}/assign-delivery`, { deliveryTeamId }),
  deliveryEstimate: (productId, quantity, lat, lng, express = false) =>
    apiClient.get('/orders/delivery-estimate', { params: { productId, quantity, lat, lng, express } }),
};

export const paymentService = {
  createOrderPayment: (orderId) => apiClient.post(`/payments/order/${orderId}`),
  createSubscription: (planType) => apiClient.post('/payments/subscription', { planType })
};

export const deliveryService = {
  getAssignedOrders: () => apiClient.get('/delivery/orders/assigned'),
  getAvailableOrders: () => apiClient.get('/delivery/orders/available'),
  acceptOrder: (id) => apiClient.post(`/delivery/orders/${id}/accept`),
  updateOrderStatus: (id, status) => apiClient.put(`/delivery/orders/${id}/status`, { status }),
  toggleAvailability: () => apiClient.put('/delivery/availability'),
  getEarnings: () => apiClient.get('/delivery/earnings'),
};

export const adminService = {
  getStats: () => apiClient.get('/admin/stats'),
  getUsers: (params) => apiClient.get('/admin/users', { params }),
  updateUser: (id, data) => apiClient.put(`/admin/users/${id}`, data),
  deleteUser: (id) => apiClient.delete(`/admin/users/${id}`),
  getOrders: (params) => apiClient.get('/admin/orders', { params }),
  overrideOrderStatus: (id, status) => apiClient.put(`/admin/orders/${id}/status`, { status }),
  getProducts: (params) => apiClient.get('/admin/products', { params }),
  toggleProduct: (id) => apiClient.put(`/admin/products/${id}/toggle`),
};

export const subscriptionService = {
  getMyPlan: () => apiClient.get('/subscriptions/my-plan'),
  checkout: (planType) => apiClient.post('/subscriptions/checkout', { planType }),
  cancel: () => apiClient.delete('/subscriptions'),
};

export const enterpriseService = {
  submitInquiry: (data) => apiClient.post('/enterprise/inquiry', data),
  getMyContract: () => apiClient.get('/enterprise/contract/me'),
  // Admin
  getLeads: (params) => apiClient.get('/enterprise/leads', { params }),
  updateLead: (id, data) => apiClient.put(`/enterprise/leads/${id}`, data),
  getContracts: () => apiClient.get('/enterprise/contracts'),
  upsertContract: (data) => apiClient.post('/enterprise/contracts', data),
  cancelContract: (id) => apiClient.delete(`/enterprise/contracts/${id}`),
};

export const marketService = {
  getPriceIndex: (params) => apiClient.get('/products/price-index', { params }),
};

export default apiClient;
