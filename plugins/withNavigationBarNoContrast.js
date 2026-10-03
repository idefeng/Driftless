/**
 * Expo config plugin: disable Android's navigation-bar contrast enforcement.
 *
 * On large screens with a taskbar (e.g. Galaxy Z Fold inner display), the system
 * paints a light scrim behind the gesture area because the app's nav bar is
 * transparent (edge-to-edge). Driftless is always dark, so that scrim shows up as
 * a light strip under the black UI. Turning enforcement off lets our own
 * background show through. Injected into MainActivity.onCreate on every prebuild,
 * since android/ is generated and must not be hand-edited.
 */
const { withMainActivity } = require('expo/config-plugins');

const LINE =
  '    if (android.os.Build.VERSION.SDK_INT >= 29) window.isNavigationBarContrastEnforced = false';

module.exports = function withNavigationBarNoContrast(config) {
  return withMainActivity(config, (cfg) => {
    const { modResults } = cfg;
    if (modResults.language !== 'kt') {
      throw new Error('withNavigationBarNoContrast: expected a Kotlin MainActivity');
    }
    if (!modResults.contents.includes('isNavigationBarContrastEnforced')) {
      const anchor = /(\n\s*super\.onCreate\([^)]*\)\n)/;
      if (!anchor.test(modResults.contents)) {
        throw new Error('withNavigationBarNoContrast: super.onCreate(...) not found in MainActivity');
      }
      modResults.contents = modResults.contents.replace(anchor, `$1${LINE}\n`);
    }
    return cfg;
  });
};
