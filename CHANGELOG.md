# Changelog

## 1.1.0 · 2026-10-03

- 开启 R8：release 构建启用代码压缩与资源压缩（`expo-build-properties`），本地 release 包 35.7 MB、dex 由 18 个减至 3 个；已在 Fold7 真机回归播放、±1、滑动、通知栏 ±1、训练换段等路径，无缺类 / 反射崩溃。
- 已弃用的 system-bar API（`Window.setStatusBarColor` / `setNavigationBarColor`）：自有代码无调用；R8 后依赖中的调用点由 16 处降到 8 处，剩余位于 React Native 核心、Material、AndroidX SplashScreen，均按系统版本守卫（仅 Android 14 及以下执行），需随依赖升级消除。
- 大屏适配（折叠屏内屏 / 平板，短边 ≥ 600dp）：所有页面内容居中成最宽 640dp 的一列；首页在高度充足时放大步频数字与节拍脚印。
- 屏幕方向：manifest 不再锁定竖屏（满足 Google Play 大屏质量要求），改为运行时策略——手机 / 折叠屏外屏锁竖屏，大屏放开旋转，折叠 / 展开时实时切换（新增 `expo-screen-orientation`）。
- 修复大屏任务栏手势区域出现浅色条：新增本地 config plugin `plugins/withNavigationBarNoContrast` 关闭导航栏对比度强制；启动占位 / 导航栈背景改为品牌黑。
- 品牌视觉 v2：主色由阳光橙改为荧光运动绿 `#C6FF3D`，默认黑底（`#0B0D0A`），保留白底「日光强光」模式、移除「夜跑红光」；荧光绿填充上的文字统一用近黑（新增 `onBrand` token），清理组件内写死的橙色。
- 新 Logo：两只交错的脚印；首页 / 跑步页节拍可视化改为左右脚交替落地（`FootstepPulse`，替换 `BeatBars`）。
- App 图标、Android 自适应 / 单色图标、启动屏、favicon 全部重绘；iOS Live Activity 与 Android 通知改用绿色与脚印图形（需重新出原生包）。
- Android 训练通知的状态栏小图标由系统播放三角换成脚印矢量图（`driftless_ic_stat_footprints`）。已在三星 Galaxy Z Fold7 真机验证：原生引擎编译通过、播放 / 通知 / 桌面自适应图标显示正常。
- 首页拆分为「准备 / 跑步」两态：暂停时展示音效、共存、计划等设置；播放后自动收起设置项、放大步频数字，中心区域可上下滑动 ±1（读屏下 BPM 数字支持「可调节」手势）。
- 踩拍测频、配速推算收进右上角「跑前工具」底部抽屉，首页更聚焦。
- 步频强度色回归单一品牌色规范（PRD §1.5）：恢复 / 巡航 / 冲刺只在阳光橙色阶内以明度区分，移除红橙 `#FF4500`；强度标签接入 i18n。
- 引擎三件套（iOS / Android / Web 三端同构，需重新出原生包，不能仅 OTA）：
  - 渐进过渡（PRD §3.4 Ramp）：换段前 10 / 20 / 30 秒线性平滑变速到下一段步频；每拍按采样计数重新推导间隔，不引入漂移；手动 ±1 立即取消过渡。跑步页显示「渐进中 → 目标」。
  - 重音拍：每 2 / 4 拍首拍换成高五度的同一音色，在「节拍音效」页设置。
  - 换段提示音：每段结束前 3 / 2 / 1 秒各一声上扬双音，由引擎叠在最近的拍点上，绝不离网格；在训练计划页可开关。
- 新增 `pnpm test:audio`（JS 调度器的匀速零漂移 / 渐进过渡 / 取消过渡单测），并入 `pnpm test`。

## Unreleased · 2026-08-19

- 修复暂停时倒计时仍继续流逝的问题：暂停即冻结计时，训练阶段剩余时间统一改用绝对时间戳（单一时间源），恢复播放后按真实剩余时长继续。
- 修复 Web 端原生模块注册名不一致导致浏览器预览无声的问题，`AudioContext` 前瞻调度恢复正常发声。
- 完善 iOS 音频会话生命周期：正确处理来电等中断（中断结束自动恢复）与拔耳机暂停，避免会话状态泄漏。
- 修复 Android 前台服务幽灵通知（训练结束后通知残留），并补齐音频焦点中断的暂停 / 恢复处理。
- 清理 Live Activity 孤儿卡片：异常退出或状态不一致时不再残留锁屏 / 灵动岛卡片。
- 语言偏好持久化：手动切换的中英文选择在重启后保留。
- 无障碍与 UX 细节修复（盲操按钮可及性、文案与状态提示等）。
- 文档对齐：版本号统一至 `1.0.3`（以 `app.json` 为准）、README 移除「仍待接入」过时描述、多语种兜底规则与代码一致、Android 音频通路统一为 `USAGE_MEDIA`、上架指南与 PRD 勘误同步。

## 2026-07-12

- 将 Android / iOS 包名从 `com.fengqun.driftless` 改回 `com.idefeng.driftless`，并重新执行 `expo prebuild --clean` 同步原生工程；`docs/store-launch-guide.md` 等上架文档同步更新，但此举会重新触发「该包名在当前新 Google Play 账号下无法创建应用」的历史问题，尚待解决。
- 新增两种节拍音效「气泡声」「水滴声」，与嘀声、木鱼、节拍器共用同一套采样合成模型，iOS / Android / Web 三端同步实现。
- 因涉及原生音频模块改动，本次变更需要重新出原生构建包，不能仅通过 OTA 发布。

## 2026-07-01

- 将 Google Play 发布包名从 `com.idefeng.driftless` 调整为 `com.fengqun.driftless`，用于新的 Google Play 开发者账号创建应用。

## 2026-06-30

- 将应用版本提升到 `1.0.1`，作为首个内置 OTA 能力的原生包基线。
- 接入 `expo-updates` / EAS Update，配置 Driftless 的 OTA URL、runtimeVersion 与 EAS build channel。
- 新增启动后与前台恢复时的 OTA 检查：下载完成后提示用户重启，不在训练中强制刷新。
- 新增 OTA 服务层单元测试、发布脚本 `ota:preview` / `ota:prod`，并补充 README 与上架指南中的 OTA 发布边界。
- 将启动屏幕相关异常改为通过 logger 记录，避免静默吞掉启动链路错误。

## 2026-06-26

- 将多语种地区缺失时的默认语言调整为英文；中国大陆、港澳台仍按地区规则显示中文。
- 增加中英文自动多语种支持：`CN/HK/MO/TW` 地区显示中文，其它地区显示英文。
- 新增轻量 i18n 层、地区判断单元测试，并将主要页面、训练计划、音效文案和实时通知文案接入翻译字典。
- 更新 App 图标为 Driftless 四节拍条品牌图形，并同步 Android adaptive icon 前景图、单色图和奶白背景。
- 替换 Splash Screen 占位图，改为 `logo + Driftless + Run Cadence · 零漂移步频` 的品牌启动屏，并增加深色模式启动图。
- 通过 Android 真机重新构建、安装并验证启动图和图标资源生效。
