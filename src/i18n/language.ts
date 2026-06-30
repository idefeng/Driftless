export type AppLanguage = 'zh' | 'en';

export interface LocaleLike {
  languageCode?: string | null;
  regionCode?: string | null;
}

export interface LanguageDetection {
  language: AppLanguage;
  languageCode: string | null;
  regionCode: string | null;
}

const CHINESE_REGION_CODES = new Set(['CN', 'HK', 'MO', 'TW']);

export function detectAppLanguage(locales: readonly LocaleLike[]): LanguageDetection {
  const primary = locales[0];
  const languageCode = primary?.languageCode?.toLowerCase() ?? null;
  const regionCode = primary?.regionCode?.toUpperCase() ?? null;

  // 地区是主规则：只有中国大陆、港澳台显示中文，其它明确地区统一英文。
  if (regionCode) {
    return {
      language: CHINESE_REGION_CODES.has(regionCode) ? 'zh' : 'en',
      languageCode,
      regionCode,
    };
  }

  // 少数系统可能不给地区；无法判断地区时统一默认英文。
  return {
    language: 'en',
    languageCode,
    regionCode,
  };
}
