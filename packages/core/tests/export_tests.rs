use exambot_core::exam::{Question, QuestionType};
use exambot_core::export::export_csv;

fn make_questions() -> Vec<Question> {
    vec![
        Question {
            id: "q1".to_string(),
            qtype: QuestionType::SingleChoice,
            stem: "What is 2+2?".to_string(),
            options: vec!["3".to_string(), "4".to_string(), "5".to_string(), "6".to_string()],
            answer: "4".to_string(),
            analysis: "Basic arithmetic".to_string(),
        },
        Question {
            id: "q2".to_string(),
            qtype: QuestionType::TrueFalse,
            stem: "The sky is blue.".to_string(),
            options: vec!["True".to_string(), "False".to_string()],
            answer: "True".to_string(),
            analysis: "".to_string(),
        },
    ]
}

#[test]
fn test_export_csv() {
    let questions = make_questions();
    let path = "tests/fixtures/test_output.csv";
    export_csv(&questions, path).unwrap();

    let content = std::fs::read_to_string(path).unwrap();
    assert!(content.contains("id,type,stem,options,answer,analysis"));
    assert!(content.contains("q1"));
    assert!(content.contains("3|4|5|6"));
    assert!(content.contains("q2"));

    std::fs::remove_file(path).ok();
}

#[test]
fn test_export_empty_csv() {
    let questions: Vec<Question> = vec![];
    let path = "tests/fixtures/test_empty.csv";
    export_csv(&questions, path).unwrap();

    let content = std::fs::read_to_string(path).unwrap();
    let lines: Vec<_> = content.lines().collect();
    assert_eq!(lines.len(), 1);
    assert!(lines[0].contains("id,type,stem"));

    std::fs::remove_file(path).ok();
}
