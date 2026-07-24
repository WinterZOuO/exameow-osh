<script setup lang="ts">
import { ref } from 'vue'
import { useI18nStore } from '@/stores/i18n'
import { usePublishedStore } from '@/stores/published'
import { publishExam } from '@/api/relay'
import type { Question } from '@exameow/shared'

const props = defineProps<{ questions: Question[] }>()
const emit = defineEmits<{ (e: 'close'): void }>()

const i18n = useI18nStore()
const publishedStore = usePublishedStore()

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const title = ref('')
const startAt = ref(toLocalInput(new Date()))
const endAt = ref(toLocalInput(new Date(Date.now() + 24 * 3600 * 1000)))
const durationMinutes = ref(60)
const publishing = ref(false)
const error = ref('')
const result = ref<{ code: string; manageUrl: string } | null>(null)
const copied = ref('')

async function handlePublish() {
  error.value = ''
  const start = new Date(startAt.value).getTime()
  const end = new Date(endAt.value).getTime()
  if (!title.value.trim() || !start || !end || !(start < end) || durationMinutes.value <= 0) {
    error.value = i18n.t('pubErrorInvalid')
    return
  }
  publishing.value = true
  try {
    const res = await publishExam({
      title: title.value.trim(),
      questions: props.questions,
      startAt: start,
      endAt: end,
      durationMinutes: durationMinutes.value,
    })
    result.value = { code: res.code, manageUrl: res.manageUrl }
    publishedStore.add({ code: res.code, title: title.value.trim(), manageUrl: res.manageUrl, publishedAt: Date.now() })
  } catch (e: any) {
    error.value = e.message || String(e)
  } finally {
    publishing.value = false
  }
}

async function copy(text: string, which: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = which
    setTimeout(() => (copied.value = ''), 1500)
  } catch {}
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background-color: rgba(0,0,0,0.4)" @click.self="emit('close')">
    <div class="card-filled w-full max-w-md p-5 space-y-4">
      <template v-if="!result">
        <h2 class="text-title-lg">{{ i18n.t('pubDialogTitle') }}</h2>
        <div>
          <label class="text-label-sm">{{ i18n.t('pubFieldTitle') }}</label>
          <input v-model="title" class="input-outlined w-full mt-1" :placeholder="i18n.t('pubFieldTitlePlaceholder')" />
        </div>
        <div>
          <label class="text-label-sm">{{ i18n.t('pubFieldStart') }}</label>
          <input v-model="startAt" type="datetime-local" class="input-outlined w-full mt-1" />
        </div>
        <div>
          <label class="text-label-sm">{{ i18n.t('pubFieldEnd') }}</label>
          <input v-model="endAt" type="datetime-local" class="input-outlined w-full mt-1" />
        </div>
        <div>
          <label class="text-label-sm">{{ i18n.t('pubFieldDuration') }}</label>
          <input v-model.number="durationMinutes" type="number" min="1" class="input-outlined w-full mt-1" />
        </div>
        <p v-if="error" class="text-sm" style="color: rgb(var(--md-error))">{{ error }}</p>
        <div class="flex gap-2 justify-end">
          <button class="btn-outlined" @click="emit('close')">{{ i18n.t('pubCancel') }}</button>
          <button class="btn-filled" :disabled="publishing" @click="handlePublish">
            {{ publishing ? i18n.t('pubPublishing') : i18n.t('pubConfirm') }}
          </button>
        </div>
      </template>
      <template v-else>
        <h2 class="text-title-lg text-center">{{ i18n.t('pubSuccessTitle') }}</h2>
        <div class="text-center">
          <div class="text-label-sm mb-1">{{ i18n.t('pubCodeLabel') }}</div>
          <div class="text-4xl font-bold tracking-[0.3em]" style="color: rgb(var(--md-primary))">{{ result.code }}</div>
          <button class="btn-tonal text-sm mt-2" @click="copy(result.code, 'code')">
            {{ copied === 'code' ? i18n.t('pubCopied') : i18n.t('pubCopy') }}
          </button>
        </div>
        <div>
          <div class="text-label-sm mb-1">{{ i18n.t('pubManageLinkLabel') }}</div>
          <div class="flex gap-2">
            <input :value="result.manageUrl" readonly class="input-outlined flex-1 text-xs" />
            <button class="btn-tonal text-sm shrink-0" @click="copy(result.manageUrl, 'link')">
              {{ copied === 'link' ? i18n.t('pubCopied') : i18n.t('pubCopy') }}
            </button>
          </div>
        </div>
        <button class="btn-filled w-full" @click="emit('close')">{{ i18n.t('pubClose') }}</button>
      </template>
    </div>
  </div>
</template>
