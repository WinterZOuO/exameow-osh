import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/practice',
    },
    {
      path: '/practice',
      name: 'practice',
      component: () => import('@/views/PracticeView.vue'),
      meta: { title: 'Practice' },
    },
    {
      path: '/generate',
      name: 'generate',
      component: () => import('@/views/GenerateView.vue'),
      meta: { title: 'Generate Exam' },
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/views/SearchHomeView.vue'),
      meta: { title: 'Search' },
    },
    {
      path: '/search/text',
      name: 'search-text',
      component: () => import('@/views/TextSearchView.vue'),
      meta: { title: 'Text Search' },
    },
    {
      path: '/search/photo',
      name: 'search-photo',
      component: () => import('@/views/PhotoSearchView.vue'),
      meta: { title: 'Photo Search' },
    },
    {
      path: '/search/screen-record',
      name: 'search-screen-record',
      component: () => import('@/views/ScreenRecordView.vue'),
      meta: { title: 'Screen Record Search' },
    },
    {
      path: '/src-windows/record-overlay',
      component: () => import('@/components/search/RecordOverlay.vue'),
    },
    {
      path: '/config',
      name: 'config',
      component: () => import('@/views/ConfigView.vue'),
      meta: { title: 'AI Config' },
    },
  ],
})

export default router
