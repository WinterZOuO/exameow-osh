<script setup lang="ts">
import { onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import AppShell from '@/components/layout/AppShell.vue'

const configStore = useConfigStore()

onMounted(async () => {
  await configStore.loadSaved()
})
</script>

<template>
  <AppShell />
</template>

<style>
html, body { margin: 0; padding: 0; }
</style>
