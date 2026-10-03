# Driftless 上架素材包（1.1.0 · 品牌视觉 v2：黑底 + 荧光运动绿）

## 文件一览

| 用途 | 文件 | 规格 |
|---|---|---|
| Google Play 应用图标 | `generated/google-play-icon-512.png` | 512×512 PNG（Play 自动加圆角遮罩，图内勿自带圆角） |
| Google Play 置顶大图（英文） | `generated/feature-graphic-en-1024x500.png` | 1024×500 PNG |
| 置顶大图 / 国内商店横幅（中文） | `generated/feature-graphic-zh-1024x500.png` | 1024×500 PNG |
| 商店截图（中文） | `screenshots/store-1080x1920/zh/01…06-*.png` | 1080×1920（9:16），Google Play 与 vivo 等国内商店通用 |
| 商店截图（英文） | `screenshots/store-1080x1920/en/01…06-*.png` | 同上 |
| 原始真机截图 | `screenshots/raw/{zh,en}/*.png` | 1080×2520（Galaxy Z Fold7 外屏），仅归档 |
| 商店文案 | `store-listing-copy.md` | 中英文标题、简介、关键词、1.1.0 更新说明 |
| 隐私政策 | `privacy-policy.html` | — |

## 截图顺序与卖点

| # | 文件 | 中文标题 | English |
|---|---|---|---|
| 1 | `01-one-beat-one-step` | 一拍一步 · 稳住步频 | One beat. One step. |
| 2 | `02-intervals` | 间歇训练 · 自动换段 | Intervals that shift for you |
| 3 | `03-plans` | 自定义 · 训练计划 | Build your own workout |
| 4 | `04-music` | 边听音乐 · 边跑节拍 | Keep your music playing |
| 5 | `05-sounds` | 5 种音色 · + 重音拍 | 5 sounds + accent beats |
| 6 | `06-blind-control` | 大按钮 · 盲操 ±1 | Big buttons. Blind ±1. |

## 说明

- 原始截图长宽比 2.33，超过 Google Play「长边 ≤ 短边 2 倍」的限制，**不要直接上传 `raw/`**；上传 `store-1080x1920/` 下的合成图。
- 合成图已裁掉状态栏与系统导航条，画面中不含个人通知信息。
- 截图来自 1.1.0 开发构建，计划名 / 阶段名在中文组为默认的「计划 1 / 热身 / 巡航 / 冲刺」，英文组为「Tempo / Warm-up / Cruise / Sprint」。
- 如需平板截图（Play 的 7 / 10 英寸栏位，可选），可在 Fold7 展开内屏（1968×2184）后另截一组。

## 安装包

- 当前版本：`1.1.0`（versionCode 10），EAS 构建 `765fdfdf-4ef7-4ecb-9d51-c11cdfec8f27`，使用 2026-08 重置后的 Play 上传密钥签名。
- EAS 尚未关联 Play Console 服务账号，AAB 需在 Play Console 手动上传。
- 历史 1.0.x 安装包（橙色旧版视觉）不建议再上传。
