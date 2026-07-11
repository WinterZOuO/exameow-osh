<script setup lang="ts">
import { useExamStore } from '@/stores/exam'
import { useI18nStore } from '@/stores/i18n'
import { QuestionType, Difficulty } from '@exambot/shared'

const store = useExamStore()
const i18n = useI18nStore()

const typeOptions = [
  { title: 'typeSingle', value: QuestionType.SingleChoice },
  { title: 'typeMulti', value: QuestionType.MultiChoice },
  { title: 'typeTrueFalse', value: QuestionType.TrueFalse },
  { title: 'typeFillBlank', value: QuestionType.FillBlank },
  { title: 'typeShortAnswer', value: QuestionType.ShortAnswer },
]

const difficultyOptions = [
  { title: 'diffEasy', value: Difficulty.Easy },
  { title: 'diffMedium', value: Difficulty.Medium },
  { title: 'diffHard', value: Difficulty.Hard },
]

function toggleType(type: QuestionType) {
  const idx = store.questionTypes.indexOf(type)
  if (idx >= 0) {
    store.questionTypes.splice(idx, 1)
    store.typeCounts[type] = 0
  } else {
    store.questionTypes.push(type)
    store.typeCounts[type] = 5
  }
}
</script>

<template>
  <v-card class="h-100">
    <v-card-text>
      <v-label class="text-caption font-weight-bold text-uppercase mb-4 d-block" style="color: #1A6CFF; letter-spacing: 1px;">
        {{ i18n.t('genQuestionTypes') }}
      </v-label>

      <div>
        <div
          v-for="opt in typeOptions"
          :key="opt.value"
          :class="[
            'px-3 py-2 rounded-lg mb-1',
            store.questionTypes.includes(opt.value) ? 'bg-primary' : '',
          ]"
          :style="
            store.questionTypes.includes(opt.value)
              ? 'background-color: rgba(var(--v-theme-primary), 0.06) !important;'
              : ''
          "
        >
          <div class="d-flex align-center" style="gap: 12px;">
            <v-chip
              :variant="store.questionTypes.includes(opt.value) ? 'flat' : 'outlined'"
              :color="store.questionTypes.includes(opt.value) ? 'primary' : 'on-surface-variant'"
              size="small"
              filter
              class="cursor-pointer flex-shrink-0"
              style="font-weight: 600; font-size: 13px; min-width: 90px; justify-content: center;"
              @click="toggleType(opt.value)"
            >
              {{ i18n.t(opt.title as any) }}
            </v-chip>

            <template v-if="store.questionTypes.includes(opt.value)">
              <v-btn
                icon="mdi-minus"
                variant="text"
                size="x-small"
                density="compact"
                color="on-surface-variant"
                @click="store.typeCounts[opt.value] = Math.max(0, (store.typeCounts[opt.value] || 0) - 1)"
              />
              <span
                style="
                  min-width: 24px; text-align: center;
                  font-weight: 700; font-size: 16px;
                  font-variant-numeric: tabular-nums;
                "
              >
                {{ store.typeCounts[opt.value] }}
              </span>
              <v-btn
                icon="mdi-plus"
                variant="text"
                size="x-small"
                density="compact"
                color="on-surface-variant"
                @click="store.typeCounts[opt.value] = Math.min(20, (store.typeCounts[opt.value] || 0) + 1)"
              />
            </template>
            <v-spacer v-else />
          </div>
        </div>
      </div>

      <v-divider class="my-4" opacity="0.08" />

      <v-row dense>
        <v-col cols="6">
          <v-select
            v-model="store.difficulty"
            :items="difficultyOptions"
            :item-title="(d: any) => i18n.t(d.title as any)"
            item-value="value"
            :label="i18n.t('genDifficulty')"
            prepend-inner-icon="mdi-signal-cellular-1"
          />
        </v-col>

        <v-col cols="6">
          <v-select
            v-model="store.language"
            :items="[
              { title: 'Chinese', value: 'zh-CN' },
              { title: 'English', value: 'en-US' },
            ]"
            item-title="title"
            item-value="value"
            :label="i18n.t('genLanguage')"
            prepend-inner-icon="mdi-translate"
          />
        </v-col>

        <v-col cols="12">
          <v-text-field
            v-model="store.topicFilter"
            :label="i18n.t('genTopic')"
            :placeholder="i18n.t('genTopicPlaceholder')"
            prepend-inner-icon="mdi-tag-outline"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>
