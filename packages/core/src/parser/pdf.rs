use super::ParserError;
use lopdf::Document;

pub fn extract_pdf(path: &str) -> Result<String, ParserError> {
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
                eprintln!("[ExamBot] PDF page {}/{} extraction failed: {e}", page_num, total);
            }
        }
    }

    let result = texts.join("\n");
    if result.trim().is_empty() {
        return Err(ParserError::Parse("no extractable text in pdf".to_string()));
    }
    Ok(result)
}
