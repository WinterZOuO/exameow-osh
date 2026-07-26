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
  navMine: string

  // Mine
  mineSubtitle: string
  mineAIConfig: string
  mineAIConfigDesc: string
  minePublished: string
  minePublishedDesc: string
  mineJoined: string
  mineJoinedDesc: string
  mineRecords: string
  mineRecordsDesc: string
  recordsTotal: string
  recordsAccuracy: string
  recordsStreak: string
  recordsActiveDays: string
  recordsTypeDist: string
  recordsTodayAccuracy: string
  recordsTrend: string
  recordsTrendCount: string
  recordsTrendAccuracy: string
  recordsLess: string
  recordsMore: string
  recordsDayTooltip: string
  publishedEmpty: string
  joinedEmpty: string
  joinedNotSubmitted: string
  joinedReenter: string
  pubViewResults: string
  pubDeleteRecord: string
  pubDeleteConfirm: string
  privacyTitle: string
  termsTitle: string
  cookieBannerLearnMore: string

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

  // Mobile OTA
  otaCheckUpdate: string
  otaCurrentBundle: string
  otaBuiltin: string
  otaChecking: string
  otaUpToDate: string
  otaStaged: string
  otaShellTooOld: string
  otaFailed: string

  pubPublish: string
  pubJoin: string
  pubDialogTitle: string
  pubFieldTitle: string
  pubFieldTitlePlaceholder: string
  pubFieldStart: string
  pubFieldDuration: string
  presetNow: string
  presetIn1Hour: string
  presetTomorrow8: string
  pubConfirm: string
  pubPublishing: string
  pubCancel: string
  pubSuccessTitle: string
  pubCodeLabel: string
  pubManageLinkLabel: string
  pubCopy: string
  pubCopied: string
  pubClose: string
  pubErrorInvalid: string
  pubMyPublished: string
  pubLaunch: string
  launchSelectBanks: string
  launchNoBanks: string
  launchTypeCounts: string
  launchTotal: string
  launchExamSettings: string
  launchErrorNoQuestions: string
  launchPoints: string
  pubExamLink: string
  manageLiveHint: string
  manageRefresh: string
  joinedViewResult: string
  joinedViewWrong: string
  joinedWrongTitle: string
  joinedNoWrong: string
  takeAlreadySubmitted: string
  takeEnterName: string
  reportBtn: string
  reportDialogTitle: string
  reportReasonPlaceholder: string
  reportSubmit: string
  reportThanks: string
  takeReported: string
  pubRateLimited: string
  adminTitle: string
  adminLogin: string
  adminTokenPlaceholder: string
  adminForceChange: string
  adminNewToken: string
  adminNewTokenConfirm: string
  adminChangeToken: string
  adminTokenMismatch: string
  adminNoReports: string
  adminReportCount: string
  adminRestore: string
  adminDeleteConfirm: string
  joinDialogTitle: string
  joinCodeLabel: string
  joinNameLabel: string
  joinConfirm: string
  takeLoading: string
  takeNotFound: string
  takeNotStarted: string
  takeEnded: string
  takeTimeLeft: string
   takeSubmit: string
   takeSubmitConfirm: string
   takeSubmitting: string
   takeSubmitFailed: string
  takeScore: string
  takePendingReview: string
  takeYourAnswer: string
  takeCorrectAnswer: string
  takeUnanswered: string
  takePendingShort: string
  takeBackHome: string
  manageTitle: string
  manageUnauthorized: string
  manageNoResults: string
  manageColName: string
  manageColScore: string
  manageColCorrect: string
  manageColDuration: string
  manageColTime: string
}

