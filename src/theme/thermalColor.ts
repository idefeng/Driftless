import { brand } from './tokens';
import type { I18nKey } from '../i18n/resources';

/**
 * Thermal intensity mapping for Driftless BPM.
 *
 * Brand rule (PRD §1.5)：全应用只有一个品牌色（荧光运动绿 #C6FF3D）。「越快越热」
 * 只在同一绿色色相内通过亮度 / 发光强度表达：
 * - 100–149 BPM：恢复 —— 暗橄榄绿，低亮
 * - 150–180 BPM：巡航 —— 标准荧光绿（brand.base）
 * - 181–250 BPM：冲刺 —— 近白亮绿（brand.light），发光最强
 * 日光（白底）模式下反过来用由浅到深的绿保证对比度。
 */

export interface BpmThermalColor {
  /** beat footprints / active accents */
  base: string;
  /** halo highlight */
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
      base: isDark ? '#8DB33A' : '#6E9A2E',
      glow: isDark ? '#A8D94A' : '#8DB33A',
      chipBg: isDark ? 'rgba(198, 255, 61, 0.08)' : '#EEF6E0',
      text: isDark ? '#A8D94A' : '#4A6B1C',
      labelKey: 'thermal.recovery',
    };
  }
  if (bpm <= 180) {
    return {
      base: isDark ? brand.base : '#5E9E00',
      glow: isDark ? brand.glow : brand.deep,
      chipBg: isDark ? 'rgba(198, 255, 61, 0.14)' : '#E3F3C6',
      text: isDark ? brand.base : '#3D6B00',
      labelKey: 'thermal.cruise',
    };
  }
  return {
    base: isDark ? brand.light : '#3D6B00',
    glow: isDark ? '#F2FFD1' : '#5E9E00',
    chipBg: isDark ? 'rgba(227, 255, 158, 0.22)' : '#D4EDA6',
    text: isDark ? brand.light : '#2C4F00',
    labelKey: 'thermal.sprint',
  };
}
