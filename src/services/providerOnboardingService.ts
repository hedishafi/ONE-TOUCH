import api from './api';

// ─── Types ───────────────────────────────────────────────────────────────

export interface OnboardingStep1Request {
  document_type: 'national_id' | 'drivers_license' | 'kebele_id';
  front_image: File;
  back_image: File;
}

export interface OnboardingStep1Response {
  session_id: string;
  step: number;
  extracted_data: {
    full_name?: string | null;
    id_number?: string | null;
    date_of_birth?: string | null;
    gender?: string;
    nationality?: string | null;
    region_sub_city?: string | null;
    woreda?: string | null;
    issue_date?: string | null;
    expiry_date?: string | null;
    phone_number?: string | null;
  };
  image_quality: number;
  quality_warnings: string[];
  ocr_confidence: number;
}

export interface OnboardingStep2Response {
  session_id: string;
  step: number;
  extracted_fields: any;
  confidence: number;
}

export interface OnboardingStep3OTPRequest {
  session_id: string;
  phone: string;
}

export interface OnboardingStep3OTPVerifyRequest {
  session_id: string;
  otp_code: string;
}

export interface OnboardingStep3Response {
  session_id: string;
  step: number;
  message: string;
}

export interface OnboardingStep4Request {
  session_id: string;
  selfie_image: File;
}

export interface OnboardingStep4Response {
  session_id: string;
  step: number;
  liveness_score: number;
  face_match_score: number;
  status: 'approved' | 'flagged' | 'rejected';
  message: string;
}

export interface OnboardingStep5Request {
  session_id: string;
  bio: string;
  years_of_experience: number;
  address: string;
  price_min: number;
  price_max: number;
}

export interface OnboardingStep5Response {
  message: string;
  status: string;
}

// ─── Step 1: Upload Document ──────────────────────────────────────────────

export const uploadDocument = async (payload: OnboardingStep1Request): Promise<OnboardingStep1Response> => {
  const formData = new FormData();
  formData.append('document_type', payload.document_type);
  formData.append('front_image', payload.front_image);
  formData.append('back_image', payload.back_image);

  const { data } = await api.post<OnboardingStep1Response>(
    '/provider/onboarding/step1/',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return data;
};

// ─── Step 2: Get OCR Fields ───────────────────────────────────────────────

export const getOCRFields = async (): Promise<OnboardingStep2Response> => {
  const { data } = await api.post<OnboardingStep2Response>(
    '/provider/onboarding/step2/',
    {}
  );
  return data;
};

// ─── Step 3: OTP Request and Verification (with session_id) ──────────────

export const providerOTPRequest = async (payload: OnboardingStep3OTPRequest) => {
  const { data } = await api.post(
    '/provider/onboarding/step3/otp-request/',
    {
      session_id: payload.session_id,
      phone_for_verification: payload.phone,
    }
  );
  return data;
};

export const providerOTPVerify = async (payload: OnboardingStep3OTPVerifyRequest): Promise<OnboardingStep3Response> => {
  const { data } = await api.post<OnboardingStep3Response>(
    '/provider/onboarding/step3/otp-verify/',
    {
      session_id: payload.session_id,
      otp: payload.otp_code,
    }
  );
  return data;
};

// ─── Step 4: Upload Selfie & Biometrics ───────────────────────────────────

export const uploadSelfie = async (payload: OnboardingStep4Request): Promise<OnboardingStep4Response> => {
  const formData = new FormData();
  formData.append('session_id', payload.session_id);
  formData.append('selfie_image', payload.selfie_image);

  const { data } = await api.post<OnboardingStep4Response>(
    '/provider/onboarding/step4/',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return data;
};

// ─── Step 5: Complete Profile ─────────────────────────────────────────────

export const completeProfile = async (payload: OnboardingStep5Request): Promise<OnboardingStep5Response> => {
  const { data } = await api.post<OnboardingStep5Response>(
    '/provider/onboarding/step5/',
    payload
  );
  return data;
};
