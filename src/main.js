import { createApp } from 'vue'
import App from './App.vue'
import { registerPlugins } from '@/plugins'

// Styles
import 'unfonts.css'

const app = createApp(App)

// OneSignal Başlat
const initOneSignal = async () => {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID
  if (!appId) return

  // Önce global bekle
  if (!window.OneSignal) {
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (window.OneSignal) {
          clearInterval(check)
          resolve()
        }
      }, 50)
    })
  }

  const OneSignal = window.OneSignal

  await OneSignal.init({
    appId,
    allowLocalhostAsSecureOrigin: true,
    notificationClickHandlerMatch: 'origin',
    notificationClickHandlerAction: 'navigate',
  })

  OneSignal.Slidedown.promptPush()
  console.log("✅ OneSignal Başlatıldı")
}

initOneSignal()

registerPlugins(app)
app.mount('#app')
