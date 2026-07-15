# Document Format Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the generate-questions upload pipeline to parse any text/code file (with encoding fallback), CSV/Excel (markdown tables + table-aware chunking), PPTX, HTML, ODT, and EPUB.

**Architecture:** All parsing lives in `packages/core/src/parser/` (shared by Tauri and Axum server, so both entry points gain formats automatically). `FileFormat::from_extension` gets new variants plus a PlainText catch-all fallback (unknown extensions are tried as text; binary content is rejected by the text reader, not the dispatcher). Frontend gets wider file-picker filters and a table-aware chunker that copies markdown table headers into every chunk.

**Tech Stack:** Rust (quick-xml 0.37, zip 2, csv 1 — already present; NEW: calamine 0.26, encoding_rs 0.8), Vue 3 + TypeScript frontend.

**Spec:** `docs/superpowers/specs/2026-07-15-more-formats-design.md`

## Global Constraints

- Only two new runtime dependencies allowed: `calamine = "0.26"`, `encoding_rs = "0.8"` (both in `packages/core/Cargo.toml`). No new npm dependencies.
- Rust tests append to `packages/core/tests/parser_tests.rs`; run with `cargo test -p exambot-core --test parser_tests`. Test fixtures are generated inside tests (temp files via `std::env::temp_dir()`), NOT committed binaries — except the existing `tests/fixtures/sample.txt`.
- Frontend has no unit-test framework — verify with `pnpm --dir frontend type-check` (exit 0).
- Working dir: `D:\AI\ExamBot`, branch `main`, shell is PowerShell. If crates.io downloads fail, set `$env:http_proxy="http://127.0.0.1:7892"; $env:https_proxy="http://127.0.0.1:7892"` first.
- Error message for undecodable content must be exactly `binary or unknown-encoding file` (wrapped in `ParserError::Unsupported`).
- Markdown table format emitted by parsers: header row, then separator `|` + `" --- |"` × cols, then data rows; cells escape `|` as `\|` and newlines as spaces.
- Commit after every task with the message given in the task.

---

### Task 1: Text reader with encoding fallback (txt.rs rewrite)

**Files:**
- Modify: `packages/core/Cargo.toml` (add `encoding_rs = "0.8"`)
- Modify: `packages/core/src/parser/txt.rs` (full rewrite)
- Test: `packages/core/tests/parser_tests.rs` (append)

**Interfaces:**
- Consumes: `ParserError` from `parser/mod.rs` (unchanged).
- Produces: `pub fn extract_txt(path: &str) -> Result<String, ParserError>` (name kept, existing callers/tests untouched) and `pub(crate) fn read_text_lossy(path: &str) -> Result<String, ParserError>` used by Tasks 3 (csv) and 5 (html).

- [ ] **Step 1: Write the failing tests**

Append to `packages/core/tests/parser_tests.rs`:

```rust
#[test]
fn test_read_gb18030_txt() {
    let path = std::env::temp_dir().join("exambot_test_gb18030.txt");
    // "中文测试" in GB18030 bytes + ASCII tail
    let bytes: Vec<u8> = vec![0xD6, 0xD0, 0xCE, 0xC4, 0xB2, 0xE2, 0xCA, 0xD4, b' ', b'o', b'k'];
    std::fs::write(&path, &bytes).unwrap();
    let text = extract_txt(path.to_str().unwrap()).unwrap();
    assert!(text.contains("中文测试"));
    assert!(text.contains("ok"));
    let _ = std::fs::remove_file(&path);
}

#[test]
fn test_read_binary_rejected() {
    let path = std::env::temp_dir().join("exambot_test_binary.bin");
    std::fs::write(&path, [0u8, 159, 146, 150, 0, 0, 12, 255]).unwrap();
    let result = extract_txt(path.to_str().unwrap());
    assert!(matches!(result, Err(ParserError::Unsupported(_))));
    let _ = std::fs::remove_file(&path);
}

#[test]
fn test_read_utf8_bom_stripped() {
    let path = std::env::temp_dir().join("exambot_test_bom.txt");
    let mut bytes = vec![0xEF, 0xBB, 0xBF];
    bytes.extend_from_slice("hello bom".as_bytes());
    std::fs::write(&path, &bytes).unwrap();
    let text = extract_txt(path.to_str().unwrap()).unwrap();
    assert_eq!(text, "hello bom");
    let _ = std::fs::remove_file(&path);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: `test_read_gb18030_txt` and `test_read_binary_rejected` FAIL (`from_utf8`/read_to_string errors produce `Io`, not the new behavior); `test_read_utf8_bom_stripped` FAILS (BOM retained).

- [ ] **Step 3: Add dependency and rewrite txt.rs**

In `packages/core/Cargo.toml` `[dependencies]` add:

```toml
encoding_rs = "0.8"
```

Replace the full content of `packages/core/src/parser/txt.rs` with:

```rust
use super::ParserError;

pub fn extract_txt(path: &str) -> Result<String, ParserError> {
    read_text_lossy(path)
}

pub(crate) fn read_text_lossy(path: &str) -> Result<String, ParserError> {
    let bytes = std::fs::read(path)?;
    read_text_from_bytes(&bytes)
}

pub(crate) fn read_text_from_bytes(bytes: &[u8]) -> Result<String, ParserError> {
    let text = if bytes.starts_with(&[0xFF, 0xFE]) {
        decode_or_reject(encoding_rs::UTF_16LE, bytes)?
    } else if bytes.starts_with(&[0xFE, 0xFF]) {
        decode_or_reject(encoding_rs::UTF_16BE, bytes)?
    } else if bytes.iter().take(8192).any(|&b| b == 0) {
        return Err(ParserError::Unsupported(
            "binary or unknown-encoding file".to_string(),
        ));
    } else {
        match std::str::from_utf8(bytes) {
            Ok(s) => s.to_string(),
            Err(_) => decode_or_reject(encoding_rs::GB18030, bytes)?,
        }
    };
    let text = text.trim_start_matches('\u{feff}').to_string();
    if text.trim().is_empty() {
        return Err(ParserError::Parse("file is empty".to_string()));
    }
    Ok(text)
}

