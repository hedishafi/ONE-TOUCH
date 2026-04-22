import api from './api';
import axios from 'axios';

// ─── Types ───────────────────────────────────────────────────────────────
export interface SignupOTPRequest {
  phone_number?: string;
  phone?: string;
  role?: 'client' | 'provider';
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface SignupVerifyRequest {
  phone_number?: string;
  phone?: string;
  otp_code: string;
  role?: 'client' | 'provider';
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface LoginOTPRequest {
  phone_number: string;
}

export interface LoginVerifyRequest {
  phone_number: string;
  otp_code: string;
}

export interface OTPResponse {
  otp_code?: string; // Only in DEBUG mode
  expires_in_seconds: number;
  detail?: string;
}

export interface AuthTokenResponse {
  access?: string;
  refresh?: string;
  access_token?: string;
  refresh_token?: string;
  user: {
    id: number;
    username?: string;
    phone_number: string;
    role: 'client' | 'provider' | 'admin';
    provider_uid?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    is_on_trial?: boolean;
    trial_ends_at?: string;
    biometric_verified?: boolean;
    verification_status?: string;
  };
}

export interface UserProfile {
  id: number;
  username?: string;
  phone_number: string;
  role: 'client' | 'provider' | 'admin';
  provider_uid?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  is_on_trial?: boolean;
  trial_ends_at?: string;
  biometric_verified?: boolean;
  verification_status?: string;
}

export interface ProviderOnboardingStatus {
  next_step: 'profile_setup' | 'identity_upload' | 'dashboard';
  next_route: string;
  profile_completed: boolean;
  verification_status: string;
  rejection_reason?: string;
}

const extractTokens = (data: AuthTokenResponse) => {
  const accessToken = data.access || data.access_token || '';
  const refreshToken = data.refresh || data.refresh_token || '';
  return { accessToken, refreshToken };
};

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data: any = error.response?.data;
    const fieldErrors = data?.errors;
    const firstFieldError =
      fieldErrors && typeof fieldErrors === 'object'
        ? Object.values(fieldErrors).flat().find(Boolean)
        : undefined;

    return (
      data?.error ||
      data?.detail ||
      firstFieldError ||
      data?.phone_number?.[0] ||
      data?.otp_code?.[0] ||
      data?.non_field_errors?.[0] ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

// ─── Signup ───────────────────────────────────────────────────────────────

/**
 * Request OTP for signup (supports both phone and phone_number)
 */
export const signupRequestOTP = async (payload: { phone: string; role?: 'client' | 'provider' }): Promise<OTPResponse> => {
  const normalizedPhone = payload.phone?.trim() || '';
  try {
    const { data } = await api.post<OTPResponse>('/auth/signup/otp/', {
      phone_number: normalizedPhone,
      role: payload.role ?? 'client',
    });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to request signup OTP.'));
  }
};

/**
 * Verify signup OTP and create account (simplified client signup)
 */
export const signupVerify = async (payload: {
  phone: string;
  otp_code: string;
  role?: 'client' | 'provider';
  first_name?: string;
  last_name?: string;
  username?: string;
}): Promise<AuthTokenResponse> => {
  const normalizedPhone = payload.phone?.trim() || '';
  const role = payload.role ?? 'client';
  try {
    const { data } = await api.post<AuthTokenResponse>('/auth/signup/verify/', {
      phone_number: normalizedPhone,
      otp_code: payload.otp_code,
      role,
      first_name: payload.first_name ?? (role === 'provider' ? 'Provider' : 'Client'),
      last_name: payload.last_name ?? 'User',
      username: payload.username ?? `${role}_${Date.now()}`,
    });

    const { accessToken, refreshToken } = extractTokens(data);
    if (!accessToken) {
      throw new Error('Access token was not returned by the server.');
    }

    // Store tokens and user info
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('user_id', String(data.user.id));

    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to verify signup OTP.'));
  }
};

// ─── Login ───────────────────────────────────────────────────────────────

/**
 * Request OTP for login
 */
export const loginRequestOTP = async (payload: LoginOTPRequest): Promise<OTPResponse> => {
  try {
    const { data } = await api.post<OTPResponse>('/auth/login/otp/', payload);
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to request login OTP.'));
  }
};

/**
 * Verify login OTP and get tokens
 */
export const loginVerify = async (payload: LoginVerifyRequest): Promise<AuthTokenResponse> => {
  try {
    const { data } = await api.post<AuthTokenResponse>('/auth/login/verify/', payload);

    const { accessToken, refreshToken } = extractTokens(data);
    if (!accessToken) {
      throw new Error('Access token was not returned by the server.');
    }

    // Store tokens and user info
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('user_id', String(data.user.id));

    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to verify login OTP.'));
  }
};

/**
 * Resend signup OTP (same behavior as requesting OTP).
 */
export const signupResendOTP = async (payload: { phone: string; role?: 'client' | 'provider' }): Promise<OTPResponse> => {
  const normalizedPhone = payload.phone?.trim() || '';
  try {
    const { data } = await api.post<OTPResponse>('/auth/signup/resend-otp/', {
      phone_number: normalizedPhone,
      role: payload.role ?? 'client',
    });
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to resend signup OTP.'));
  }
};

// ─── Profile ─────────────────────────────────────────────────────────────

/**
 * Get current user profile
 */
export const getProfile = async (): Promise<UserProfile> => {
  const { data } = await api.get<UserProfile>('/auth/profile/');
  return data;
};

export const getProviderOnboardingStatus = async (): Promise<ProviderOnboardingStatus> => {
  const { data } = await api.get<ProviderOnboardingStatus>('/provider/onboarding/status/');
  return data;
};

/**
 * Logout (clear local storage)
 */
export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

/**
 * Get stored user from localStorage
 */
export const getStoredUser = (): UserProfile | null => {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
};

/**
 * Check if user has valid tokens
 */
export const hasValidTokens = (): boolean => {
  return !!localStorage.getItem('access_token');
};
