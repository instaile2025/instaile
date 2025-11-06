import { OneSignal } from 'onesignal';

export default {
  install: (app) => {
    // OneSignal başlatma
    const initOneSignal = async () => {
      if (import.meta.env.VITE_ONESIGNAL_APP_ID) {
        try {
          await OneSignal.init({
            appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerParam: { scope: '/onesignal/' },
            serviceWorkerPath: 'onesignal/OneSignalSDKWorker.js',
            notificationClickHandlerMatch: 'origin',
            notificationClickHandlerAction: 'navigate',
          });
          
          OneSignal.Slidedown.promptPush();
          
          console.log('OneSignal initialized successfully');
        } catch (error) {
          console.error('OneSignal initialization error:', error);
        }
      }
    };

    // OneSignal'i başlat
    initOneSignal();

    // Global olarak ekle
    app.config.globalProperties.$onesignal = OneSignal;
  }
};