/**
 * Thermal color mapping for Driftless BPM.
 * Dynamic color shifting based on cadence:
 * - 100-149 BPM: Recovery / Warm Amber (#F59E0B)
 * - 150-180 BPM: Gold Standard Sunny Orange (#FF8C2B)
 * - 181-250 BPM: Fiery Sprint Red-Orange (#FF4500)
 */

export interface BpmThermalColor {
  base: string;
  glow: string;
  chipBg: string;
  labelZh: string;
  labelEn: string;
}

export function getBpmThermalColor(bpm: number, isDark: boolean): BpmThermalColor {
  if (bpm < 150) {
    // Recovery / Warm Amber
    return {
      base: isDark ? '#F59E0B' : '#D97706',
      glow: '#FBBF24',
      chipBg: isDark ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7',
      labelZh: '沉稳恢复',
      labelEn: 'Recovery',
    };
  } else if (bpm <= 180) {
    // Gold Standard Sunny Orange
    return {
      base: isDark ? '#FF9A45' : '#FF8C2B',
      glow: '#FFB066',
      chipBg: isDark ? 'rgba(255, 140, 43, 0.18)' : '#FFEAD6',
      labelZh: '黄金巡航',
      labelEn: 'Cruise',
    };
  } else {
    // Fiery Sprint Red-Orange
    return {
      base: isDark ? '#FF5500' : '#E63E00',
      glow: '#FF7733',
      chipBg: isDark ? 'rgba(255, 85, 0, 0.22)' : '#FFECE5',
      labelZh: '极限冲刺',
      labelEn: 'Sprint',
    };
  }
}
