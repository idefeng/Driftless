# Driftless Android 上架指南

更新日期：2026-06-30

## 当前项目状态

- 应用名：Driftless
- Android 包名：`com.idefeng.driftless`
- 当前版本：`1.0.1`
- EAS 项目：`@idefeng/driftless`
- EAS Project ID：`af22973b-c89f-4d59-b406-a2ae922cdc64`
- EAS Update URL：`https://u.expo.dev/af22973b-c89f-4d59-b406-a2ae922cdc64`
- OTA runtime 策略：`appVersion`（当前 `1.0.1` 原生包只接收同一 runtime 的 JS / 资源更新）
- Google Play AAB：<https://expo.dev/artifacts/eas/W4aR0acbrtnrOS8XigKVW_HWYDulTUuZmoxnOndVqCE.aab>（versionCode `5`）
- vivo/国内渠道 APK：<https://expo.dev/artifacts/eas/v2IGNcYLqPsG6NxWGF3M-g1iRQlPs9-pMkJW2hkUKfA.apk>（versionCode `6`）
- Google Play EAS 构建：<https://expo.dev/accounts/idefeng/projects/driftless/builds/892875e3-f830-4beb-a77e-b032d8d0cc5f>
- vivo APK EAS 构建：<https://expo.dev/accounts/idefeng/projects/driftless/builds/b7a5fbed-1d7b-4f54-9c3b-c8812177c1e3>
- 历史 `1.0.0` AAB / APK 未内置 OTA，不建议继续上传。
- 重要状态：旧包名 `com.driftless.app` 已被 Google Play 占用；当前统一改为 `com.idefeng.driftless`。不要上传旧的 `dist/driftless-1.0.0-android-v2.aab`、`dist/driftless-1.0.0-android-v3-vivo.apk` 或本地 `android/app/build/outputs/apk/release/app-release.apk`。

## 推荐上架顺序

1. 注册 Google Play Console，并先走内部测试。
2. 准备隐私政策 URL、支持邮箱、应用官网/支持页，并在 Play Console 创建应用。
3. 注册中国主流应用商店开发者账号，优先使用企业主体。
4. 处理 APP 备案、隐私政策、权限说明和软著/版权材料。
5. 先提交 1-2 个国内渠道试审，例如华为、小米或 vivo，再同步其他渠道。

## Google Play 账号注册

入口：<https://play.google.com/console>

需要准备：
- Google 账号。
- 开发者显示名称、联系邮箱、联系电话。
- 付款方式；Google Play 开发者账号有一次性注册费。
- 身份验证资料；企业账号还需要组织信息。

注意事项：
- 新的个人开发者账号申请生产发布前，通常需要完成封闭测试要求：至少 12 名测试者，连续 14 天测试，然后再申请生产访问。
- 新应用应上传 Android App Bundle，即 `.aab`，不要用 APK 作为 Google Play 首发包。
- Play Console 需要完成 Data safety、内容分级、目标受众、广告声明、隐私政策等表单。

操作流程：
1. 登录 Play Console，创建开发者账号并付款。
2. 完成身份验证和开发者资料。
3. 创建应用：名称填 Driftless，默认语言建议 English (United States)，应用类型选择 App，免费/付费按实际商业模式选择。
4. 填写商店资料：标题、短描述、完整描述、图标、feature graphic、手机截图、分类、联系邮箱、隐私政策 URL。
5. 完成 App content：Data safety、Ads、Content rating、Target audience、News apps、Government apps 等声明。
6. 上传 AAB 到 Internal testing，添加测试者；自动上传需要 Play Console 服务账号 JSON。
7. 如果是新的个人开发者账号，完成 12 名测试者连续 14 天封闭测试后，再申请生产发布权限。
8. 生产发布时使用 staged rollout，建议先 5%-10% 灰度。

## OTA 更新发布

当前已接入 `expo-updates` / EAS Update：

- `preview` 构建绑定 `preview` channel。
- `production` AAB 和 `production-apk` 都绑定 `production` channel。
- App 启动后和回到前台时会检查更新；更新下载完成后提示用户重启。

发布前检查：

```bash
pnpm run test
pnpm run lint
```

预览 OTA：

```bash
pnpm run ota:preview -- --message "说明本次预览更新"
```

生产 OTA：

```bash
CI=1 pnpm run ota:prod -- --message "说明本次生产更新"
```

不能只发 OTA 的变更：
- 原生模块、Android / iOS 权限、包名、scheme、图标、启动图。
- `app.json` 中会影响原生工程的配置。
- Expo SDK、React Native、`expo-updates`、本地原生模块或前台服务 / Live Activities 代码。
- 任何需要 Google Play / 国内渠道重新审核的隐私、权限或合规变化。

这类变更必须重新执行 EAS build，并按渠道上传新的 AAB / APK。

## 中国应用商店账号注册

