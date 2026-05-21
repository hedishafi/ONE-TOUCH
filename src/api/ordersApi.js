import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Helper to get JWT token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    Authorization: token ? `Bearer ${token}` : '',
  };
};

// Create axios instance with auth interceptor
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

axiosInstance.interceptors.request.use((config) => {
  config.headers = { ...config.headers, ...getAuthHeaders() };
  return config;
});

// Add 401 interceptor for expired tokens
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const createOrder = async (formData) => {
  try {
    const response = await axiosInstance.post('/orders/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getOrder = async (id) => {
  try {
    const response = await axiosInstance.get(`/orders/${id}/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getMyOrders = async () => {
  try {
    const response = await axiosInstance.get('/orders/my-orders/');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getAvailableOrders = async () => {
  try {
    const response = await axiosInstance.get('/orders/available/');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const acceptOrder = async (id) => {
  try {
    const response = await axiosInstance.post(`/orders/${id}/accept/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const declineOrder = async (id) => {
  try {
    const response = await axiosInstance.post(`/orders/${id}/decline/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const cancelOrder = async (id) => {
  try {
    const response = await axiosInstance.post(`/orders/${id}/cancel/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const startOrder = async (id) => {
  try {
    const response = await axiosInstance.post(`/orders/${id}/start/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const completeOrder = async (id) => {
  try {
    const response = await axiosInstance.post(`/orders/${id}/complete/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const getStatusLog = async (id) => {
  try {
    const response = await axiosInstance.get(`/orders/${id}/status_log/`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
