import api from './api';

// ─── Types ───────────────────────────────────────────────────────────────

export interface OnboardingStep1Request {
  doc_type: 'national_id' | 'drivers_license' | 'kebele_id';
  document_file: File;
}

export interface OnboardingStep1Response {
  session_id: string;
  step: number;
  extracted_data: {
    name?: string;
    document_number?: string;
    dob?: string;
    gender?: string;
    nationality?: string;
    region?: string;
    wereda?: string;
    kebele?: string;
    home_address?: string;
    issue_date?: string;
    expiry_date?: string;
    phone?: string;
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
  formData.append('document_type', payload.doc_type);
  formData.append('document_file', payload.document_file);

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
