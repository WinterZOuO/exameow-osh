use crate::error::CoreError;
use super::models::{ModelInfo, ModelsResponse};
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};

pub struct AIClient {
    client: reqwest::Client,
    endpoint: String,
    api_key: String,
}

impl AIClient {
    pub fn new(endpoint: &str, api_key: &str) -> Self {
        let endpoint = endpoint.trim_end_matches('/').to_string();
        let client = reqwest::Client::builder()
            .no_proxy()
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());
        Self {
            client,
            endpoint,
            api_key: api_key.to_string(),
        }
    }

    pub async fn fetch_models(&self) -> Result<Vec<ModelInfo>, CoreError> {
        let url = format!("{}/models", self.endpoint);
        let response = self
            .client
            .get(&url)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .timeout(std::time::Duration::from_secs(15))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(CoreError::AI(format!("HTTP {status}: {body}")));
        }

        let models_response: ModelsResponse = response.json().await?;
        Ok(models_response.data)
    }

    pub async fn chat(
        &self,
        system_prompt: &str,
        user_prompt: &str,
        model: &str,
    ) -> Result<String, CoreError> {
        let url = format!("{}/chat/completions", self.endpoint);

        let body = serde_json::json!({
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 16384,
        });

        let response = self
            .client
            .post(&url)
            .header(AUTHORIZATION, format!("Bearer {}", self.api_key))
            .header(CONTENT_TYPE, "application/json")
            .json(&body)
            .timeout(std::time::Duration::from_secs(120))
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(CoreError::AI(format!("HTTP {status}: {body}")));
        }

        let json: serde_json::Value = response.json().await?;
        let content = json["choices"][0]["message"]["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        if content.is_empty() {
            return Err(CoreError::AI("empty response from AI".to_string()));
        }

        Ok(content)
    }
}
