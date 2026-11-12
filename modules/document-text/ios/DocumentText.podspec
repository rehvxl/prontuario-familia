Pod::Spec.new do |s|
  s.name           = 'DocumentText'
  s.version        = '1.0.0'
  s.summary        = 'Extração de texto de PDF e imagem no aparelho (PDFKit + Vision)'
  s.description    = 'Módulo local do Prontuário da Família'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks     = 'Vision', 'PDFKit'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files   = "**/*.{h,m,mm,swift,hpp,cpp}"
end
