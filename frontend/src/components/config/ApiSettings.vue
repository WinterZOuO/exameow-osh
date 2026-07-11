<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useI18nStore } from '@/stores/i18n'
import { ServerIcon, KeyIcon, CloudArrowDownIcon, CpuChipIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, CheckIcon } from '@heroicons/vue/24/outline'

const store = useConfigStore()
const i18n = useI18nStore()
const showKey = ref(false)
const fetchError = ref('')
const fetchingModels = ref(false)
const saveSuccess = ref(false)
const saveError = ref('')

async function handleFetchModels() {
  fetchError.value = ''
  fetchingModels.value = true
  try { await store.fetchModels() } catch (e: any) { fetchError.value = e.message || String(e) } finally { fetchingModels.value = false }
}

async function handleSave() {
  saveError.value = ''
  try {
    await store.save()
    saveSuccess.value = true
    setTimeout(() => saveSuccess.value = false, 2500)
  } catch (e: any) { saveError.value = e.message || String(e) }
}
</script>

<template>
  <div>
    <h1 class="page-title mb-1">{{ i18n.t('configTitle') }}</h1>
    <p class="page-subtitle mb-8">{{ i18n.t('configSubtitle') }}</p>

    <!-- Endpoint Card -->
    <div class="card mb-4">
      <label class="section-label">{{ i18n.t('configSectionEndpoint') }}</label>
      <div class="relative">
        <ServerIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--c-text-secondary))]" />
        <input
          v-model="store.endpoint"
          :placeholder="i18n.t('configApiUrl')"
          class="input-field !pl-11"
        />
      </div>
    </div>

    <!-- Auth Card -->
    <div class="card mb-4">
      <label class="section-label">{{ i18n.t('configSectionAuth') }}</label>
      <div class="relative">
        <KeyIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--c-text-secondary))]" />
        <input
          v-model="store.apiKey"
          :type="showKey ? 'text' : 'password'"
          :placeholder="i18n.t('configApiKey')"
          class="input-field !pl-11 !pr-11"
        />
        <button class="absolute right-4 top-1/2 -translate-y-1/2 text-[rgb(var(--c-text-secondary))]" @click="showKey = !showKey">
          <EyeSlashIcon v-if="showKey" class="w-5 h-5" />
          <EyeIcon v-else class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Model Card -->
    <div class="card mb-4">
      <label class="section-label">{{ i18n.t('configSectionModel') }}</label>

      <div class="flex flex-col sm:flex-row gap-3">
        <button
          class="btn-outline shrink-0 !py-3 text-sm"
          :disabled="!store.endpoint || !store.apiKey"
          @click="handleFetchModels"
        >
          <CloudArrowDownIcon class="w-4 h-4" />
          {{ fetchingModels ? '...' : i18n.t('configFetchModels') }}
        </button>

        <div class="flex-1 relative">
          <CpuChipIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgb(var(--c-text-secondary))]" />
          <select
            v-if="store.models.length > 0"
            v-model="store.model"
            class="input-field !pl-11 appearance-none cursor-pointer"
          >
            <option value="" disabled>{{ i18n.t('configSelectModel') }}</option>
            <option v-for="m in store.models" :key="m.id" :value="m.id">{{ m.id }}</option>
          </select>
          <input
            v-else
            v-model="store.model"
            :placeholder="i18n.t('configEnterModel')"
            class="input-field !pl-11"
          />
        </div>
      </div>
    </div>

    <!-- Alerts -->
    <div v-if="fetchError" class="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
      <span>{{ fetchError }}</span>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-3">
      <button class="btn-primary" :disabled="!store.configured" @click="handleSave">
        <CheckIcon class="w-5 h-5" />
        {{ i18n.t('configSave') }}
      </button>

      <Transition name="fade">
        <div v-if="saveSuccess" class="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
          <CheckCircleIcon class="w-5 h-5" /> {{ i18n.t('configSaved') }}
        </div>
      </Transition>
    </div>

    <div v-if="saveError" class="mt-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-700 dark:text-red-300">
      {{ saveError }}
    </div>
  </div>
</template>
