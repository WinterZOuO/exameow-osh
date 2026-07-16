import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { AIConfig, ModelInfo } from '@exambot/shared'
import { api } from '@/api'
import { isCloudflare } from '@/utils/platform'

import { DEFAULT_CF_MODEL } from '@/api/cf-models'

export type AIProvider = 'cf-free' | 'custom'

export const useConfigStore = defineStore('config', () => {
  const endpoint = ref('https://api.openai.com/v1')
  const apiKey = ref('')
  const model = ref('')
  const models = ref<ModelInfo[]>([])
  const loading = ref(false)
  const aiProvider = ref<AIProvider>('cf-free')

  const configured = computed(() => {
    if (!isCloudflare()) {
      return !!endpoint.value && !!apiKey.value && !!model.value
    }
    if (aiProvider.value === 'cf-free') {
      return !!model.value
    }
    return !!endpoint.value && !!apiKey.value && !!model.value
  })

  async function loadSaved() {
    const saved = await api.loadConfig()
    if (saved) {
      if (saved.endpoint) endpoint.value = saved.endpoint
      if (saved.api_key) apiKey.value = saved.api_key
      model.value = saved.model
    }
    if (isCloudflare()) {
      const provider = localStorage.getItem('exambot_ai_provider')
      if (provider === 'custom' || provider === 'cf-free') {
        aiProvider.value = provider
      }
      if (!model.value) {
        endpoint.value = 'cloudflare-worker'
        apiKey.value = 'cloudflare-worker'
      }
    }
  }

  async function fetchModels() {
    loading.value = true
    try {
      if (isCloudflare() && aiProvider.value === 'cf-free') {
        models.value = await api.getModels({ endpoint: '', api_key: '', model: '' })
      } else if (isCloudflare() && aiProvider.value === 'custom') {
        models.value = await fetchCustomModels(endpoint.value, apiKey.value)
      } else {
        if (!endpoint.value || !apiKey.value) return
        models.value = await api.getModels({ endpoint: endpoint.value, api_key: apiKey.value, model: '' })
      }
    } catch (e: any) {
      throw new Error(e.message || String(e))
    } finally {
      loading.value = false
    }
  }

  async function fetchCustomModels(ep: string, key: string): Promise<ModelInfo[]> {
    const url = `${ep.replace(/\/+$/, '')}/models`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`)
    const data = await res.json()
    const list = data.data || data || []
    return list.map((m: any) => ({ id: m.id || m.name || m.model }))
  }

  async function save() {
    localStorage.setItem('exambot_ai_provider', aiProvider.value)
    await api.saveConfig({ endpoint: endpoint.value, api_key: apiKey.value, model: model.value })
  }

  function getConfig(): AIConfig {
    return { endpoint: endpoint.value, api_key: apiKey.value, model: model.value }
  }

  function setProvider(provider: AIProvider) {
    aiProvider.value = provider
    models.value = []
    if (provider === 'cf-free' && !model.value) {
      model.value = DEFAULT_CF_MODEL
    }
  }

  return { endpoint, apiKey, model, models, loading, configured, aiProvider, loadSaved, fetchModels, save, getConfig, setProvider }
})
