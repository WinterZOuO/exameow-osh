<script setup lang="ts">
import { useExamStore } from '@/stores/exam'
import { QuestionType, Difficulty } from '@exambot/shared'

const store = useExamStore()

const typeOptions = [
  { title: 'Single Choice', value: QuestionType.SingleChoice },
  { title: 'Multi Choice', value: QuestionType.MultiChoice },
  { title: 'True/False', value: QuestionType.TrueFalse },
  { title: 'Fill Blank', value: QuestionType.FillBlank },
  { title: 'Short Answer', value: QuestionType.ShortAnswer },
]

const difficultyOptions = [
  { title: 'Easy', value: Difficulty.Easy },
  { title: 'Medium', value: Difficulty.Medium },
  { title: 'Hard', value: Difficulty.Hard },
]
</script>

<template>
  <v-card>
    <v-card-text>
      <v-row>
        <v-col cols="12">
          <div class="text-subtitle-2 mb-2">Question Types</div>
          <v-chip-group v-model="store.questionTypes" column multiple>
            <v-chip
              v-for="opt in typeOptions"
              :key="opt.value"
              :value="opt.value"
              filter
              variant="outlined"
            >
              {{ opt.title }}
            </v-chip>
          </v-chip-group>
        </v-col>

        <v-col cols="12" sm="6">
          <v-text-field
            v-model.number="store.count"
            label="Number of Questions"
            type="number"
            variant="outlined"
            density="comfortable"
            :min="1"
            :max="50"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6">
          <v-select
            v-model="store.difficulty"
            :items="difficultyOptions"
            item-title="title"
            item-value="value"
            label="Difficulty"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6">
          <v-select
            v-model="store.language"
            :items="[
              { title: 'Chinese', value: 'zh-CN' },
              { title: 'English', value: 'en-US' },
            ]"
            item-title="title"
            item-value="value"
            label="Language"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-col>

        <v-col cols="12" sm="6">
          <v-text-field
            v-model="store.topicFilter"
            label="Topic / Chapter (optional)"
            placeholder="e.g. Machine Learning"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>
