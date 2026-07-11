import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AIConfig, ModelInfo } from '@exambot/shared'
import { api } from '@/api'

export const useConfigStore = defineStore('config', () => {
  const endpoint = ref('https://api.openai.com/v1')
  const apiKey = ref('')
  const model = ref('')
  const models = ref<ModelInfo[]>([])
  const loading = ref(false)
  const configured = computed(() => !!endpoint.value && !!apiKey.value && !!model.value)

  async function loadSaved() {
    const saved = await api.loadConfig()
    if (saved) {
      endpoint.value = saved.endpoint
      apiKey.value = saved.api_key
      model.value = saved.model
    }
  }

  async function fetchModels() {
    if (!endpoint.value || !apiKey.value) return
    loading.value = true
    try {
      models.value = await api.getModels({ endpoint: endpoint.value, api_key: apiKey.value, model: '' })
    } catch (e: any) {
      throw new Error(e.message || String(e))
    } finally {
      loading.value = false
    }
  }

  async function save() {
    await api.saveConfig({ endpoint: endpoint.value, api_key: apiKey.value, model: model.value })
  }

  function getConfig(): AIConfig {
    return { endpoint: endpoint.value, api_key: apiKey.value, model: model.value }
  }

  return { endpoint, apiKey, model, models, loading, configured, loadSaved, fetchModels, save, getConfig }
})
