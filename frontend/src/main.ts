import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler } from './api/http'
import { useAuthStore } from './stores/auth'
import './assets/main.css'
import './assets/fonts.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 任何 API 回 401（例如 session 過期）就清本地狀態、彈返登入頁
setUnauthorizedHandler(() => {
  useAuthStore().markLoggedOut()
  const current = router.currentRoute.value
  if (current.meta.public !== true) {
    router.replace({ name: 'login', query: { redirect: current.fullPath } })
  }
})

app.mount('#app')
