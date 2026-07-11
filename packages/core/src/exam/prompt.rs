use crate::exam::{Difficulty, ExamParams, QuestionType};
use crate::error::CoreError;
use crate::ai::AIClient;
use crate::exam::Question;

pub fn build_system_prompt() -> String {
    format!(
        r#"You are an expert exam question generator. Generate questions based on the provided document content.

## Output Rules
1. Respond ONLY with a valid JSON array — no explanation, no markdown fences.
2. Each question object MUST have exactly these fields:
   - "id": a short unique identifier string
   - "type": one of [{}]
   - "stem": the question text
   - "options": array of option strings (required for single_choice/multi_choice/true_false; empty array for others)
   - "answer": the correct answer
   - "analysis": brief explanation of the answer (can be empty string for fill_blank/short_answer)
3. For single_choice: exactly 4 options, one correct.
4. For multi_choice: exactly 4 options, at least one correct (list correct letters separated by comma in answer).
5. For true_false: options ["True", "False"], answer is "True" or "False".
6. For fill_blank: answer is the exact word/phrase to fill in.
7. For short_answer: answer is a concise reference answer.
8. All questions must be based on the document content.
9. Use the specified language for questions.
"#,
        vec![
            QuestionType::SingleChoice,
            QuestionType::MultiChoice,
            QuestionType::TrueFalse,
            QuestionType::FillBlank,
            QuestionType::ShortAnswer,
        ]
        .iter()
        .map(|t| t.to_string())
        .collect::<Vec<_>>()
        .join(", ")
    )
}

pub fn build_user_prompt(text: &str, params: &ExamParams) -> String {
    let types_list = params
        .question_types
        .iter()
        .map(|t| t.to_string())
        .collect::<Vec<_>>()
        .join(", ");

    let difficulty_str = match params.difficulty {
        Difficulty::Easy => "easy questions suitable for beginners",
        Difficulty::Medium => "moderate difficulty questions requiring understanding",
        Difficulty::Hard => "challenging questions requiring deep analysis",
    };

    let topic_note = match &params.topic_filter {
        Some(topic) => format!("\nFocus on this topic: {topic}"),
        None => String::new(),
    };

    let max_chars = 32000;
    let text_section = if text.len() > max_chars {
        format!("{}...(truncated)", &text[..max_chars])
    } else {
        text.to_string()
    };

    format!(
        r#"Generate {count} questions based on the following document.

Question types: {types}
Difficulty: {difficulty_str}
Language: {language}{topic_note}

DOCUMENT CONTENT:
{text_content}
"#,
        count = params.count,
        types = types_list,
        difficulty_str = difficulty_str,
        language = params.language,
        topic_note = topic_note,
        text_content = text_section,
    )
}

pub fn parse_questions(json_str: &str) -> Result<Vec<Question>, CoreError> {
    let cleaned = json_str
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    let questions: Vec<Question> = serde_json::from_str(cleaned)
        .map_err(|e| CoreError::Exam(format!("JSON parse error: {e}")))?;

    if questions.is_empty() {
        return Err(CoreError::Exam("AI returned empty questions array".to_string()));
    }

    Ok(questions)
}

pub async fn generate_exam(
    client: &AIClient,
    text: &str,
    params: &ExamParams,
    model: &str,
) -> Result<Vec<Question>, CoreError> {
    let system_prompt = build_system_prompt();
    let user_prompt = build_user_prompt(text, params);
    let response = client.chat(&system_prompt, &user_prompt, model).await?;
    parse_questions(&response)
}
