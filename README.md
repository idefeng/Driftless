# Driftless

零漂移步频节拍器 · 高精度跑步步频辅助工具（Run Cadence Metronome）。

Local-First 移动 App，主色 **阳光橙 `#FF8C2B`**。本仓库当前实现了依据
[`docs/Driftless_PRD_v1.6.md`](docs/Driftless_PRD_v1.6.md) 与 Cloud Design 原型
（`Driftless.dc.html`）的**完整 App UI**，iOS / Android 双平台、明暗两套主题。

## 技术栈

- **Expo SDK 56** + React Native 0.85（New Architecture）
- **expo-router**（文件式路由）
- **expo-localization**（按系统地区自动选择中文 / 英文）
- **expo-updates / EAS Update**（JS 与资源 OTA 发布）
- **react-native-reanimated 4**（签名脉冲波形 / 播放环动效）
- **Sora**（标题 / 数字）+ **Manrope**（正文），经 `@expo-google-fonts`
- 包管理器：**pnpm**

## 运行

```bash
pnpm install        # 安装依赖
pnpm start          # 启动 dev server（按 i / a 打开 iOS / Android）
pnpm ios            # iOS 模拟器
pnpm android        # Android 模拟器
pnpm web            # 浏览器预览
```

## 目录结构

```
app/                     expo-router 路由（每个文件 = 一个界面）
  _layout.tsx            根布局：字体加载 + 主题 / 状态 Provider + Stack
  index.tsx              01 主界面（大 BPM、1/4 屏 ±1 盲操、共存）
  sounds.tsx             节拍音效选择
  coexist.tsx            音频共存设置（混音/独占、独立节拍音量、Ducking、常亮）
  plan.tsx               结构化训练流编辑（无缝换算）
  running.tsx            训练运行中（阶段进度、剩余时长、−1/▶/+1）
src/
  i18n/                  地区检测 + 中英文翻译字典（CN/HK/MO/TW => 中文，其它英文）
  theme/                 设计 Token（明暗调色板）+ ThemeContext
  state/CadenceContext   全局状态：BPM、播放、音效、共存、训练会话
  audio/CadenceScheduler 纯 JS 前瞻调度器 — 仅作 Expo Go 下的可视化兜底
  updates/               OTA 检查、下载、重启提示与单元测试
  components/            BeatBars / PlayPauseButton / StepButton / Logo / ...
modules/cadence-audio/   本地原生模块：高精度音频引擎（见下）
  ios/CadenceAudioModule.swift     AVAudioEngine 实现
  android/.../CadenceAudioModule.kt AudioTrack 实现
  src/CadenceAudioModule.web.ts    WebAudio 实现（浏览器可发声）
assets/
  icon.png                App 主图标
  android-icon-*.png      Android adaptive icon 资源
  splash-icon*.png        明暗模式品牌启动屏
```

## 高精度音频引擎（`modules/cadence-audio`）

PRD §3.1 的核心：**短采样前瞻调度（look-ahead）**，按采样时钟绝对定位每一拍，
计时以「样本数」累计 → **零累积漂移、亚样本级抖动**。三平台同构实现：

- **iOS** — `AVAudioEngine` + `AVAudioSourceNode`。在音频渲染回调里按
  `samplesUntilNextBeat` 精确把短采样写入输出缓冲；会话用
  `.playback + .mixWithOthers`（共存，PRD §3.2），并处理来电中断（§4.1）。
- **Android** — `AudioTrack`（`ENCODING_PCM_FLOAT`，流式）+ 高优先级渲染线程，
  同一套样本偏移算法；`USAGE_MEDIA` 走媒体音量通道。共存模式默认不申请音频焦点，
  独占模式申请 `AUDIOFOCUS_GAIN` 暂停其它 App，开启 Ducking 时申请
  `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`。
- **Web** — `AudioContext` 前瞻调度（浏览器预览即可听到节拍）。

三种音效（电子嘀声 / 木鱼 / 标准节拍器）在原生代码里**程序化合成**：短（<80ms）、
首尾零静音、已归一化。BPM 变更在下一拍边界生效（「自然收尾，立即换算」§3.4）。

引擎经 `src/state/CadenceContext.tsx` 接入：原生 / Web 可用时走真实发声，
Expo Go（无原生模块）下回退到纯 JS 调度器（只动画、不发声）。

## 多语种

App 使用 `expo-localization` 读取设备系统地区，不使用 GPS / IP / 定位权限。
当前规则为：`CN`、`HK`、`MO`、`TW` 显示中文；其它地区显示英文。
如果系统没有返回地区，但语言是中文，则兜底显示中文。

文案集中在 `src/i18n/resources.ts`，页面通过 `useI18n()` 的 `t(key, params)`
读取。训练阶段名仍可由用户编辑，默认阶段名和新增阶段名按当前语言生成。

## OTA 更新

Driftless 使用 `expo-updates` + EAS Update。`app.json` 中的
`runtimeVersion.policy` 为 `appVersion`，当前 `1.0.1` 原生包只接收同一
runtime 的 JS / 资源更新。启动后和回到前台时，App 会检查 OTA；更新下载完成后
提示用户重启，避免训练中被强制刷新。

发布前先跑：

```bash
pnpm run test
pnpm run lint
```

发布命令：

```bash
pnpm run ota:preview -- --message "说明本次预览更新"
CI=1 pnpm run ota:prod -- --message "说明本次生产更新"
```

以下变更不能只发 OTA，必须重新走 EAS 构建 / 商店包：原生模块、权限、包名、
启动图、图标、`app.json` 原生配置、SDK / React Native 版本、Android 前台服务
或 iOS Live Activities 相关原生代码。

### 在真机 / 模拟器上运行（听到声音）

原生模块**不能在 Expo Go 中运行**，需 development build：

```bash
brew install cocoapods      # iOS 首次需要
pnpm exec expo run:ios      # 或 pnpm exec expo run:android
```

> 本仓库已 `expo prebuild` 生成 `ios/` 与 `android/`（已 gitignore，可随时
> `pnpm exec expo prebuild --clean` 重新生成）。

## 验证状态

- ✅ 全量 TypeScript 通过（`tsc --noEmit`）
- ✅ 多语种与 OTA 服务层单元测试通过（`pnpm run test`）
- ✅ Expo 自动链接在 iOS / Android 均识别到原生模块（`expo-modules-autolinking resolve`）
- ✅ `expo prebuild` 双平台生成无误
- ✅ Web 构建导出，WebAudio 引擎真实按 `AudioContext.currentTime` 排入节拍、零运行时报错
- ✅ Android debug build 已在 USB 真机上完成构建、安装与启动验证
- ⚠️ iOS 原生编译仍需配置 Apple Team ID 后再验证

## 仍待接入（需各自的原生工作）

Live Activities / 灵动岛、Android 前台服务常驻通知、屏幕常亮（expo-keep-awake）、
物理音量键映射 —— 这些系统能力同样需在 development build 中以原生 / config plugin 落地。
