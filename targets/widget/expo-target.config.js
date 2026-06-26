/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'DriftlessWidget',
  // Live Activities + interactive App Intents require these frameworks.
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit', 'AppIntents'],
  deploymentTarget: '16.4',
};