fn decode_or_reject(
    encoding: &'static encoding_rs::Encoding,
    bytes: &[u8],
) -> Result<String, ParserError> {
    let (cow, _, had_errors) = encoding.decode(bytes);
    let replaced = cow.chars().filter(|&c| c == '\u{FFFD}').count();
    let total = cow.chars().count().max(1);
    if had_errors && replaced * 20 > total {
        return Err(ParserError::Unsupported(
            "binary or unknown-encoding file".to_string(),
        ));
    }
    Ok(cow.into_owned())
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: all PASS (including the 3 pre-existing tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/Cargo.toml Cargo.lock packages/core/src/parser/txt.rs packages/core/tests/parser_tests.rs
git commit -m "feat: text reader with UTF-16/GB18030 fallback and binary rejection"
```

---

### Task 2: Dispatch — PlainText fallback for unknown extensions

**Files:**
- Modify: `packages/core/src/parser/mod.rs`
- Test: `packages/core/tests/parser_tests.rs` (modify existing test)

**Interfaces:**
- Produces: `FileFormat::PlainText` variant replacing `Txt`; `from_extension` never returns `Unsupported` anymore (catch-all → PlainText). Tasks 3-8 each add one variant + one match arm on top of this.

- [ ] **Step 1: Update the existing dispatch test (failing first)**

In `packages/core/tests/parser_tests.rs`, replace the body of `test_file_format_from_extension` with:

```rust
#[test]
fn test_file_format_from_extension() {
    assert!(matches!(FileFormat::from_extension("doc.pdf"), Ok(FileFormat::Pdf)));
    assert!(matches!(FileFormat::from_extension("doc.docx"), Ok(FileFormat::Docx)));
    assert!(matches!(FileFormat::from_extension("doc.txt"), Ok(FileFormat::PlainText)));
    assert!(matches!(FileFormat::from_extension("main.py"), Ok(FileFormat::PlainText)));
    assert!(matches!(FileFormat::from_extension("README.md"), Ok(FileFormat::PlainText)));
    // unknown extensions fall back to PlainText (binary content is rejected at read time)
    assert!(matches!(FileFormat::from_extension("doc.png"), Ok(FileFormat::PlainText)));
    assert!(matches!(FileFormat::from_extension("Makefile"), Ok(FileFormat::PlainText)));
}
```

Also update the test that expects unknown-extension parse errors if it references `FileFormat::Txt` anywhere else (the import line stays `use exambot_core::parser::{extract_txt, FileFormat, ParserError};` — `ParserError` is still used by Task 1's binary test).

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: compile FAIL (`FileFormat::PlainText` does not exist).

- [ ] **Step 3: Rewrite dispatch in mod.rs**

In `packages/core/src/parser/mod.rs`, replace the `FileFormat` enum, `from_extension`, and `parse_file` with:

```rust
#[derive(Debug)]
pub enum FileFormat {
    PlainText,
    Docx,
    Pdf,
}

impl FileFormat {
    pub fn from_extension(path: &str) -> Result<Self, ParserError> {
        let ext = Path::new(path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        match ext.as_str() {
            "docx" => Ok(FileFormat::Docx),
            "pdf" => Ok(FileFormat::Pdf),
            _ => Ok(FileFormat::PlainText),
        }
    }
}
```

```rust
pub fn parse_file(path: &str) -> Result<String, ParserError> {
    let format = FileFormat::from_extension(path)?;
    match format {
        FileFormat::PlainText => extract_txt(path),
        FileFormat::Docx => extract_docx(path),
        FileFormat::Pdf => extract_pdf(path),
    }
}
```

(`from_extension` keeps its `Result` signature so callers don't change; it just never errors now.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/parser/mod.rs packages/core/tests/parser_tests.rs
git commit -m "feat: unknown extensions fall back to plain-text parsing"
```

---

### Task 3: Markdown table builder + CSV parser

**Files:**
- Create: `packages/core/src/parser/table.rs`
- Create: `packages/core/src/parser/csv.rs`
- Modify: `packages/core/src/parser/mod.rs`
- Test: `packages/core/tests/parser_tests.rs` (append)

**Interfaces:**
- Consumes: `read_text_lossy` from Task 1 (`super::txt::read_text_lossy`).
- Produces: `pub fn extract_csv(path) -> Result<String, ParserError>`; `pub(crate) fn clean_cell(&str) -> String` and `pub(crate) fn rows_to_markdown(&[Vec<String>]) -> String` in `table.rs`, reused by Task 4 (excel).

- [ ] **Step 1: Write the failing tests**

Append to `packages/core/tests/parser_tests.rs` (add `extract_csv` to the `use exambot_core::parser::{...}` import):

```rust
#[test]
fn test_extract_csv_markdown_table() {
    let path = std::env::temp_dir().join("exambot_test.csv");
    std::fs::write(&path, "name,score\nAlice,95\nBob,87\n").unwrap();
    let text = extract_csv(path.to_str().unwrap()).unwrap();
    let lines: Vec<&str> = text.lines().collect();
    assert_eq!(lines[0], "| name | score |");
    assert_eq!(lines[1], "| --- | --- |");
    assert_eq!(lines[2], "| Alice | 95 |");
    assert_eq!(lines[3], "| Bob | 87 |");
    let _ = std::fs::remove_file(&path);
}

#[test]
fn test_extract_csv_escapes_pipes_and_newlines() {
    let path = std::env::temp_dir().join("exambot_test_esc.csv");
    std::fs::write(&path, "a,b\n\"x|y\",\"line1\nline2\"\n").unwrap();
    let text = extract_csv(path.to_str().unwrap()).unwrap();
    assert!(text.contains("x\\|y"));
    assert!(text.contains("line1 line2"));
    let _ = std::fs::remove_file(&path);
}

#[test]
fn test_extract_csv_empty_rejected() {
    let path = std::env::temp_dir().join("exambot_test_empty.csv");
    std::fs::write(&path, "\n\n").unwrap();
    assert!(extract_csv(path.to_str().unwrap()).is_err());
    let _ = std::fs::remove_file(&path);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: compile FAIL (`extract_csv` not found).

- [ ] **Step 3: Implement table.rs and csv.rs**

Create `packages/core/src/parser/table.rs`:

```rust
pub(crate) fn clean_cell(s: &str) -> String {
    s.replace('|', "\\|")
        .replace(['\r', '\n'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

pub(crate) fn rows_to_markdown(rows: &[Vec<String>]) -> String {
    let cols = rows.iter().map(|r| r.len()).max().unwrap_or(0);
    let mut out = String::new();
    for (i, row) in rows.iter().enumerate() {
        let mut cells = row.clone();
        cells.resize(cols, String::new());
        out.push_str("| ");
        out.push_str(&cells.join(" | "));
        out.push_str(" |\n");
        if i == 0 {
            out.push('|');
            out.push_str(&" --- |".repeat(cols));
            out.push('\n');
        }
    }
    out
}
```

Create `packages/core/src/parser/csv.rs`:

```rust
use super::table::{clean_cell, rows_to_markdown};
use super::ParserError;

pub fn extract_csv(path: &str) -> Result<String, ParserError> {
    let raw = super::txt::read_text_lossy(path)?;
    let mut rdr = ::csv::ReaderBuilder::new()
        .has_headers(false)
        .flexible(true)
        .from_reader(raw.as_bytes());
    let mut rows: Vec<Vec<String>> = Vec::new();
    for rec in rdr.records() {
        let rec = rec.map_err(|e| ParserError::Parse(format!("csv error: {e}")))?;
        let cells: Vec<String> = rec.iter().map(clean_cell).collect();
        if cells.iter().all(|c| c.is_empty()) {
            continue;
        }
        rows.push(cells);
    }
    if rows.is_empty() {
        return Err(ParserError::Parse("file is empty".to_string()));
    }
    Ok(rows_to_markdown(&rows))
}
```

In `packages/core/src/parser/mod.rs`:
- add modules: `mod table;` and `mod csv;` (note: module named `csv` shadows the crate inside `mod.rs` — the parser file itself uses `::csv::` to reach the crate, as written above)
- add export: `pub use csv::extract_csv;`
- add enum variant `Csv,` to `FileFormat`
- add match arm in `from_extension`: `"csv" => Ok(FileFormat::Csv),` (before the `_` catch-all)
- add match arm in `parse_file`: `FileFormat::Csv => extract_csv(path),`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/parser/ packages/core/tests/parser_tests.rs
git commit -m "feat: parse CSV documents into markdown tables"
```

---

### Task 4: Excel parser (calamine)

**Files:**
- Modify: `packages/core/Cargo.toml` (add `calamine = "0.26"`)
- Create: `packages/core/src/parser/excel.rs`
- Modify: `packages/core/src/parser/mod.rs`
- Test: `packages/core/tests/parser_tests.rs` (append)

**Interfaces:**
- Consumes: `clean_cell` / `rows_to_markdown` from Task 3 (`super::table::`).
- Produces: `pub fn extract_excel(path) -> Result<String, ParserError>` handling xlsx/xlsm/xls/ods; multi-sheet output uses `### <sheet name>` section headers.

- [ ] **Step 1: Write the failing test (with handcrafted minimal xlsx fixture)**

Append to `packages/core/tests/parser_tests.rs` (add `extract_excel` to the import):

```rust
fn write_min_xlsx(path: &std::path::Path) {
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    let f = std::fs::File::create(path).unwrap();
    let mut z = zip::ZipWriter::new(f);
    let o = SimpleFileOptions::default();
    z.start_file("[Content_Types].xml", o).unwrap();
    z.write_all(br#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>"#).unwrap();
    z.start_file("_rels/.rels", o).unwrap();
    z.write_all(br#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>"#).unwrap();
    z.start_file("xl/workbook.xml", o).unwrap();
    z.write_all(br#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Scores" sheetId="1" r:id="rId1"/></sheets></workbook>"#).unwrap();
    z.start_file("xl/_rels/workbook.xml.rels", o).unwrap();
    z.write_all(br#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>"#).unwrap();
    z.start_file("xl/worksheets/sheet1.xml", o).unwrap();
    z.write_all(br#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c><c r="B1" t="inlineStr"><is><t>Score</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Alice</t></is></c><c r="B2"><v>95</v></c></row></sheetData></worksheet>"#).unwrap();
    z.finish().unwrap();
}

#[test]
fn test_extract_excel_markdown_table() {
    let path = std::env::temp_dir().join("exambot_test.xlsx");
    write_min_xlsx(&path);
    let text = extract_excel(path.to_str().unwrap()).unwrap();
    assert!(text.contains("| Name | Score |"));
    assert!(text.contains("| --- | --- |"));
    assert!(text.contains("| Alice | 95 |"));
    let _ = std::fs::remove_file(&path);
}

#[test]
fn test_extract_excel_invalid_rejected() {
    let path = std::env::temp_dir().join("exambot_test_bad.xlsx");
    std::fs::write(&path, "not a zip").unwrap();
    assert!(extract_excel(path.to_str().unwrap()).is_err());
    let _ = std::fs::remove_file(&path);
}
```

Note: the `zip` crate is already a dependency of exambot-core, so it is usable from integration tests without a dev-dependency entry. If `cargo test` says `use of undeclared crate zip`, add `zip = "2"` under `[dev-dependencies]` in `packages/core/Cargo.toml`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: compile FAIL (`extract_excel` not found).

- [ ] **Step 3: Implement**

In `packages/core/Cargo.toml` `[dependencies]` add:

```toml
calamine = "0.26"
```

Create `packages/core/src/parser/excel.rs`:

```rust
use super::table::{clean_cell, rows_to_markdown};
use super::ParserError;
use calamine::{open_workbook_auto, Data, Reader};

pub fn extract_excel(path: &str) -> Result<String, ParserError> {
    let mut wb = open_workbook_auto(path)
        .map_err(|e| ParserError::Parse(format!("spreadsheet open error: {e}")))?;
    let names: Vec<String> = wb.sheet_names().to_vec();
    let multi = names.len() > 1;
    let mut out = String::new();
    for name in names {
        let range = match wb.worksheet_range(&name) {
            Ok(r) => r,
            Err(_) => continue,
        };
        let mut rows: Vec<Vec<String>> = Vec::new();
        for row in range.rows() {
            let cells: Vec<String> = row
                .iter()
                .map(|d| clean_cell(&cell_to_string(d)))
                .collect();
            if cells.iter().all(|c| c.is_empty()) {
                continue;
            }
            rows.push(cells);
        }
        if rows.is_empty() {
            continue;
        }
        if multi {
            out.push_str(&format!("### {name}\n\n"));
        }
        out.push_str(&rows_to_markdown(&rows));
        out.push('\n');
    }
    if out.trim().is_empty() {
        return Err(ParserError::Parse("no data found in spreadsheet".to_string()));
    }
    Ok(out.trim_end().to_string())
}

fn cell_to_string(d: &Data) -> String {
    match d {
        Data::Empty => String::new(),
        other => other.to_string(),
    }
}
```

In `packages/core/src/parser/mod.rs`:
- add `mod excel;`
- add `pub use excel::extract_excel;`
- add enum variant `Excel,`
- add `from_extension` arm: `"xlsx" | "xlsm" | "xls" | "ods" => Ok(FileFormat::Excel),`
- add `parse_file` arm: `FileFormat::Excel => extract_excel(path),`

If calamine 0.26's API differs on compile (e.g., `Data` type name), check the resolved version's docs with `cargo doc -p calamine --no-deps` or the error suggestions — older versions call it `DataType`. Fix the import accordingly and note it in your report.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/Cargo.toml Cargo.lock packages/core/src/parser/ packages/core/tests/parser_tests.rs
git commit -m "feat: parse XLSX/XLS/ODS spreadsheets via calamine into markdown tables"
```

---

### Task 5: HTML parser (lightweight tag stripper)

**Files:**
- Create: `packages/core/src/parser/html.rs`
- Modify: `packages/core/src/parser/mod.rs`
- Test: `packages/core/tests/parser_tests.rs` (append)

**Interfaces:**
- Consumes: `read_text_lossy` from Task 1.
- Produces: `pub fn extract_html(path) -> Result<String, ParserError>`; `pub(crate) fn strip_html(&str) -> String` reused by Task 8 (epub).

- [ ] **Step 1: Write the failing tests**

Append to `packages/core/tests/parser_tests.rs` (add `extract_html` to the import):

```rust
#[test]
fn test_extract_html_strips_tags() {
    let path = std::env::temp_dir().join("exambot_test.html");
    std::fs::write(&path, "<html><head><title>T</title><style>body{color:red}</style></head><body><script>var x=1;</script><h1>Chapter &amp; Intro</h1><p>Hello <b>world</b>&nbsp;&#20013;</p><!-- comment --></body></html>").unwrap();
    let text = extract_html(path.to_str().unwrap()).unwrap();
    assert!(text.contains("Chapter & Intro"));
    assert!(text.contains("Hello world 中"));
    assert!(!text.contains("var x"));
    assert!(!text.contains("color:red"));
    assert!(!text.contains("<"));
    assert!(!text.contains("comment"));
    let _ = std::fs::remove_file(&path);
}

#[test]
fn test_extract_html_empty_rejected() {
    let path = std::env::temp_dir().join("exambot_test_empty.html");
    std::fs::write(&path, "<html><body><script>only()</script></body></html>").unwrap();
    assert!(extract_html(path.to_str().unwrap()).is_err());
    let _ = std::fs::remove_file(&path);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: compile FAIL (`extract_html` not found).

- [ ] **Step 3: Implement html.rs**

Create `packages/core/src/parser/html.rs`:

```rust
use super::ParserError;

pub fn extract_html(path: &str) -> Result<String, ParserError> {
    let raw = super::txt::read_text_lossy(path)?;
    let text = strip_html(&raw);
    if text.trim().is_empty() {
        return Err(ParserError::Parse("no text found in html".to_string()));
    }
    Ok(text)
}

pub(crate) fn strip_html(html: &str) -> String {
    let s = remove_blocks(html, "<script", "</script>");
    let s = remove_blocks(&s, "<style", "</style>");
    let s = remove_blocks(&s, "<!--", "-->");
    let s = tags_to_text(&s);
    let s = decode_entities(&s);
    collapse_whitespace(&s)
}

fn find_ci(haystack: &str, needle: &str, from: usize) -> Option<usize> {
    let h = haystack.as_bytes();
    let n = needle.as_bytes();
    if n.is_empty() || h.len() < n.len() || from > h.len() - n.len() {
        return None;
    }
    (from..=h.len() - n.len()).find(|&i| h[i..i + n.len()].eq_ignore_ascii_case(n))
}

fn remove_blocks(input: &str, open: &str, close: &str) -> String {
    let mut out = String::with_capacity(input.len());
    let mut pos = 0;
    while let Some(start) = find_ci(input, open, pos) {
        out.push_str(&input[pos..start]);
        match find_ci(input, close, start + open.len()) {
            Some(end) => pos = end + close.len(),
            None => return out,
        }
    }
    out.push_str(&input[pos..]);
    out
}

fn tags_to_text(s: &str) -> String {
    const BLOCK_TAGS: [&str; 18] = [
        "p", "div", "br", "li", "ul", "ol", "tr", "table", "h1", "h2", "h3", "h4", "h5",
        "h6", "section", "article", "blockquote", "pre",
    ];
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    while let Some(idx) = rest.find('<') {
        out.push_str(&rest[..idx]);
        let after = &rest[idx..];
        match after.find('>') {
            Some(end) => {
                let inner = &after[1..end];
                let name: String = inner
                    .trim_start_matches('/')
                    .chars()
                    .take_while(|c| c.is_ascii_alphanumeric())
                    .collect::<String>()
                    .to_ascii_lowercase();
                if BLOCK_TAGS.contains(&name.as_str()) {
                    out.push('\n');
                } else if name == "td" || name == "th" {
                    out.push(' ');
                }
                rest = &after[end + 1..];
            }
            None => return out,
        }
    }
    out.push_str(rest);
    out
}

fn decode_numeric_entities(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut rest = s;
    while let Some(idx) = rest.find("&#") {
        out.push_str(&rest[..idx]);
        let tail = &rest[idx + 2..];
        let semi = tail.find(';').filter(|&e| e > 0 && e <= 8);
        let decoded = semi.and_then(|end| {
            let code = &tail[..end];
            let parsed = if let Some(hex) = code.strip_prefix(['x', 'X']) {
                u32::from_str_radix(hex, 16).ok()
            } else {
                code.parse::<u32>().ok()
            };
            parsed.and_then(char::from_u32).map(|c| (c, end))
        });
        match decoded {
            Some((c, end)) => {
                out.push(c);
                rest = &tail[end + 1..];
            }
            None => {
                out.push_str("&#");
                rest = tail;
            }
        }
    }
    out.push_str(rest);
    out
}

fn decode_entities(s: &str) -> String {
    decode_numeric_entities(s)
        .replace("&nbsp;", " ")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&amp;", "&")
}

fn collapse_whitespace(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut blank_pending = false;
    for line in s.lines() {
        let t = line.trim();
        if t.is_empty() {
            blank_pending = !out.is_empty();
        } else {
            if !out.is_empty() {
                out.push('\n');
                if blank_pending {
                    out.push('\n');
                }
            }
            out.push_str(t);
            blank_pending = false;
        }
    }
    out
}
```

In `packages/core/src/parser/mod.rs`:
- add `mod html;`
- add `pub use html::extract_html;`
- add enum variant `Html,`
- add `from_extension` arm: `"html" | "htm" => Ok(FileFormat::Html),`
- add `parse_file` arm: `FileFormat::Html => extract_html(path),`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: all PASS. Note: the test expects `Hello world 中` — `<b>` is not a block tag so no break; `&nbsp;` → space, `&#20013;` → 中.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/parser/ packages/core/tests/parser_tests.rs
git commit -m "feat: parse HTML documents via lightweight tag stripper"
```

---

### Task 6: Shared XML text helper + PPTX parser (refactor docx)

**Files:**
- Create: `packages/core/src/parser/xml_text.rs`
- Create: `packages/core/src/parser/pptx.rs`
- Modify: `packages/core/src/parser/docx.rs` (use shared helper)
- Modify: `packages/core/src/parser/mod.rs`
- Test: `packages/core/tests/parser_tests.rs` (append)

**Interfaces:**
- Produces: `pub(crate) fn collect_texts(xml: &str, target: &[u8]) -> Result<Vec<String>, ParserError>` (extracts text following Start tags whose local name == target); `pub fn extract_pptx(path) -> Result<String, ParserError>` with `### Slide N` sections in numeric order.

- [ ] **Step 1: Write the failing test**

Append to `packages/core/tests/parser_tests.rs` (add `extract_pptx` to the import):

```rust
fn write_min_pptx(path: &std::path::Path) {
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    let f = std::fs::File::create(path).unwrap();
    let mut z = zip::ZipWriter::new(f);
    let o = SimpleFileOptions::default();
    let slide = |body: &str| format!(r#"<?xml version="1.0"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>{body}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>"#);
    // write slide2 before slide1 to prove numeric ordering
    z.start_file("ppt/slides/slide2.xml", o).unwrap();
    z.write_all(slide("Second slide").as_bytes()).unwrap();
    z.start_file("ppt/slides/slide1.xml", o).unwrap();
    z.write_all(slide("First slide").as_bytes()).unwrap();
    z.finish().unwrap();
}

#[test]
fn test_extract_pptx_slides_in_order() {
    let path = std::env::temp_dir().join("exambot_test.pptx");
    write_min_pptx(&path);
    let text = extract_pptx(path.to_str().unwrap()).unwrap();
    let first = text.find("First slide").unwrap();
    let second = text.find("Second slide").unwrap();
    assert!(first < second);
    assert!(text.contains("### Slide 1"));
    assert!(text.contains("### Slide 2"));
    let _ = std::fs::remove_file(&path);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: compile FAIL (`extract_pptx` not found).

- [ ] **Step 3: Implement**

Create `packages/core/src/parser/xml_text.rs`:

```rust
use super::ParserError;
use quick_xml::events::Event;
use quick_xml::Reader;

pub(crate) fn collect_texts(xml: &str, target: &[u8]) -> Result<Vec<String>, ParserError> {
    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);
    let mut texts = Vec::new();
    let mut buf = Vec::new();
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) => {
                if e.local_name().as_ref() == target {
                    if let Ok(Event::Text(ref t)) = reader.read_event_into(&mut buf) {
                        let text = t.unescape().unwrap_or_default();
                        if !text.trim().is_empty() {
                            texts.push(text.to_string());
                        }
                    }
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(ParserError::Parse(format!("xml error: {e}"))),
            _ => {}
        }
        buf.clear();
    }
    Ok(texts)
}
```

Replace the body of `packages/core/src/parser/docx.rs` with:

```rust
use super::xml_text::collect_texts;
use super::ParserError;
use std::io::Read;

pub fn extract_docx(path: &str) -> Result<String, ParserError> {
    let file = std::fs::File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| ParserError::Parse(format!("invalid docx zip: {e}")))?;

    let mut doc_xml = String::new();
    archive
        .by_name("word/document.xml")
        .map_err(|e| ParserError::Parse(format!("missing document.xml: {e}")))?
        .read_to_string(&mut doc_xml)?;

    let texts = collect_texts(&doc_xml, b"t")?;
    let result = texts.join("\n");
    if result.trim().is_empty() {
        return Err(ParserError::Parse("no text found in docx".to_string()));
    }
    Ok(result)
}
```

Create `packages/core/src/parser/pptx.rs`:

```rust
use super::xml_text::collect_texts;
use super::ParserError;
use std::io::Read;

pub fn extract_pptx(path: &str) -> Result<String, ParserError> {
    let file = std::fs::File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| ParserError::Parse(format!("invalid pptx zip: {e}")))?;

    let mut slide_names: Vec<String> = (0..archive.len())
        .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
        .filter(|n| n.starts_with("ppt/slides/slide") && n.ends_with(".xml"))
        .collect();
    slide_names.sort_by_key(|n| slide_number(n));

    let mut out = String::new();
    for name in &slide_names {
        let mut xml = String::new();
        archive
            .by_name(name)
            .map_err(|e| ParserError::Parse(format!("zip error: {e}")))?
            .read_to_string(&mut xml)?;
        let texts = collect_texts(&xml, b"t")?;
        if texts.is_empty() {
            continue;
        }
        out.push_str(&format!("### Slide {}\n\n{}\n\n", slide_number(name), texts.join("\n")));
    }
    if out.trim().is_empty() {
        return Err(ParserError::Parse("no text found in pptx".to_string()));
    }
    Ok(out.trim_end().to_string())
}

fn slide_number(name: &str) -> u32 {
    name.trim_start_matches("ppt/slides/slide")
        .trim_end_matches(".xml")
        .parse()
        .unwrap_or(0)
}
```

In `packages/core/src/parser/mod.rs`:
- add `mod xml_text;` and `mod pptx;`
- add `pub use pptx::extract_pptx;`
- add enum variant `Pptx,`
- add `from_extension` arm: `"pptx" => Ok(FileFormat::Pptx),`
- add `parse_file` arm: `FileFormat::Pptx => extract_pptx(path),`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: all PASS, including the pre-existing docx behavior (no docx test exists, but compile confirms the refactor; the shared helper is identical logic).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/parser/ packages/core/tests/parser_tests.rs
git commit -m "feat: parse PPTX slides; share XML text extraction with docx"
```

---

### Task 7: ODT parser

**Files:**
- Create: `packages/core/src/parser/odt.rs`
- Modify: `packages/core/src/parser/mod.rs`
- Test: `packages/core/tests/parser_tests.rs` (append)

**Interfaces:**
- Produces: `pub fn extract_odt(path) -> Result<String, ParserError>` — text of `content.xml` with paragraph breaks at `</text:p>` / `</text:h>`.

- [ ] **Step 1: Write the failing test**

Append to `packages/core/tests/parser_tests.rs` (add `extract_odt` to the import):

```rust
fn write_min_odt(path: &std::path::Path) {
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    let f = std::fs::File::create(path).unwrap();
    let mut z = zip::ZipWriter::new(f);
    let o = SimpleFileOptions::default();
    z.start_file("content.xml", o).unwrap();
    z.write_all(br#"<?xml version="1.0"?><office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><office:body><office:text><text:h>Title Here</text:h><text:p>First paragraph.</text:p><text:p>Second <text:span>styled</text:span> paragraph.</text:p></office:text></office:body></office:document-content>"#).unwrap();
    z.finish().unwrap();
}

#[test]
fn test_extract_odt_paragraphs() {
    let path = std::env::temp_dir().join("exambot_test.odt");
    write_min_odt(&path);
    let text = extract_odt(path.to_str().unwrap()).unwrap();
    assert!(text.contains("Title Here"));
    assert!(text.contains("First paragraph."));
    assert!(text.contains("Second styled paragraph."));
    let title_pos = text.find("Title Here").unwrap();
    let first_pos = text.find("First paragraph.").unwrap();
    assert!(title_pos < first_pos);
    let _ = std::fs::remove_file(&path);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: compile FAIL (`extract_odt` not found).

- [ ] **Step 3: Implement odt.rs**

Create `packages/core/src/parser/odt.rs`:

```rust
use super::ParserError;
use quick_xml::events::Event;
use quick_xml::Reader;
use std::io::Read;

pub fn extract_odt(path: &str) -> Result<String, ParserError> {
    let file = std::fs::File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| ParserError::Parse(format!("invalid odt zip: {e}")))?;

    let mut xml = String::new();
    archive
        .by_name("content.xml")
        .map_err(|e| ParserError::Parse(format!("missing content.xml: {e}")))?
        .read_to_string(&mut xml)?;

    let mut reader = Reader::from_str(&xml);
    let mut out = String::new();
    let mut buf = Vec::new();
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Text(ref t)) => {
                let s = t.unescape().unwrap_or_default();
                if !s.trim().is_empty() {
                    out.push_str(&s);
                }
            }
            Ok(Event::End(ref e)) => {
                if matches!(e.local_name().as_ref(), b"p" | b"h") && !out.ends_with('\n') {
                    out.push('\n');
                }
            }
            Ok(Event::Eof) => break,
            Err(e) => return Err(ParserError::Parse(format!("xml error: {e}"))),
            _ => {}
        }
        buf.clear();
    }

    if out.trim().is_empty() {
        return Err(ParserError::Parse("no text found in odt".to_string()));
    }
    Ok(out.trim().to_string())
}
```

In `packages/core/src/parser/mod.rs`:
- add `mod odt;`
- add `pub use odt::extract_odt;`
- add enum variant `Odt,`
- add `from_extension` arm: `"odt" => Ok(FileFormat::Odt),`
- add `parse_file` arm: `FileFormat::Odt => extract_odt(path),`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/parser/ packages/core/tests/parser_tests.rs
git commit -m "feat: parse ODT documents"
```

