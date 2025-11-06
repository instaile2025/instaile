import { createApp } from 'vue'
import App from './App.vue'
import { registerPlugins } from '@/plugins'

// Styles
import 'unfonts.css'

const app = createApp(App)

// ✅ OneSignal Başlat
const initOneSignal = async () => {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID
  if (!appId) {
    console.warn("⚠️ VITE_ONESIGNAL_APP_ID .env içinde yok!")
    return
  }

  // ✅ CDN yüklenmiş mi?
  if (typeof window.OneSignal === "undefined") {
    console.warn("⚠️ OneSignal SDK henüz yüklenmedi. index.html kontrol et.")
    return
  }

  try {
    await window.OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: true,
      notificationClickHandlerAction: "navigate",
    })

    window.OneSignal.Slidedown.promptPush()

    console.log("✅ OneSignal Başlatıldı")
  } catch (err) {
    console.error("❌ OneSignal Hatası:", err)
  }
}

initOneSignal()

// Plugins ve App Başlat
registerPlugins(app)
app.mount('#app')
