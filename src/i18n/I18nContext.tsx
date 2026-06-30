import React, { createContext, useContext, useMemo } from 'react';
import { useLocales } from 'expo-localization';
import { detectAppLanguage, type AppLanguage } from './language';
import { translate, type I18nKey, type TranslationParams, type Translator } from './resources';

interface I18nValue {
  language: AppLanguage;
  languageCode: string | null;
  regionCode: string | null;
  t: Translator;
}

const I18nCtx = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locales = useLocales();
  const detected = useMemo(() => detectAppLanguage(locales), [locales]);

  const value = useMemo<I18nValue>(() => {
    const t = (key: I18nKey, params?: TranslationParams) =>
      translate(detected.language, key, params);

    return {
      language: detected.language,
      languageCode: detected.languageCode,
      regionCode: detected.regionCode,
      t,
    };
  }, [detected]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const value = useContext(I18nCtx);
  if (!value) throw new Error('useI18n must be used within I18nProvider');
  return value;
}
