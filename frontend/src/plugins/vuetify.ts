import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1A73E8',
          secondary: '#5F6368',
          background: '#FFFFFF',
          surface: '#FFFFFF',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#8AB4F8',
          secondary: '#9AA0A6',
          background: '#121212',
          surface: '#1E1E1E',
        },
      },
    },
  },
})
