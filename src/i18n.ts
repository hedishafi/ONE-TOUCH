import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { storage, STORAGE_KEYS } from './utils/storage';
import en from './locales/en.json';
import am from './locales/am.json';
import ar from './locales/ar.json';

const savedLang = storage.get<string>(STORAGE_KEYS.language, 'en');

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
    ar: { translation: ar },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
