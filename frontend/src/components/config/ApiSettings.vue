<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/config'
import { useI18nStore } from '@/stores/i18n'
import { isCloudflare } from '@/utils/platform'
import { ServerIcon, KeyIcon, CloudArrowDownIcon, CpuChipIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, CheckIcon, ArrowRightIcon, CloudIcon } from '@heroicons/vue/24/outline'

const store = useConfigStore()
const router = useRouter()
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
  saveError.value = false
  try {
    await store.save()
    saveSuccess.value = true
    setTimeout(() => saveSuccess.value = false, 2500)
  } catch (e: any) { saveError.value = e.message || String(e) }
}
</script>

<template>
  <div>
    <h1 class="text-display-sm mb-1">{{ i18n.t('configTitle') }}</h1>
    <p class="text-body-lg mb-6" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSubtitle') }}</p>

    <!-- CF: Provider toggle -->
    <div v-if="isCloudflare()" class="card-filled p-4 mb-4">
      <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configAiProvider') }}</label>
      <div class="flex items-center gap-3">
        <button
          class="btn-tonal text-sm !px-4 !py-2"
          :class="{ 'btn-filled': store.aiProvider === 'cf-free' }"
          @click="store.setProvider('cf-free')"
        >
          <CloudIcon class="w-4 h-4" />
          {{ i18n.t('configCfFree') }}
        </button>
        <button
          class="btn-tonal text-sm !px-4 !py-2"
          :class="{ 'btn-filled': store.aiProvider === 'custom' }"
          @click="store.setProvider('custom')"
        >
          <ServerIcon class="w-4 h-4" />
          {{ i18n.t('configCustomApi') }}
        </button>
      </div>
      <p v-if="store.aiProvider === 'cf-free'" class="text-body-sm mt-2" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('configCfFreeDesc') }}
      </p>
      <p v-else class="text-body-sm mt-2" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('configCustomApiDesc') }}
      </p>
    </div>

    <!-- Endpoint (custom API or non-CF) -->
    <div v-if="!isCloudflare() || store.aiProvider === 'custom'" class="card-filled p-5 mb-4">
      <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSectionEndpoint') }}</label>
      <div class="relative">
        <ServerIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
        <input
          v-model="store.endpoint"
          :placeholder="i18n.t('configApiUrl')"
          class="input-outlined !pl-10"
        />
      </div>
    </div>

    <!-- Auth (custom API or non-CF) -->
    <div v-if="!isCloudflare() || store.aiProvider === 'custom'" class="card-filled p-5 mb-4">
      <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSectionAuth') }}</label>
      <div class="relative">
        <KeyIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
        <input
          v-model="store.apiKey"
          :type="showKey ? 'text' : 'password'"
          :placeholder="i18n.t('configApiKey')"
          class="input-outlined !pl-10 !pr-10"
        />
        <button class="absolute right-3 top-1/2 -translate-y-1/2 btn-icon !w-8 !h-8" @click="showKey = !showKey">
          <EyeSlashIcon v-if="showKey" class="w-4 h-4" />
          <EyeIcon v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Model -->
    <div class="card-filled p-5 mb-4">
      <label class="text-label-md block mb-3" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('configSectionModel') }}</label>

      <div class="flex flex-col sm:flex-row items-center gap-3">
        <button
          class="btn-outlined shrink-0 text-sm"
          :disabled="(!isCloudflare() || store.aiProvider === 'custom') && (!store.endpoint || !store.apiKey)"
          @click="handleFetchModels"
        >
          <CloudArrowDownIcon class="w-4 h-4" />
          {{ fetchingModels ? '...' : i18n.t('configFetchModels') }}
        </button>

        <div class="flex-1 relative">
          <CpuChipIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 z-10" style="color: rgb(var(--md-on-surface-variant))" />
          <select
            v-if="store.models.length > 0"
            v-model="store.model"
            class="input-outlined !pl-10 appearance-none cursor-pointer"
          >
            <option value="" disabled>{{ i18n.t('configSelectModel') }}</option>
            <option v-for="m in store.models" :key="m.id" :value="m.id">{{ m.id }}</option>
          </select>
          <input
            v-else
            v-model="store.model"
            :placeholder="i18n.t('configEnterModel')"
            class="input-outlined !pl-10"
          />
        </div>
      </div>
    </div>

    <!-- Fetch Error -->
    <Transition name="scale">
      <div
        v-if="fetchError"
        class="mb-4 px-4 py-3 rounded-2xl text-sm flex items-center gap-2"
        style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
      >
        <span>{{ fetchError }}</span>
      </div>
    </Transition>

    <!-- Actions -->
    <div class="flex items-center justify-center gap-3">
      <button class="btn-filled" :disabled="!store.configured" @click="handleSave">
        <CheckIcon class="w-5 h-5" />
        {{ i18n.t('configSave') }}
      </button>

      <button
        class="btn-filled"
        :disabled="!store.configured"
        @click="router.push('/generate')"
      >
        <ArrowRightIcon class="w-5 h-5" />
        {{ i18n.t('configReadyCta') }}
      </button>

      <Transition name="fade">
        <div v-if="saveSuccess" class="flex items-center gap-2 text-sm font-medium" style="color: rgb(var(--md-primary))">
          <CheckCircleIcon class="w-5 h-5" /> {{ i18n.t('configSaved') }}
        </div>
      </Transition>
    </div>

    <Transition name="scale">
      <div
        v-if="saveError"
        class="mt-4 px-4 py-3 rounded-2xl text-sm"
        style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
      >
        {{ saveError }}
      </div>
    </Transition>
  </div>
</template>
