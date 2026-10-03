/**
 * Expo config plugin: raise Gradle / Kotlin daemon memory for Android builds.
 *
 * Since Expo SDK 57 more modules run KSP during the release build, and the
 * template default (`-Xmx2048m -XX:MaxMetaspaceSize=512m`) runs out of Metaspace
 * in `:expo-updates:kspReleaseKotlin`. The generated android/gradle.properties is
 * recreated on every prebuild (locally and on EAS), so the values are injected here.
 */
const { withGradleProperties } = require('expo/config-plugins');

const PROPS = {
  'org.gradle.jvmargs': '-Xmx4096m -XX:MaxMetaspaceSize=1536m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8',
  'kotlin.daemon.jvmargs': '-Xmx3072m -XX:MaxMetaspaceSize=1024m',
};

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(PROPS)) {
      const existing = cfg.modResults.find((item) => item.type === 'property' && item.key === key);
      if (existing) existing.value = value;
      else cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
};
