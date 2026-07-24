export interface LocaleMessages {
  // App
  appName: string
  appSubtitle: string

  // Nav
  navConfig: string
  navGenerate: string
  navPreview: string
  navPractice: string
  navSearch: string

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
  configAiProvider: string
  configCfFree: string
  configCustomApi: string
  configCfFreeDesc: string
  configCustomApiDesc: string

  // Generate
  genTitle: string
  genSubtitle: string
  genCancel: string
  genSelectFile: string
  genFileHint: string
  genTakePhoto: string
  genQuestionTypes: string
  genQuestions: string
  genDifficulty: string
  genLanguage: string
  genTopic: string
  genTopicPlaceholder: string
  genGenerateBtn: string
  genGenerating: string
  genFileSelected: string
  genProgressParsing: string
  genProgressParsingPdfPage: string
  genProgressComplete: string
  genProgressCancelled: string
  genProgressGeneratingBatch: string
  genErrorNoText: string
  genErrorReadFile: string

  // Preview
  previewTitle: string
  previewSubtitleEmpty: string
  previewSubtitle: string
  previewEmptyTitle: string
  previewEmptyText: string
  previewGotoGenerate: string
  previewNewBatch: string
  previewExportCsv: string
  previewExportSaved: string
  previewExportShare: string
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

  // Practice
  practiceTitle: string
  practiceSubtitle: string
  practiceEmptyTitle: string
  practiceEmptyHint: string
  practiceImportBtn: string
  practiceImportCsv: string
  practiceImportExcel: string
  practiceImportDialogTitle: string
  practiceImportPreview: string
  practiceImportConfirm: string
  practiceImportSuccess: string
  practiceImportFail: string
  practiceImportParsing: string
  practiceModeSequential: string
  practiceModeSequentialDesc: string
  practiceModeRandom: string
  practiceModeRandomDesc: string
  practiceModeMock: string
  practiceModeMockDesc: string
  practiceSelectBank: string
  practiceSelectModeTitle: string
  practiceStartBtn: string
  practiceMockConfigTitle: string
  practiceMockTypes: string
  practiceMockCounts: string
  practiceMockGenerate: string
  practiceQuestions: string
  practiceProgress: string
  practicePrevBtn: string
  practiceNextBtn: string
  practiceSubmitBtn: string
  practiceSubmitConfirm: string
  practiceSubmitConfirmMsg: string
  practiceResultTitle: string
  practiceScore: string
  practiceCorrect: string
  practiceIncorrect: string
  practiceAccuracy: string
  practiceElapsed: string
  practiceReviewTitle: string
  practiceReviewQuestion: string
  practiceReviewYourAnswer: string
  practiceReviewCorrectAnswer: string
  practiceReviewAnalysis: string
  practiceReviewEmptyAnalysis: string
  practiceRetryBtn: string
  practiceBackToBanks: string
  practiceDeleteBank: string
  practiceDeleteConfirm: string
  practiceSelfCheck: string
  practiceSelfCheckHint: string
  practiceSaveAsBank: string
  practiceSavedAsBank: string
  practiceSourceAI: string
  practiceSourceImport: string
  practiceChooseFile: string
  practiceFileHint: string
  practiceRemoveFile: string
  practiceMinutes: string
  practiceSeconds: string
  // Practice mode toggle
  practiceModeExam: string
  practiceModeFlashcard: string
  // Practice in-card strings
  practiceConfirmAnswer: string
  practiceClickToSubmit: string
  practiceCorrectAdvancing: string
  practiceInputAnswer: string
  practiceInputAnswerShort: string
  practiceSelfCheckCorrect: string
  practiceSelfCheckWrong: string
  practiceUnanswered: string
  practiceContinuePractice: string
  practiceWrongPractice: string
  practiceContinue: string
  practiceEnterBank: string
  practiceCancel: string
  practiceClear: string
  practiceClearProgress: string
  practiceClearProgressMsg: string
  practiceUnansweredCount: string
  practiceAnswerSheet: string
  practiceQuestionCount: string
  practiceUnansweredShort: string
  practiceRemoveWrong: string
  practiceQuestionGone: string
  practiceUnknownBank: string
  practiceAnsweredCount: string
  practiceQuestionUnit: string
  // Import / file
  practiceMultiFileHint: string
  practiceFileCount: string
  practiceAddFile: string
  practiceClearAll: string
  practiceImportCount: string
  practiceImportColType: string
  practiceImportColStem: string
  practiceImportColAnswer: string
  practiceImportColAnalysis: string
  practiceDownloadTemplate: string
  practiceExportBank: string
  practiceMapTitle: string
  practiceMapHint: string
  practiceMapFieldOptions: string
  practiceMapFieldCombined: string
  practiceMapNone: string
  practiceMapMultiColumn: string
  practiceMapCombinedColumn: string
  practiceMapDelimiter: string
  practiceMapDelimiterAuto: string
  practiceMapApply: string
  practiceMapSplitPreview: string
  practiceMapRequired: string
  // Language
  practiceLangZh: string
  practiceLangEn: string

  // Wrong questions
  wrongModeTitle: string
  wrongModeDesc: string
  wrongQuestionsBtn: string
  wrongQuestionsManage: string
  wrongCount: string
  wrongTimesCount: string
  wrongSortTitle: string
  wrongSortCountDesc: string
  wrongSortCountAsc: string
  wrongSortTimeDesc: string
  wrongSortTimeAsc: string
  wrongRemoved: string
  wrongAutoRemoved: string
  wrongClearConfirm: string
  wrongClearConfirmMsg: string
  wrongClearBtn: string
  wrongManagerTitle: string
  wrongManagerEmpty: string
  wrongNoWrong: string

  // Common
  btnStart: string
  btnBack: string
  langZh: string
  langEn: string

  // Search
  searchTitle: string
  searchSubtitle: string
  searchModeText: string
  searchModeTextDesc: string
  searchModePhoto: string
  searchModePhotoDesc: string
  searchModeCameraLive: string
  searchModeCameraLiveDesc: string
  searchModeScreenRecord: string
  searchModeScreenRecordDesc: string
  searchScreenRecordStart: string
  searchScreenRecordStop: string
  searchScreenRecordNotSupported: string
  searchScreenRecordDesc: string
  searchScreenRecordAnswer: string
  searchScreenRecordNoMatch: string
  searchScreenRecordLoading: string
  searchScreenRecordCollapse: string
  searchScreenRecordAdjust: string
  searchScreenRecordExit: string
  searchScreenRecordAdjustHint: string
  searchScreenRecordResume: string
  searchScreenRecordPaused: string
  searchScreenRecordOverlayPerm: string
  searchScreenRecordProjectionDenied: string
  searchScreenRecordScreenPerm: string
  searchCameraLiveStart: string
  searchCameraLivePause: string
  searchCameraLiveResume: string
  searchCameraLiveExit: string
  searchCameraLiveNoMatch: string
  searchCameraLiveStartFailed: string
  searchCameraLivePermissionDenied: string
  searchCameraLivePausedLabel: string
  searchCameraLiveOpenSettings: string
  searchComingSoon: string
  searchNotSupported: string
  searchInputPlaceholder: string
  searchSettings: string
  searchBankScope: string
  searchAllBanks: string
  searchMatchScope: string
  searchMatchStem: string
  searchMatchStemOptions: string
  searchTypeFilter: string
  searchResultCount: string
  searchNoResults: string
  searchNoResultsHint: string
  searchNoBanks: string
  searchAskAI: string
  searchAiThinking: string
  searchCancel: string
  searchRetry: string
  searchShowAnalysis: string
  searchHideAnalysis: string
  searchSimilarity: string
  searchNotConfigured: string
  searchGotoConfig: string
  searchExactMatches: string
  searchFuzzyMatches: string
  searchPhotoLoadingModel: string
  searchPhotoRecognizing: string
  searchPhotoEmpty: string
  searchPhotoTake: string
  searchPhotoUpload: string
  searchPhotoReselect: string
  searchPhotoDropHint: string

  // Practice grading
  practiceSubmitAuto: string
  practiceSubmitAutoHint: string
  practiceRevealAnswer: string
  practiceRevealHint: string
  practiceAiJudge: string
  practiceAiJudgeHint: string
  practiceAiJudging: string
  practiceAiFeedback: string
  practiceRegradeHint: string

  // Cookie consent
  cookieBannerText: string
  cookieBannerAccept: string

  // Updater
  updateAvailableTitle: string
  updateAvailableBody: string
  updateNow: string
  updateLater: string
  updateDownloading: string
  updateReady: string
  updateRestart: string
  updateFailed: string
}

