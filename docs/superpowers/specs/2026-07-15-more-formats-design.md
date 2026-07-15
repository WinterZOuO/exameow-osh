# Document Format Expansion Design — 出题上传格式扩展

**Date:** 2026-07-15
**Status:** Approved

## Problem

出题(generate)流程目前仅支持 `txt` / `docx` / `pdf`。用户需要:

1. 类 TXT 文件(md、py 等代码/标记文本)直接可用
2. CSV / XLSX 表格文档,且分块时不丢失表头语义
3. 其他常见格式:PPTX、HTML/HTM、ODT、EPUB
4. 未知扩展名的文本文件不应直接拒绝

现状还有一个隐藏缺陷:`extract_txt` 用 `read_to_string`,GBK/GB18030 编码的中文文本文件会解析失败。

## Scope

- **Rust 解析层** `packages/core/src/parser/`(Tauri 与 Axum server 共用,天然双端生效)
- **前端** `FileUploader.vue`(选择器过滤)、`exam.ts`(扩展名传递 + 表格感知分块)、`locales.ts`(文案)
- **新增依赖(仅 2 个)**:`calamine`(Excel/ODS,纯 Rust)、`encoding_rs`(编码回退)

## Design

### 1. FileFormat 分发(parser/mod.rs)

```rust
pub enum FileFormat {
    PlainText,  // txt + 白名单 + 未知扩展名回退
    Docx, Pdf,
    Csv,
    Excel,      // xlsx / xlsm / xls / ods (calamine)
    Pptx,
    Html,       // html / htm
    Odt,
    Epub,
}
```

`from_extension` 规则:

- 白名单 → `PlainText`:`txt md markdown py js ts jsx tsx mjs cjs java c cpp cc h hpp cs go rs rb php swift kt kts sql sh bash zsh bat ps1 json yaml yml toml xml ini cfg conf log tex r lua pl scala dart vue svelte css scss less`(注意:html/htm 不在白名单,走 Html 解析)
- `csv` → Csv;`xlsx xlsm xls ods` → Excel;`pptx` → Pptx;`html htm` → Html;`odt` → Odt;`epub` → Epub;`docx` → Docx;`pdf` → Pdf
- **其他任何扩展名(含无扩展名)→ `PlainText` 回退**,不再返回 `Unsupported`;若字节内容无法按文本解码,由文本读取器报错(见下)

### 2. 文本读取器(parser/txt.rs 重写)

`read_text_lossy(path) -> Result<String>`:

1. 读原始字节
2. UTF-8(含 BOM)严格解码成功 → 返回
3. 失败 → `encoding_rs` 按 GB18030 解码;若替换字符(U+FFFD)比例 > 5% 或含大量 NUL 字节 → 判定为二进制,报 `ParserError::Unsupported("binary or unknown-encoding file")`
4. 空内容(trim 后为空)沿用现有报错

所有 `PlainText` 走此函数。

### 3. 表格解析(parser/csv.rs、parser/excel.rs)

输出统一为 Markdown 表格文本:

- CSV(现有 `csv` crate,自动嗅探是否有表头,直接首行作表头):

  ```
  | col1 | col2 |
  | --- | --- |
  | v1 | v2 |
  ```

- Excel(`calamine`):每个非空 sheet 输出一节:

  ```
  ### <sheet 名>

  | ... 表格 ... |
  ```

  sheet 间以空行分隔。单元格值按 calamine 的 DataType 转字符串(数字去尾零,日期按 ISO 格式)。空行/空列跳过;单元格内的 `|` 和换行转义为空格。

### 4. PPTX / HTML / ODT / EPUB

- **pptx.rs**:zip 读 `ppt/slides/slide{N}.xml`(按 N 数值排序),quick-xml 提取 `<a:t>` 文本;每页输出 `### Slide N` + 文本。复用 docx.rs 的解析模式。
- **html.rs**:轻量去标签(无新依赖):删除 `<script>`/`<style>`/注释块 → 块级标签(p、div、br、li、tr、h1-h6 等)转换行 → 剥其余标签 → 解码常见实体(`&amp; &lt; &gt; &quot; &#39; &nbsp;` 及数字实体)→ 压缩连续空行。输入字节同样过 `read_text_lossy` 的编码逻辑。
- **odt.rs**:zip 读 `content.xml`,quick-xml 提取文本事件;`<text:p>`/`<text:h>` 结束时输出换行。
- **epub.rs**:zip 读 `META-INF/container.xml` → 定位 OPF → 按 spine 顺序取 xhtml 章节,每章经 html 去标签后拼接;OPF 解析失败时回退为按 zip 内 `.xhtml/.html` 条目名自然排序。

### 5. 前端分块优化(exam.ts)

现有 `chunkTextBySize` 按 `\n\n`(段落)优先、`\n` 回退切分;表格是单 `\n` 行流,会被切碎且丢表头。新增表格感知:

- 切分单元识别:若某"段落"以 `|` 开头且含表格分隔行(`| --- |`),视为表格块
- 表格块过大需要切分时:按行切,**每个子块头部复制表头两行(标题行 + `| --- |` 行)及其上方最近的 `###` 节标题(如有)**
- `splitTextChunk` 同步扩展:现有 `## 文件名` 头保留逻辑之外,若 body 前部是表头两行,也复制到两半

### 6. 前端选择器与文案

- `FileUploader.vue`:
  - Tauri dialog filters:
    - `Documents: txt docx pdf pptx html htm odt epub csv xlsx xlsm xls ods md markdown`
    - `Text & Code: py js ts jsx tsx java c cpp h hpp cs go rs rb php swift kt sql sh bat ps1 json yaml yml toml xml ini cfg conf log tex lua vue css`
    - `All Files: *`(配合未知扩展名 UTF-8 回退)
  - web `<input accept>` 同步扩展(逗号列表 + 保持可选任意文件不强校验)
- `locales.ts` `genFileHint`:
  - zh:`支持 DOCX、PDF、PPTX、HTML、EPUB、表格(CSV/XLSX)及任意文本/代码文件`
  - en:`DOCX, PDF, PPTX, HTML, EPUB, spreadsheets (CSV/XLSX), and any text/code file`

### 7. Server 路径(routes.rs)

删除 `ext == "txt"` 的特判(`parse_file` 的 PlainText 路径已覆盖且更健壮),其余不动 —— 新格式经共用 core 自动生效。

## Error Handling

- 二进制/未知编码 → `ParserError::Unsupported("binary or unknown-encoding file")`,前端沿现有错误通道展示
- zip 结构缺失(如 pptx 无 slides)→ `ParserError::Parse(...)` 带具体信息
- 解析结果为空文本 → 沿用现有 "empty file" 报错

## Testing

`packages/core` 已有 Rust 测试基建(cargo test)。为每个新解析器写单元测试:

- 纯文本:UTF-8、GB18030、二进制拒绝、未知扩展名回退
- CSV/Excel:表头 + 数据行 → Markdown 表格断言(Excel 用代码生成的最小 xlsx fixture)
- PPTX/ODT/EPUB:代码内构造最小 zip fixture(手工拼 xml)断言提取文本
- HTML:标签剥离、实体解码、script/style 剔除
- 前端分块:无测试框架,类型检查 + 手动验证(上传大 CSV 看分块请求内容)

## Out of Scope

- OCR / 扫描版 PDF
- DOC(97-2003 Word 二进制格式)、PPT(二进制)
- RTF
- 前端 web 纯浏览器模式本地解析新二进制格式(仍由 server 解析)
