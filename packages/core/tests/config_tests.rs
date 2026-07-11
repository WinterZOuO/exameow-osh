use exambot_core::config::ConfigStore;

#[test]
fn test_save_and_load_config() {
    let store = ConfigStore::new("ExamBotTest").unwrap();
    store
        .save("https://api.openai.com/v1", "sk-test-key-123", "gpt-4")
        .unwrap();

    let config = store.load().unwrap().unwrap();
    assert_eq!(config.endpoint, "https://api.openai.com/v1");
    assert_eq!(config.api_key, "sk-test-key-123");
    assert_eq!(config.model, "gpt-4");
}

#[test]
fn test_load_nonexistent() {
    let store = ConfigStore::new("ExamBotNonExistent").unwrap();
    let config = store.load().unwrap();
    assert!(config.is_none());
}
