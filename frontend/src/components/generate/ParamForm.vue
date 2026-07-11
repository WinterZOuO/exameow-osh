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
</script>

<template>
  <v-card class="h-100">
    <v-card-text>
      <v-label class="text-caption font-weight-bold text-uppercase mb-3 d-block" style="color: #1A6CFF; letter-spacing: 1px;">
        {{ i18n.t('genQuestionTypes') }}
      </v-label>

      <div class="d-flex flex-wrap ga-2 mb-4">
        <v-chip
          v-for="opt in typeOptions"
          :key="opt.value"
          :value="opt.value"
          :variant="store.questionTypes.includes(opt.value) ? 'flat' : 'outlined'"
          :color="store.questionTypes.includes(opt.value) ? 'primary' : 'on-surface-variant'"
          size="large"
          filter
          class="cursor-pointer"
          style="font-weight: 500;"
          @click="
            const idx = store.questionTypes.indexOf(opt.value);
            idx >= 0 ? store.questionTypes.splice(idx, 1) : store.questionTypes.push(opt.value)
          "
        >
          {{ i18n.t(opt.title as any) }}
        </v-chip>
      </div>

      <v-divider class="mb-4" opacity="0.08" />

      <v-row dense>
        <v-col cols="6">
          <v-text-field
            v-model.number="store.count"
            :label="i18n.t('genQuestions')"
            type="number"
            :min="1"
            :max="50"
            prepend-inner-icon="mdi-numeric"
          />
        </v-col>

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

        <v-col cols="6">
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