export const zh: LocaleMessages = {
  appName: '过了喵',
  appSubtitle: 'AI 智能出题',

  navConfig: '配置',
  navGenerate: '出题',
  navPreview: '预览',
  navPractice: '刷题',
  navSearch: '搜题',
  navMine: '我的',

  // Mine
  mineSubtitle: '管理我的 AI 算力与考试',
  mineAIConfig: '算力配置',
  mineAIConfigDesc: '模型服务商与密钥',
  minePublished: '我发起的考试',
  minePublishedDesc: '校验码与成绩管理',
  mineJoined: '我参与的考试',
  mineJoinedDesc: '成绩与再次进入',
  mineRecords: '练习记录',
  mineRecordsDesc: '练习热力与数据统计',
  recordsTotal: '累计练习',
  recordsAccuracy: '正确率',
  recordsStreak: '连续打卡',
  recordsActiveDays: '活跃天数',
  recordsTypeDist: '题型分布',
  recordsTodayAccuracy: '今日正确率',
  recordsTrend: '练习趋势',
  recordsTrendCount: '题量',
  recordsTrendAccuracy: '正确率',
  recordsLess: '少',
  recordsMore: '多',
  recordsDayTooltip: '{n} 题',
  publishedEmpty: '还没有发起过考试',
  joinedEmpty: '还没有参与过考试',
  joinedNotSubmitted: '未交卷',
  joinedReenter: '进入',
  pubViewResults: '查看成绩',
  pubDeleteRecord: '删除记录',
  pubDeleteConfirm: '删除后学生将无法进入考试，所有成绩也将一并清除。确定删除？',
  privacyTitle: '隐私政策',
  termsTitle: '用户协议',
  cookieBannerLearnMore: '了解详情',

  configTitle: '算力配置',
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
  cookieBannerText: '我们使用本地存储保存您的偏好、题库与考试记录;在线考试数据在服务器最多保留 7 天。不使用追踪 Cookie。',
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

  // Mobile OTA
  otaCheckUpdate: '检查更新',
  otaCurrentBundle: '当前界面包',
  otaBuiltin: '内置',
  otaChecking: '正在检查…',
  otaUpToDate: '已是最新',
  otaStaged: 'v{version} 已下载，重启应用后生效',
  otaShellTooOld: 'v{version} 需要升级 APP 本体，请前往 Release 页下载安装',
  otaFailed: '检查更新失败',

  pubPublish: '发布考试',
  pubJoin: '参加考试',
  pubDialogTitle: '发布考试',
  pubFieldTitle: '考试名称',
  pubFieldTitlePlaceholder: '例如：高三数学期末模拟',
  pubFieldStart: '开始时间',
  pubFieldDuration: '考试时长（分钟）',
  presetNow: '现在',
  presetIn1Hour: '1 小时后',
  presetTomorrow8: '明天 8:00',
  pubConfirm: '发布',
  pubPublishing: '发布中...',
  pubCancel: '取消',
  pubSuccessTitle: '发布成功！',
  pubCodeLabel: '学生校验码',
  pubManageLinkLabel: '成绩管理链接（仅你可见，请保存）',
  pubCopy: '复制',
  pubCopied: '已复制',
  pubClose: '完成',
  pubErrorInvalid: '请完整填写所有字段',
  pubMyPublished: '我发布的考试',
  pubLaunch: '发起考试',
  launchSelectBanks: '选择题库',
  launchNoBanks: '暂无本地题库，请先在练习页生成或导入',
  launchTypeCounts: '各题型出题数',
  launchTotal: '试卷共 {n} 题',
  launchExamSettings: '考试设置',
  launchErrorNoQuestions: '请选择题库，并确保出题数大于 0',
  launchPoints: '分值',
  pubExamLink: '考试链接',
  manageLiveHint: '考试进行中，成绩将在结束后更新（结束后自动查询一次，节省资源）',
  manageRefresh: '刷新',
  joinedViewResult: '查看成绩',
  joinedViewWrong: '查看错题',
  joinedWrongTitle: '错题回顾',
  joinedNoWrong: '本次考试没有错题，全部答对！',
  takeAlreadySubmitted: '你已交卷，不能重复进入考试',
  takeEnterName: '请输入你的姓名',
  reportBtn: '举报',
  reportDialogTitle: '举报考试',
  reportReasonPlaceholder: '请描述问题（选填）',
  reportSubmit: '提交举报',
  reportThanks: '已收到举报，感谢反馈',
  takeReported: '该考试因被举报已暂停',
  pubRateLimited: '发布次数已达今日上限，请明天再试',
  adminTitle: '管理员',
  adminLogin: '管理员登录',
  adminTokenPlaceholder: '管理密钥',
  adminForceChange: '默认密钥必须修改后才能继续',
  adminNewToken: '新管理密钥',
  adminNewTokenConfirm: '确认新密钥',
  adminChangeToken: '修改密钥',
  adminTokenMismatch: '两次输入的密钥不一致',
  adminNoReports: '暂无被举报的考试',
  adminReportCount: '{n} 个 IP 举报',
  adminRestore: '恢复',
  adminDeleteConfirm: '确定删除考试 {code} 及其全部成绩？',
  joinDialogTitle: '参加考试',
  joinCodeLabel: '6 位校验码',
  joinNameLabel: '你的姓名',
  joinConfirm: '进入考试',
  takeLoading: '加载考试中...',
  takeNotFound: '考试不存在或已过期',
  takeNotStarted: '考试尚未开始，开始时间：{time}',
  takeEnded: '考试已结束',
  takeTimeLeft: '剩余时间',
   takeSubmit: '交卷',
   takeSubmitConfirm: '确定交卷吗？还有 {n} 题未作答。',
   takeSubmitting: '交卷中...',
   takeSubmitFailed: '交卷失败，请重试',
  takeScore: '得分',
  takePendingReview: '{n} 道简答题待教师评阅，未计入得分',
  takeYourAnswer: '你的作答',
  takeCorrectAnswer: '参考答案',
  takeUnanswered: '未作答',
  takePendingShort: '待评阅',
  takeBackHome: '返回首页',
  manageTitle: '成绩管理',
  manageUnauthorized: '管理链接无效',
  manageNoResults: '暂无学生交卷',
  manageColName: '姓名',
  manageColScore: '得分',
  manageColCorrect: '答对',
  manageColDuration: '用时',
  manageColTime: '交卷时间',
}