export const zh: LocaleMessages = {
  appName: '过了喵',
  appSubtitle: 'AI 智能出题',

  navConfig: '配置',
  navGenerate: '出题',
  navPreview: '预览',
  navPractice: '刷题',
  navSearch: '搜题',

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
  configAiProvider: 'AI 提供商',
  configCfFree: 'Cloudflare 免费 AI',
  configCustomApi: '自定义 API',
  configCfFreeDesc: '免费套餐，无需 API Key。每日有限额。',
  configCustomApiDesc: '使用你自己的 OpenAI / DeepSeek API，Key 存在浏览器本地不会泄露。',

  genTitle: '出题',
  genSubtitle: '上传文档，设置出题参数',
  genCancel: '取消生成',
  genSelectFile: '选择文档',
  genFileHint: '支持 DOCX、PDF、PPTX、HTML、EPUB、ODT、表格（CSV/XLSX）、图片（PNG/JPG/WEBP/GIF/BMP）及任意文本/代码文件',
  genTakePhoto: '拍照',
  genQuestionTypes: '题型',
  genQuestions: '题目数量',
  genDifficulty: '难度',
  genLanguage: '语言',
  genTopic: '知识点 / 章节',
  genTopicPlaceholder: '如：机器学习基础',
  genGenerateBtn: '生成试题',
  genGenerating: '生成中...',
  genFileSelected: '已选择',
  genProgressParsing: '解析文件中...',
  genProgressParsingPdfPage: '正在解析第 {current}/{total} 页（{images} 张图片已处理）',
  genProgressComplete: '完成！',
  genProgressCancelled: '已取消',
  genProgressGeneratingBatch: '正在生成第 {current}/{total} 批...',
  genErrorNoText: '未从文件识别到有效文本，请检查文件内容',
  genErrorReadFile: '无法读取文件：{file}',

  previewTitle: '预览',
  previewSubtitleEmpty: '生成试题后可在此预览',
  previewSubtitle: '{n} 道题目已生成',
  previewEmptyTitle: '暂无试题',
  previewEmptyText: '请先在出题页面生成试题',
  previewGotoGenerate: '去出题',
  previewNewBatch: '重新出题',
  previewExportCsv: '导出 CSV',
  previewExportSaved: '已保存至 ',
  previewExportShare: '分享',
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

  practiceTitle: '刷题',
  practiceSubtitle: '选择题库开始练习或导入新题库',
  practiceEmptyTitle: '暂无题库',
  practiceEmptyHint: '导入 CSV/Excel 文件或将生成的试题保存为题库',
  practiceImportBtn: '导入题库',
  practiceImportCsv: 'CSV 文件',
  practiceImportExcel: 'Excel 文件',
  practiceImportDialogTitle: '导入题库',
  practiceImportPreview: '解析预览',
  practiceImportConfirm: '确认导入',
  practiceImportSuccess: '成功导入 {n} 道题目',
  practiceImportFail: '导入失败，请检查文件格式',
  practiceImportParsing: '正在解析文件...',
  practiceModeSequential: '顺序练习',
  practiceModeSequentialDesc: '按照题库顺序逐题练习',
  practiceModeRandom: '随机练习',
  practiceModeRandomDesc: '题目和选项顺序随机打乱',
  practiceModeMock: '模拟考试',
  practiceModeMockDesc: '从题库中随机抽取生成试卷',
  practiceSelectBank: '选择题库',
  practiceSelectModeTitle: '选择练习模式',
  practiceStartBtn: '开始练习',
  practiceMockConfigTitle: '模拟考试设置',
  practiceMockTypes: '选择题型',
  practiceMockCounts: '题目数量',
  practiceMockGenerate: '生成试卷',
  practiceQuestions: '{n} 题',
  practiceProgress: '第 {c}/{t} 题',
  practicePrevBtn: '上一题',
  practiceNextBtn: '下一题',
  practiceSubmitBtn: '提交答案',
  practiceSubmitConfirm: '确认提交',
  practiceSubmitConfirmMsg: '提交后无法修改答案，确定要提交吗？',
  practiceResultTitle: '练习结果',
  practiceScore: '得分',
  practiceCorrect: '正确',
  practiceIncorrect: '错误',
  practiceAccuracy: '正确率',
  practiceElapsed: '用时',
  practiceReviewTitle: '错题回顾',
  practiceReviewQuestion: '题目',
  practiceReviewYourAnswer: '你的答案',
  practiceReviewCorrectAnswer: '正确答案',
  practiceReviewAnalysis: '解析',
  practiceReviewEmptyAnalysis: '暂无解析',
  practiceRetryBtn: '重新练习',
  practiceBackToBanks: '返回题库',
  practiceDeleteBank: '删除',
  practiceDeleteConfirm: '确定要删除该题库吗？',
  practiceSelfCheck: '自行判断',
  practiceSelfCheckHint: '参考答案已显示，请自行判断对错',
  practiceSaveAsBank: '保存为题库',
  practiceSavedAsBank: '已保存为题库',
  practiceSourceAI: 'AI 生成',
  practiceSourceImport: '外部导入',
  practiceChooseFile: '选择文件',
  practiceFileHint: '支持 CSV、XLSX 格式',
  practiceRemoveFile: '移除',
  practiceMinutes: '分',
  practiceSeconds: '秒',

  practiceModeExam: '做题模式',
  practiceModeFlashcard: '背题模式',
  practiceConfirmAnswer: '确认答案',
  practiceClickToSubmit: '点击选项直接提交',
  practiceCorrectAdvancing: '回答正确，即将跳转...',
  practiceInputAnswer: '输入回答...',
  practiceInputAnswerShort: '输入答案...',
  practiceSelfCheckCorrect: '对了',
  practiceSelfCheckWrong: '错了',
  practiceUnanswered: '(未作答)',
  practiceContinuePractice: '继续练习',
  practiceWrongPractice: '错题练习',
  practiceContinue: '继续',
  practiceEnterBank: '进入题库',
  practiceCancel: '取消',
  practiceClear: '清除',
  practiceClearProgress: '清除练习进度',
  practiceClearProgressMsg: '确定要清除当前的练习进度吗？清除后需重新开始。',
  practiceUnansweredCount: '还有 {n} 道题未作答',
  practiceAnswerSheet: '答题卡',
  practiceQuestionCount: '第 {c}/{t} 题',
  practiceUnansweredShort: '未答 {n}',
  practiceRemoveWrong: '移出错题本',
  practiceQuestionGone: '(题目已不存在)',
  practiceUnknownBank: '未知题库',
  practiceAnsweredCount: '{a}/{t} 题已答',
  practiceQuestionUnit: '{n} 题',
  practiceMultiFileHint: '支持多文件，可拖拽',
  practiceFileCount: '{n} 个文件',
  practiceAddFile: '+ 添加文件',
  practiceClearAll: '清空全部',
  practiceImportCount: '共 {n} 道题目',
  practiceImportColType: '题型',
  practiceImportColStem: '题干',
  practiceImportColAnswer: '答案',
  practiceImportColAnalysis: '解析',
    practiceDownloadTemplate: '下载题库模板',
    practiceExportBank: '导出',
    practiceMapTitle: '匹配表格列',
    practiceMapHint: '部分必填列未能自动识别，请手动选择对应的列',
    practiceMapFieldOptions: '选项列',
    practiceMapFieldCombined: '合并选项列',
    practiceMapNone: '无',
    practiceMapMultiColumn: '多列选项',
    practiceMapCombinedColumn: '单列包含所有选项',
    practiceMapDelimiter: '分列符',
    practiceMapDelimiterAuto: '自动检测',
    practiceMapApply: '应用并预览',
    practiceMapSplitPreview: '分列预览',
    practiceMapRequired: '必填',
  practiceLangZh: '中文',
  practiceLangEn: 'English',

  wrongModeTitle: '错题练习',
  wrongModeDesc: '只练习之前做错的题目',
  wrongQuestionsBtn: '错题练习',
  wrongQuestionsManage: '错题',
  wrongCount: '次错',
  wrongTimesCount: '做错 {n} 次',
  wrongSortTitle: '排序方式',
  wrongSortCountDesc: '做错次数多→少',
  wrongSortCountAsc: '做错次数少→多',
  wrongSortTimeDesc: '最近做错优先',
  wrongSortTimeAsc: '最早做错优先',
  wrongRemoved: '已移出错题本',
  wrongAutoRemoved: '已连续答对 3 次，已从错题本移除',
  wrongClearConfirm: '清空错题本',
  wrongClearConfirmMsg: '确定要清空该题库的所有错题吗？',
  wrongClearBtn: '清空全部',
  wrongManagerTitle: '错题本',
  wrongManagerEmpty: '暂无错题',
  wrongNoWrong: '暂无错题',

  btnStart: '开始出题',
  btnBack: '返回',
  langZh: '中',
  langEn: 'En',

  // Search
  searchTitle: '搜题',
  searchSubtitle: '选择一种搜题方式',
  searchModeText: '文字搜题',
  searchModeTextDesc: '输入题目文字，从本地题库中查找，支持 AI 解答',
  searchModePhoto: '拍照搜题',
  searchModePhotoDesc: '拍摄或上传题目照片进行搜索',
  searchModeCameraLive: '拍屏搜题',
  searchModeCameraLiveDesc: 'AI 实时监听摄像头中的题目',
  searchModeScreenRecord: '录屏搜题',
  searchModeScreenRecordDesc: 'AI 实时监听桌面上的题目',
  searchScreenRecordStart: '开始录制',
  searchScreenRecordStop: '停止录制',
  searchScreenRecordNotSupported: '录屏搜题支持桌面端（Windows / macOS / Linux）和 Android；iOS 因系统限制暂不支持',
  searchScreenRecordDesc: '启动后，调整录制框覆盖题目区域，AI 将实时识别并搜索本地题库',
  searchScreenRecordAnswer: '答案',
  searchScreenRecordNoMatch: '未匹配到题目',
  searchScreenRecordLoading: '模型加载中…',
  searchScreenRecordCollapse: '收起',
  searchScreenRecordAdjust: '调整录制区域',
  searchScreenRecordExit: '退出录屏',
  searchScreenRecordAdjustHint: '拖拽移动录制框，框住题目区域',
  searchScreenRecordResume: '完成调整，继续录制',
  searchScreenRecordPaused: '调整录制框中，识别已暂停',
  searchScreenRecordOverlayPerm: '请在系统设置中授予「在其他应用上显示」权限后重试',
  searchScreenRecordProjectionDenied: '屏幕录制权限被拒绝，无法启动录屏搜题',
  searchScreenRecordScreenPerm: '录屏搜题需要 macOS「屏幕录制」权限。已为你打开系统设置，请在 隐私与安全性 → 屏幕录制 中勾选本应用（开发环境请勾选终端/iTerm），授权后需重启应用再试',
  searchCameraLiveStart: '开始扫描',
  searchCameraLivePause: '暂停',
  searchCameraLiveResume: '继续',
  searchCameraLiveExit: '退出',
  searchCameraLiveNoMatch: '未匹配到题目',
  searchCameraLiveStartFailed: '摄像头启动失败',
  searchCameraLivePermissionDenied: '请在系统设置中允许相机权限后重试',
  searchCameraLivePausedLabel: '已暂停',
  searchCameraLiveOpenSettings: '前往设置',
  searchComingSoon: '即将推出',
  searchNotSupported: '该平台不支持',
  searchInputPlaceholder: '输入题目内容…',
  searchSettings: '搜索设置',
  searchBankScope: '题库范围',
  searchAllBanks: '全部题库',
  searchMatchScope: '匹配范围',
  searchMatchStem: '仅题干',
  searchMatchStemOptions: '题干+选项',
  searchTypeFilter: '题型筛选',
  searchResultCount: '找到 {count} 道相关题目',
  searchNoResults: '未找到相关题目',
  searchNoResultsHint: '试试调整搜索设置，或使用 AI 回答',
  searchNoBanks: '暂无本地题库，可直接使用 AI 回答',
  searchAskAI: 'AI 回答',
  searchAiThinking: 'AI 思考中…',
  searchCancel: '取消',
  searchRetry: '重试',
  searchShowAnalysis: '查看解析',
  searchHideAnalysis: '收起解析',
  searchSimilarity: '相似度',
  searchNotConfigured: '请先完成 AI 配置',
  searchGotoConfig: '前往配置',
  searchExactMatches: '精确匹配',
  searchFuzzyMatches: '模糊匹配',
  searchPhotoLoadingModel: '正在加载识别模型…',
  searchPhotoRecognizing: '识别中…',
  searchPhotoEmpty: '未识别到文字，请换更清晰的图片或手动输入',
  searchPhotoTake: '拍照',
  searchPhotoUpload: '上传图片',
  searchPhotoReselect: '重新选择',
  searchPhotoDropHint: '拖拽图片到此处，或选择下方按钮',

  // Practice grading
  practiceSubmitAuto: '提交',
  practiceSubmitAutoHint: '提交＝自动判断，需与答案完全一致（忽略大小写）',
  practiceRevealAnswer: '查看答案',
  practiceRevealHint: '查看答案＝看完答案后自行判断对错',
  practiceAiJudge: '提交并 AI 判断',
  practiceAiJudgeHint: '提交＝AI 对照参考答案自动评判',
  practiceAiJudging: 'AI 判卷中…',
  practiceAiFeedback: 'AI 评语',
  practiceRegradeHint: '对判定结果不满意？可人工改判',

  // Cookie consent
  cookieBannerText: '我们使用 Cookie 和本地存储来保存您的偏好设置、题库与练习记录。继续使用本网站即表示您同意我们的数据存储政策。',
  cookieBannerAccept: '我知道了',

  // Updater
  updateAvailableTitle: '发现新版本 v{version}',
  updateAvailableBody: '新版本已发布，是否立即下载并更新？',
  updateNow: '立即更新',
  updateLater: '稍后再说',
  updateDownloading: '正在下载更新…',
  updateReady: '更新已就绪，重启应用后生效',
  updateRestart: '重启应用',
  updateFailed: '更新失败，请稍后在 GitHub Release 页手动下载',
}

