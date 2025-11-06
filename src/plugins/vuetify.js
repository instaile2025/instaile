/**
 * plugins/vuetify.js
 *
 * Automatically included in `./main.js`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  // TEMA AYARI BURAYA EKLENDİ
  theme: {
    // Varsayılan tema 'light' (aydınlık) olarak ayarlandı.
    defaultTheme: 'light',
  },
})