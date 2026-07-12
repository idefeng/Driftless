import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { SubHeader } from '../src/components/SubHeader';
import { ChevronRightIcon } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts } from '../src/theme/tokens';
import { useCadence } from '../src/state/CadenceContext';
import { useI18n } from '../src/i18n/I18nContext';
import { getSoundShortName } from '../src/i18n/labels';

export default function Settings() {
  const { c, isDark } = useTheme();
  const { t, languagePreference, language } = useI18n();
  const router = useRouter();
  const { plans, sound, coexist } = useCadence();

  const languageSub =
    languagePreference === 'system'
      ? t('settings.languageSub.system', { language: t(language === 'zh' ? 'language.zh' : 'language.en') })
      : t(languagePreference === 'zh' ? 'language.zh' : 'language.en');

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
  ];

  return (
    <Screen>
      <SubHeader title={t('settings.title')} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.group, { backgroundColor: c.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
          {rows.map((row, i) => (
            <Pressable key={row.title} onPress={row.onPress}>
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
                <ChevronRightIcon />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
