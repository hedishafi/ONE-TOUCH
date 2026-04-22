import api from './api';

export interface ServiceCategory {
  id: number;
  name: string;
  slug?: string;
  icon?: string;
  description?: string;
}

export interface ServiceSubService {
  id: number;
  name: string;
  service_id?: number;
}

export const getServiceCategories = async (): Promise<ServiceCategory[]> => {
  const { data } = await api.get<ServiceCategory[]>('/services/categories/');
  return data;
};

export const getSubServices = async (categoryId: number | string): Promise<ServiceSubService[]> => {
  const { data } = await api.get<ServiceSubService[]>('/services/subservices/', {
    params: { category: categoryId },
  });
  return data;
};
