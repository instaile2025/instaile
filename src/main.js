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
    // OneSignal SDK'sını global olarak ekleyen script'i beklememiz gerekebilir
    // Eğer index.html dosyanızda <script src="https://cdn.onesignal.com/sdks/OneSignalSDK.js" ...>
    // satırı varsa, bu kontrol gereklidir.
    if (typeof window.OneSignal === 'undefined') {
      await new Promise((resolve, reject) => {
        let attempts = 0
        const check = setInterval(() => {
          attempts++
          if (typeof window.OneSignal !== 'undefined') {
            clearInterval(check)
            resolve()
          } else if (attempts > 100) { // 10 saniye timeout
            clearInterval(check)
            reject(new Error("OneSignal SDK (window.OneSignal) bulunamadı veya yüklenemedi"))
          }
        }, 100)
      })
    }

    // OneSignal'i başlat - PWA Entegrasyonu için DÜZELTİLDİ
    await window.OneSignal.init({
      appId: appId,
      allowLocalhostAsSecureOrigin: true, // Geliştirme ortamı için
      
      // --- BURASI DEĞİŞTİ ---
      // Sizin PWA service worker dosyanızı kullanmasını söylüyoruz
      // Yanlış olan 'scope' ve 'onesignal/' klasör ayarları kaldırıldı.
      serviceWorkerPath: 'sw.PWA.js',
      serviceWorkerUpdaterPath: 'sw.PWA.js'
      // --------------------
    })

    // Slidedown prompt'u göster
    window.OneSignal.Slidedown.promptPush()
    
    console.log("✅ OneSignal Başlatıldı (PWA modu) - App ID:", appId)

  } catch (error) {
    console.error("❌ OneSignal başlatılamadı:", error)
  }
}

// Uygulama başlatıldığında OneSignal'i başlat
initOneSignal()

registerPlugins(app)
app.mount('#app')