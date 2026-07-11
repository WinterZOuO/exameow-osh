pub struct ConfigStore;
impl ConfigStore {
    pub fn save(&self, _endpoint: &str, _api_key: &str, _model: &str) -> Result<(), String> { Ok(()) }
    pub fn load(&self) -> Result<Option<(String, String, String)>, String> { Ok(None) }
}
