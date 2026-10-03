import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import { Screen } from '../src/components/Screen';
import { SubHeader } from '../src/components/SubHeader';
import { ChevronRightIcon } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts, VisualMode } from '../src/theme/tokens';
import { useCadence } from '../src/state/CadenceContext';
import { useI18n } from '../src/i18n/I18nContext';
import { getSoundShortName } from '../src/i18n/labels';

export default function Settings() {
  const { c, isDark, visualMode, setVisualMode } = useTheme();
  const { t, languagePreference, language } = useI18n();
  const router = useRouter();
  const { plans, sound, coexist } = useCadence();
  const [checkingOta, setCheckingOta] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.3';
  const updateId = Updates.updateId ? Updates.updateId.slice(0, 8) : null;
  const channel = Updates.channel || 'production';

  const languageSub =
    languagePreference === 'system'
      ? t('settings.languageSub.system', { language: t(language === 'zh' ? 'language.zh' : 'language.en') })
      : t(languagePreference === 'zh' ? 'language.zh' : 'language.en');

  const visualModes: { mode: VisualMode; labelZh: string; labelEn: string; descZh: string; descEn: string }[] = [
    { mode: 'standard', labelZh: '标准', labelEn: 'Standard', descZh: '跟随系统明暗', descEn: 'System theme' },
    { mode: 'solar', labelZh: '日光强光', labelEn: 'Solar', descZh: '户外高对比', descEn: 'Sun glare focus' },
    { mode: 'midnight', labelZh: '夜跑红光', labelEn: 'Midnight', descZh: '护眼深红光', descEn: 'Night vision' },
  ];

  const handleCheckOta = async () => {
    if (checkingOta) return;
    setCheckingOta(true);
    try {
      const isDev = __DEV__;
      const enabled = Updates.isEnabled;
      const ch = Updates.channel || 'none';
      const runtimeVer = Updates.runtimeVersion || 'none';
      const upId = Updates.updateId || 'embedded (内置初始包)';

      if (isDev) {
        Alert.alert(
          language === 'zh' ? 'OTA 诊断结果' : 'OTA Diagnostics',
          language === 'zh'
            ? '当前为开发调试环境 (__DEV__=true)。\n\nOTA 功能在开发包中已禁用。请使用打包生成的独立 Release APK 进行更新测试。'
            : 'Currently in __DEV__ mode. OTA updates are disabled in development builds. Test with a Release build.',
        );
        return;
      }

      if (!enabled) {
        Alert.alert(
          language === 'zh' ? 'OTA 诊断结果' : 'OTA Diagnostics',
          language === 'zh'
            ? 'Updates.isEnabled 为 false。请检查 app.json 中 Updates 配置。'
            : 'Updates.isEnabled is false. Check app.json configuration.',
        );
        return;
      }

      const res = await Updates.checkForUpdateAsync();
      if (res.isAvailable) {
        Alert.alert(
          language === 'zh' ? '发现新版本！' : 'Update Available!',
          language === 'zh'
            ? '已从 EAS 服务器检测到更新 Bundle，点击确定立即下载并应用。'
            : 'A new update bundle was found. Tap OK to download & apply now.',
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: language === 'zh' ? '下载并应用' : 'Download Now',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  await Updates.reloadAsync();
                } catch (e: any) {
                  Alert.alert('下载失败', e.message || String(e));
                }
              },
            },
          ],
        );
      } else {
        Alert.alert(
          language === 'zh' ? 'OTA 诊断：未检测到更新' : 'OTA: Up to date',
          language === 'zh'
            ? `当前参数信息：\n` +
              `• 渠道 (Channel): ${ch}\n` +
              `• 运行时 (RuntimeVersion): ${runtimeVer}\n` +
              `• 当前 Update ID: ${upId}\n` +
              `• 初始内嵌包: ${Updates.isEmbeddedLaunch ? '是' : '否'}\n\n` +
              `服务器上暂未检测到匹配此 Channel 和 RuntimeVersion 的更高更新。`
            : `Parameters:\n• Channel: ${ch}\n• RuntimeVersion: ${runtimeVer}\n• Update ID: ${upId}\n• Embedded: ${Updates.isEmbeddedLaunch}`,
        );
      }
    } catch (err: any) {
      Alert.alert(
        language === 'zh' ? 'OTA 检查异常' : 'OTA Check Error',
        `Error: ${err.message || String(err)}`,
      );
    } finally {
      setCheckingOta(false);
    }
  };

  const rows = [
    {
      title: t('plan.title'),
      sub: t('settings.trainingPlanSub', { count: plans.length }),
      onPress: () => router.push('/plan-list'),
    },
    {
      title: t('language.title'),
      sub: languageSub,
      onPress: () => router.push('/language'),
    },
    {
      title: t('sound.title'),
      sub: getSoundShortName(t, sound),
      onPress: () => router.push('/sounds'),
    },
    {
      title: t('coexist.title'),
      sub: coexist === 'mix' ? t('home.coexistMix') : t('home.coexistExclusive'),
      onPress: () => router.push('/coexist'),
    },
    {
      title: language === 'zh' ? '检查 OTA 热更新与诊断' : 'OTA Update & Diagnostics',
      sub: language === 'zh' ? '手动检查 EAS 更新并查看当前 Channel / Runtime' : 'Check EAS update & inspect environment',
      onPress: handleCheckOta,
      rightIcon: checkingOta ? <ActivityIndicator size="small" color={c.brand} /> : <ChevronRightIcon />,
    },
  ];

  return (
    <Screen>
      <SubHeader title={t('settings.title')} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        {/* Visual Mode Card */}
        <Text style={[styles.sectionTitle, { color: c.textFaint }]}>
          {language === 'zh' ? '视觉模式 · Visual Mode' : 'Visual Mode'}
        </Text>
        <View style={[styles.visualCard, { backgroundColor: c.card }]}>
          <View style={styles.segmentRow}>
            {visualModes.map((item) => {
              const active = visualMode === item.mode;
              return (
                <Pressable
                  key={item.mode}
                  style={[
                    styles.segmentBtn,
                    active && { backgroundColor: c.chipAccent, borderColor: c.brand, borderWidth: 1 },
                  ]}
                  onPress={() => setVisualMode(item.mode)}
                >
                  <Text style={[styles.segmentLabel, { color: active ? c.brandText : c.text }]}>
                    {language === 'zh' ? item.labelZh : item.labelEn}
                  </Text>
                  <Text style={[styles.segmentDesc, { color: active ? c.brandText : c.textFaint }]}>
                    {language === 'zh' ? item.descZh : item.descEn}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* General Settings Group */}
        <Text style={[styles.sectionTitle, { color: c.textFaint, marginTop: 22 }]}>
          {language === 'zh' ? '常规偏好与诊断' : 'General & Diagnostics'}
        </Text>
        <View style={[styles.group, { backgroundColor: c.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
          {rows.map((row, i) => (
            <Pressable key={row.title} onPress={row.onPress} accessibilityRole="button" accessibilityLabel={row.title}>
              <View
                style={[
                  styles.row,
                  i < rows.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.divider },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: c.text }]}>{row.title}</Text>
                  <Text style={[styles.rowSub, { color: c.textFaint }]}>{row.sub}</Text>
                </View>
                {row.rightIcon || <ChevronRightIcon />}
              </View>
            </Pressable>
          ))}
        </View>

        {/* Version Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerTitle, { color: c.textMuted }]}>
            Driftless v{appVersion}
          </Text>
          <Text style={[styles.footerSub, { color: c.textFaint }]}>
            {updateId
              ? `OTA Update: ${updateId} (${channel})`
              : `Embedded Build (${channel})`}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
  },
  visualCard: {
    borderRadius: 22,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  segmentDesc: {
    fontFamily: fonts.bodyRegular,
    fontSize: 10,
    marginTop: 2,
  },
  group: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 10,
  },
  rowTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15.5 },
  rowSub: { fontFamily: fonts.bodyMedium, fontSize: 11.5, marginTop: 1 },
  footer: {
    marginTop: 32,
    marginBottom: 16,
    alignItems: 'center',
    gap: 2,
  },
  footerTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  footerSub: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
  },
});
