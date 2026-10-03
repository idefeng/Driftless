import React, { useCallback, useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { useI18n } from '../i18n/I18nContext';
import { logger } from '../utils/logger';
import { prepareOtaUpdate, reloadOtaUpdate, type PrepareOtaResult } from './otaUpdate';
import { CadenceAudio } from '../../modules/cadence-audio';
import { CadenceLive } from '../../modules/cadence-live';

const OTA_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const OTA_CHECK_FAILURE_BACKOFF_MS = 5 * 60 * 1000;

export function OtaUpdateGate() {
  const { t } = useI18n();
  const checkingRef = useRef(false);
  const promptVisibleRef = useRef(false);
  const dismissedRef = useRef(false);
  const reloadingRef = useRef(false);
  const lastCheckAtRef = useRef(0);

  // Hook into Expo Updates state changes (detects background downloaded updates)
  const { isUpdatePending } = Updates.useUpdates();

  const handleReload = useCallback(async () => {
    if (reloadingRef.current) return;
    reloadingRef.current = true;

    try {
      // 在 reloadAsync 重置 React 引擎前，先关停 Native 音频与 Live Notifications，
      // 避免 JNI 回调解绑抛出致命异常导致 Expo 打上崩溃标记并回滚至 Embedded 初始包。
      CadenceAudio.stop();
      CadenceLive.stop();
    } catch {
      // ignore
    }

    // 给予 Native 线程 100ms 资源解绑缓冲区
    setTimeout(() => {
      void reloadOtaUpdate(Updates, logger);
    }, 100);
  }, []);

  const promptForReload = useCallback(() => {
    if (promptVisibleRef.current || dismissedRef.current || reloadingRef.current) return;
    promptVisibleRef.current = true;

    Alert.alert(t('update.readyTitle'), t('update.readyMessage'), [
      {
        text: t('update.later'),
        style: 'cancel',
        onPress: () => {
          promptVisibleRef.current = false;
          dismissedRef.current = true;
        },
      },
      {
        text: t('update.restart'),
        onPress: () => {
          promptVisibleRef.current = false;
          void handleReload();
        },
      },
    ]);
  }, [t, handleReload]);

  // When an update is downloaded in background by native Expo (ON_LOAD) or JS fetch, prompt for reload
  useEffect(() => {
    if (isUpdatePending && !__DEV__ && Updates.isEnabled && !dismissedRef.current) {
      promptForReload();
    }
  }, [isUpdatePending, promptForReload]);

  const checkForUpdates = useCallback(
    async (force = false) => {
      if (__DEV__ || !Updates.isEnabled || checkingRef.current || promptVisibleRef.current || dismissedRef.current) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastCheckAtRef.current < OTA_CHECK_INTERVAL_MS) {
        return;
      }

      checkingRef.current = true;

      let result: PrepareOtaResult;
      try {
        result = await prepareOtaUpdate(Updates, logger);
      } finally {
        checkingRef.current = false;
      }

      if (result.status === 'error') {
        lastCheckAtRef.current = now - OTA_CHECK_INTERVAL_MS + OTA_CHECK_FAILURE_BACKOFF_MS;
        return;
      }

      lastCheckAtRef.current = now;

      if (result.status === 'ready') {
        promptForReload();
      }
    },
    [promptForReload],
  );

  const runCheck = useCallback(
    (force = false) => {
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
