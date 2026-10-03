import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { useI18n } from '../i18n/I18nContext';
import type { SessionRecord } from '../state/sessionStats';
import { ShareCard, SHARE_CARD_WIDTH } from './ShareCard';
import { logger } from '../utils/logger';

/**
 * 分享卡片预览 + 系统分享（v1.2）。卡片截成 PNG 临时文件后交给系统分享面板，
 * 不经过任何服务器。Web 预览只展示卡片，不提供分享（view-shot 不支持 Web）。
 */
export function ShareSessionModal({
  record,
  visible,
  onClose,
  celebrate = false,
}: {
  record: SessionRecord | null;
  visible: boolean;
  onClose: () => void;
  /** 训练刚结束时自动弹出：标题改为「训练完成」。 */
  celebrate?: boolean;
}) {
  const { c } = useTheme();
  const { t } = useI18n();
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const { width } = useWindowDimensions();
  // 窄屏（如折叠屏外屏）时整体缩小卡片预览；截图取的是原生视图原始尺寸，不受缩放影响。
  const scale = Math.min(1, (width - 32) / SHARE_CARD_WIDTH);
  const canShare = Platform.OS !== 'web';

  const onShare = async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (!(await Sharing.isAvailableAsync())) throw new Error('sharing unavailable');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t('share.title'), UTI: 'public.png' });
    } catch (error) {
      logger.warn('生成分享图片失败。', error);
      Alert.alert(t('share.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Text style={styles.title}>{celebrate ? t('share.done') : t('share.title')}</Text>

        {record && (
          <View style={{ transform: [{ scale }] }}>
            <ShareCard ref={cardRef} record={record} />
          </View>
        )}

        <View style={styles.actions}>
          {canShare ? (
            <Pressable
              onPress={onShare}
              disabled={busy}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primary, { backgroundColor: c.brand, opacity: pressed || busy ? 0.7 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator color={c.onBrand} />
              ) : (
                <Text style={[styles.primaryText, { color: c.onBrand }]}>{t('share.button')}</Text>
              )}
            </Pressable>
          ) : (
            <Text style={styles.hint}>{t('share.webHint')}</Text>
          )}
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" style={styles.secondary}>
            <Text style={styles.secondaryText}>{t('share.close')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 18,
  },
  title: { fontFamily: fonts.bodyBold, fontSize: 18, color: '#FFFFFF' },
  actions: { alignItems: 'center', gap: 12, width: '100%', maxWidth: SHARE_CARD_WIDTH },
  primary: { alignSelf: 'stretch', paddingVertical: 15, borderRadius: 18, alignItems: 'center' },
  primaryText: { fontFamily: fonts.bodyBold, fontSize: 15.5 },
  hint: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  secondary: { paddingVertical: 6 },
  secondaryText: { fontFamily: fonts.bodyBold, fontSize: 14, color: 'rgba(255,255,255,0.75)' },
});
