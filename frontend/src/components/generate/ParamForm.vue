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
      <v-label class="text-caption font-weight-bold text-uppercase mb-3 d-block" style="color: #1A6CFF; letter-spacing: 1px;">
        {{ i18n.t('genQuestionTypes') }}
      </v-label>

      <div class="mb-2">
        <div
          v-for="opt in typeOptions"
          :key="opt.value"
          class="mb-3"
        >
          <div class="d-flex align-center ga-3">
            <v-chip
              :variant="store.questionTypes.includes(opt.value) ? 'flat' : 'outlined'"
              :color="store.questionTypes.includes(opt.value) ? 'primary' : 'on-surface-variant'"
              filter
              class="cursor-pointer flex-shrink-0"
              style="font-weight: 500; min-width: 110px; justify-content: center;"
              @click="toggleType(opt.value)"
            >
              {{ i18n.t(opt.title as any) }}
            </v-chip>

            <template v-if="store.questionTypes.includes(opt.value)">
              <v-slider
                :model-value="store.typeCounts[opt.value]"
                @update:model-value="(v: number) => store.typeCounts[opt.value] = v"
                :min="0"
                :max="20"
                :step="1"
                hide-details
                thumb-label="always"
                thumb-size="28"
                density="compact"
                style="flex: 1; min-width: 0;"
              />
              <span
                style="
                  min-width: 28px; text-align: center;
                  font-weight: 700; font-size: 15px;
                  color: var(--v-primary-base);
                "
              >
                {{ store.typeCounts[opt.value] }}
              </span>
            </template>
            <span v-else style="flex: 1;" />
          </div>
        </div>
      </div>

      <v-divider class="mb-4" opacity="0.08" />

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
