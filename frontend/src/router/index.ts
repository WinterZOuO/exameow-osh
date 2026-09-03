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
      path: '/take/:code',
      name: 'take-exam',
      component: () => import('@/views/TakeExamView.vue'),
      meta: { title: 'Take Exam' },
    },
    {
      path: '/manage/:code',
      name: 'manage-exam',
      component: () => import('@/views/ManageResultsView.vue'),
      meta: { title: 'Exam Results' },
    },
    {
      path: '/mine',
      name: 'mine',
      component: () => import('@/views/MineView.vue'),
      meta: { title: 'Mine' },
    },
    {
      path: '/mine/config',
      name: 'mine-config',
      component: () => import('@/views/ConfigView.vue'),
      meta: { title: 'AI Config' },
    },
    {
      path: '/mine/settings',
      name: 'mine-settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { title: 'System Settings' },
    },
    {
      path: '/mine/published',
      name: 'mine-published',
      component: () => import('@/views/MyPublishedView.vue'),
      meta: { title: 'My Launched Exams' },
    },
    {
      path: '/mine/joined',
      name: 'mine-joined',
      component: () => import('@/views/MyJoinedView.vue'),
      meta: { title: 'My Joined Exams' },
    },
    {
      path: '/mine/joined/wrong',
      name: 'mine-joined-wrong',
      component: () => import('@/views/JoinedWrongView.vue'),
      meta: { title: 'Wrong Questions' },
    },
    {
      path: '/mine/records',
      name: 'mine-records',
      component: () => import('@/views/PracticeRecordsView.vue'),
      meta: { title: 'Practice Records' },
    },
    {
      path: '/config',
      redirect: '/mine/config',
    },
    {
      path: '/privacy',
      name: 'privacy',
      component: () => import('@/views/PrivacyView.vue'),
      meta: { title: 'Privacy Policy' },
    },
    {
      path: '/terms',
      name: 'terms',
      component: () => import('@/views/TermsView.vue'),
      meta: { title: 'Terms of Service' },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { title: 'Admin' },
    },
  ],
})

export default router
