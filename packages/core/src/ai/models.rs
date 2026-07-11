use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct ModelInfo {
    pub id: String,
}
