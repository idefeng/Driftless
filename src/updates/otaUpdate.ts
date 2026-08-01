import type { AppLogger } from '../utils/logger';

export type OtaClient = {
  isEnabled?: boolean;
  checkForUpdateAsync: () => Promise<{ isAvailable: boolean }>;
  fetchUpdateAsync: () => Promise<unknown>;
  reloadAsync: () => Promise<void>;
};

export type PrepareOtaResult =
  | { status: 'disabled' }
  | { status: 'not-available' }
  | { status: 'ready' }
  | { status: 'error'; error: unknown };

export type ReloadOtaResult = { status: 'reloaded' } | { status: 'error'; error: unknown };

export async function prepareOtaUpdate(client: OtaClient, log: Pick<AppLogger, 'error'>): Promise<PrepareOtaResult> {
  if (client.isEnabled === false) {
    return { status: 'disabled' };
  }

  try {
    // OTA 下载和重启拆开，避免在用户训练过程中强制刷新 App。
    const update = await client.checkForUpdateAsync();
    if (!update.isAvailable) {
      return { status: 'not-available' };
    }

    await client.fetchUpdateAsync();
    return { status: 'ready' };
  } catch (error) {
    log.error('OTA 更新检查失败，请稍后重试。', error);
    return { status: 'error', error };
  }
}

export async function reloadOtaUpdate(client: Pick<OtaClient, 'reloadAsync'>, log: Pick<AppLogger, 'error'>): Promise<ReloadOtaResult> {
  try {
    await client.reloadAsync();
    return { status: 'reloaded' };
  } catch (error) {
    log.error('OTA 更新重启失败，请手动重启 App。', error);
    return { status: 'error', error };
  }
}
