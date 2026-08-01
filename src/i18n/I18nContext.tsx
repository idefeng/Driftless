import React, { createContext, useContext, useMemo, useState } from 'react';
import { useLocales } from 'expo-localization';
import { detectAppLanguage, type AppLanguage } from './language';
import { translate, type I18nKey, type TranslationParams, type Translator } from './resources';

// 'system' follows the device region/language automatically (detectAppLanguage);
// 'zh' / 'en' are explicit user overrides set from the language settings screen.
export type LanguagePreference = 'system' | AppLanguage;

interface I18nValue {
  language: AppLanguage;
  languageCode: string | null;
  regionCode: string | null;
  languagePreference: LanguagePreference;
  setLanguagePreference: (pref: LanguagePreference) => void;
  t: Translator;
}

const I18nCtx = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locales = useLocales();
  const detected = useMemo(() => detectAppLanguage(locales), [locales]);
  const [languagePreference, setLanguagePreference] = useState<LanguagePreference>('system');

  const language = languagePreference === 'system' ? detected.language : languagePreference;

  const value = useMemo<I18nValue>(() => {
    const t = (key: I18nKey, params?: TranslationParams) => translate(language, key, params);

    return {
      language,
      languageCode: detected.languageCode,
      regionCode: detected.regionCode,
      languagePreference,
      setLanguagePreference,
      t,
    };
  }, [language, detected, languagePreference]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const value = useContext(I18nCtx);
  if (!value) throw new Error('useI18n must be used within I18nProvider');
  return value;
}
