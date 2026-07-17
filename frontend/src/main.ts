import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/main.css'

const params = new URLSearchParams(window.location.search)
const winTarget = params.get('win')
if (winTarget === 'record-overlay') {
  router.replace('/src-windows/record-overlay')
} else if (winTarget === 'answer-float') {
  router.replace('/src-windows/answer-float')
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
