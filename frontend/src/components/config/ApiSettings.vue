<script setup lang="ts">
import { ref } from 'vue'
import { useConfigStore } from '@/stores/config'

const store = useConfigStore()
const showKey = ref(false)
const fetchError = ref('')
const fetchingModels = ref(false)
const saveSuccess = ref(false)

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
  try {
    await store.save()
    saveSuccess.value = true
    setTimeout(() => (saveSuccess.value = false), 2500)
  } catch {}
}
</script>

<template>
  <v-card class="mx-auto" max-width="640">
    <v-card-title class="text-h5">AI Configuration</v-card-title>
    <v-card-text>
      <v-text-field
        v-model="store.endpoint"
        label="API Endpoint URL"
        placeholder="https://api.openai.com/v1"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-server"
      />

      <v-text-field
        v-model="store.apiKey"
        :type="showKey ? 'text' : 'password'"
        label="API Key"
        placeholder="sk-..."
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-key"
        :append-inner-icon="showKey ? 'mdi-eye-off' : 'mdi-eye'"
        @click:append-inner="showKey = !showKey"
      />

      <v-btn
        block
        variant="tonal"
        :loading="fetchingModels"
        :disabled="!store.endpoint || !store.apiKey"
        @click="handleFetchModels"
      >
        Fetch Models
      </v-btn>

      <v-alert
        v-if="fetchError"
        type="error"
        variant="tonal"
        density="compact"
        closable
        class="mt-2"
      >
        {{ fetchError }}
      </v-alert>

      <v-select
        v-if="store.models.length > 0"
        v-model="store.model"
        :items="store.models"
        item-title="id"
        item-value="id"
        label="Model"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-brain"
        class="mt-4"
      />
      <v-text-field
        v-else
        v-model="store.model"
        label="Model Name"
        placeholder="e.g. gpt-4o"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-brain"
        class="mt-4"
      />
    </v-card-text>

    <v-card-actions>
      <v-spacer />
      <v-btn
        color="primary"
        variant="elevated"
        :disabled="!store.configured"
        @click="handleSave"
      >
        Save Configuration
      </v-btn>
    </v-card-actions>

    <v-alert
      v-if="saveSuccess"
      type="success"
      variant="tonal"
      density="compact"
      class="mx-4 mb-4"
    >
      Configuration saved successfully
    </v-alert>
  </v-card>
</template>
