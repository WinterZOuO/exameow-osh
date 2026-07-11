use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum QuestionType {
    SingleChoice,
    MultiChoice,
    TrueFalse,
    FillBlank,
    ShortAnswer,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Question {
    pub id: String,
    #[serde(rename = "type")]
    pub qtype: QuestionType,
    pub stem: String,
    pub options: Vec<String>,
    pub answer: String,
    pub analysis: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExamParams {
    pub question_types: Vec<QuestionType>,
    pub count: u32,
    pub difficulty: Difficulty,
    pub language: String,
    pub topic_filter: Option<String>,
}