export const en: LocaleMessages = {
  appName: 'Exameow',
  appSubtitle: 'AI Question Generator',

  navConfig: 'Config',
  navGenerate: 'Generate',
  navPreview: 'Preview',
  navPractice: 'Practice',
  navSearch: 'Search',

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
  configAiProvider: 'AI Provider',
  configCfFree: 'Cloudflare Free AI',
  configCustomApi: 'Custom API',
  configCfFreeDesc: 'Free tier — no API key needed. Daily limits apply.',
  configCustomApiDesc: 'Use your own OpenAI / DeepSeek API. Key stays in your browser.',

  genTitle: 'Generate',
  genSubtitle: 'Upload a document and configure exam parameters',
  genCancel: 'Cancel generation',
  genSelectFile: 'Select Document',
  genFileHint: 'DOCX, PDF, PPTX, HTML, EPUB, ODT, spreadsheets (CSV/XLSX), images (PNG/JPG/WEBP/GIF/BMP), and any text/code file',
  genTakePhoto: 'Take Photo',
  genQuestionTypes: 'Question Types',
  genQuestions: 'Questions',
  genDifficulty: 'Difficulty',
  genLanguage: 'Language',
  genTopic: 'Topic / Chapter',
  genTopicPlaceholder: 'e.g. Machine Learning Basics',
  genGenerateBtn: 'Generate Questions',
  genGenerating: 'Generating...',
  genFileSelected: 'Selected',
  genProgressParsing: 'Parsing files...',
  genProgressParsingPdfPage: 'Parsing page {current}/{total} ({images} images processed)',
  genProgressComplete: 'Complete!',
  genProgressCancelled: 'Cancelled',
  genProgressGeneratingBatch: 'Generating batch {current}/{total}...',
  genErrorNoText: 'No recognizable text was extracted from the files. Please check the file contents.',
  genErrorReadFile: 'Cannot read file: {file}',

  previewTitle: 'Preview',
  previewSubtitleEmpty: 'Review generated questions before export',
  previewSubtitle: '{n} questions generated',
  previewEmptyTitle: 'No Questions Yet',
  previewEmptyText: 'Generate questions first from the Generate page',
  previewGotoGenerate: 'Go to Generate',
  previewNewBatch: 'New Batch',
  previewExportCsv: 'Export CSV',
  previewExportSaved: 'Saved to ',
  previewExportShare: 'Share',
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

  practiceTitle: 'Practice',
  practiceSubtitle: 'Select a question bank or import a new one',
  practiceEmptyTitle: 'No Question Banks',
  practiceEmptyHint: 'Import a CSV/Excel file or save generated questions as a bank',
  practiceImportBtn: 'Import Bank',
  practiceImportCsv: 'CSV File',
  practiceImportExcel: 'Excel File',
  practiceImportDialogTitle: 'Import Question Bank',
  practiceImportPreview: 'Preview',
  practiceImportConfirm: 'Confirm Import',
  practiceImportSuccess: 'Successfully imported {n} questions',
  practiceImportFail: 'Import failed. Please check the file format.',
  practiceImportParsing: 'Parsing file...',
  practiceModeSequential: 'Sequential Practice',
  practiceModeSequentialDesc: 'Go through questions in order from the bank',
  practiceModeRandom: 'Random Practice',
  practiceModeRandomDesc: 'Questions and options are shuffled randomly',
  practiceModeMock: 'Mock Exam',
  practiceModeMockDesc: 'Randomly generate an exam from different question types',
  practiceSelectBank: 'Select Bank',
  practiceSelectModeTitle: 'Choose Practice Mode',
  practiceStartBtn: 'Start Practice',
  practiceMockConfigTitle: 'Mock Exam Settings',
  practiceMockTypes: 'Select Types',
  practiceMockCounts: 'Question Count',
  practiceMockGenerate: 'Generate Exam',
  practiceQuestions: '{n} Q',
  practiceProgress: 'Q {c}/{t}',
  practicePrevBtn: 'Previous',
  practiceNextBtn: 'Next',
  practiceSubmitBtn: 'Submit Answers',
  practiceSubmitConfirm: 'Confirm Submission',
  practiceSubmitConfirmMsg: 'You cannot change your answers after submission. Submit now?',
  practiceResultTitle: 'Practice Results',
  practiceScore: 'Score',
  practiceCorrect: 'Correct',
  practiceIncorrect: 'Incorrect',
  practiceAccuracy: 'Accuracy',
  practiceElapsed: 'Time',
  practiceReviewTitle: 'Review',
  practiceReviewQuestion: 'Question',
  practiceReviewYourAnswer: 'Your Answer',
  practiceReviewCorrectAnswer: 'Correct Answer',
  practiceReviewAnalysis: 'Analysis',
  practiceReviewEmptyAnalysis: 'No analysis available',
  practiceRetryBtn: 'Retry',
  practiceBackToBanks: 'Back to Banks',
  practiceDeleteBank: 'Delete',
  practiceDeleteConfirm: 'Are you sure you want to delete this bank?',
  practiceSelfCheck: 'Self Check',
  practiceSelfCheckHint: 'The correct answer is shown. Please judge your own answer.',
  practiceSaveAsBank: 'Save as Bank',
  practiceSavedAsBank: 'Saved as question bank',
  practiceSourceAI: 'AI Generated',
  practiceSourceImport: 'Imported',
  practiceChooseFile: 'Choose File',
  practiceFileHint: 'CSV or XLSX format',
  practiceRemoveFile: 'Remove',
  practiceMinutes: 'min',
  practiceSeconds: 'sec',

  practiceModeExam: 'Exam Mode',
  practiceModeFlashcard: 'Flashcard Mode',
  practiceConfirmAnswer: 'Confirm Answer',
  practiceClickToSubmit: 'Click option to submit',
  practiceCorrectAdvancing: 'Correct! Advancing...',
  practiceInputAnswer: 'Enter answer...',
  practiceInputAnswerShort: 'Enter answer...',
  practiceSelfCheckCorrect: 'Correct',
  practiceSelfCheckWrong: 'Wrong',
  practiceUnanswered: '(Unanswered)',
  practiceContinuePractice: 'Continue Practice',
  practiceWrongPractice: 'Wrong Questions',
  practiceContinue: 'Continue',
  practiceEnterBank: 'Enter',
  practiceCancel: 'Cancel',
  practiceClear: 'Clear',
  practiceClearProgress: 'Clear Practice Progress',
  practiceClearProgressMsg: 'Clear current practice progress? You will need to start over.',
  practiceUnansweredCount: '{n} questions unanswered',
  practiceAnswerSheet: 'Answer Sheet',
  practiceQuestionCount: 'Q {c}/{t}',
  practiceUnansweredShort: '{n} Unanswered',
  practiceRemoveWrong: 'Remove from Wrong',
  practiceQuestionGone: '(Question no longer exists)',
  practiceUnknownBank: 'Unknown Bank',
  practiceAnsweredCount: '{a}/{t} answered',
  practiceQuestionUnit: '{n} Q',
  practiceMultiFileHint: 'Multiple files supported, drag & drop',
  practiceFileCount: '{n} files',
  practiceAddFile: '+ Add File',
  practiceClearAll: 'Clear All',
  practiceImportCount: '{n} questions total',
  practiceImportColType: 'Type',
  practiceImportColStem: 'Stem',
  practiceImportColAnswer: 'Answer',
  practiceImportColAnalysis: 'Analysis',
    practiceDownloadTemplate: 'Download Template',
    practiceExportBank: 'Export',
    practiceMapTitle: 'Map Columns',
    practiceMapHint: 'Some required columns could not be detected. Please map them manually.',
    practiceMapFieldOptions: 'Option columns',
    practiceMapFieldCombined: 'Combined options column',
    practiceMapNone: 'None',
    practiceMapMultiColumn: 'Multiple option columns',
    practiceMapCombinedColumn: 'Single combined column',
    practiceMapDelimiter: 'Delimiter',
    practiceMapDelimiterAuto: 'Auto detect',
    practiceMapApply: 'Apply & Preview',
    practiceMapSplitPreview: 'Split preview',
    practiceMapRequired: 'Required',
  practiceLangZh: 'Chinese',
  practiceLangEn: 'English',

  wrongModeTitle: 'Wrong Questions',
  wrongModeDesc: 'Practice only questions you got wrong before',
  wrongQuestionsBtn: 'Wrong Qs',
  wrongQuestionsManage: 'Wrong',
  wrongCount: 'wrong',
  wrongTimesCount: 'Wrong {n} times',
  wrongSortTitle: 'Sort Order',
  wrongSortCountDesc: 'Most Wrong',
  wrongSortCountAsc: 'Least Wrong',
  wrongSortTimeDesc: 'Most Recent',
  wrongSortTimeAsc: 'Oldest First',
  wrongRemoved: 'Removed from wrong questions',
  wrongAutoRemoved: 'Correct 3 times in a row, removed from wrong questions',
  wrongClearConfirm: 'Clear All Wrong Questions',
  wrongClearConfirmMsg: 'Are you sure you want to clear all wrong questions for this bank?',
  wrongClearBtn: 'Clear All',
  wrongManagerTitle: 'Wrong Questions',
  wrongManagerEmpty: 'No wrong questions',
  wrongNoWrong: 'No Wrong Questions',

  btnStart: 'Start Generating',
  btnBack: 'Back',
  langZh: '中',
  langEn: 'En',

  // Search
  searchTitle: 'Question Search',
  searchSubtitle: 'Choose a search mode',
  searchModeText: 'Text Search',
  searchModeTextDesc: 'Type the question to search your local banks, with AI answers',
  searchModePhoto: 'Photo Search',
  searchModePhotoDesc: 'Snap or upload a photo of the question',
  searchModeCameraLive: 'Live Camera Search',
  searchModeCameraLiveDesc: 'AI watches questions through your camera in real time',
  searchModeScreenRecord: 'Live Screen Search',
  searchModeScreenRecordDesc: 'AI watches your desktop screen in real time',
  searchScreenRecordStart: 'Start Recording',
  searchScreenRecordStop: 'Stop Recording',
  searchScreenRecordNotSupported: 'Screen recording search is available on desktop (Windows / macOS / Linux) and Android; not supported on iOS due to system restrictions',
  searchScreenRecordDesc: 'After starting, adjust the recording frame over the question area for real-time AI recognition',
  searchScreenRecordAnswer: 'Answer',
  searchScreenRecordNoMatch: 'No matching question found',
  searchScreenRecordLoading: 'Loading model…',
  searchScreenRecordCollapse: 'Collapse',
  searchScreenRecordAdjust: 'Adjust area',
  searchScreenRecordExit: 'Exit recording',
  searchScreenRecordAdjustHint: 'Drag the frame to cover the question area',
  searchScreenRecordResume: 'Done, resume recording',
  searchScreenRecordPaused: 'Adjusting frame, recognition paused',
  searchScreenRecordOverlayPerm: 'Please grant "Display over other apps" permission in Settings and try again',
  searchScreenRecordProjectionDenied: 'Screen capture permission was denied',
  searchScreenRecordScreenPerm: 'Screen recording search requires the macOS "Screen Recording" permission. System Settings has been opened — enable this app under Privacy & Security → Screen Recording (or your terminal/iTerm in dev), then restart the app and try again',
  searchCameraLiveStart: 'Start Scanning',
  searchCameraLivePause: 'Pause',
  searchCameraLiveResume: 'Resume',
  searchCameraLiveExit: 'Exit',
  searchCameraLiveNoMatch: 'No matching question found',
  searchCameraLiveStartFailed: 'Camera failed to start',
  searchCameraLivePermissionDenied: 'Please allow camera permission in Settings and try again',
  searchCameraLivePausedLabel: 'Paused',
  searchCameraLiveOpenSettings: 'Open Settings',
  searchComingSoon: 'Coming soon',
  searchNotSupported: 'Not available on this platform',
  searchInputPlaceholder: 'Type the question…',
  searchSettings: 'Search Settings',
  searchBankScope: 'Banks',
  searchAllBanks: 'All banks',
  searchMatchScope: 'Match scope',
  searchMatchStem: 'Stem only',
  searchMatchStemOptions: 'Stem + options',
  searchTypeFilter: 'Question types',
  searchResultCount: 'Found {count} related questions',
  searchNoResults: 'No matching questions',
  searchNoResultsHint: 'Try adjusting the settings, or ask AI',
  searchNoBanks: 'No local banks yet — ask AI directly',
  searchAskAI: 'Ask AI',
  searchAiThinking: 'AI is thinking…',
  searchCancel: 'Cancel',
  searchRetry: 'Retry',
  searchShowAnalysis: 'Show analysis',
  searchHideAnalysis: 'Hide analysis',
  searchSimilarity: 'Similarity',
  searchNotConfigured: 'Please configure AI first',
  searchGotoConfig: 'Go to settings',
  searchExactMatches: 'Exact matches',
  searchFuzzyMatches: 'Fuzzy matches',
  searchPhotoLoadingModel: 'Loading OCR model…',
  searchPhotoRecognizing: 'Recognizing…',
  searchPhotoEmpty: 'No text recognized — try a clearer photo or type it manually',
  searchPhotoTake: 'Take photo',
  searchPhotoUpload: 'Upload image',
  searchPhotoReselect: 'Choose another',
  searchPhotoDropHint: 'Drop an image here, or use the buttons below',

  // Practice grading
  practiceSubmitAuto: 'Submit',
  practiceSubmitAutoHint: 'Submit = auto-graded; must match the answer exactly (case-insensitive)',
  practiceRevealAnswer: 'Show answer',
  practiceRevealHint: 'Show answer = judge yourself after viewing it',
  practiceAiJudge: 'Submit & AI grade',
  practiceAiJudgeHint: 'Submit = AI grades against the reference answer',
  practiceAiJudging: 'AI grading…',
  practiceAiFeedback: 'AI feedback',
  practiceRegradeHint: 'Disagree with the verdict? Regrade manually',

  // Cookie consent
  cookieBannerText: 'We use cookies and local storage to save your preferences, question banks, and practice records. By continuing to use this site, you consent to our data storage policy.',
  cookieBannerAccept: 'Got it',

  // Updater
  updateAvailableTitle: 'Update available: v{version}',
  updateAvailableBody: 'A new version is available. Download and install it now?',
  updateNow: 'Update now',
  updateLater: 'Later',
  updateDownloading: 'Downloading update…',
  updateReady: 'Update ready. Restart the app to apply.',
  updateRestart: 'Restart',
  updateFailed: 'Update failed. Please download manually from GitHub Releases later.',
}
