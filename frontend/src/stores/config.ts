import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ModelInfo } from '@exameow/shared'
import { api } from '@/api'
import type { ServerConfigInfo } from '@/api/http'
import { normalizeEndpoint, withV1Suffix } from '@/utils/endpoint'

export type AIProvider = 'custom' | 'server'

/**
 * 每個用戶自己嘅 LLM 設定（W3）。
 *
 * 同上游最大分別：**條 API key 唔再住喺呢度**。
 * `apiKeyInput` 係一個只寫嘅輸入格 —— 用戶貼咗，`save()` 送上 server 加密存起，
 * 跟住即刻清空。之後 server 永遠唔會將條 key 交返落嚟，介面只攞到 `keyHint`
 * （`sk-a…4f2a`）夠用戶認得返自己貼咗邊條。
 *
 * 即係話：換咗部機／清咗 cache，`apiKeyInput` 會係空，但 `configured` 照樣 true，
 * 生成同解析照做 —— server 嗰邊有 key 就得。
 */
export const useConfigStore = defineStore('config', () => {
  const endpoint = ref('')
  const model = ref('')
  /** 只寫。存完就清走，唔會由 server 讀返落嚟 */
  const apiKeyInput = ref('')
  /** server 手上有冇條 key */
  const hasStoredKey = ref(false)
  const keyHint = ref('')
  const models = ref<ModelInfo[]>([])
  const loading = ref(false)
  const aiProvider = ref<AIProvider>('custom')
  const serverInfo = ref<ServerConfigInfo | null>(null)
  const loaded = ref(false)

  /** 夠料出題未：有型號，而且 server 有 key（或者 server 自己有 env key） */
  const configured = computed(() => {
    if (!model.value) return false
    if (aiProvider.value === 'server') return !!serverInfo.value?.has_env_ai
    return hasStoredKey.value
  })

  /** 可唔可以撳「獲取模型」/「儲存」：要 endpoint ＋（新貼嘅 key 或者已存嘅 key） */
  const canSave = computed(() => {
    if (aiProvider.value === 'server') return false
    return !!endpoint.value.trim() && (!!apiKeyInput.value.trim() || hasStoredKey.value)
  })

  function applyInfo(info: { configured: boolean; endpoint: string; model: string; key_hint: string }) {
    hasStoredKey.value = info.configured
    keyHint.value = info.key_hint
    if (info.endpoint) endpoint.value = info.endpoint
    if (info.model) model.value = info.model
  }

  async function loadSaved() {
    serverInfo.value = await api.getServerInfo()
    const info = await api.getLlmConfig()
    applyInfo(info)
    loaded.value = true

    const stored = localStorage.getItem('exameow_ai_provider')
    if (stored === 'server' && serverInfo.value?.has_env_ai) {
      aiProvider.value = 'server'
      if (!model.value && serverInfo.value.model) model.value = serverInfo.value.model
      return
    }
    // 自己冇設定但 server 有 env key，就預設行 server 嗰套
    if (!hasStoredKey.value && serverInfo.value?.has_env_ai) {
      aiProvider.value = 'server'
      if (serverInfo.value.model) model.value = serverInfo.value.model
      localStorage.setItem('exameow_ai_provider', 'server')
    }
  }

  /**
   * 存設定。`api_key` 留空 = 叫 server 沿用已存嗰條，
   * 所以淨係改型號唔使重新貼一次 key。
   */
  async function save() {
    localStorage.setItem('exameow_ai_provider', aiProvider.value)
    if (aiProvider.value === 'server') return

    endpoint.value = normalizeEndpoint(endpoint.value)
    const info = await api.saveLlmConfig({
      endpoint: endpoint.value,
      model: model.value,
      api_key: apiKeyInput.value.trim() || undefined,
    })
    // 存低咗就即刻由記憶體清走，唔留響前端
    apiKeyInput.value = ''
    applyInfo(info)
  }

  /**
   * 拉型號列表。server 要用已存嘅 key 去問 provider，所以要先存。
   * 上游係將 endpoint + key 塞落 query string 直接問（S2），而家冇呢回事。
   */
  async function fetchModels() {
    loading.value = true
    try {
      if (aiProvider.value === 'server') {
        models.value = await api.getModels()
        return
      }
      endpoint.value = normalizeEndpoint(endpoint.value)
      await save()
      try {
        models.value = await api.getModels()
      } catch (firstError) {
        // endpoint 少咗 /v1 係最常見嘅填錯法，試多次先算數
        const candidate = withV1Suffix(endpoint.value)
        if (!candidate) throw firstError
        // 呢個 retry 要**存低**個新 endpoint 先試得到（server 攞自己嗰行去 call
        // provider），所以試唔掂就一定要還原 —— 唔還原嘅話「獲取模型」失敗過一次
        // （貼錯 key、超時、rate limit 都算），個設定就永久留咗條補多咗 /v1 嘅
        // 爛 endpoint，之後生成全部 404。
        const original = endpoint.value
        endpoint.value = candidate
        await save()
        try {
          models.value = await api.getModels()
        } catch {
          endpoint.value = original
          try {
            await save()
          } catch {
            // 連還原都存唔返（多數係斷網）：起碼介面顯示返用戶原本填嗰條，
            // 而佢跟住見到 firstError 都要再撳一次，嗰陣會再存過
          }
          throw firstError
        }
      }
    } catch (e: any) {
      throw new Error(e.message || String(e))
    } finally {
      loading.value = false
    }
  }

  async function clearKey() {
    await api.deleteLlmConfig()
    apiKeyInput.value = ''
    hasStoredKey.value = false
    keyHint.value = ''
    models.value = []
  }

  function setProvider(provider: AIProvider) {
    aiProvider.value = provider
    models.value = []
    if (provider === 'server' && !model.value && serverInfo.value?.model) {
      model.value = serverInfo.value.model
    }
  }

  return {
    endpoint, model, apiKeyInput, hasStoredKey, keyHint, models, loading,
    configured, canSave, aiProvider, serverInfo, loaded,
    loadSaved, fetchModels, save, clearKey, setProvider,
  }
})
