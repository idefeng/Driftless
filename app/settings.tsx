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

export default function Settings() {
  const { c, isDark } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { plans } = useCadence();

  return (
    <Screen>
      <SubHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.group, { backgroundColor: c.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
          <Pressable onPress={() => router.push('/plan-list')}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: c.text }]}>{t('plan.title')}</Text>
                <Text style={[styles.rowSub, { color: c.textFaint }]}>
                  {t('settings.trainingPlanSub', { count: plans.length })}
                </Text>
              </View>
              <ChevronRightIcon />
            </View>
          </Pressable>
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
