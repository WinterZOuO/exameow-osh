export function normalizeEndpoint(raw: string): string {
  let u = raw.trim().replace(/\/+$/, '')
  u = u.replace(/\/chat\/completions$/i, '')
  return u.replace(/\/+$/, '')
}

/**
 * 漏咗 `/v1` 係最常見嘅填錯法，所以「獲取模型」第一次失敗會補多個 `/v1` 再試
 * （見 `stores/config.ts` 個 `fetchModels()`）。
 *
 * 但**淨係喺條 path 完全冇版本段嗰陣先可以補**。本來得個 `/\/v\d+$/` 睇結尾，
 * Gemini 條官方 OpenAI 相容端點 `.../v1beta/openai` 結尾係 `/openai` 唔係 `/v1`，
 * 就會俾人補成 `.../v1beta/openai/v1` —— 一條唔存在嘅路徑，而 allowlist 只睇
 * host 唔睇 path，攔佢唔住。而家改成「path 入面任何一段係 `v<數字>…` 就唔補」，
 * `v1` / `v2` / `v1beta` / `v1alpha` 一律當「用戶已經俾咗完整 API base」。
 *
 * 兩個方向嘅代價唔對等：唔補頂多係幫唔到手，補錯就會整爛一條本身啱嘅 endpoint，
 * 所以拿不準就唔補。
 */
export function withV1Suffix(endpoint: string): string | null {
  // 只睇 path —— `https://v2.example.com/api` 嗰個 `v2` 係 host label 唔算數
  const path = endpoint.replace(/^[a-z][a-z\d+\-.]*:\/\/[^/]*/i, '')
  if (path.split('/').some(seg => /^v\d/i.test(seg))) return null
  return `${endpoint}/v1`
}
