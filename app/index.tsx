import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Screen } from '../src/components/Screen';
import { FootstepPulse } from '../src/components/FootstepPulse';
import { PlayPauseButton } from '../src/components/PlayPauseButton';
import { StepButton } from '../src/components/StepButton';
import { Wordmark } from '../src/components/Logo';
import { Chip, RoundIconButton, MenuIcon, SettingsIcon, ToolsIcon, MiniBars, dot } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts } from '../src/theme/tokens';
import { useCadence, SOUNDS } from '../src/state/CadenceContext';
import { useI18n } from '../src/i18n/I18nContext';
import { getSoundShortName } from '../src/i18n/labels';
import { getBpmThermalColor } from '../src/theme/thermalColor';
import { TapTempoModal } from '../src/components/TapTempoModal';
import { PaceCalculatorModal } from '../src/components/PaceCalculatorModal';
import { ToolsSheet, ToolId } from '../src/components/ToolsSheet';
import { useResponsive } from '../src/theme/layout';
import { MeasuredCadence } from '../src/components/MeasuredCadence';

// 播放中上下滑动调节步频：每滑过这么多像素 ±1。
const SWIPE_STEP_PX = 36;

export default function Home() {
  const { c, isDark } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { bpm, isPlaying, sound, coexist, plans, activePlanId, setActivePlanId, step, togglePlay, setSound, setCoexist } =
    useCadence();

  const [showTapTempo, setShowTapTempo] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showTools, setShowTools] = useState(false);

  const thermal = getBpmThermalColor(bpm, isDark);
  // 大屏且高度充足（折叠屏展开竖持 / 平板）时放大主数字与节拍脚印；横持高度不足时保持手机尺寸。
  const { isLarge, height } = useResponsive();
  const roomy = isLarge && height >= 800;
  const bpmSize = roomy ? 176 : 138;

  // 播放 = 跑步模式：收起设置项，放大步频数字，整块中心区域可上下滑动 ±1。
  // 暂停 = 准备模式：展示音效 / 共存 / 计划等完整设置。
  const bpmScale = useSharedValue(1);
  useEffect(() => {
    bpmScale.value = withTiming(isPlaying ? 1.16 : 1, { duration: 280 });
  }, [isPlaying, bpmScale]);
  const bpmStyle = useAnimatedStyle(() => ({ transform: [{ scale: bpmScale.value }] }));

  const stepRef = useRef(step);
  stepRef.current = step;
  const swipeEnabled = useRef(isPlaying);
  swipeEnabled.current = isPlaying;
  const swipe = useMemo(() => {
    let applied = 0;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        swipeEnabled.current && Math.abs(g.dy) > 12 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderGrant: () => {
        applied = 0;
      },
      onPanResponderMove: (_, g) => {
        // 上滑为正：随手指滑动距离连续步进
        const target = Math.trunc(-g.dy / SWIPE_STEP_PX);
        while (applied < target) {
          stepRef.current(1);
          applied++;
        }
        while (applied > target) {
          stepRef.current(-1);
          applied--;
        }
      },
    });
  }, []);

  const pickTool = (tool: ToolId) => {
    setShowTools(false);
    // 等抽屉收起后再弹出工具弹窗，避免两个 Modal 同时过渡
    setTimeout(() => (tool === 'tapTempo' ? setShowTapTempo(true) : setShowCalculator(true)), 250);
  };

  const cycleSound = () => {
    const i = SOUNDS.findIndex((s) => s.id === sound);
    setSound(SOUNDS[(i + 1) % SOUNDS.length].id);
  };

  const toggleCoexist = () => setCoexist(coexist === 'mix' ? 'exclusive' : 'mix');

  const activePlan = plans.find((p) => p.id === activePlanId) ?? plans[0];
  const cyclePlan = () => {
    // 只有一个计划时「切换」没有任何效果，看起来像点不动：直接进计划列表（可新建 / 从模板新建）。
    if (plans.length <= 1) {
      router.push('/plan-list');
      return;
    }
    const i = plans.findIndex((p) => p.id === activePlanId);
    setActivePlanId(plans[(i + 1) % plans.length].id);
  };

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <Wordmark size={17} />
        <View style={styles.headerActions}>
          {!isPlaying && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
              <RoundIconButton onPress={() => setShowTools(true)} label={t('a11y.tools')}>
                <ToolsIcon />
              </RoundIconButton>
            </Animated.View>
          )}
          <RoundIconButton onPress={() => router.push('/settings')} label={t('a11y.settings')}>
            <SettingsIcon />
          </RoundIconButton>
        </View>
      </View>

      {/* Center: BPM + thermal badge + beat + chips + play */}
      <View
        style={styles.center}
        {...swipe.panHandlers}
      >
        <Animated.View layout={LinearTransition.duration(280)} style={styles.kickerRow}>
          <Text style={[styles.kicker, { color: c.textFaint }]}>{t('home.currentCadence')}</Text>
          <View style={[styles.thermalBadge, { backgroundColor: thermal.chipBg }]}>
            <Text style={[styles.thermalText, { color: thermal.text }]}>{t(thermal.labelKey)}</Text>
          </View>
        </Animated.View>

        <Animated.Text
          layout={LinearTransition.duration(280)}
          style={[
            styles.bpm,
            { color: c.textStrong, fontSize: bpmSize, lineHeight: bpmSize * 0.92, letterSpacing: -bpmSize * 0.045 },
            bpmStyle,
          ]}
          accessibilityRole="adjustable"
          accessibilityLabel={t('home.currentCadence')}
          accessibilityValue={{ text: String(bpm) }}
          accessibilityHint={isPlaying ? t('a11y.swipeArea') : undefined}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        >
          {bpm}
        </Animated.Text>

        <Animated.View layout={LinearTransition.duration(280)} style={{ marginTop: isPlaying ? 30 : 18 }}>
          <FootstepPulse color={thermal.base} glowColor={thermal.glow} size={roomy ? 64 : 50} running={isPlaying} />
        </Animated.View>

        {isPlaying ? (
          <Animated.View
            key="swipe-hint"
            entering={FadeIn.duration(240).delay(120)}
            exiting={FadeOut.duration(120)}
            style={styles.playingInfo}
          >
            <MeasuredCadence target={bpm} />
            <Text style={[styles.swipeHint, { color: c.textFaint }]}>{t('home.swipeHint')}</Text>
          </Animated.View>
        ) : (
          <Animated.View
            key="chips"
            entering={FadeIn.duration(240)}
            exiting={FadeOut.duration(140)}
            style={styles.chips}
          >
            <Pressable
              onPress={cycleSound}
              onLongPress={() => router.push('/sounds')}
              delayLongPress={300}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.soundChip', { sound: getSoundShortName(t, sound) })}
            >
              <Chip style={styles.compactChip}>
                <MiniBars color={c.textFaint} heights={[6, 13, 9]} />
                <Text style={[styles.chipText, { color: c.text }]}>{getSoundShortName(t, sound)}</Text>
              </Chip>
            </Pressable>
            <Pressable
              onPress={toggleCoexist}
              onLongPress={() => router.push('/coexist')}
              delayLongPress={300}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.coexistChip', {
                mode: coexist === 'mix' ? t('home.coexistMix') : t('home.coexistExclusive'),
              })}
            >
              <Chip accent style={styles.compactChip}>
                {dot(thermal.base)}
                <Text style={[styles.chipText, { color: c.brandText }]}>
                  {coexist === 'mix' ? t('home.coexistMix') : t('home.coexistExclusive')}
                </Text>
              </Chip>
            </Pressable>
            <Pressable
              onPress={cyclePlan}
              onLongPress={() => router.push('/plan')}
              delayLongPress={300}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.planChip', { name: activePlan.name })}
            >
              <Chip style={styles.compactChip}>
                <MenuIcon />
                <Text style={[styles.chipText, styles.planChipText, { color: c.text }]} numberOfLines={1}>
                  {activePlan.name}
                </Text>
              </Chip>
            </Pressable>
          </Animated.View>
        )}

        <Animated.View layout={LinearTransition.duration(280)} style={{ marginTop: 20 }}>
          <PlayPauseButton playing={isPlaying} onPress={togglePlay} />
        </Animated.View>
      </View>

      {/* Bottom: 1/4-screen blind-op ±1 buttons */}
      <View style={styles.steps}>
        <StepButton sign="−" label={t('home.slowDown')} onStep={() => step(-1)} />
        <StepButton sign="+" label={t('home.speedUp')} onStep={() => step(1)} />
      </View>

      {/* Modals */}
      <ToolsSheet visible={showTools} onClose={() => setShowTools(false)} onPick={pickTool} />
      <TapTempoModal visible={showTapTempo} onClose={() => setShowTapTempo(false)} />
      <PaceCalculatorModal visible={showCalculator} onClose={() => setShowCalculator(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 6,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  center: {
    flex: 1,
    // 滑动调节时不触发文字选择（Web 预览）
    userSelect: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  thermalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  thermalText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
  },
  bpm: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 138,
    lineHeight: 138 * 0.92,
    letterSpacing: -6,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  chips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
    marginTop: 20,
  },
  compactChip: {
    paddingHorizontal: 12,
    gap: 6,
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
  },
  planChipText: {
    maxWidth: 72,
  },
  playingInfo: {
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  swipeHint: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  steps: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
  },
});