export const en: LocaleMessages = {
  appName: 'Exameow',
  appSubtitle: 'AI Question Generator',

  navConfig: 'Config',
  navGenerate: 'Generate',
  navPreview: 'Preview',
  navPractice: 'Practice',
  navSearch: 'Search',
  navMine: 'Mine',

  // Mine
  mineSubtitle: 'Manage my AI compute and exams',
  mineAIConfig: 'AI Config',
  mineAIConfigDesc: 'Endpoint, key & model',
  minePublished: 'My Launched Exams',
  minePublishedDesc: 'Codes & results',
  mineJoined: 'My Joined Exams',
  mineJoinedDesc: 'Scores & re-entry',
  mineRecords: 'Practice Records',
  mineRecordsDesc: 'Activity heatmap & stats',
  recordsTotal: 'Total Practiced',
  recordsAccuracy: 'Accuracy',
  recordsStreak: 'Day Streak',
  recordsActiveDays: 'Active Days',
  recordsTypeDist: 'Type Distribution',
  recordsTodayAccuracy: "Today's Accuracy",
  recordsTrend: 'Practice Trend',
  recordsTrendCount: 'Questions',
  recordsTrendAccuracy: 'Accuracy',
  recordsLess: 'Less',
  recordsMore: 'More',
  recordsDayTooltip: '{n} questions',
  publishedEmpty: 'No launched exams yet',
  joinedEmpty: 'No joined exams yet',
  joinedNotSubmitted: 'Not submitted',
  joinedReenter: 'Enter',
  pubViewResults: 'Results',
  pubDeleteRecord: 'Delete',
  pubDeleteConfirm: 'Students will no longer be able to take this exam, and all results will be deleted. Continue?',
  privacyTitle: 'Privacy Policy',
  termsTitle: 'Terms of Service',
  cookieBannerLearnMore: 'Learn more',

  configTitle: 'AI Config',
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
  cookieBannerText: 'We use local storage for your preferences, question banks, and exam records. Online exam data is kept on our server for at most 7 days. No tracking cookies.',
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

  // Mobile OTA
  otaCheckUpdate: 'Check for updates',
  otaCurrentBundle: 'Current UI bundle',
  otaBuiltin: 'built-in',
  otaChecking: 'Checking…',
  otaUpToDate: 'Up to date',
  otaStaged: 'v{version} downloaded; takes effect after restarting the app',
  otaShellTooOld: 'v{version} requires a newer app build; please install it from Releases',
  otaFailed: 'Update check failed',

  pubPublish: 'Publish Exam',
  pubJoin: 'Join Exam',
  pubDialogTitle: 'Publish Exam',
  pubFieldTitle: 'Exam Title',
  pubFieldTitlePlaceholder: 'e.g. Final Math Mock',
  pubFieldStart: 'Start Time',
  pubFieldDuration: 'Duration (minutes)',
  presetNow: 'Now',
  presetIn1Hour: 'In 1 hour',
  presetTomorrow8: 'Tomorrow 8:00',
  pubConfirm: 'Publish',
  pubPublishing: 'Publishing...',
  pubCancel: 'Cancel',
  pubSuccessTitle: 'Published!',
  pubCodeLabel: 'Access Code',
  pubManageLinkLabel: 'Results link (keep it private)',
  pubCopy: 'Copy',
  pubCopied: 'Copied',
  pubClose: 'Done',
  pubErrorInvalid: 'Please fill in all fields',
  pubMyPublished: 'My Published Exams',
  pubLaunch: 'Launch Exam',
  launchSelectBanks: 'Select Banks',
  launchNoBanks: 'No local banks yet. Generate or import one in Practice first.',
  launchTypeCounts: 'Questions per Type',
  launchTotal: '{n} questions in exam',
  launchExamSettings: 'Exam Settings',
  launchErrorNoQuestions: 'Select banks and set at least 1 question',
  launchPoints: 'Points',
  pubExamLink: 'Exam Link',
  manageLiveHint: 'Exam in progress. Results refresh after it ends (fetched once to save resources)',
  manageRefresh: 'Refresh',
  joinedViewResult: 'View Result',
  joinedViewWrong: 'Wrong Questions',
  joinedWrongTitle: 'Wrong Question Review',
  joinedNoWrong: 'No wrong questions — perfect score!',
  takeAlreadySubmitted: 'You have already submitted this exam and cannot re-enter',
  takeEnterName: 'Enter your name',
  reportBtn: 'Report',
  reportDialogTitle: 'Report Exam',
  reportReasonPlaceholder: 'Describe the issue (optional)',
  reportSubmit: 'Submit Report',
  reportThanks: 'Report received, thank you',
  takeReported: 'This exam has been suspended due to reports',
  pubRateLimited: 'Daily publish limit reached, try again tomorrow',
  adminTitle: 'Admin',
  adminLogin: 'Admin Login',
  adminTokenPlaceholder: 'Admin token',
  adminForceChange: 'Default token must be changed to continue',
  adminNewToken: 'New admin token',
  adminNewTokenConfirm: 'Confirm new token',
  adminChangeToken: 'Change Token',
  adminTokenMismatch: 'Tokens do not match',
  adminNoReports: 'No reported exams',
  adminReportCount: '{n} IP reports',
  adminRestore: 'Restore',
  adminDeleteConfirm: 'Delete exam {code} and all its results?',
  joinDialogTitle: 'Join Exam',
  joinCodeLabel: '6-digit Code',
  joinNameLabel: 'Your Name',
  joinConfirm: 'Start',
  takeLoading: 'Loading exam...',
  takeNotFound: 'Exam not found or expired',
  takeNotStarted: 'Exam has not started. Starts at {time}',
  takeEnded: 'Exam has ended',
  takeTimeLeft: 'Time Left',
   takeSubmit: 'Submit',
   takeSubmitConfirm: 'Submit now? {n} question(s) unanswered.',
   takeSubmitting: 'Submitting...',
   takeSubmitFailed: 'Submission failed, please retry',
  takeScore: 'Score',
  takePendingReview: '{n} short-answer question(s) pending teacher review, not scored',
  takeYourAnswer: 'Your Answer',
  takeCorrectAnswer: 'Correct Answer',
  takeUnanswered: 'Unanswered',
  takePendingShort: 'Pending',
  takeBackHome: 'Back Home',
  manageTitle: 'Exam Results',
  manageUnauthorized: 'Invalid management link',
  manageNoResults: 'No submissions yet',
  manageColName: 'Name',
  manageColScore: 'Score',
  manageColCorrect: 'Correct',
  manageColDuration: 'Time Used',
  manageColTime: 'Submitted At',
}
