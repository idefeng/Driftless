import { brand } from './tokens';
import type { I18nKey } from '../i18n/resources';

/**
 * Thermal intensity mapping for Driftless BPM.
 *
 * Brand rule (PRD §1.5)：全应用只有一个品牌色（阳光橙 #FF8C2B），不引入第二个
 * 高饱和强调色。因此「越快越热」只在同一橙色色相内通过明度 / 发光强度表达，
 * 全部取自 `brand` 色阶：
 * - 100–149 BPM：恢复 —— 浅橙（brand.light），柔和低亮
 * - 150–180 BPM：巡航 —— 标准阳光橙（brand.base）
 * - 181–250 BPM：冲刺 —— 深橙（brand.deep），发光最强
 */

export interface BpmThermalColor {
  /** beat bars / active accents */
  base: string;
  /** center bar / halo highlight */
  glow: string;
  /** badge background */
  chipBg: string;
  /** badge text, contrast-tuned for the current scheme */
  text: string;
  labelKey: I18nKey;
}

export function getBpmThermalColor(bpm: number, isDark: boolean): BpmThermalColor {
  if (bpm < 150) {
    return {
      base: brand.light,
      glow: '#FFD2A3',
      chipBg: isDark ? 'rgba(255, 176, 102, 0.12)' : '#FFF4E8',
      text: isDark ? brand.light : '#C2620F',
      labelKey: 'thermal.recovery',
    };
  }
  if (bpm <= 180) {
    return {
      base: isDark ? brand.glow : brand.base,
      glow: brand.light,
      chipBg: isDark ? 'rgba(255, 140, 43, 0.18)' : '#FFEAD6',
      text: isDark ? brand.light : '#C2620F',
      labelKey: 'thermal.cruise',
    };
  }
  return {
    base: isDark ? brand.base : brand.deep,
    glow: brand.glow,
    chipBg: isDark ? 'rgba(244, 114, 22, 0.28)' : '#FFDDBF',
    text: isDark ? brand.glow : '#A84E08',
    labelKey: 'thermal.sprint',
  };
}
