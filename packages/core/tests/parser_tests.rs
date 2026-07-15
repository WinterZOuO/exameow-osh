use exambot_core::parser::{extract_csv, extract_excel, extract_html, extract_txt, FileFormat, ParserError};

#[test]
fn test_extract_txt() {
    let text = extract_txt("tests/fixtures/sample.txt").unwrap();
    assert!(text.contains("Machine Learning"));
    assert!(text.contains("Chapter 1"));
}

#[test]
fn test_extract_txt_not_found() {
    let result = extract_txt("tests/fixtures/nonexistent.txt");
    assert!(result.is_err());
}

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

#[test]
fn test_read_gb18030_txt() {
    let path = std::env::temp_dir().join("exambot_test_gb18030.txt");
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

#[test]
fn test_extract_html_strips_tags() {
    let path = std::env::temp_dir().join("exambot_test.html");
    std::fs::write(&path, "<html><head><title>T</title><style>body{color:red}</style></head><body><script>var x=1;</script><h1>Chapter &amp; Intro</h1><p>Hello <b>world</b>&nbsp;&#20013;</p><!-- comment --></body></html>").unwrap();
    let text = extract_html(path.to_str().unwrap()).unwrap();
    assert!(text.contains("Chapter & Intro"));
    assert!(text.contains("Hello world \u{4e2d}"));
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
