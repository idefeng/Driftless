import React, { useState, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { useCadence } from '../state/CadenceContext';
import { clampBpm } from '../audio/CadenceScheduler';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import { useI18n } from '../i18n/I18nContext';

interface TapTempoModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TapTempoModal({ visible, onClose }: TapTempoModalProps) {
  const { c } = useTheme();
  const { t, language } = useI18n();
  const { setBpm } = useCadence();

  const [taps, setTaps] = useState<number[]>([]);
  const [detectedBpm, setDetectedBpm] = useState<number | null>(null);
  const lastTapRef = useRef<number>(0);

  const handleTap = () => {
    const now = Date.now();
    // Reset if taps are separated by more than 2.5 seconds
    if (lastTapRef.current && now - lastTapRef.current > 2500) {
      setTaps([now]);
      setDetectedBpm(null);
      lastTapRef.current = now;
      return;
    }

    lastTapRef.current = now;
    const newTaps = [...taps.slice(-5), now];
    setTaps(newTaps);

    if (newTaps.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const bpmVal = clampBpm(Math.round(60000 / avgInterval));
      setDetectedBpm(bpmVal);
    }
  };

  const handleApply = () => {
    if (detectedBpm) {
      setBpm(detectedBpm);
    }
    setTaps([]);
    setDetectedBpm(null);
    onClose();
  };

  const handleReset = () => {
    setTaps([]);
    setDetectedBpm(null);
    lastTapRef.current = 0;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: c.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: c.text }]}>
            {language === 'zh' ? '踩拍测步频 · Tap Tempo' : 'Tap Tempo'}
          </Text>
          <Text style={[styles.subtitle, { color: c.textFaint }]}>
            {language === 'zh'
              ? '按照跑步脚步落地节奏轻按大圆盘'
              : 'Tap the big circle to match your cadence'}
          </Text>

          {/* Tap Target */}
          <Pressable
            style={({ pressed }) => [
              styles.tapCircle,
              {
                backgroundColor: pressed ? c.chipAccent : c.cardAlt,
                borderColor: c.brand,
              },
            ]}
            onPress={handleTap}
          >
            <Text style={[styles.bpmValue, { color: detectedBpm ? c.brandText : c.textFaint }]}>
              {detectedBpm ? detectedBpm : '--'}
            </Text>
            <Text style={[styles.tapHint, { color: c.textMuted }]}>
              {taps.length < 2
                ? language === 'zh' ? '按节奏连续点击...' : 'Tap rhythmically...'
                : language === 'zh' ? `已采集 ${taps.length} 拍 (点击继续)` : `${taps.length} taps (keep tapping)`}
            </Text>
          </Pressable>

          <View style={styles.buttonRow}>
            <Pressable style={[styles.button, { backgroundColor: c.cardAlt }]} onPress={handleReset}>
              <Text style={[styles.buttonText, { color: c.textFaint }]}>
                {language === 'zh' ? '重置' : 'Reset'}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                { backgroundColor: detectedBpm ? c.brand : c.trackInactive },
              ]}
              disabled={!detectedBpm}
              onPress={handleApply}
            >
              <Text style={[styles.buttonText, { color: detectedBpm ? c.onBrand : c.textFaint }]}>
                {language === 'zh' ? '应用步频' : 'Apply Cadence'}
              </Text>
            </Pressable>
          </View>
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
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  tapCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  bpmValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 54,
    fontVariant: ['tabular-nums'],
  },
  tapHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14.5,
  },
});
