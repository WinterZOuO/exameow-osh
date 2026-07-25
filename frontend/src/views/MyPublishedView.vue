<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { usePublishedStore } from '@/stores/published'
import { ArrowLeftIcon, ClipboardDocumentIcon, ChartBarIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { ref } from 'vue'

const router = useRouter()
const i18n = useI18nStore()
const publishedStore = usePublishedStore()
const copiedCode = ref('')

function managePath(manageUrl: string): string {
  const hash = manageUrl.split('#')[1] || ''
  return hash || '/'
}

async function copyLink(url: string, code: string) {
  try {
    await navigator.clipboard.writeText(url)
    copiedCode.value = code
    setTimeout(() => (copiedCode.value = ''), 1500)
  } catch {}
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="flex items-center gap-2 mb-6">
      <button class="btn-icon" @click="router.push('/mine')">
        <ArrowLeftIcon class="w-5 h-5" />
      </button>
      <h1 class="text-display-sm">{{ i18n.t('minePublished') }}</h1>
    </div>

    <p v-if="publishedStore.list.length === 0" class="text-center py-10" style="color: rgb(var(--md-on-surface-variant))">
      {{ i18n.t('publishedEmpty') }}
    </p>

    <div v-else class="space-y-3">
      <div v-for="rec in publishedStore.list" :key="rec.code" class="card-outlined p-4 sm:p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-title-sm truncate">{{ rec.title }}</div>
            <div class="text-body-sm mt-0.5" style="color: rgb(var(--md-on-surface-variant))">{{ fmtTime(rec.publishedAt) }}</div>
          </div>
          <div class="text-xl font-bold tracking-[0.2em] shrink-0" style="color: rgb(var(--md-primary))">{{ rec.code }}</div>
        </div>
        <div class="flex flex-wrap gap-2 mt-3">
          <button class="btn-filled !h-8 !px-3 !text-xs" @click="router.push(managePath(rec.manageUrl))">
            <ChartBarIcon class="w-4 h-4" /> {{ i18n.t('pubViewResults') }}
          </button>
          <button class="btn-tonal !h-8 !px-3 !text-xs" @click="copyLink(rec.manageUrl, rec.code)">
            <ClipboardDocumentIcon class="w-4 h-4" /> {{ copiedCode === rec.code ? i18n.t('pubCopied') : i18n.t('pubCopy') }}
          </button>
          <button class="btn-outlined !h-8 !px-3 !text-xs" @click="publishedStore.remove(rec.code)">
            <TrashIcon class="w-4 h-4" /> {{ i18n.t('pubDeleteRecord') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
