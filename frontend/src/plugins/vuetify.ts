import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  components,
  directives,
  defaults: {
    VCard: {
      elevation: 0,
      rounded: 'xl',
      border: true,
    },
    VBtn: {
      rounded: 'pill',
      style: 'text-transform: none; font-weight: 600; letter-spacing: 0;',
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
      hideDetails: 'auto',
      bgColor: 'surface',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      rounded: 'lg',
      hideDetails: 'auto',
      bgColor: 'surface',
    },
    VChip: {
      rounded: 'pill',
    },
    VAlert: {
      rounded: 'lg',
      variant: 'tonal',
    },
    VProgressLinear: {
      rounded: 'pill',
      height: 6,
    },
    VDataTable: {
      hover: true,
    },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1A6CFF',
          'on-primary': '#FFFFFF',
          secondary: '#5B6F8C',
          'on-secondary': '#FFFFFF',
          'surface': '#FFFBFE',
          'surface-variant': '#F3F1F9',
          'on-surface': '#1C1B1F',
          'on-surface-variant': '#49454F',
          background: '#FFFBFE',
          'on-background': '#1C1B1F',
          error: '#BA1A1A',
          'on-error': '#FFFFFF',
          success: '#1B7B34',
          warning: '#8C5A00',
          info: '#1A6CFF',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#ABC7FF',
          'on-primary': '#002F6B',
          secondary: '#BAC9E5',
          'on-secondary': '#26344C',
          surface: '#1C1B1F',
          'surface-variant': '#2E2C33',
          'on-surface': '#E6E1E5',
          'on-surface-variant': '#CAC4D0',
          background: '#1C1B1F',
          'on-background': '#E6E1E5',
          error: '#FFB4AB',
          'on-error': '#690005',
          success: '#7BD88D',
          warning: '#F5C333',
          info: '#ABC7FF',
        },
      },
    },
  },
})
