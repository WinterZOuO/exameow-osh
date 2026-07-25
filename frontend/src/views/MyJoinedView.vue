<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useJoinedStore } from '@/stores/joined'
import { ChevronLeftIcon, TrashIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const i18n = useI18nStore()
const joinedStore = useJoinedStore()

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <div class="flex items-center gap-2 mb-6">
      <button class="btn-icon" @click="router.push('/mine')">
        <ChevronLeftIcon class="w-6 h-6" />
      </button>
      <h1 class="text-display-sm">{{ i18n.t('mineJoined') }}</h1>
    </div>

    <p v-if="joinedStore.list.length === 0" class="text-center py-10" style="color: rgb(var(--md-on-surface-variant))">
      {{ i18n.t('joinedEmpty') }}
    </p>

    <div v-else class="space-y-3">
      <div v-for="rec in joinedStore.list" :key="rec.code + ':' + rec.name" class="card-outlined p-4 sm:p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-title-sm truncate">{{ rec.title || rec.code }}</div>
            <div class="text-body-sm mt-0.5" style="color: rgb(var(--md-on-surface-variant))">
              {{ rec.name }} · {{ rec.code }} · {{ fmtTime(rec.joinedAt) }}
            </div>
          </div>
          <div v-if="rec.submittedAt" class="text-xl font-bold shrink-0" style="color: rgb(var(--md-primary))">
            {{ rec.score }}/{{ rec.totalScore }}
          </div>
          <div v-else class="text-sm shrink-0" style="color: rgb(var(--md-on-surface-variant))">
            {{ i18n.t('joinedNotSubmitted') }}
          </div>
        </div>
        <div class="flex flex-wrap gap-2 mt-3">
          <button
            class="btn-tonal !h-8 !px-3 !text-xs"
            @click="router.push({ path: `/take/${rec.code}`, query: { name: rec.name } })"
          >
            {{ i18n.t('joinedReenter') }}
          </button>
          <button class="btn-outlined !h-8 !px-3 !text-xs" @click="joinedStore.remove(rec.code, rec.name)">
            <TrashIcon class="w-4 h-4" /> {{ i18n.t('pubDeleteRecord') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
