import { useEffect, useMemo, useState } from 'react';
import type { Category } from '../types';
import { MOCK_CATEGORIES } from '../mock/mockServices';
import {
  getServiceCategories,
  getSubServices,
  type ServiceCategory,
  type ServiceSubService,
} from '../services/serviceCatalogService';

type CatalogState = {
  categories: Category[];
  loading: boolean;
  error: string | null;
};

const NAME_ICON_MAP: Record<string, string> = {
  plumbing: 'droplets',
  electrical: 'bolt',
  cleaning: 'sparkles',
  'auto & mechanics': 'car',
  moving: 'truck',
  'beauty & wellness': 'heart',
  'tutoring & education': 'school',
  'it & tech support': 'device-laptop',
};

const FALLBACK_COLORS = ['#1ABC9C', '#F39C12', '#3498DB', '#E74C3C', '#2C3E50', '#9B59B6', '#E91E63', '#00B4D8'];

const resolveIcon = (category: ServiceCategory) => {
  if (category.icon) {
    return category.icon;
  }
  const key = category.name.toLowerCase();
  return NAME_ICON_MAP[key] ?? 'bolt';
};

const resolveColor = (category: ServiceCategory, index: number) => {
  const mock = MOCK_CATEGORIES.find(c => c.name.toLowerCase() === category.name.toLowerCase());
  if (mock?.color) {
    return mock.color;
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
};

const normalizeCategory = (
  category: ServiceCategory,
  subservices: ServiceSubService[],
  index: number
): Category => ({
  id: String(category.id),
  name: category.name,
  icon: resolveIcon(category),
  color: resolveColor(category, index),
  subcategories: subservices.map((sub) => ({
    id: String(sub.id),
    categoryId: String(category.id),
    name: sub.name,
  })),
});

export const useServiceCatalog = (): CatalogState => {
  const [state, setState] = useState<CatalogState>({
    categories: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const categories = await getServiceCategories();
        const subserviceLists = await Promise.all(
          categories.map((category) => getSubServices(category.id))
        );

        if (!active) return;

        const normalized = categories.map((category, index) =>
          normalizeCategory(category, subserviceLists[index], index)
        );

        setState({ categories: normalized, loading: false, error: null });
      } catch (error: any) {
        if (!active) return;
        const message =
          error?.response?.data?.detail ||
          error?.message ||
          'Unable to load service catalog.';
        setState({ categories: MOCK_CATEGORIES, loading: false, error: message });
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => state, [state]);
};
