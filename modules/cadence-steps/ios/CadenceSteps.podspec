Pod::Spec.new do |s|
  s.name           = 'CadenceSteps'
  s.version        = '1.0.0'
  s.summary        = 'Step sensing for measured cadence'
  s.description    = 'Reports cumulative step counts from the platform step sensor.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