---

### Task 8: EPUB parser

**Files:**
- Create: `packages/core/src/parser/epub.rs`
- Modify: `packages/core/src/parser/mod.rs`
- Test: `packages/core/tests/parser_tests.rs` (append)

**Interfaces:**
- Consumes: `strip_html` from Task 5 (`super::html::strip_html`).
- Produces: `pub fn extract_epub(path) -> Result<String, ParserError>` — chapters in OPF spine order, fallback to sorted zip entry order.

- [ ] **Step 1: Write the failing test**

Append to `packages/core/tests/parser_tests.rs` (add `extract_epub` to the import):

```rust
fn write_min_epub(path: &std::path::Path) {
    use std::io::Write;
    use zip::write::SimpleFileOptions;
    let f = std::fs::File::create(path).unwrap();
    let mut z = zip::ZipWriter::new(f);
    let o = SimpleFileOptions::default();
    z.start_file("META-INF/container.xml", o).unwrap();
    z.write_all(br#"<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>"#).unwrap();
    z.start_file("OEBPS/content.opf", o).unwrap();
    // spine references ch2 FIRST, then ch1 — proves spine ordering wins over name order
    z.write_all(br#"<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><manifest><item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c2"/><itemref idref="c1"/></spine></package>"#).unwrap();
    z.start_file("OEBPS/ch1.xhtml", o).unwrap();
    z.write_all(br#"<html><body><p>Alpha chapter</p></body></html>"#).unwrap();
    z.start_file("OEBPS/ch2.xhtml", o).unwrap();
    z.write_all(br#"<html><body><p>Beta chapter</p></body></html>"#).unwrap();
    z.finish().unwrap();
}

#[test]
fn test_extract_epub_spine_order() {
    let path = std::env::temp_dir().join("exambot_test.epub");
    write_min_epub(&path);
    let text = extract_epub(path.to_str().unwrap()).unwrap();
    let beta = text.find("Beta chapter").unwrap();
    let alpha = text.find("Alpha chapter").unwrap();
    assert!(beta < alpha, "spine order (c2 before c1) must be respected");
    let _ = std::fs::remove_file(&path);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: compile FAIL (`extract_epub` not found).

- [ ] **Step 3: Implement epub.rs**

Create `packages/core/src/parser/epub.rs`:

```rust
use super::html::strip_html;
use super::ParserError;
use quick_xml::events::Event;
use quick_xml::Reader;
use std::collections::HashMap;
use std::io::Read;

