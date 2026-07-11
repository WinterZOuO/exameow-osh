use super::ParserError;
use quick_xml::Reader;
use std::io::Read;

pub fn extract_docx(path: &str) -> Result<String, ParserError> {
    let file = std::fs::File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| ParserError::Parse(format!("invalid docx zip: {e}")))?;

    let mut doc_xml = String::new();
    let mut doc_file = archive
        .by_name("word/document.xml")
        .map_err(|e| ParserError::Parse(format!("missing document.xml: {e}")))?;
    doc_file.read_to_string(&mut doc_xml)?;

    let mut reader = Reader::from_str(&doc_xml);
    reader.config_mut().trim_text(true);

    let mut texts = Vec::new();
    let mut txt_buf = Vec::new();
    loop {
        match reader.read_event_into(&mut txt_buf) {
            Ok(quick_xml::events::Event::Start(ref e)) => {
                if e.local_name().as_ref() == b"t" {
                    if let Ok(quick_xml::events::Event::Text(ref t)) = reader.read_event_into(&mut txt_buf) {
                        let text = t.unescape().unwrap_or_default();
                        if !text.trim().is_empty() {
                            texts.push(text.to_string());
                        }
                    }
                }
            }
            Ok(quick_xml::events::Event::Eof) => break,
            Err(e) => return Err(ParserError::Parse(format!("xml error: {e}"))),
            _ => {}
        }
        txt_buf.clear();
    }

    let result = texts.join("\n");
    if result.trim().is_empty() {
        return Err(ParserError::Parse("no text found in docx".to_string()));
    }
    Ok(result)
}
