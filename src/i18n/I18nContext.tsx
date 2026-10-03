import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocales } from 'expo-localization';
import { detectAppLanguage, type AppLanguage } from './language';
import { translate, type I18nKey, type TranslationParams, type Translator } from './resources';
import { logger } from '../utils/logger';

// 'system' follows the device region/language automatically (detectAppLanguage);
// 'zh' / 'en' are explicit user overrides set from the language settings screen.
export type LanguagePreference = 'system' | AppLanguage;

// 持久化 key：手动选择的语言偏好，杀进程后启动时恢复。
export const LANGUAGE_PREF_STORAGE_KEY = 'driftless.languagePreference';

const isLanguagePreference = (value: unknown): value is LanguagePreference =>
  value === 'system' || value === 'zh' || value === 'en';

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

  // 启动时水合持久化的语言偏好；水合完成前保持 'system'（跟随系统）行为，避免闪烁。
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LANGUAGE_PREF_STORAGE_KEY);
        if (isLanguagePreference(raw)) setLanguagePreference(raw);
      } catch (error) {
        logger.warn('读取语言偏好失败。', error);
      }
    })();
  }, []);

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
