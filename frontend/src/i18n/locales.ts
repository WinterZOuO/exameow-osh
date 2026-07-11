export interface LocaleMessages {
  // App
  appName: string
  appSubtitle: string

  // Nav
  navConfig: string
  navGenerate: string
  navPreview: string

  // Config
  configTitle: string
  configSubtitle: string
  configSectionEndpoint: string
  configSectionAuth: string
  configSectionModel: string
  configApiUrl: string
  configApiKey: string
  configFetchModels: string
  configSelectModel: string
  configEnterModel: string
  configSave: string
  configSaved: string
  configReady: string
  configReadyCta: string

  // Generate
  genTitle: string
  genSubtitle: string
  genSelectFile: string
  genFileHint: string
  genQuestionTypes: string
  genQuestions: string
  genDifficulty: string
  genLanguage: string
  genTopic: string
  genTopicPlaceholder: string
  genGenerateBtn: string
  genGenerating: string
  genFileSelected: string

  // Preview
  previewTitle: string
  previewSubtitleEmpty: string
  previewSubtitle: string
  previewEmptyTitle: string
  previewEmptyText: string
  previewGotoGenerate: string
  previewNewBatch: string
  previewExportCsv: string
  previewQuestionCount: string

  // Table
  tableNum: string
  tableType: string
  tableQuestion: string
  tableOptions: string
  tableAnswer: string
  tableAnalysis: string

  // Types
  typeSingle: string
  typeMulti: string
  typeTrueFalse: string
  typeFillBlank: string
  typeShortAnswer: string

  // Difficulty
  diffEasy: string
  diffMedium: string
  diffHard: string

  // Common
  btnStart: string
  btnBack: string
  langZh: string
  langEn: string
}

export const zh: LocaleMessages = {
  appName: 'ExamBot',
  appSubtitle: 'AI 智能出题',

  navConfig: '配置',
  navGenerate: '出题',
  navPreview: '预览',

  configTitle: '设置',
  configSubtitle: '连接 AI 后台，开始出题',
  configSectionEndpoint: '接口地址',
  configSectionAuth: '认证密钥',
  configSectionModel: '模型选择',
  configApiUrl: 'API 地址',
  configApiKey: 'API Key',
  configFetchModels: '获取模型列表',
  configSelectModel: '选择模型',
  configEnterModel: '或手动输入模型名',
  configSave: '保存配置',
  configSaved: '已保存',
  configReady: '配置完成，可以开始生成试题了',
  configReadyCta: '开始出题',

  genTitle: '出题',
  genSubtitle: '上传文档，设置出题参数',
  genSelectFile: '选择文档',
  genFileHint: '支持 TXT、DOCX、文本型 PDF',
  genQuestionTypes: '题型',
  genQuestions: '题目数量',
  genDifficulty: '难度',
  genLanguage: '语言',
  genTopic: '知识点 / 章节',
  genTopicPlaceholder: '如：机器学习基础',
  genGenerateBtn: '生成试题',
  genGenerating: '生成中...',
  genFileSelected: '已选择',

  previewTitle: '预览',
  previewSubtitleEmpty: '生成试题后可在此预览',
  previewSubtitle: '{n} 道题目已生成',
  previewEmptyTitle: '暂无试题',
  previewEmptyText: '请先在出题页面生成试题',
  previewGotoGenerate: '去出题',
  previewNewBatch: '重新出题',
  previewExportCsv: '导出 CSV',
  previewQuestionCount: '{n} 道题目已生成',

  tableNum: '#',
  tableType: '题型',
  tableQuestion: '题目',
  tableOptions: '选项',
  tableAnswer: '答案',
  tableAnalysis: '解析',

  typeSingle: '单选题',
  typeMulti: '多选题',
  typeTrueFalse: '判断题',
  typeFillBlank: '填空题',
  typeShortAnswer: '简答题',

  diffEasy: '简单',
  diffMedium: '中等',
  diffHard: '困难',

  btnStart: '开始出题',
  btnBack: '返回',
  langZh: '中',
  langEn: 'En',
}

export const en: LocaleMessages = {
  appName: 'ExamBot',
  appSubtitle: 'AI Question Generator',

  navConfig: 'Config',
  navGenerate: 'Generate',
  navPreview: 'Preview',

  configTitle: 'Settings',
  configSubtitle: 'Connect your AI backend to get started',
  configSectionEndpoint: 'Endpoint',
  configSectionAuth: 'Authentication',
  configSectionModel: 'Model',
  configApiUrl: 'API URL',
  configApiKey: 'API Key',
  configFetchModels: 'Fetch Models',
  configSelectModel: 'Select Model',
  configEnterModel: 'Or enter model name',
  configSave: 'Save Configuration',
  configSaved: 'Saved',
  configReady: 'Everything is set up. Ready to generate exam questions.',
  configReadyCta: 'Start Generating',

  genTitle: 'Generate',
  genSubtitle: 'Upload a document and configure exam parameters',
  genSelectFile: 'Select Document',
  genFileHint: 'TXT, DOCX, or text-based PDF',
  genQuestionTypes: 'Question Types',
  genQuestions: 'Questions',
  genDifficulty: 'Difficulty',
  genLanguage: 'Language',
  genTopic: 'Topic / Chapter',
  genTopicPlaceholder: 'e.g. Machine Learning Basics',
  genGenerateBtn: 'Generate Questions',
  genGenerating: 'Generating...',
  genFileSelected: 'Selected',

  previewTitle: 'Preview',
  previewSubtitleEmpty: 'Review generated questions before export',
  previewSubtitle: '{n} questions generated',
  previewEmptyTitle: 'No Questions Yet',
  previewEmptyText: 'Generate questions first from the Generate page',
  previewGotoGenerate: 'Go to Generate',
  previewNewBatch: 'New Batch',
  previewExportCsv: 'Export CSV',
  previewQuestionCount: '{n} questions generated',

  tableNum: '#',
  tableType: 'Type',
  tableQuestion: 'Question',
  tableOptions: 'Options',
  tableAnswer: 'Answer',
  tableAnalysis: 'Analysis',

  typeSingle: 'Single Choice',
  typeMulti: 'Multi Choice',
  typeTrueFalse: 'True / False',
  typeFillBlank: 'Fill Blank',
  typeShortAnswer: 'Short Answer',

  diffEasy: 'Easy',
  diffMedium: 'Medium',
  diffHard: 'Hard',

  btnStart: 'Start Generating',
  btnBack: 'Back',
  langZh: '中',
  langEn: 'En',
}
