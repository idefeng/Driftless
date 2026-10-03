import { useEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { logger } from '../utils/logger';

/**
 * 大屏适配（折叠屏内屏 / 平板）。以窗口短边判断：≥ 600dp 视为大屏
 * （Android 的 sw600dp 断点，Galaxy Z Fold 展开内屏约 750×830dp）。
 */
export const LARGE_SCREEN_MIN_DP = 600;
/** 大屏上内容列的最大宽度：居中显示，避免卡片 / 按钮被拉成整屏宽。 */
export const CONTENT_MAX_WIDTH = 640;

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isLarge = Math.min(width, height) >= LARGE_SCREEN_MIN_DP;
  return { width, height, isLarge, isLandscape: width > height };
}

/**
 * 屏幕方向策略：manifest 不再锁定竖屏（Play 大屏质量要求），改为运行时决定——
 * 手机 / 折叠屏外屏锁竖屏（首页布局按竖屏设计），大屏放开旋转。
 * 折叠 / 展开会改变窗口尺寸，策略随之实时切换。
 */
export function useOrientationPolicy() {
  const { isLarge } = useResponsive();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const apply = isLarge
      ? ScreenOrientation.unlockAsync()
      : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    apply.catch((error) => logger.warn('屏幕方向设置失败。', error));
  }, [isLarge]);
}
