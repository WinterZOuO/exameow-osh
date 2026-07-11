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
