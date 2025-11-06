import { createApp } from 'vue'
import App from './App.vue'
import { registerPlugins } from '@/plugins'

// OneSignal
import OneSignal from '@onesignal/onesignal'

// Styles
import 'unfonts.css'

const app = createApp(App)

// OneSignal Başlat
const initOneSignal = async () => {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID
  if (!appId) return

  try {
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerPath: '/onesignal/OneSignalSDKWorker.js',
      notificationClickHandlerMatch: 'origin',
      notificationClickHandlerAction: 'navigate',
    })

    OneSignal.Slidedown.promptPush()
    console.log('✅ OneSignal Başlatıldı')
  } catch (err) {
    console.error('❌ OneSignal Hatası:', err)
  }
}

initOneSignal()

app.config.globalProperties.$onesignal = OneSignal
registerPlugins(app)
app.mount('#app')
