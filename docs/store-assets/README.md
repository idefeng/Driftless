# Driftless 上架素材包

## 已生成文件

- Google Play 图标：`generated/google-play-icon-512.png`
- Google Play 英文横幅：`generated/feature-graphic-en-1024x500.png`
- 国内中文横幅：`generated/feature-graphic-zh-1024x500.png`
- 隐私政策 HTML：`privacy-policy.html`
- 原始首页截图：`screenshots/raw/01-home.png`
- 原始音色截图：`screenshots/raw/02-sounds.png`
- 原始共存设置截图：`screenshots/raw/03-coexist.png`
- 原始训练计划截图：`screenshots/raw/04-plan.png`
- 原始训练运行截图：`screenshots/raw/05-running.png`
- vivo 1080×1920 首页截图：`screenshots/vivo-1080x1920/01-home.png`
- vivo 1080×1920 音色截图：`screenshots/vivo-1080x1920/02-sounds.png`
- vivo 1080×1920 共存设置截图：`screenshots/vivo-1080x1920/03-coexist.png`
- vivo 1080×1920 训练计划截图：`screenshots/vivo-1080x1920/04-plan.png`
- vivo 1080×1920 训练运行截图：`screenshots/vivo-1080x1920/05-running.png`

## 截图规格

- 原始截图尺寸：1440 x 3168 PNG。
- vivo 截图尺寸：1080 x 1920 PNG。
- 用途：原始截图用于通用素材归档；`screenshots/vivo-1080x1920/` 用于 vivo 商店上传。
- 备注：当前截图为中文系统地区下的中文界面。若要做 Google Play 英文首发，建议后续把设备地区切到美国后再截一组英文截图。

## 安装包

- 当前 OTA 基线版本：`1.0.1`。
- 当前源码包名（`app.json`）：`com.idefeng.driftless`（2026-07-12 从 `com.fengqun.driftless` 改回；下方各安装包仍分别标注各自实际构建时的包名）。
- Google Play AAB：<https://expo.dev/artifacts/eas/JaHgsSRSxxtIzemm9y6OW4zekgtBDbrzEVbx7jdf2Ew.aab>（versionCode `3`，包名 `com.fengqun.driftless`）。
- vivo/国内渠道 APK：<https://expo.dev/artifacts/eas/v2IGNcYLqPsG6NxWGF3M-g1iRQlPs9-pMkJW2hkUKfA.apk>（versionCode `6`）。
- 本地 Google Play AAB：`../../dist/driftless-1.0.1-android-v3-com-fengqun-driftless-google-play.aab`。
- 上一版 `com.idefeng.driftless` Google Play AAB：<https://expo.dev/artifacts/eas/W4aR0acbrtnrOS8XigKVW_HWYDulTUuZmoxnOndVqCE.aab>（不适合当前新 Google Play 账号继续创建应用）。
- 历史 1.0.0 vivo/国内渠道 APK：`../../dist/driftless-1.0.0-android-v3-com-idefeng-driftless-vivo.apk`（未内置 OTA，不建议继续上传）。
- 历史 1.0.0 Google Play AAB：`../../dist/driftless-1.0.0-android-v2-com-idefeng-driftless.aab`（未内置 OTA，不建议继续上传）。
- 注意：不要上传旧的 `dist/driftless-1.0.0-android-v2.aab`、`dist/driftless-1.0.0-android-v3-vivo.apk` 或 `android/app/build/outputs/apk/release/app-release.apk`。
