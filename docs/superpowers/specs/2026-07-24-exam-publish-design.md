# 考试发布/参加功能 设计文档

日期：2026-07-24
状态：已确认

## 背景与目标

Exameow 目前生成题目后只能本地练习或导出。本功能让教师可把生成的试卷发布到 Cloudflare 中转服务（`https://exam.superagentparty.com`），获得 6 位校验码；学生凭码参加限时考试；教师凭管理链接查看成绩。考试数据在 D1 缓存 7 天后自动删除（2026-07-25 修订：原 R2 方案，因 R2 超额自动扣费且无法设硬上限，迁移至 D1 免费版——硬墙不扣费，且写额度超过 Worker 瓶颈）。

三端（CF 网页版 / Tauri 桌面移动端 / Docker 版）通过纯 HTTPS 调用中转服务，均可使用。

## 关键决策（已与用户确认）

| 决策点 | 结论 |
|--------|------|
| 部署形态 | 同一个 exameow Worker 加自定义域 `exam.superagentparty.com`，不新建独立 Worker |
| 存储 | **D1**（2026-07-25 修订）：免费 10 万写行/500 万读行每天，硬墙不扣费、无需绑卡；SQL 事务防并发丢成绩 |
| 学生身份 | 仅输入姓名，无账号体系；同名允许，按提交时间区分 |
| 考试形态 | 限时模拟考，倒计时在学生本地 enforce；考试有开始/结束时间窗口（服务端校验） |
| 答案可见性 | 学生交卷后即可看答案与解析 |
| 教师成绩访问 | 发布时返回含管理 token 的专属链接，任何设备可打开 |
| 判分 | 服务端判分，未交卷前不下发答案 |
| 校验码 | 6 位数字+字母，排除混淆字符 |

## 架构

同一个 Worker 增加 D1 binding `EXAM_DB`（库名 `exameow-exams`）+ Cron Trigger 每日清理过期数据。Worker 通过 Cloudflare 自定义域绑定 `exam.superagentparty.com`。

前端新增独立的 `api/relay.ts`，不经过 `api/index.ts` 的平台路由分发——任何平台都直接 fetch 中转域名（base URL 固定，可用 `VITE_EXAM_RELAY` 环境变量覆盖）。

## D1 数据结构（2026-07-25 修订：由 R2 迁移至 D1，用户不启用 R2 以避免超额扣费）

两张表（schema 见 `workers/migrations/0001_init.sql`）：

- `exams`：`code` PK、`title`、`questions`(JSON 含答案）、`start_at`、`end_at`、`duration_minutes`、`created_at`、`admin_token_hash`
- `results`：`id` PK、`code`（有索引）、`name`、`answers`(JSON)、`score`、`total_score`、`correct_count`、`total_count`、`pending_count`、`duration_sec`、`submitted_at`、`detail`(JSON，每题 isCorrect)

7 天过期双保险：读取时懒删（过期即 DELETE 两表对应行）+ Cron Trigger 每日批量清理 `created_at`/`submitted_at` 超过 7 天的行。D1 事务保证并发交卷不丢成绩；成绩查询走索引 `ORDER BY score DESC, submitted_at ASC LIMIT 500`。

## Worker API（4 个新端点）

### POST /api/exam/publish
- 入参：`{ title, questions, startAt, endAt, durationMinutes }`
- 校验：题目数 1–500，payload ≤ 5MB，窗口时长 ≤ 7 天，durationMinutes > 0
- 生成 6 位码（字符集 `ABCDEFGHJKMNPQRSTUVWXYZ23456789`，31 字符，约 8.9 亿组合），SELECT 查重，冲突则重试
- 生成 128-bit 随机管理 token，仅存 SHA-256 哈希到考试对象
- 返回：`{ code, adminToken, manageUrl }`

### GET /api/exam/code/{code}
- 校验考试存在、当前时间在 [startAt, endAt] 窗口内（窗口外返回 403 及明确提示）
- **剥离每题的 answer/analysis 字段**后返回：`{ title, questions, startAt, endAt, durationMinutes }`

### POST /api/exam/code/{code}/submit
- 入参：`{ name, answers, durationSec }`
- 校验窗口：仅当提交时间 ≤ endAt 时接受交卷，逾期返回 403（学生在 endAt 前开始但未答完的，以 endAt 为硬性截止，前端应在接近 endAt 时提示并提前自动交卷）
- 服务端判分：
  - 单选/判断：精确比对
  - 多选：集合相等（无序）
  - 填空：忽略大小写与首尾空格比对
  - 简答：标记"待教师评阅"，不参与自动判分；`score`/`totalScore` 仅统计客观题，简答题数量在结果中单独字段 `pendingCount` 返回
- 写 `results/{code}/{uuid}.json`
- 返回：`{ score, totalScore, correctCount, totalCount, questions }`（含完整答案解析）

### GET /api/exam/code/{code}/results?token=
- SHA-256(token) 与 adminTokenHash 比对，失败返回 403
- list `results/{code}/` 前缀 + 逐个 GET，返回成绩列表（含每题作答明细）

## 前端改动

### api/relay.ts（新增）
4 个函数对应上述端点：`publishExam()`、`fetchExam()`、`submitExam()`、`fetchResults()`。

### GenerateView
- 出题结果工具栏加 **「发布考试」** 按钮 → 弹窗：考试名称、开始时间、结束时间、时长（分钟）→ 成功页显示大号 6 位码 + 管理链接 + 复制按钮
- 发布记录存入 localStorage `exameow-published`（code、title、manageUrl、发布时间）
- 加 **「参加考试」** 按钮 → 弹窗输入 6 位码 + 姓名 → 跳转答题页

### 答题页（新路由 `#/take/:code`）
- 复用 PracticeView mock 模式 UI 组件
- 进入时 GET 取题，本地倒计时（分钟级），到点自动交卷
- 交卷后展示分数 + 每题对错 + 答案解析

### 成绩页（新路由 `#/manage/:code?token=`）
- 教师成绩表格：姓名、分数、正确数、用时、提交时间，按分数排序
- 可展开查看每题作答明细

### i18n
中英文 key 同步补全。

## 安全

- 答案永不下发给未交卷者（取题时服务端剥离）
- 管理 token 只存 SHA-256 哈希；泄露 6 位码无法查看成绩
- 6 位码查重生成，防碰撞
- 窗口外取题/交卷返回 403 及明确文案

## 部署改动

- `wrangler.toml`：D1 binding `EXAM_DB` + 自定义域 route + Cron Trigger
- `scripts/deploy-cf.sh`：幂等创建 D1 库、注入 database_id、应用 migrations
- 版本号四处同步 bump（root package.json、src-tauri/Cargo.toml、src-tauri/tauri.conf.json、workers/package.json）

## 容量估算（D1 免费版）

单场 50 人考试约 51 行写入 → 免费额度（10 万写行/天）支撑约 **1,960 场/天**；读（5 百万行/天）更远超需求。真正瓶颈是 Worker 免费版 10 万请求/天 ≈ **950 场/天**（约 4.7 万学生交卷）。D1 与 Worker 均为硬墙，超额报错不扣费。

## 验证方式

无测试套件。验证手段：
- `cd workers && pnpm typecheck`
- `cd frontend && pnpm run type-check`
- `wrangler dev` 本地手动走通：发布 → 凭码取题（确认无答案字段）→ 交卷判分 → 管理链接看成绩 → 窗口外访问返回 403
