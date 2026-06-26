# Driftless

零漂移步频节拍器 · 高精度跑步步频辅助工具（Run Cadence Metronome）。

Local-First 移动 App，主色 **阳光橙 `#FF8C2B`**。本仓库当前实现了依据
[`docs/Driftless_PRD_v1.6.md`](docs/Driftless_PRD_v1.6.md) 与 Cloud Design 原型
（`Driftless.dc.html`）的**完整 App UI**，iOS / Android 双平台、明暗两套主题。

## 技术栈

- **Expo SDK 56** + React Native 0.85（New Architecture）
- **expo-router**（文件式路由）
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
  theme/                 设计 Token（明暗调色板）+ ThemeContext
  state/CadenceContext   全局状态：BPM、播放、音效、共存、训练会话
  audio/CadenceScheduler 纯 JS 前瞻调度器 — 仅作 Expo Go 下的可视化兜底
  components/            BeatBars / PlayPauseButton / StepButton / Logo / ...
modules/cadence-audio/   本地原生模块：高精度音频引擎（见下）
  ios/CadenceAudioModule.swift     AVAudioEngine 实现
  android/.../CadenceAudioModule.kt AudioTrack 实现
  src/CadenceAudioModule.web.ts    WebAudio 实现（浏览器可发声）
```

## 高精度音频引擎（`modules/cadence-audio`）

PRD §3.1 的核心：**短采样前瞻调度（look-ahead）**，按采样时钟绝对定位每一拍，
计时以「样本数」累计 → **零累积漂移、亚样本级抖动**。三平台同构实现：

- **iOS** — `AVAudioEngine` + `AVAudioSourceNode`。在音频渲染回调里按
  `samplesUntilNextBeat` 精确把短采样写入输出缓冲；会话用
  `.playback + .mixWithOthers`（共存，PRD §3.2），并处理来电中断（§4.1）。
- **Android** — `AudioTrack`（`ENCODING_PCM_FLOAT`，流式）+ 高优先级渲染线程，
  同一套样本偏移算法；`USAGE_ASSISTANCE_SONIFICATION`，**不申请音频焦点** → 与
  音乐自动混音。
- **Web** — `AudioContext` 前瞻调度（浏览器预览即可听到节拍）。

三种音效（电子嘀声 / 木鱼 / 标准节拍器）在原生代码里**程序化合成**：短（<80ms）、
首尾零静音、已归一化。BPM 变更在下一拍边界生效（「自然收尾，立即换算」§3.4）。

引擎经 `src/state/CadenceContext.tsx` 接入：原生 / Web 可用时走真实发声，
Expo Go（无原生模块）下回退到纯 JS 调度器（只动画、不发声）。

### 在真机 / 模拟器上运行（听到声音）

原生模块**不能在 Expo Go 中运行**，需 development build：

```bash
brew install cocoapods      # iOS 首次需要
npx expo run:ios            # 或 npx expo run:android
```

> 本仓库已 `expo prebuild` 生成 `ios/` 与 `android/`（已 gitignore，可随时
> `npx expo prebuild --clean` 重新生成）。

## 验证状态

- ✅ 全量 TypeScript 通过（`tsc --noEmit`）
- ✅ Expo 自动链接在 iOS / Android 均识别到原生模块（`expo-modules-autolinking resolve`）
- ✅ `expo prebuild` 双平台生成无误
- ✅ Web 构建导出，WebAudio 引擎真实按 `AudioContext.currentTime` 排入节拍、零运行时报错
- ⚠️ Swift / Kotlin 的**原生编译**未在本机执行（缺 CocoaPods / JDK）——
  请在装好原生工具链的机器上 `expo run:ios` / `run:android` 验证发声

## 仍待接入（需各自的原生工作）

Live Activities / 灵动岛、Android 前台服务常驻通知、屏幕常亮（expo-keep-awake）、
物理音量键映射 —— 这些系统能力同样需在 development build 中以原生 / config plugin 落地。
