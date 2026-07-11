<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const navItems = [
  { title: 'Config', icon: 'mdi-cog', path: '/config' },
  { title: 'Generate', icon: 'mdi-creation', path: '/generate' },
  { title: 'Preview', icon: 'mdi-table-eye', path: '/preview' },
]
</script>

<template>
  <v-app>
    <v-navigation-drawer
      v-if="$vuetify.display.mdAndUp"
      permanent
      rail
    >
      <v-list density="compact" nav>
        <v-list-item
          v-for="item in navItems"
          :key="item.path"
          :title="item.title"
          :prepend-icon="item.icon"
          :active="route.path === item.path"
          @click="router.push(item.path)"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container fluid class="pa-4">
        <router-view />
      </v-container>
    </v-main>

    <v-bottom-navigation v-if="$vuetify.display.smAndDown" grow>
      <v-btn
        v-for="item in navItems"
        :key="item.path"
        :value="item.path"
        @click="router.push(item.path)"
      >
        <v-icon>{{ item.icon }}</v-icon>
        <span>{{ item.title }}</span>
      </v-btn>
    </v-bottom-navigation>
  </v-app>
</template>
