use super::ParserError;

pub fn extract_txt(path: &str) -> Result<String, ParserError> {
    let content = std::fs::read_to_string(path)?;
    if content.trim().is_empty() {
        return Err(ParserError::Parse("file is empty".to_string()));
    }
    Ok(content)
}
