use super::ParserError;
use lopdf::Document;

pub fn extract_pdf(path: &str) -> Result<String, ParserError> {
    match extract_via_lopdf(path) {
        Ok(text) if !text.trim().is_empty() => return Ok(text),
        Ok(_) | Err(_) => {}
    }
    extract_via_pdf_extract(path)
}

fn extract_via_lopdf(path: &str) -> Result<String, ParserError> {
    let doc = Document::load(path)
        .map_err(|e| ParserError::Parse(format!("pdf load error: {e}")))?;

    let mut texts = Vec::new();
    let total = doc.get_pages().len();

    for page_num in 1..=total as u32 {
        match doc.extract_text(&[page_num]) {
            Ok(text) => {
                let cleaned = text.trim().to_string();
                if !cleaned.is_empty() {
                    texts.push(cleaned);
                }
            }
            Err(e) => {
                eprintln!("[ExamBot] lopdf page {}/{} failed: {e}", page_num, total);
            }
        }
    }

    let result = texts.join("\n");
    if result.trim().is_empty() {
        return Err(ParserError::Parse("lopdf: no extractable text".to_string()));
    }
    Ok(result)
}

fn extract_via_pdf_extract(path: &str) -> Result<String, ParserError> {
    let data = std::fs::read(path)
        .map_err(|e| ParserError::Io(e))?;
    pdf_extract::extract_text_from_mem(&data)
        .map_err(|e| ParserError::Parse(format!("pdf-extract error: {e}")))
}
