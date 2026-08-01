import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Screen } from '../src/components/Screen';
import { SubHeader } from '../src/components/SubHeader';
import { CheckIcon } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts, brand } from '../src/theme/tokens';
import { useI18n, type LanguagePreference } from '../src/i18n/I18nContext';

const OPTIONS: { id: LanguagePreference; nameKey: 'language.system' | 'language.zh' | 'language.en'; descKey: 'language.systemDesc' | 'language.zhDesc' | 'language.enDesc' }[] = [
  { id: 'system', nameKey: 'language.system', descKey: 'language.systemDesc' },
  { id: 'zh', nameKey: 'language.zh', descKey: 'language.zhDesc' },
  { id: 'en', nameKey: 'language.en', descKey: 'language.enDesc' },
];

export default function Language() {
  const { c, isDark } = useTheme();
  const { t, languagePreference, setLanguagePreference } = useI18n();

  return (
    <Screen>
      <SubHeader title={t('language.title')} subtitle={t('language.subtitle')} />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {OPTIONS.map((opt) => {
          const selected = opt.id === languagePreference;
          return (
            <Pressable key={opt.id} onPress={() => setLanguagePreference(opt.id)}>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: c.card,
                    borderColor: selected ? brand.base : 'transparent',
                    borderWidth: 2,
                    shadowOpacity: selected ? 0.14 : isDark ? 0 : 0.05,
                    shadowColor: selected ? brand.deep : '#000',
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: c.text }]}>{t(opt.nameKey)}</Text>
                  <Text style={[styles.desc, { color: selected ? c.brandText : c.textFaint }]}>
                    {t(opt.descKey)}
                  </Text>
                </View>
                {selected && (
                  <View style={[styles.knob, { backgroundColor: brand.base }]}>
                    <CheckIcon />
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingTop: 20, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  name: { fontFamily: fonts.bodyBold, fontSize: 17 },
  desc: { fontFamily: fonts.bodyMedium, fontSize: 12.5, marginTop: 2 },
  knob: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
