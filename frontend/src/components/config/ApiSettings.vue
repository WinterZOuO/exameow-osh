<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useI18nStore } from '@/stores/i18n'

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
  try {
    await store.fetchModels()
  } catch (e: any) {
    fetchError.value = e.message || String(e)
  } finally {
    fetchingModels.value = false
  }
}

async function handleSave() {
  saveError.value = ''
  try {
    await store.save()
    saveSuccess.value = true
    setTimeout(() => (saveSuccess.value = false), 2500)
  } catch (e: any) {
    saveError.value = e.message || String(e)
  }
}
</script>

<template>
  <div class="mb-8">
    <h1 class="text-h4 font-weight-bold mb-1" style="letter-spacing: -0.5px;">{{ i18n.t('configTitle') }}</h1>
    <p class="text-body-1 text-medium-emphasis mb-6">{{ i18n.t('configSubtitle') }}</p>

    <v-card class="mb-4 pb-2 px-2 pt-2">
      <v-card-text>
        <v-label class="text-caption font-weight-bold text-uppercase mb-2 d-block" style="color: #1A6CFF; letter-spacing: 1px;">
          {{ i18n.t('configSectionEndpoint') }}
        </v-label>
        <v-text-field
          v-model="store.endpoint"
          :label="i18n.t('configApiUrl')"
          placeholder="https://api.openai.com/v1"
          prepend-inner-icon="mdi-server"
          class="mb-2"
        />

        <v-divider class="my-4" opacity="0.08" />

        <v-label class="text-caption font-weight-bold text-uppercase mb-2 d-block" style="color: #1A6CFF; letter-spacing: 1px;">
          {{ i18n.t('configSectionAuth') }}
        </v-label>
        <v-text-field
          v-model="store.apiKey"
          :type="showKey ? 'text' : 'password'"
          :label="i18n.t('configApiKey')"
          placeholder="sk-..."
          prepend-inner-icon="mdi-key"
          :append-inner-icon="showKey ? 'mdi-eye-off' : 'mdi-eye'"
          @click:append-inner="showKey = !showKey"
        />
      </v-card-text>
    </v-card>

    <v-card class="mb-4 pb-2 px-2 pt-2">
      <v-card-text>
        <v-label class="text-caption font-weight-bold text-uppercase mb-2 d-block" style="color: #1A6CFF; letter-spacing: 1px;">
          {{ i18n.t('configSectionModel') }}
        </v-label>

        <div class="d-flex gap-3">
          <v-btn
            variant="outlined"
            color="primary"
            :loading="fetchingModels"
            :disabled="!store.endpoint || !store.apiKey"
            prepend-icon="mdi-cloud-download"
            class="flex-shrink-0"
            style="min-height: 56px;"
            @click="handleFetchModels"
          >
            {{ i18n.t('configFetchModels') }}
          </v-btn>

          <div class="flex-grow-1">
            <v-select
              v-if="store.models.length > 0"
              v-model="store.model"
              :items="store.models"
              item-title="id"
              item-value="id"
              :label="i18n.t('configSelectModel')"
              prepend-inner-icon="mdi-brain"
            />
            <v-text-field
              v-else
              v-model="store.model"
              :label="i18n.t('configEnterModel')"
              placeholder="gpt-4o"
              prepend-inner-icon="mdi-brain"
            />
          </div>
        </div>
      </v-card-text>
    </v-card>

    <v-alert v-if="fetchError" type="error" closable class="mb-4">
      {{ fetchError }}
    </v-alert>

    <div class="d-flex ga-3 align-center">
      <v-btn
        color="primary"
        variant="flat"
        size="large"
        :disabled="!store.configured"
        @click="handleSave"
      >
        <v-icon icon="mdi-check" start />
        {{ i18n.t('configSave') }}
      </v-btn>

      <v-fade-transition>
        <div v-if="saveSuccess" class="d-flex align-center ga-2">
          <v-icon icon="mdi-check-circle" color="success" size="20" />
          <span class="text-body-2 font-weight-medium" style="color: #1B7B34;">{{ i18n.t('configSaved') }}</span>
        </div>
      </v-fade-transition>
    </div>

    <v-alert v-if="saveError" type="error" closable class="mt-4">
      {{ saveError }}
    </v-alert>
  </div>
</template>

<style scoped>
.gap-3 { gap: 12px; }
</style>
