import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ModelInfo, VisionConfig, VisionMode } from '@exambot/shared'
import { api } from '@/api'
import { isCloudflare } from '@/utils/platform'
import { fetchModelsFromEndpoint } from '@/utils/modelList'

export const useVisionConfigStore = defineStore('visionConfig', () => {
  const mode = ref<VisionMode>('ocr')
  const endpoint = ref('')
  const apiKey = ref('')
  const model = ref('')
  const models = ref<ModelInfo[]>([])
  const loading = ref(false)
  const loaded = ref(false)

  const llmConfigured = computed(() => !!endpoint.value && !!apiKey.value && !!model.value)

  async function loadSaved() {
    if (loaded.value) return
    try {
      const saved = await api.loadVisionConfig()
      if (saved) {
        mode.value = saved.mode === 'llm' ? 'llm' : 'ocr'
        endpoint.value = saved.endpoint || ''
        apiKey.value = saved.api_key || ''
        model.value = saved.model || ''
      }
    } catch {}
    loaded.value = true
  }

  async function fetchModels() {
    if (!endpoint.value || !apiKey.value) return
    loading.value = true
    try {
      if (isCloudflare()) {
        models.value = await fetchModelsFromEndpoint(endpoint.value, apiKey.value)
      } else {
        models.value = await api.getModels({ endpoint: endpoint.value, api_key: apiKey.value, model: '' })
      }
    } catch (e: any) {
      throw new Error(e.message || String(e))
    } finally {
      loading.value = false
    }
  }

  async function save() {
    await api.saveVisionConfig(getConfig())
  }

  function getConfig(): VisionConfig {
    return { mode: mode.value, endpoint: endpoint.value, api_key: apiKey.value, model: model.value }
  }

  return { mode, endpoint, apiKey, model, models, loading, llmConfigured, loadSaved, fetchModels, save, getConfig }
})
