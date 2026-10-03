import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { useCadence } from '../state/CadenceContext';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import { useI18n } from '../i18n/I18nContext';
import { MiniStepper } from './MiniStepper';

interface PaceCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PaceCalculatorModal({ visible, onClose }: PaceCalculatorModalProps) {
  const { c } = useTheme();
  const { language } = useI18n();
  const { bpm } = useCadence();

  // Stride length in cm (default 100cm = 1.00m)
  const [strideCm, setStrideCm] = useState(100);

  const strideM = strideCm / 100;
  const metersPerMin = bpm * strideM;
  const secPerKm = metersPerMin > 0 ? 60000 / metersPerMin : 0;

  const paceMin = Math.floor(secPerKm / 60);
  const paceSec = Math.round(secPerKm % 60);
  const paceSecStr = paceSec < 10 ? `0${paceSec}` : `${paceSec}`;

  const kmh = ((metersPerMin * 60) / 1000).toFixed(1);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: c.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: c.text }]}>
            {language === 'zh' ? '步频-步幅-配速推算' : 'Cadence to Pace Calculator'}
          </Text>
          <Text style={[styles.subtitle, { color: c.textFaint }]}>
            {language === 'zh'
              ? '纯本地公式估算跑步预期配速与时速'
              : 'Calculate estimated running pace & speed'}
          </Text>

          {/* Result Card */}
          <View style={[styles.resultCard, { backgroundColor: c.chipAccent }]}>
            <Text style={[styles.paceText, { color: c.brandText }]}>
              {paceMin}'{paceSecStr}" <Text style={styles.unitText}>/km</Text>
            </Text>
            <Text style={[styles.speedText, { color: c.textMuted }]}>
              {language === 'zh'
                ? `时速 ~${kmh} km/h · 步幅 ${strideM.toFixed(2)}m`
                : `Speed ~${kmh} km/h · Stride ${strideM.toFixed(2)}m`}
            </Text>
          </View>

          {/* Steppers */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepperRow}>
              <Text style={[styles.label, { color: c.text }]}>
                {language === 'zh' ? '当前步频' : 'Cadence'}
              </Text>
              <Text style={[styles.valueText, { color: c.brandText }]}>{bpm} SPM</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: c.divider }]} />

            <View style={styles.stepperRow}>
              <View>
                <Text style={[styles.label, { color: c.text }]}>
                  {language === 'zh' ? '单步步幅' : 'Stride Length'}
                </Text>
                <Text style={[styles.subLabel, { color: c.textFaint }]}>
                  {language === 'zh' ? '落地脚距 (80-160cm)' : 'Step distance (80-160cm)'}
                </Text>
              </View>
              <MiniStepper
                value={`${strideCm} cm`}
                caption={language === 'zh' ? '步幅' : 'Stride'}
                onStep={(d) => setStrideCm((prev) => Math.min(160, Math.max(80, prev + d * 2)))}
              />
            </View>
          </View>

          <Pressable style={[styles.button, { backgroundColor: c.brand }]} onPress={onClose}>
            <Text style={[styles.buttonText, { color: c.onBrand }]}>
              {language === 'zh' ? '完成' : 'Done'}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.card,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    marginTop: 4,
    marginBottom: 18,
    textAlign: 'center',
  },
  resultCard: {
    width: '100%',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  paceText: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 38,
    fontVariant: ['tabular-nums'],
  },
  unitText: {
    fontSize: 18,
    fontFamily: fonts.bodyBold,
  },
  speedText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    marginTop: 2,
  },
  stepperContainer: {
    width: '100%',
    marginBottom: 20,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 4,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
  },
  subLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    marginTop: 1,
  },
  valueText: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
  },
});
