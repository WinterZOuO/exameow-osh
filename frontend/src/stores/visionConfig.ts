import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { VisionConfig, VisionMode } from '@exambot/shared'
import { api } from '@/api'

export const useVisionConfigStore = defineStore('visionConfig', () => {
  const mode = ref<VisionMode>('ocr')
  const endpoint = ref('')
  const apiKey = ref('')
  const model = ref('')
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

  async function save() {
    await api.saveVisionConfig(getConfig())
  }

  function getConfig(): VisionConfig {
    return { mode: mode.value, endpoint: endpoint.value, api_key: apiKey.value, model: model.value }
  }

  return { mode, endpoint, apiKey, model, llmConfigured, loadSaved, save, getConfig }
})