pub fn extract_epub(path: &str) -> Result<String, ParserError> {
    let file = std::fs::File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| ParserError::Parse(format!("invalid epub zip: {e}")))?;

    let mut chapters: Vec<String> = Vec::new();
    if let Ok(container) = read_zip_string(&mut archive, "META-INF/container.xml") {
        if let Some(opf_path) = container_opf_path(&container) {
            if let Ok(opf) = read_zip_string(&mut archive, &opf_path) {
                let base = opf_path
                    .rsplit_once('/')
                    .map(|(d, _)| format!("{d}/"))
                    .unwrap_or_default();
                chapters = spine_chapter_paths(&opf, &base);
            }
        }
    }
    if chapters.is_empty() {
        chapters = (0..archive.len())
            .filter_map(|i| archive.by_index(i).ok().map(|f| f.name().to_string()))
            .filter(|n| n.ends_with(".xhtml") || n.ends_with(".html") || n.ends_with(".htm"))
            .collect();
        chapters.sort();
    }

    let mut out = String::new();
    for ch in &chapters {
        if let Ok(xml) = read_zip_string(&mut archive, ch) {
            let t = strip_html(&xml);
            if !t.trim().is_empty() {
                out.push_str(t.trim());
                out.push_str("\n\n");
            }
        }
    }
    if out.trim().is_empty() {
        return Err(ParserError::Parse("no text found in epub".to_string()));
    }
    Ok(out.trim_end().to_string())
}

