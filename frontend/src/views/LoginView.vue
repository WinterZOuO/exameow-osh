<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18nStore } from '@/stores/i18n'
import { UserIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const i18n = useI18nStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const error = ref('')

async function handleSubmit() {
  if (submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    await auth.login(username.value, password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/practice'
    await router.replace(redirect)
  } catch (e: any) {
    error.value =
      e?.message === 'invalid credentials'
        ? i18n.t('authInvalidCredentials')
        : e?.message || i18n.t('authLoginFailed')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4" style="background-color: rgb(var(--md-surface))">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-display-sm font-bold tracking-tight">{{ i18n.t('appName') }}</h1>
        <p class="text-body-sm mt-2" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('authSignInSubtitle') }}
        </p>
      </div>

      <form
        class="card-filled p-6 shadow-sm border border-[rgb(var(--md-outline-variant)/0.3)]"
        @submit.prevent="handleSubmit"
      >
        <label class="text-label-md font-semibold block mb-2" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('authUsername') }}
        </label>
        <div class="relative mb-4">
          <UserIcon
            class="absolute left-3 top-3 w-5 h-5 pointer-events-none"
            style="color: rgb(var(--md-on-surface-variant))"
          />
          <input
            v-model="username"
            type="text"
            autocomplete="username"
            required
            class="input-filled w-full !pl-11"
            :disabled="submitting"
          />
        </div>

        <label class="text-label-md font-semibold block mb-2" style="color: rgb(var(--md-on-surface-variant))">
          {{ i18n.t('authPassword') }}
        </label>
        <div class="relative mb-5">
          <LockClosedIcon
            class="absolute left-3 top-3 w-5 h-5 pointer-events-none"
            style="color: rgb(var(--md-on-surface-variant))"
          />
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
            class="input-filled w-full !pl-11 !pr-11"
            :disabled="submitting"
          />
          <button
            type="button"
            class="absolute right-2 top-1.5 btn-icon"
            :aria-label="i18n.t('authTogglePassword')"
            @click="showPassword = !showPassword"
          >
            <component :is="showPassword ? EyeSlashIcon : EyeIcon" class="w-5 h-5" />
          </button>
        </div>

        <p
          v-if="error"
          class="text-body-sm mb-4 px-3 py-2 rounded-lg"
          style="background-color: rgb(var(--md-error-container)); color: rgb(var(--md-on-error-container))"
        >
          {{ error }}
        </p>

        <button type="submit" class="btn-filled w-full justify-center" :disabled="submitting">
          {{ submitting ? i18n.t('authSigningIn') : i18n.t('authSignIn') }}
        </button>
      </form>

      <p class="text-body-sm text-center mt-6" style="color: rgb(var(--md-on-surface-variant))">
        {{ i18n.t('authNoSelfSignup') }}
      </p>
    </div>
  </div>
</template>
