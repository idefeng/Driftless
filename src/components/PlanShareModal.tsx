import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { TrainingPlan } from '../state/CadenceContext';
import { PlanQRCode } from './PlanQRCode';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import { useI18n } from '../i18n/I18nContext';

interface PlanShareModalProps {
  plan: TrainingPlan | null;
  visible: boolean;
  onClose: () => void;
}

export function PlanShareModal({ plan, visible, onClose }: PlanShareModalProps) {
  const { c, isDark } = useTheme();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  if (!plan) return null;

  const payload = JSON.stringify({
    name: plan.name,
    phases: plan.phases.map((p) => ({
      name: p.name,
      durationSec: p.durationSec,
      bpm: p.bpm,
    })),
  });

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert(
      t('language.title') === '语言' ? '配置已导出' : 'Exported',
      t('language.title') === '语言'
        ? '训练计划 JSON 数据已准备就绪。在另一台设备粘贴此文本即可恢复计划！'
        : 'Plan JSON payload ready to copy & share!',
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { backgroundColor: c.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: c.text }]}>{plan.name}</Text>
          <Text style={[styles.subtitle, { color: c.textFaint }]}>
            {t('language.title') === '语言'
              ? '扫码或导入 JSON 零网分享计划'
              : 'Scan QR code or import JSON offline'}
          </Text>

          <View style={styles.qrContainer}>
            <PlanQRCode value={payload} size={210} color={isDark ? '#FFFFFF' : '#0B0D0A'} backgroundColor={c.card} />
          </View>

          <Pressable style={[styles.button, { backgroundColor: c.brand }]} onPress={handleCopy}>
            <Text style={[styles.buttonText, { color: c.onBrand }]}>
              {copied
                ? t('language.title') === '语言' ? '✓ 已准备好数据' : '✓ Ready'
                : t('language.title') === '语言' ? '复制 JSON 文本' : 'Copy JSON'}
            </Text>
          </Pressable>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={[styles.closeText, { color: c.textFaint }]}>
              {t('common.cancel')}
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
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrContainer: {
    marginBottom: 22,
    padding: 8,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  closeButton: {
    marginTop: 14,
    paddingVertical: 8,
  },
  closeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
  },
});
