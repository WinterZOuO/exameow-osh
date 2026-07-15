use exambot_core::parser::{extract_txt, FileFormat, ParserError};

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
    assert!(matches!(
        FileFormat::from_extension("doc.pdf"),
        Ok(FileFormat::Pdf)
    ));
    assert!(matches!(
        FileFormat::from_extension("doc.docx"),
        Ok(FileFormat::Docx)
    ));
    assert!(matches!(
        FileFormat::from_extension("doc.txt"),
        Ok(FileFormat::Txt)
    ));
    assert!(matches!(
        FileFormat::from_extension("doc.png"),
        Err(ParserError::Unsupported(_))
    ));
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
