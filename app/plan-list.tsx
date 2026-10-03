import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { SubHeader } from '../src/components/SubHeader';
import { CheckIcon } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts, brand } from '../src/theme/tokens';
import { useCadence, formatClock, TrainingPlan } from '../src/state/CadenceContext';
import { useI18n } from '../src/i18n/I18nContext';
import { PlanShareModal } from '../src/components/PlanShareModal';
import { PlanImportModal } from '../src/components/PlanImportModal';

function summarize(plan: TrainingPlan) {
  const totalSec = plan.phases.reduce((a, p) => a + p.durationSec, 0);
  const avg = Math.round(plan.phases.reduce((a, p) => a + p.bpm * p.durationSec, 0) / (totalSec || 1));
  return { count: plan.phases.length, totalSec, avg };
}

export default function PlanList() {
  const { c, isDark } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const { plans, activePlanId, setActivePlanId, createPlan, deletePlan } = useCadence();

  const [sharePlan, setSharePlan] = useState<TrainingPlan | null>(null);
  const [importVisible, setImportVisible] = useState(false);

  const openPlan = (id: string) => {
    setActivePlanId(id);
    router.push('/plan');
  };

  const onCreate = () => {
    createPlan();
    router.push('/plan');
  };

  const confirmDelete = (p: TrainingPlan) => {
    Alert.alert(t('planList.deleteTitle'), t('planList.deleteMessage', { name: p.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => deletePlan(p.id) },
    ]);
  };

  return (
    <Screen>
      <SubHeader title={t('planList.title')} subtitle={t('planList.subtitle')} />

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {/* Actions bar: Import plan offline */}
        <View style={styles.topActions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: c.chipAccent }]}
            onPress={() => setImportVisible(true)}
          >
            <Text style={[styles.actionBtnText, { color: c.brandText }]}>
              {language === 'zh' ? '📥 离线导入 JSON' : '📥 Import JSON'}
            </Text>
          </Pressable>
        </View>

        {plans.map((p) => {
          const selected = p.id === activePlanId;
          const { count, totalSec, avg } = summarize(p);
          return (
            <Pressable
              key={p.id}
              onPress={() => openPlan(p.id)}
              onLongPress={() => confirmDelete(p)}
              delayLongPress={400}
              accessibilityRole="button"
              accessibilityLabel={p.name}
            >
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
                  <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={[styles.summary, { color: selected ? c.brandText : c.textFaint }]}>
                    {t('planList.summary', { count, duration: formatClock(totalSec), avg })}
                  </Text>
                </View>

                {/* Share QR Code Button */}
                <Pressable
                  style={[styles.shareBtn, { backgroundColor: c.cardAlt }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSharePlan(p);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.shareIcon}>QR</Text>
                </Pressable>

                {selected && (
                  <View style={[styles.knob, { backgroundColor: brand.base }]}>
                    <CheckIcon />
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        <Pressable
          onPress={onCreate}
          accessibilityRole="button"
          accessibilityLabel={t('planList.newPlan')}
          style={({ pressed }) => [
            styles.addPlan,
            { borderColor: isDark ? '#3A3328' : '#D8D1C6', opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: c.textFaint }}>{t('planList.newPlan')}</Text>
        </Pressable>

        {plans.length > 1 && (
          <Text style={[styles.deleteHint, { color: c.textFaint }]}>{t('planList.deleteHint')}</Text>
        )}
      </ScrollView>

      {/* Share QR Code Modal */}
      <PlanShareModal
        plan={sharePlan}
        visible={!!sharePlan}
        onClose={() => setSharePlan(null)}
      />

      {/* Import Plan Modal */}
      <PlanImportModal
        visible={importVisible}
        onClose={() => setImportVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingTop: 14, gap: 12 },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  actionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 22,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  name: { fontFamily: fonts.bodyBold, fontSize: 17 },
  summary: { fontFamily: fonts.bodyMedium, fontSize: 12.5, marginTop: 2 },
  shareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareIcon: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: '#FF8C2B',
  },
  knob: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  addPlan: {
    marginTop: 2,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  deleteHint: { fontFamily: fonts.bodyMedium, fontSize: 12, textAlign: 'center', marginTop: 10 },
});
