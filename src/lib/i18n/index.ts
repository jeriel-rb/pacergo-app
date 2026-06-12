import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from '@/locales/en.json';
import zhHant from '@/locales/zh-Hant.json';

const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const initialLng = deviceLanguage === 'zh' ? 'zh-Hant' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-Hant': { translation: zhHant },
  },
  lng: initialLng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
