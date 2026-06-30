import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Screen } from '../src/components/Screen';
import { SubHeader } from '../src/components/SubHeader';
import { CheckIcon, dot } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts, brand } from '../src/theme/tokens';
import { useCadence, SOUNDS, SoundId } from '../src/state/CadenceContext';
import { useI18n } from '../src/i18n/I18nContext';
import { getSoundDesc, getSoundName } from '../src/i18n/labels';

const ICON_BARS: Record<SoundId, number[]> = {
  beep: [10, 20, 14],
  woodfish: [14, 22, 11],
  click: [18, 9, 16],
};

export default function Sounds() {
  const { c, isDark } = useTheme();
  const { t } = useI18n();
  const { sound, setSound } = useCadence();

  return (
    <Screen>
      <SubHeader title={t('sound.title')} subtitle={t('sound.subtitle')} />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {SOUNDS.map((s) => {
          const selected = s.id === sound;
          return (
            <Pressable key={s.id} onPress={() => setSound(s.id)}>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: c.card,
                    borderColor: selected ? brand.base : 'transparent',
                    borderWidth: 2,
                    shadowOpacity: selected ? 0.16 : isDark ? 0 : 0.05,
                    shadowColor: selected ? brand.deep : '#000',
                  },
                ]}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: selected ? (isDark ? 'rgba(255,140,43,0.18)' : '#FFEAD6') : c.cardAlt },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                    {ICON_BARS[s.id].map((h, i) => (
                      <View
                        key={i}
                        style={{
                          width: 3.5,
                          height: h,
                          borderRadius: 2,
                          backgroundColor: selected ? (isDark ? brand.glow : brand.deep) : c.textFaint,
                        }}
                      />
                    ))}
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: c.text }]}>{getSoundName(t, s.id)}</Text>
                  <Text style={[styles.desc, { color: selected ? c.brandText : c.textFaint }]}>
                    {getSoundDesc(t, s.id)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.knob,
                    { backgroundColor: selected ? brand.base : c.cardAlt },
                  ]}
                >
                  {selected ? (
                    <CheckIcon />
                  ) : (
                    <View style={styles.playTri} />
                  )}
                </View>
              </View>
            </Pressable>
          );
        })}

        <View style={[styles.note, { backgroundColor: c.cardAlt }]}>
          <View style={{ marginTop: 5 }}>{dot(brand.base)}</View>
          <Text style={[styles.noteText, { color: c.textMuted }]}>
            {t('sound.note.beforeBold')}
            <Text style={{ color: c.text, fontFamily: fonts.bodyBold }}>{t('sound.note.bold')}</Text>
            {t('sound.note.afterBold')}
          </Text>
        </View>
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
    padding: 15,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontFamily: fonts.bodyBold, fontSize: 17 },
  desc: { fontFamily: fonts.bodyMedium, fontSize: 12.5, marginTop: 2 },
  knob: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  playTri: {
    marginLeft: 3,
    width: 0,
    height: 0,
    borderTopWidth: 7,
    borderBottomWidth: 7,
    borderLeftWidth: 11,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#8C8275',
  },
  note: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderRadius: 18,
    marginTop: 8,
  },
  noteText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 18 },
});
