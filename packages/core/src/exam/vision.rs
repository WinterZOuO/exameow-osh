use crate::ai::AIClient;
use crate::error::CoreError;

pub fn build_extract_system_prompt() -> String {
    r#"You are an OCR assistant for exam questions. The user sends a photo containing one exam question (it may include options).

## Output Rules
1. Transcribe the question text exactly as it appears in the image, preserving the original language.
2. Include the stem and all options (one option per line, e.g. "A. ..."), if present.
3. Ignore surrounding page furniture: headers, footers, page numbers, watermarks, and unrelated questions cut off at the edges.
4. Output plain text only — no JSON, no markdown fences, no commentary.
5. If no question text is visible, output an empty string."#
        .to_string()
}

pub async fn extract_question_text(
    client: &AIClient,
    image_data_url: &str,
    model: &str,
) -> Result<String, CoreError> {
    let system_prompt = build_extract_system_prompt();
    let response = client
        .chat_with_image(
            &system_prompt,
            "Transcribe the exam question in this image.",
            image_data_url,
            model,
        )
        .await?;
    Ok(response.trim().to_string())
}
