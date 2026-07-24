<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { fetchResults, RelayError } from '@/api/relay'
import type { ExamResultsResponse } from '@exameow/shared'

const route = useRoute()
const i18n = useI18nStore()

const code = (route.params.code as string || '').toUpperCase()
const token = (route.query.token as string || '').trim()

const loading = ref(true)
const unauthorized = ref(false)
const data = ref<ExamResultsResponse | null>(null)

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString()
}

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

onMounted(async () => {
  try {
    data.value = await fetchResults(code, token)
  } catch (e) {
    if (e instanceof RelayError) unauthorized.value = true
    else unauthorized.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <p v-if="loading" class="text-center py-10">{{ i18n.t('takeLoading') }}</p>

    <div v-else-if="unauthorized" class="card-filled p-6 text-center">
      <p class="text-body-lg" style="color: rgb(var(--md-error))">{{ i18n.t('manageUnauthorized') }}</p>
    </div>

    <template v-else-if="data">
      <h1 class="text-display-sm mb-1">{{ i18n.t('manageTitle') }}</h1>
      <p class="text-body-lg mb-4" style="color: rgb(var(--md-on-surface-variant))">
        {{ data.title }} · {{ code }}
      </p>

      <p v-if="data.results.length === 0" class="text-center py-10" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('manageNoResults') }}
      </p>

      <div v-else class="card-outlined overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left" style="color: rgb(var(--md-on-surface-variant))">
              <th class="p-3">{{ i18n.t('manageColName') }}</th>
              <th class="p-3">{{ i18n.t('manageColScore') }}</th>
              <th class="p-3">{{ i18n.t('manageColCorrect') }}</th>
              <th class="p-3">{{ i18n.t('manageColDuration') }}</th>
              <th class="p-3">{{ i18n.t('manageColTime') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in data.results" :key="i" class="border-t" style="border-color: rgb(var(--md-outline-variant))">
              <td class="p-3">{{ r.name }}</td>
              <td class="p-3 font-bold" style="color: rgb(var(--md-primary))">{{ r.score }}/{{ r.totalScore }}</td>
              <td class="p-3">{{ r.correctCount }}/{{ r.totalCount }}</td>
              <td class="p-3">{{ fmtDuration(r.durationSec) }}</td>
              <td class="p-3">{{ fmtTime(r.submittedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
