import axios, { type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('access_token');
  return { Authorization: token ? `Bearer ${token}` : '' };
};

const axiosInstance = axios.create({ baseURL: API_BASE_URL });

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers = Object.assign(config.headers ?? {}, getAuthHeaders()) as typeof config.headers;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TranscribeResult {
  transcription: string;
}

export interface CreateOrderResult {
  order_id: number;
  status: string;
  category: string | null;
  sub_service: string | null;
  matched_provider_count: number;
}

export interface SuggestedProvider {
  id: number;
  full_name: string;
  bio: string;
  profile_picture: string | null;
  rating: number;
  total_reviews: number;
  distance_km: number;
  price_range: string;
  services: string[];
  years_of_experience: number;
}

export interface ProviderMeResult {
  free_jobs_remaining: number;
  is_online: boolean;
  [key: string]: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractError(error: unknown): never {
  if (axios.isAxiosError(error)) throw error.response?.data ?? error.message;
  throw error;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const transcribeAudio = async (
  audioBlob: Blob,
  language: string | null = null,
): Promise<TranscribeResult> => {
  try {
    const formData = new FormData();
    formData.append('voice_file', audioBlob, 'recording.wav');
    if (language) formData.append('language', language);
    const response = await axiosInstance.post<TranscribeResult>('/orders/transcribe/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    console.log('Transcription result:', response.data);
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const createOrder = async (formData: FormData): Promise<CreateOrderResult> => {
  try {
    const response = await axiosInstance.post<CreateOrderResult>('/orders/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const getOrder = async (id: number | string): Promise<unknown> => {
  try {
    const response = await axiosInstance.get(`/orders/${id}/`);
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const getMyOrders = async (): Promise<unknown[]> => {
  try {
    const response = await axiosInstance.get('/orders/my_orders/');
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const getAvailableOrders = async (): Promise<unknown[]> => {
  try {
    const response = await axiosInstance.get('/orders/available/');
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const getProviderOrders = async (): Promise<unknown[]> => {
  try {
    const response = await axiosInstance.get('/orders/');
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const acceptOrder = async (id: number | string): Promise<unknown> => {
  try {
    const response = await axiosInstance.post(`/orders/${id}/accept/`);
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const declineOrder = async (id: number | string): Promise<unknown> => {
  try {
    const response = await axiosInstance.post(`/orders/${id}/decline/`);
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const cancelOrder = async (id: number | string): Promise<unknown> => {
  try {
    const response = await axiosInstance.post(`/orders/${id}/cancel/`);
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const startOrder = async (id: number | string): Promise<unknown> => {
  try {
    const response = await axiosInstance.post(`/orders/${id}/start/`);
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const completeOrder = async (id: number | string): Promise<unknown> => {
  try {
    const response = await axiosInstance.post(`/orders/${id}/complete/`);
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const getStatusLog = async (id: number | string): Promise<unknown[]> => {
  try {
    const response = await axiosInstance.get(`/orders/${id}/status_log/`);
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const getProviderMe = async (): Promise<ProviderMeResult> => {
  try {
    const response = await axiosInstance.get<ProviderMeResult>('/provider/me/');
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const getSuggestedProviders = async (orderId: number | string): Promise<SuggestedProvider[]> => {
  try {
    const response = await axiosInstance.get<SuggestedProvider[]>(
      `/orders/${orderId}/suggested-providers/`,
    );
    return response.data;
  } catch (error) {
    extractError(error);
  }
};

export const selectProvider = async (
  orderId: number | string,
  providerId: number | string,
): Promise<unknown> => {
  try {
    const response = await axiosInstance.post(`/orders/${orderId}/select-provider/`, {
      provider_id: providerId,
    });
    return response.data;
  } catch (error) {
    extractError(error);
  }
};
