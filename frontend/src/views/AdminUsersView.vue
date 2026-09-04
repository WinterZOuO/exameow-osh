<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18nStore } from '@/stores/i18n'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/api'
import type { UserRole, UserSummary } from '@/api/http'
import BaseSelect from '@/components/common/BaseSelect.vue'
import {
  ArrowLeftIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/vue/24/outline'

const router = useRouter()
const i18n = useI18nStore()
const auth = useAuthStore()

const users = ref<UserSummary[]>([])
const loading = ref(true)
const busy = ref(false)
const formError = ref('')
const created = ref('')

const showCreate = ref(false)
const newUsername = ref('')
const newPassword = ref('')
const newRole = ref<UserRole>('member')
const confirmDeleteId = ref<string | null>(null)

const roleOptions = computed(() => [
  { value: 'member' as UserRole, label: i18n.t('authRoleMember') },
  { value: 'admin' as UserRole, label: i18n.t('authRoleAdmin'), hint: i18n.t('usersRoleAdminHint') },
])

// 每次入呢頁都重新攞：帳號列表隨時因為第二部機嘅操作而變，唔應該賴住 cache
onMounted(refresh)

async function refresh() {
  loading.value = true
  try {
    users.value = await api.listUsers()
  } catch (e: any) {
    formError.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  showCreate.value = true
  formError.value = ''
  created.value = ''
}

async function handleCreate() {
  formError.value = ''
  created.value = ''
  const username = newUsername.value.trim()
  if (!username || !newPassword.value) {
    formError.value = i18n.t('usersFormRequired')
    return
  }
  busy.value = true
  try {
    const user = await api.createUser(username, newPassword.value, newRole.value)
    users.value.push(user)
    // 開完就即刻清走條密碼，唔好留喺個 DOM 度俾人望到
    newUsername.value = ''
    newPassword.value = ''
    newRole.value = 'member'
    showCreate.value = false
    created.value = i18n.t('usersHandOffHint', { username: user.username })
  } catch (e: any) {
    formError.value = e.message || String(e)
  } finally {
    busy.value = false
  }
}

async function handleDelete(id: string) {
  formError.value = ''
  created.value = ''
  confirmDeleteId.value = null
  busy.value = true
  try {
    await api.deleteUser(id)
    users.value = users.value.filter((u) => u.id !== id)
  } catch (e: any) {
    // server 會擋住「仲有課程／教材／題目喺佢名下」嗰啲，訊息直接照顯示
    formError.value = e.message || String(e)
  } finally {
    busy.value = false
  }
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(i18n.locale === 'zh' ? 'zh-CN' : i18n.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
</script>

<template>
  <div class="max-w-3xl mx-auto pb-8">
    <div class="flex items-center gap-3 mb-6">
      <button class="btn-icon" @click="router.push('/mine')">
        <ArrowLeftIcon class="w-5 h-5 rtl:rotate-180" />
      </button>
      <div>
        <h1 class="text-display-sm font-bold tracking-tight">{{ i18n.t('usersTitle') }}</h1>
        <p class="text-body-sm" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('usersSubtitle') }}</p>
      </div>
    </div>

    <button v-if="!showCreate" class="btn-filled !h-11 !px-5 mb-6" @click="openCreate">
      <PlusIcon class="w-4 h-4" />
      <span>{{ i18n.t('usersCreate') }}</span>
    </button>

    <!-- 開新帳號 -->
    <div v-if="showCreate" class="card-filled p-5 mb-6 shadow-sm border border-[rgb(var(--md-outline-variant)/0.3)]">
      <label class="text-label-md font-semibold block mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('usersUsername') }}</label>
      <input
        v-model="newUsername"
        :placeholder="i18n.t('usersUsernamePlaceholder')"
        autocomplete="off"
        class="input-outlined !rounded-2xl !py-3 mb-4"
      />

      <label class="text-label-md font-semibold block mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('usersPassword') }}</label>
      <input
        v-model="newPassword"
        type="password"
        autocomplete="new-password"
        class="input-outlined !rounded-2xl !py-3 mb-1.5"
      />
      <p class="text-body-sm mb-4" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('usersPasswordHint') }}</p>

      <label class="text-label-md font-semibold block mb-2" style="color: rgb(var(--md-on-surface-variant))">{{ i18n.t('usersRole') }}</label>
      <BaseSelect
        :model-value="newRole"
        :options="roleOptions"
        class="mb-4 [&>button]:!rounded-xl"
        @update:model-value="newRole = $event"
      />

      <div class="flex items-center gap-3">
        <button class="btn-filled !h-11 !px-6" :disabled="busy" @click="handleCreate">{{ i18n.t('usersCreateSubmit') }}</button>
        <button class="btn-tonal !h-11 !px-6" @click="showCreate = false">{{ i18n.t('coursesCancel') }}</button>
      </div>
    </div>

    <Transition name="scale">
      <div
        v-if="formError"
        class="mb-6 px-4 py-3 rounded-2xl text-sm"
        style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
      >
        {{ formError }}
      </div>
    </Transition>

    <Transition name="scale">
      <div
        v-if="created"
        class="mb-6 px-4 py-3 rounded-2xl text-sm"
        style="background-color: rgb(var(--md-primary-container)); color: rgb(var(--md-on-primary-container))"
      >
        {{ created }}
      </div>
    </Transition>

    <!-- 帳號列表 -->
    <div v-if="loading" class="text-center py-12 text-body-sm" style="color: rgb(var(--md-on-surface-variant))">
      {{ i18n.t('usersLoading') }}
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="u in users"
        :key="u.id"
        class="card-filled flex items-center gap-4 p-4 shadow-sm border border-[rgb(var(--md-outline-variant)/0.3)]"
      >
        <div
          class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style="background-color: rgb(var(--md-secondary-container)); color: rgb(var(--md-on-secondary-container))"
        >
          <component :is="u.role === 'admin' ? ShieldCheckIcon : UserIcon" class="w-5 h-5" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-title-sm font-bold tracking-tight truncate">{{ u.username }}</span>
            <span
              v-if="u.role === 'admin'"
              class="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full"
              style="background-color: rgb(var(--md-primary-container)); color: rgb(var(--md-on-primary-container))"
            >{{ i18n.t('authRoleAdmin') }}</span>
            <span
              v-if="u.id === auth.user?.id"
              class="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full"
              style="background-color: rgb(var(--md-surface-container-highest)); color: rgb(var(--md-on-surface-variant))"
            >{{ i18n.t('usersYouBadge') }}</span>
          </div>
          <div class="text-body-sm mt-0.5" style="color: rgb(var(--md-on-surface-variant))">
            {{ i18n.t('usersCreatedAt', { date: formatDate(u.created_at) }) }}
          </div>
        </div>

        <!-- 自己刪唔到自己（server 一樣會擋），所以索性唔顯示 -->
        <template v-if="u.id !== auth.user?.id">
          <button
            v-if="confirmDeleteId !== u.id"
            class="btn-icon shrink-0"
            style="color: rgb(var(--md-error))"
            :title="i18n.t('usersDelete')"
            :disabled="busy"
            @click="confirmDeleteId = u.id"
          >
            <TrashIcon class="w-5 h-5" />
          </button>
          <div v-else class="flex items-center gap-2 shrink-0">
            <button class="btn-tonal text-xs !px-2.5 !py-1.5" :disabled="busy" style="color: rgb(var(--md-error))" @click="handleDelete(u.id)">
              {{ i18n.t('usersDeleteConfirmYes') }}
            </button>
            <button class="btn-tonal text-xs !px-2.5 !py-1.5" @click="confirmDeleteId = null">{{ i18n.t('coursesCancel') }}</button>
          </div>
        </template>
      </div>

      <p v-if="confirmDeleteId" class="text-body-sm px-1" style="color: rgb(var(--md-error))">
        {{ i18n.t('usersDeleteConfirm') }}
      </p>
    </div>
  </div>
</template>
