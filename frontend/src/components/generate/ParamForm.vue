<script setup lang="ts">
import { useExamStore } from '@/stores/exam'
import { QuestionType, Difficulty } from '@exambot/shared'

const store = useExamStore()

const typeOptions = [
  { title: 'Single Choice', value: QuestionType.SingleChoice, desc: 'One correct answer from 4 options' },
  { title: 'Multi Choice', value: QuestionType.MultiChoice, desc: 'Multiple correct answers' },
  { title: 'True / False', value: QuestionType.TrueFalse, desc: 'Binary choice questions' },
  { title: 'Fill Blank', value: QuestionType.FillBlank, desc: 'Complete the sentence' },
  { title: 'Short Answer', value: QuestionType.ShortAnswer, desc: 'Open-ended response' },
]
</script>

<template>
  <v-card class="h-100">
    <v-card-text>
      <v-label class="text-caption font-weight-bold text-uppercase mb-3 d-block" style="color: #1A6CFF; letter-spacing: 1px;">
        Question Types
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
          {{ opt.title }}
        </v-chip>
      </div>

      <v-divider class="mb-4" opacity="0.08" />

      <v-row dense>
        <v-col cols="6">
          <v-text-field
            v-model.number="store.count"
            label="Questions"
            type="number"
            :min="1"
            :max="50"
            prepend-inner-icon="mdi-numeric"
          />
        </v-col>

        <v-col cols="6">
          <v-select
            v-model="store.difficulty"
            :items="[
              { title: 'Easy', value: Difficulty.Easy },
              { title: 'Medium', value: Difficulty.Medium },
              { title: 'Hard', value: Difficulty.Hard },
            ]"
            item-title="title"
            item-value="value"
            label="Difficulty"
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
            label="Language"
            prepend-inner-icon="mdi-translate"
          />
        </v-col>

        <v-col cols="6">
          <v-text-field
            v-model="store.topicFilter"
            label="Topic"
            placeholder="e.g. ML Basics"
            prepend-inner-icon="mdi-tag-outline"
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>
