import { createApp } from 'vue'
import App from './App.vue'
import { registerPlugins } from '@/plugins'

// Styles
import 'unfonts.css'

const app = createApp(App)

// OneSignal Başlat
const initOneSignal = async () => {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID || "9e7eae9b-65b7-4d65-a1d8-339c7e2f38f3"
  
  if (!appId) {
    console.warn("❌ OneSignal App ID bulunamadı")
    return
  }

  try {
    // OneSignal SDK'nın yüklenmesini bekle
    if (!window.OneSignal) {
      await new Promise((resolve, reject) => {
        let attempts = 0
        const check = setInterval(() => {
          attempts++
          if (window.OneSignal) {
            clearInterval(check)
            resolve()
          } else if (attempts > 100) { // 10 saniye timeout
            clearInterval(check)
            reject(new Error("OneSignal SDK yüklenemedi"))
          }
        }, 100)
      })
    }

    // OneSignal'i başlat
    await window.OneSignal.init({
      appId: appId,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { 
        scope: "/onesignal/" 
      },
      serviceWorkerPath: "onesignal/OneSignalSDKWorker.js",
      notificationClickHandlerMatch: 'origin',
      notificationClickHandlerAction: 'navigate',
    })

    // Slidedown prompt'u göster
    window.OneSignal.Slidedown.promptPush()
    
    console.log("✅ OneSignal Başlatıldı - App ID:", appId)

  } catch (error) {
    console.error("❌ OneSignal başlatılamadı:", error)
  }
}

// Uygulama başlatıldığında OneSignal'i başlat
initOneSignal()

registerPlugins(app)
app.mount('#app')
//TEST