建议覆盖这些渠道：
- 华为 AppGallery：<https://developer.huawei.com/consumer/cn/>
- 小米开放平台：<https://dev.mi.com/>
- OPPO 开放平台：<https://open.oppomobile.com/>
- vivo 开放平台：<https://dev.vivo.com.cn/>
- 腾讯应用宝：<https://app.open.qq.com/>
- 荣耀开发者服务平台：<https://developer.hihonor.com/cn/>

优先使用企业主体，准备：
- 营业执照、法人身份证、管理员身份证。
- 企业联系人手机号、邮箱。
- 应用名称、包名、版本号、签名证书指纹。
- 隐私政策 URL、用户协议 URL、客服邮箱。
- APP 备案号；国内新增 App 上架通常会要求完成备案。
- 软件著作权或应用版权证明；不是所有渠道首发都强制，但多数渠道会在名称争议或审核中要求。

通用提交流程：
1. 注册开发者账号，完成个人或企业实名认证。
2. 创建应用，填写应用名、包名、分类、标签和简介。
3. 上传 APK，平台会解析版本号、权限和签名证书。
4. 填写隐私政策 URL、用户协议 URL、权限用途说明和客服信息。
5. 上传图标、截图、横幅或宣传图。
6. 填写 APP 备案号；如平台要求，补充软著、授权书或安全评估材料。
7. 提交审核，根据驳回意见逐项修改。

渠道策略：
- 首轮建议选择 2 个渠道试审，先暴露合规问题，再批量提交其他渠道。
- 国内渠道常见驳回点是权限过多、隐私政策不匹配、未提供备案号、应用名无权属证明、后台播放说明不足。
- Driftless 的核心卖点是跑步步频训练，不涉及医疗诊断。描述中避免使用“治疗”“康复”“医学建议”等医疗化表述。

## 国内合规清单

- APP 备案：通过工信部 APP 备案流程获取备案号。
- 隐私政策：必须可公开访问，并与应用实际权限和数据处理一致。
- 权限说明：当前 Manifest 包含网络、震动、通知、前台媒体播放、读写存储和悬浮窗权限。正式提交前建议移除未使用的存储和悬浮窗权限，降低国内审核风险。
- 签名证书：Google Play 与国内渠道当前都使用 EAS 远端 Android 凭据；不要使用本地 debug key。后续所有国内渠道升级应继续使用同一套 EAS 远端 keystore。
- 应用内入口：隐私政策、用户协议、版本信息建议在 App 内可查看。

## Google Play 自动提交配置

当前 `eas.json` 已配置提交到 Google Play `internal` track：

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./secrets/google-play-service-account.json",
        "track": "internal",
        "releaseStatus": "completed"
      }
    }
  }
}
```

下一步需要在 Play Console 中完成：

1. 手动创建应用，包名保持 `com.idefeng.driftless`。
2. 在 Google Cloud 创建 service account，并在 Play Console → Setup → API access 授权。
3. 下载 JSON key，保存为 `secrets/google-play-service-account.json`。该目录已加入 `.gitignore`，不要提交。
4. 执行 `pnpm exec eas submit -p android --id 383bc1ab-6592-4d74-afa8-3c4552cc6aaf --profile production`。

## 国内渠道 APK 构建

vivo 等国内渠道需要 APK。当前已在 `eas.json` 中新增 `production-apk` profile：

```json
{
  "build": {
    "production-apk": {
      "autoIncrement": true,
      "channel": "production",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

重新构建国内渠道 APK：

```bash
pnpm exec eas build -p android --profile production-apk --non-interactive
```

当前 vivo 可上传包：

```text
https://expo.dev/artifacts/eas/v2IGNcYLqPsG6NxWGF3M-g1iRQlPs9-pMkJW2hkUKfA.apk
```

APK 校验结果：

- 包名：`com.idefeng.driftless`
- versionName：`1.0.1`
- versionCode：`6`
- 签名证书 SHA-1：`d456c293e2a2ba027ca3971c8f72ca25bba45431`
- 签名证书 SHA-256：`bdf98f6cc85f1265edeb832198cadc5eeb5a5fcbf157ce335414f1c8c8661012`

## 本地 release keystore 备用方案

正式上架前创建 release keystore，并通过环境变量注入 Gradle，不要提交到 git：

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore driftless-release.keystore \
  -alias driftless-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

需要长期保存：
- keystore 文件。
- keystore 密码。
- alias。
- key 密码。
- SHA-1、SHA-256 和 MD5 指纹。

丢失 release keystore 会影响国内渠道后续升级。Google Play 可托管应用签名密钥，但 upload key 也必须妥善保存。

## 官方参考

- Google Play 创建开发者账号：<https://support.google.com/googleplay/android-developer/answer/6112435>
- Google Play 个人账号测试要求：<https://support.google.com/googleplay/android-developer/answer/14151465>
- Google Play 商店素材要求：<https://support.google.com/googleplay/android-developer/answer/9866151>
- Google Play Data safety：<https://support.google.com/googleplay/android-developer/answer/10787469>
- 工信部 APP 备案通知：<https://www.miit.gov.cn/zwgk/zcwj/wjfb/tz/art/2023/art_920db564162e4312916a01bed6540ad8.html>
