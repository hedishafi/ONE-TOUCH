import api from './api';

export interface ProviderProfileSetupPayload {
  full_name: string;
  service_category: string;
  sub_services: string[];
  price_min: number;
  price_max: number;
  bio?: string;
  profile_picture?: File | null;
}

export interface ProviderProfileSetupResponse {
  user_id: number;
  phone_number: string;
  full_name: string;
  service_category: string;
  sub_services: string[];
  price_min: number;
  price_max: number;
  bio: string;
  profile_picture?: string;
  profile_completed: boolean;
  message: string;
}

export interface ServiceCategoryItem {
  id: number;
  name: string;
  slug: string;
}

export interface SubServiceItem {
  id: number;
  name: string;
  slug: string;
  category_id: number;
}

interface ServiceCategoryListResponse {
  results: ServiceCategoryItem[];
}

interface SubServiceListResponse {
  results: SubServiceItem[];
}

export const setupProviderProfile = async (
  payload: ProviderProfileSetupPayload
): Promise<ProviderProfileSetupResponse> => {
  const formData = new FormData();
  formData.append('full_name', payload.full_name);
  formData.append('service_category', payload.service_category);
  payload.sub_services.forEach((value) => formData.append('sub_services', value));
  formData.append('price_min', String(payload.price_min));
  formData.append('price_max', String(payload.price_max));
  formData.append('bio', payload.bio ?? '');
  if (payload.profile_picture) {
    formData.append('profile_picture', payload.profile_picture);
  }

  const { data } = await api.post<ProviderProfileSetupResponse>('/provider/profile/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
};

export const listServiceCategories = async (): Promise<ServiceCategoryItem[]> => {
  const { data } = await api.get<ServiceCategoryListResponse>('/provider/service-categories/');
  return data.results;
};

export const listSubServices = async (categoryId: number): Promise<SubServiceItem[]> => {
  const { data } = await api.get<SubServiceListResponse>(`/provider/service-categories/${categoryId}/sub-services/`);
  return data.results;
};
