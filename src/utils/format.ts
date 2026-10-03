import { formatClock } from '../state/CadenceContext';
import type { AppLanguage } from '../i18n/language';

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 手写日期格式，不依赖 Hermes 的 Intl 完整度。
export function formatDate(ms: number, language: AppLanguage): string {
  const d = new Date(ms);
  const hm = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  return language === 'zh'
    ? `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
    : `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${hm}`;
}

/** 时长：不足 1 小时显示 m:ss，否则 h:mm:ss。 */
export function formatDuration(sec: number): string {
  if (sec < 3600) return formatClock(sec);
  const h = Math.floor(sec / 3600);
  return `${h}:${formatClock(sec % 3600).padStart(5, '0')}`;
}
