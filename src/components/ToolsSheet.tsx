import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import { useI18n } from '../i18n/I18nContext';
import type { I18nKey } from '../i18n/resources';
import { ChevronRightIcon } from './ui';

/**
 * ToolsSheet — 跑前工具的底部抽屉。首页只保留一个入口按钮，
 * 把踩拍测频、配速推算等低频工具收进这里，让首页聚焦在步频本身。
 */

export type ToolId = 'tapTempo' | 'paceCalc';

const TOOLS: { id: ToolId; glyph: string; title: I18nKey; desc: I18nKey }[] = [
  { id: 'tapTempo', glyph: '⏱', title: 'home.tapTempo', desc: 'home.tapTempoDesc' },
  { id: 'paceCalc', glyph: '⚡', title: 'home.paceCalc', desc: 'home.paceCalcDesc' },
];

interface ToolsSheetProps {
  visible: boolean;
  onClose: () => void;
  onPick: (tool: ToolId) => void;
}

export function ToolsSheet({ visible, onClose, onPick }: ToolsSheetProps) {
  const { c } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: c.card, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.grabber, { backgroundColor: c.trackInactive }]} />
          <Text style={[styles.title, { color: c.text }]}>{t('home.toolsTitle')}</Text>
          {TOOLS.map((tool) => (
            <Pressable
              key={tool.id}
              onPress={() => onPick(tool.id)}
              accessibilityRole="button"
              accessibilityLabel={t(tool.title)}
              accessibilityHint={t(tool.desc)}
              style={({ pressed }) => [styles.row, { backgroundColor: c.cardAlt, opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={[styles.glyphWrap, { backgroundColor: c.chipAccent }]}>
                <Text style={styles.glyph}>{tool.glyph}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.text }]}>{t(tool.title)}</Text>
                <Text style={[styles.rowDesc, { color: c.textFaint }]}>{t(tool.desc)}</Text>
              </View>
              <ChevronRightIcon />
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    // 大屏上不铺满整屏宽
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    borderTopLeftRadius: radius.card + 6,
    borderTopRightRadius: radius.card + 6,
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 4.5,
    borderRadius: 3,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    marginBottom: 4,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: radius.pill + 4,
  },
  glyphWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 19 },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  rowDesc: { fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 2 },
});
