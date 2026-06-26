import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Screen } from '../src/components/Screen';
import { SubHeader } from '../src/components/SubHeader';
import { Toggle } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts, brand } from '../src/theme/tokens';
import { useCadence, CoexistMode } from '../src/state/CadenceContext';

const MUSIC_BARS = [8, 16, 11, 19, 7, 14, 20, 10, 16, 8, 13, 18];

export default function Coexist() {
  const { c, isDark } = useTheme();
  const { coexist, setCoexist, beatVolume, setBeatVolume, ducking, setDucking, keepAwake, setKeepAwake } =
    useCadence();

  const seg = (mode: CoexistMode, label: string) => {
    const active = coexist === mode;
    return (
      <Pressable style={{ flex: 1 }} onPress={() => setCoexist(mode)}>
        <View
          style={[
            styles.seg,
            active && {
              backgroundColor: c.card,
              shadowOpacity: isDark ? 0 : 0.08,
            },
          ]}
        >
          <Text
            style={{
              fontFamily: active ? fonts.bodyBold : fonts.bodySemiBold,
              fontSize: 14,
              color: active ? c.text : c.textFaint,
            }}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    );
  };

  const volPct = Math.round(beatVolume * 100);
  const isMix = coexist === 'mix';

  return (
    <Screen>
      <SubHeader title="音频共存" />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* mode switch */}
        <View style={[styles.segTrack, { backgroundColor: c.trackInactive }]}>
          {seg('mix', '共存（混音）')}
          {seg('exclusive', '独占')}
        </View>

        {/* layering visualization */}
        <View style={[styles.card, { backgroundColor: c.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
          <View style={styles.vizRow}>
            <Text style={[styles.vizLabel, { color: c.textFaint }]}>
              音乐 / 播客{isMix ? '' : ' · 已暂停'}
            </Text>
            <View style={[styles.vizBars, !isMix && { opacity: 0.3 }]}>
              {MUSIC_BARS.map((h, i) => (
                <View
                  key={i}
                  style={{ width: 3, height: h, borderRadius: 2, backgroundColor: isDark ? '#4A4337' : '#CFC8BD' }}
                />
              ))}
            </View>
          </View>
          <View style={[styles.vizRow, { marginTop: 0 }]}>
            <Text style={[styles.vizLabel, { color: c.brandText, fontFamily: fonts.bodyBold }]}>Driftless</Text>
            <View style={[styles.vizBars, { justifyContent: 'space-between' }]}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: brand.base }} />
              ))}
            </View>
          </View>
          {isMix ? (
            <Text style={[styles.cardNote, { color: c.textFaint }]}>
              节拍声<Text style={{ color: c.textMuted, fontFamily: fonts.bodyBold }}>叠加</Text>在你正在听的音乐之上，
              <Text style={{ color: c.textMuted, fontFamily: fonts.bodyBold }}>绝不打断、绝不暂停</Text>其它 App。
            </Text>
          ) : (
            <Text style={[styles.cardNote, { color: c.textFaint }]}>
              开始播放时<Text style={{ color: c.textMuted, fontFamily: fonts.bodyBold }}>暂停其它 App</Text> 的音乐 / 播客，
              <Text style={{ color: c.textMuted, fontFamily: fonts.bodyBold }}>只播放节拍声</Text>；切回共存即可恢复叠加。
            </Text>
          )}
        </View>

        {/* settings group */}
        <View style={[styles.group, { backgroundColor: c.card, shadowOpacity: isDark ? 0 : 0.05 }]}>
          {/* beat volume */}
          <View style={[styles.groupRow, { borderBottomColor: c.divider, borderBottomWidth: 1 }]}>
            <View style={styles.rowHead}>
              <Text style={[styles.rowTitle, { color: c.text }]}>节拍音量（独立于媒体）</Text>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: c.brandText }}>{volPct}%</Text>
            </View>
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderBg, { backgroundColor: c.trackInactive }]}>
                <View style={[styles.sliderFill, { width: `${volPct}%`, backgroundColor: brand.base }]} />
                <View style={[styles.sliderKnob, { left: `${volPct}%` }]} />
              </View>
            </View>
            <View style={styles.volBtns}>
              <Pressable onPress={() => setBeatVolume(Math.max(0, beatVolume - 0.05))} style={[styles.volBtn, { borderColor: c.divider }]}>
                <Text style={{ color: c.textMuted, fontFamily: fonts.bodyBold }}>−</Text>
              </Pressable>
              <Pressable onPress={() => setBeatVolume(Math.min(1, beatVolume + 0.05))} style={[styles.volBtn, { borderColor: c.divider }]}>
                <Text style={{ color: c.textMuted, fontFamily: fonts.bodyBold }}>＋</Text>
              </Pressable>
            </View>
          </View>

          {/* ducking */}
          <View style={[styles.groupRow, styles.toggleRow, { borderBottomColor: c.divider, borderBottomWidth: 1 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: c.text }]}>轻压背景音 Ducking</Text>
              <Text style={[styles.rowSub, { color: c.textFaint }]}>默认关闭，避免全程压低音乐</Text>
            </View>
            <Toggle value={ducking} onChange={setDucking} />
          </View>

          {/* keep awake */}
          <View style={[styles.groupRow, styles.toggleRow]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: c.text }]}>屏幕常亮</Text>
              <Text style={[styles.rowSub, { color: c.textFaint }]}>夜跑 / 强光下随时看清步频</Text>
            </View>
            <Toggle value={keepAwake} onChange={setKeepAwake} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segTrack: {
    flexDirection: 'row',
    gap: 8,
    padding: 5,
    borderRadius: 16,
    marginTop: 4,
  },
  seg: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  card: {
    padding: 18,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  vizRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  vizLabel: { width: 80, fontFamily: fonts.bodySemiBold, fontSize: 13 },
  vizBars: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 22 },
  cardNote: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 18, marginTop: 14 },
  group: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  groupRow: { paddingHorizontal: 16, paddingVertical: 15 },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15.5 },
  rowSub: { fontFamily: fonts.bodyMedium, fontSize: 11.5, marginTop: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  sliderTrack: { marginTop: 11 },
  sliderBg: { height: 6, borderRadius: 100, justifyContent: 'center' },
  sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 100 },
  sliderKnob: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  volBtns: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' },
  volBtn: {
    width: 40,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
