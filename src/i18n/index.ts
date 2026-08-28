import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import en from './en.json';
import ar from './ar.json';
import ta from './ta.json';
import { parentStrings } from './parentStrings';

export type AppLang = 'en' | 'ar' | 'ta';

/**
 * The Teacher app's index registered ONLY `en`, so the Arabic and Tamil
 * dictionaries never loaded despite being shipped. All three are merged here,
 * with the parent-only copy layered on top of the shared teacher dictionary.
 */
const resources = {
  en: { translation: { ...en, ...parentStrings.en } },
  ar: { translation: { ...ar, ...parentStrings.ar } },
  ta: { translation: { ...ta, ...parentStrings.ta } },
};

export const LANG_LABELS: Record<AppLang, string> = {
  en: 'English',
  ar: 'العربية',
  ta: 'தமிழ்',
};

export const isRTL = (lang: AppLang) => lang === 'ar';

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

/**
 * Switch language and keep the layout direction in sync.
 * `I18nManager.forceRTL` needs a reload to take full effect on Android, so we
 * also flip `dir` on the i18n instance which NativeWind/Flexbox read at runtime.
 */
export function changeLanguage(lang: AppLang) {
  i18n.changeLanguage(lang);
  const rtl = isRTL(lang);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
  return lang;
}

export default i18n;
