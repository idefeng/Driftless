# Changelog

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
