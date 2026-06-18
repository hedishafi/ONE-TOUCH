import axios from 'axios';
import type { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { notifications } from '@mantine/notifications';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const getCookieValue = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
};

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const PUBLIC_AUTH_PATHS = new Set([
  '/auth/signup/otp/',
  '/auth/signup/resend-otp/',
  '/auth/signup/verify/',
  '/auth/login/otp/',
  '/auth/login/verify/',
  '/auth/token/refresh/',
]);

const isPublicAuthRequest = (url?: string): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url, API_BASE_URL);
    return PUBLIC_AUTH_PATHS.has(parsed.pathname.replace('/api/v1', ''));
  } catch {
    return PUBLIC_AUTH_PATHS.has(url);
  }
};

// Request interceptor: Add JWT token to protected requests
api.interceptors.request.use(
  (config) => {
    if (!isPublicAuthRequest(config.url)) {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    const method = (config.method || 'get').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      const csrfToken = getCookieValue('csrftoken');
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }

    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor: Handle token refresh on 401
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as any;

    // Skip retry for public endpoints
    if (error.response?.status === 401 && !originalRequest._retry && !isPublicAuthRequest(originalRequest?.url)) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');

        if (!refreshToken) {
          return Promise.reject(error);
        }

        const refreshPayload = { refresh: refreshToken };

        const { data } = await axios.post(
          `${API_BASE_URL}/auth/token/refresh/`,
          refreshPayload,
          {
            withCredentials: true,
            headers: {
              'X-CSRFToken': getCookieValue('csrftoken'),
            },
          }
        );

        // Update stored access token
        localStorage.setItem('access_token', data.access);
        if (data.refresh) {
          localStorage.setItem('refresh_token', data.refresh);
        }
        api.defaults.headers.common['Authorization'] = `Bearer ${data.access}`;

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (err) {
        // Refresh failed, logout user and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        notifications.show({
          title: 'Session Expired',
          message: 'Your session has expired. Please login again.',
          color: 'red',
        });

        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }

        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
