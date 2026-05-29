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
    apiClient.put(`/orders/${id}/assign-delivery`, { deliveryTeamId })
};

export const paymentService = {
  createOrderPayment: (orderId) => apiClient.post(`/payments/order/${orderId}`),
  createSubscription: (planType) => apiClient.post('/payments/subscription', { planType })
};

export default apiClient;
