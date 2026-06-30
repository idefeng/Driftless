import React, { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { useI18n } from '../i18n/I18nContext';
import { logger } from '../utils/logger';
import { prepareOtaUpdate, reloadOtaUpdate } from './otaUpdate';

const OTA_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function OtaUpdateGate() {
  const { t } = useI18n();
  const checkingRef = useRef(false);
  const promptVisibleRef = useRef(false);
  const lastCheckAtRef = useRef(0);

  const checkForUpdates = useCallback(
    async (force = false) => {
      if (__DEV__ || !Updates.isEnabled || checkingRef.current || promptVisibleRef.current) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastCheckAtRef.current < OTA_CHECK_INTERVAL_MS) {
        return;
      }

      checkingRef.current = true;
      lastCheckAtRef.current = now;

      const result = await prepareOtaUpdate(Updates, logger);
      checkingRef.current = false;

      if (result.status !== 'ready') {
        return;
      }

      promptVisibleRef.current = true;
      Alert.alert(t('update.readyTitle'), t('update.readyMessage'), [
        {
          text: t('update.later'),
          style: 'cancel',
          onPress: () => {
            promptVisibleRef.current = false;
          },
        },
        {
          text: t('update.restart'),
          onPress: () => {
            promptVisibleRef.current = false;
            void reloadOtaUpdate(Updates, logger);
          },
        },
      ]);
    },
    [t],
  );

  const runCheck = useCallback(
    (force = false) => {
      // AppState 回调不能直接 await，这里集中兜底记录异步异常。
      void checkForUpdates(force).catch((error) => {
        logger.error('OTA 前台检查流程失败。', error);
      });
    },
    [checkForUpdates],
  );

  useEffect(() => {
    runCheck(true);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        runCheck();
      }
    });

    return () => subscription.remove();
  }, [runCheck]);

  return null;
}