fn read_zip_string(
    archive: &mut zip::ZipArchive<std::fs::File>,
    name: &str,
) -> Result<String, ParserError> {
    let mut s = String::new();
    archive
        .by_name(name)
        .map_err(|e| ParserError::Parse(format!("zip error: {e}")))?
        .read_to_string(&mut s)?;
    Ok(s)
}

fn container_opf_path(xml: &str) -> Option<String> {
    let mut reader = Reader::from_str(xml);
    let mut buf = Vec::new();
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                if e.local_name().as_ref() == b"rootfile" {
                    for attr in e.attributes().flatten() {
                        if attr.key.local_name().as_ref() == b"full-path" {
                            return Some(String::from_utf8_lossy(&attr.value).to_string());
                        }
                    }
                }
            }
            Ok(Event::Eof) | Err(_) => return None,
            _ => {}
        }
        buf.clear();
    }
}

fn spine_chapter_paths(opf: &str, base: &str) -> Vec<String> {
    let mut manifest: HashMap<String, String> = HashMap::new();
    let mut spine: Vec<String> = Vec::new();
    let mut reader = Reader::from_str(opf);
    let mut buf = Vec::new();
    loop {
        match reader.read_event_into(&mut buf) {
            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                match e.local_name().as_ref() {
                    b"item" => {
                        let mut id = None;
                        let mut href = None;
                        for attr in e.attributes().flatten() {
                            match attr.key.local_name().as_ref() {
                                b"id" => id = Some(String::from_utf8_lossy(&attr.value).to_string()),
                                b"href" => href = Some(String::from_utf8_lossy(&attr.value).to_string()),
                                _ => {}
                            }
                        }
                        if let (Some(id), Some(href)) = (id, href) {
                            manifest.insert(id, href);
                        }
                    }
                    b"itemref" => {
                        for attr in e.attributes().flatten() {
                            if attr.key.local_name().as_ref() == b"idref" {
                                spine.push(String::from_utf8_lossy(&attr.value).to_string());
                            }
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::Eof) | Err(_) => break,
            _ => {}
        }
        buf.clear();
    }
    spine
        .into_iter()
        .filter_map(|id| manifest.get(&id).map(|h| format!("{base}{h}")))
        .collect()
}
```

In `packages/core/src/parser/mod.rs`:
- add `mod epub;`
- add `pub use epub::extract_epub;`
- add enum variant `Epub,`
- add `from_extension` arm: `"epub" => Ok(FileFormat::Epub),`
- add `parse_file` arm: `FileFormat::Epub => extract_epub(path),`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cargo test -p exambot-core --test parser_tests`
Expected: all PASS.

- [ ] **Step 5: Run the whole core suite once**

Run: `cargo test -p exambot-core`
Expected: all PASS (config/export/ai/exam tests unaffected).

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/parser/ packages/core/tests/parser_tests.rs
git commit -m "feat: parse EPUB books in spine order"
```

---

### Task 9: Server cleanup (routes.rs)

**Files:**
- Modify: `packages/server/src/routes.rs:104` and `packages/server/src/routes.rs:118-124`

**Interfaces:**
- Consumes: `parse_file` (already imported in routes.rs), now handling every format including txt.

- [ ] **Step 1: Fix extension extraction and remove the txt special-case**

At `packages/server/src/routes.rs:104`, replace:

```rust
    let ext = file_name.rsplit('.').next().unwrap_or("txt");
```

with (files without a dot previously got their whole name as "extension"; now they get `txt` and flow through the PlainText fallback):

```rust
    let ext = file_name.rsplit_once('.').map(|(_, e)| e).unwrap_or("txt");
```

At `packages/server/src/routes.rs:118-124`, replace:

```rust
    let text = if ext == "txt" {
        std::fs::read_to_string(&temp_path_str)
            .map_err(|e| (StatusCode::BAD_REQUEST, format!("Read error: {e}")))?
    } else {
        parse_file(&temp_path_str)
            .map_err(|e| (StatusCode::BAD_REQUEST, format!("Parse error: {e}")))?
    };
```

with:

```rust
    let text = parse_file(&temp_path_str)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Parse error: {e}")))?;
```

- [ ] **Step 2: Verify it compiles**

Run: `cargo build -p exambot-server`
Expected: exit 0 (warnings about unused `std::fs` import are findings — remove the import only if it becomes unused).

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/routes.rs
git commit -m "refactor: route all uploads through parse_file, fix no-extension names"
```

---

### Task 10: Frontend — picker filters, hint text, extension edge cases

**Files:**
- Modify: `frontend/src/components/generate/FileUploader.vue`
- Modify: `frontend/src/i18n/locales.ts` (the two `genFileHint` entries)
- Modify: `frontend/src/stores/exam.ts:285` and `frontend/src/stores/exam.ts:300`

**Interfaces:**
- Consumes: nothing new. Produces: UI allowing all new formats through both the Tauri dialog and the web input.

- [ ] **Step 1: Update FileUploader.vue**

In the `<script setup>` block, after the `const isDragOver = ref(false)` line, add:

```ts
const DOC_EXTENSIONS = ['txt', 'md', 'markdown', 'docx', 'pdf', 'pptx', 'html', 'htm', 'odt', 'epub', 'csv', 'xlsx', 'xlsm', 'xls', 'ods']
const CODE_EXTENSIONS = ['py', 'js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs', 'java', 'c', 'cpp', 'cc', 'h', 'hpp', 'cs', 'go', 'rs', 'rb', 'php', 'swift', 'kt', 'kts', 'sql', 'sh', 'bash', 'zsh', 'bat', 'ps1', 'json', 'yaml', 'yml', 'toml', 'xml', 'ini', 'cfg', 'conf', 'log', 'tex', 'r', 'lua', 'pl', 'scala', 'dart', 'vue', 'svelte', 'css', 'scss', 'less']
const acceptAttr = [...DOC_EXTENSIONS, ...CODE_EXTENSIONS].map((e) => '.' + e).join(',')
```

Replace the `filters` line in `pick()` (line 53):

```ts
      filters: [
        { name: 'Documents', extensions: DOC_EXTENSIONS },
        { name: 'Text & Code', extensions: CODE_EXTENSIONS },
        { name: 'All Files', extensions: ['*'] },
      ],
```

Replace BOTH `<input ... accept=".txt,.docx,.pdf" ...>` occurrences (lines 127 and 170): change `accept=".txt,.docx,.pdf"` to `:accept="acceptAttr"`.

- [ ] **Step 2: Update genFileHint in locales.ts**

zh (line ~235): `genFileHint: '支持 DOCX、PDF、PPTX、HTML、EPUB、ODT、表格（CSV/XLSX）及任意文本/代码文件',`
en (line ~428): `genFileHint: 'DOCX, PDF, PPTX, HTML, EPUB, ODT, spreadsheets (CSV/XLSX), and any text/code file',`

- [ ] **Step 3: Fix no-extension edge case in exam.ts**

At `frontend/src/stores/exam.ts:285`, replace:

```ts
            const ext = input.split('.').pop()?.toLowerCase() || 'txt'
```

with (a path without a dot previously yielded the whole path as ext, breaking the temp-file suffix):

```ts
            const fname = fileNameFromInput(input)
            const ext = fname.includes('.') ? fname.split('.').pop()!.toLowerCase() : 'txt'
```

At `frontend/src/stores/exam.ts:300`, replace:

```ts
          const ext = file.name.split('.').pop() || 'txt'
```

with:

```ts
          const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'txt'
```

- [ ] **Step 4: Type-check**

Run: `pnpm --dir frontend type-check`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/generate/FileUploader.vue frontend/src/i18n/locales.ts frontend/src/stores/exam.ts
git commit -m "feat: accept all supported document formats in generate uploader"
```

---

### Task 11: Frontend — table-aware chunking

**Files:**
- Modify: `frontend/src/stores/exam.ts:52-74` (`chunkTextBySize`) and `frontend/src/stores/exam.ts:201-216` (`splitTextChunk`)

**Interfaces:**
- Consumes: markdown tables as emitted by Tasks 3-4 (`| a | b |` rows, `| --- | --- |` separator, optional `### Sheet` headings).
- Produces: chunks where every piece of a split table carries its `### heading` + header row + separator row.

- [ ] **Step 1: Replace chunkTextBySize**

Replace `frontend/src/stores/exam.ts` lines 52-74 (the whole `chunkTextBySize` function) with:

```ts
  const TABLE_SEP_RE = /^\|(\s*:?-{3,}:?\s*\|)+$/

  function chunkTextBySize(text: string, chunkCount: number): string[] {
    let paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 10)
    let lineMode = false
    if (paragraphs.some(p => p.length > MAX_CHARS_PER_CHUNK) || paragraphs.length < chunkCount) {
      paragraphs = text.split(/\n+/).filter((p) => {
        const t = p.trim()
        return t.length > 10 || (t.startsWith('|') && t.length > 2)
      })
      lineMode = true
    }
    if (paragraphs.length === 0 || chunkCount <= 1) return [text]

    // For each paragraph, the table header context (### heading + header row + separator)
    // to prepend if a new chunk starts on that paragraph. Null when not inside a table.
    let heading = ''
    let tableHeader: string | null = null
    const contexts: (string | null)[] = paragraphs.map((p, i) => {
      const t = p.trim()
      if (t.startsWith('#')) {
        heading = t
        tableHeader = null
        return null
      }
      if (t.startsWith('|')) {
        if (TABLE_SEP_RE.test(t)) return null
        if (tableHeader === null) {
          const next = paragraphs[i + 1]?.trim() ?? ''
          if (TABLE_SEP_RE.test(next)) {
            tableHeader = (heading ? heading + '\n\n' : '') + t + '\n' + next
          }
          return null
        }
        return tableHeader
      }
      tableHeader = null
      return null
    })

    const targetSize = Math.ceil(text.length / chunkCount)
    const chunks: string[] = []
    let current = ''
    const sep = lineMode ? '\n' : '\n\n'

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i]!
      if (current.length + para.length > targetSize && current.length > 0 && chunks.length < chunkCount - 1) {
        chunks.push(current.trim())
        current = contexts[i] ? contexts[i] + '\n' + para : para
      } else {
        current += (current ? sep : '') + para
      }
    }
    if (current.trim()) chunks.push(current.trim())
    if (chunks.length === 0) return [text]
    return chunks
  }
```

Behavior notes (intended changes vs. old code): line mode now joins with `\n` instead of `\n\n` so markdown tables stay contiguous; short `|` rows (e.g. `| 1 | 2 |`) are no longer dropped by the 10-char filter; a chunk that starts inside a table is prefixed with its heading + header + separator rows.

- [ ] **Step 2: Replace splitTextChunk**

Replace `frontend/src/stores/exam.ts` lines 201-216 (adjusted for Step 1's shift — the whole `splitTextChunk` function) with:

```ts
  function splitTextChunk(chunk: string): [string, string] {
    // Preserve "## label\n" header on both halves
    let header = ''
    let body = chunk
    if (chunk.startsWith('## ')) {
      const nl = chunk.indexOf('\n')
      if (nl > 0) {
        header = chunk.substring(0, nl + 1)
        body = chunk.substring(nl + 1)
      }
    }
    // Preserve a leading markdown table header (row + separator) on both halves
    let tableHeader = ''
    const lines = body.split('\n')
    if (lines.length > 2 && lines[0]!.trim().startsWith('|') && TABLE_SEP_RE.test(lines[1]!.trim() ?? '')) {
      tableHeader = lines[0]! + '\n' + lines[1]! + '\n'
      body = lines.slice(2).join('\n')
    }
    const mid = Math.floor(body.length / 2)
    const nl = body.indexOf('\n', mid)
    const split = nl > 0 && nl < body.length - 1 ? nl + 1 : mid
    return [
      header + tableHeader + body.substring(0, split).trim(),
      header + tableHeader + body.substring(split).trim(),
    ]
  }
```

(`TABLE_SEP_RE` is the const introduced in Step 1, in the same store scope.)

- [ ] **Step 3: Type-check**

Run: `pnpm --dir frontend type-check`
Expected: exit 0.

- [ ] **Step 4: Manual chunking sanity check (console)**

Run: `pnpm --dir frontend dev` (background), open http://localhost:5273/ if a browser is available — otherwise rely on Task 12's desktop QA. The existing `console.log('[ExamBot] Chunks ...')` lines in `buildBatches` print chunk labels at generation time; a CSV upload split into 2+ chunks must show each chunk starting with `## file.csv` and containing `| --- |`. Stop the dev server afterwards.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/exam.ts
git commit -m "feat: table-aware chunking preserves headers across chunks"
```

---

### Task 12: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run everything**

```powershell
cargo test -p exambot-core
cargo build -p exambot-server
pnpm --dir frontend type-check
```

Expected: all exit 0.

- [ ] **Step 2: Desktop manual QA (user confirms)**

Launch `start.bat` → `1`. Checklist:

- [ ] File picker shows Documents / Text & Code / All Files filters
- [ ] Upload a `.md` or `.py` file → questions generate
- [ ] Upload a `.csv` → generate; console `[ExamBot] Chunks` shows table headers in every chunk when multi-chunk
- [ ] Upload an `.xlsx` → generate (multi-sheet shows `### SheetName` sections in prompt text)
- [ ] Upload a GBK-encoded `.txt` (Notepad ANSI, Chinese content) → parses without error
- [ ] Upload an unknown-extension text file (e.g. `.cfg2`) → parses via fallback
- [ ] Upload a binary (e.g. `.png` renamed or as-is) → clear error "binary or unknown-encoding file"

- [ ] **Step 3: Fix anything that fails, commit fixes**

Any fix: reproduce → minimal change → re-run the covering test/checklist item → commit `fix:`.

---

## Self-Review Notes

- Spec coverage: PlainText whitelist+fallback ✔ (T2; whitelist lives only in frontend filters T10 — in Rust the catch-all makes an explicit whitelist redundant, per spec's "同一 arm" note), encoding fallback ✔ (T1), CSV ✔ (T3), Excel ✔ (T4), HTML ✔ (T5), PPTX ✔ (T6), ODT ✔ (T7), EPUB ✔ (T8), server cleanup ✔ (T9), picker/i18n ✔ (T10), table-aware chunking ✔ (T11), testing ✔ (per-task TDD + T12).
- Type consistency checked: `read_text_lossy` (T1→T3,T5), `clean_cell`/`rows_to_markdown` (T3→T4), `collect_texts` (T6 docx+pptx), `strip_html` (T5→T8), `TABLE_SEP_RE` (T11 both functions).
- No placeholders; every code step contains complete code.
