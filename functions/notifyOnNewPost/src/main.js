/* Appwrite Function: Yeni Gönderi Bildirimi - MANTIK HATASI DÜZELTME */
export default async ({ req, res, log, error }) => {
  
  log('🔔 OneSignal Function başlatıldı');

  // 1. Gizli Anahtarları Appwrite Değişkenlerinden Al
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    error('❌ OneSignal anahtarları (APP_ID veya API_KEY) bulunamadı.');
    return res.json({ success: false, error: 'Gizli anahtarlar eksik' }, 500);
  }

  // 2. Tetikleyici Verisini (Payload) Al - GÜNCELLENDİ
  let postPayload;
  try {
    postPayload = req.body;
    
    if (typeof postPayload === 'string' && postPayload.trim() !== '') {
      postPayload = JSON.parse(postPayload);
      log('✅ Gerçek tetikleyici verisi alındı:', JSON.stringify(postPayload));
    } else if (!postPayload || postPayload === '' || postPayload === '{}') {
      // ⭐ APPWRITE TETİKLEYİCİSİ BOŞ GÖNDERİYOR - ACİL ÇÖZÜM GEREKİYOR!
      error('🚨 KRİTİK: Appwrite tetikleyicisi boş body gönderiyor!');
      log('🔧 Bu bir BUG - Tetikleyici veri göndermiyor');
      
      // ⭐⭐ ACİL ÇÖZÜM: Database'den son gönderiyi çek
      return res.json({ 
        success: false, 
        error: 'Appwrite tetikleyici bug - Boş payload',
        solution: 'Tetikleyici ayarlarını kontrol edin'
      }, 400);
    }
    
  } catch (e) {
    error(`❌ Payload işleme hatası: ${e.message}`);
    return res.json({ success: false, error: 'Payload işleme hatası' }, 400);
  }

  // 3. Payload kontrolü - GÜNCELLENDİ
  if (!postPayload || !postPayload.authorUsername || !postPayload.authorId) {
    error('❌ Eksik payload - authorUsername veya authorId eksik');
    log(`📦 Gelen payload: ${JSON.stringify(postPayload)}`);
    return res.json({ 
      success: false, 
      error: 'Eksik payload',
      received: postPayload 
    }, 400);
  }

  const author = postPayload.authorUsername;
  const authorId = postPayload.authorId;
  
  log(`👤 Yeni gönderi algılandı. Gönderen: ${author} (ID: ${authorId})`);

  // 4. Bildirim Mesajını Hazırla - GÜNCELLENDİ
  let notificationMessage;
  
  if (postPayload.text && postPayload.text.trim() !== '') {
    // ⭐⭐ GERÇEK MESAJI KULLAN
    const shortText = postPayload.text.length > 50 
      ? postPayload.text.substring(0, 50) + '...' 
      : postPayload.text;
    notificationMessage = `${author}: "${shortText}"`;
  } else if (postPayload.postType === 'image') {
    notificationMessage = `${author} yeni bir fotoğraf paylaştı 📸`;
  } else if (postPayload.postType === 'video') {
    notificationMessage = `${author} yeni bir video paylaştı 🎥`;
  } else if (postPayload.postType === 'audio') {
    notificationMessage = `${author} yeni bir ses paylaştı 🎵`;
  } else {
    notificationMessage = `${author} yeni bir gönderi paylaştı`;
  }

  // 5. OneSignal'a Gönderilecek İsteği Hazırla - GÖNDEREN HARİÇ
  const oneSignalPayload = {
    app_id: ONESIGNAL_APP_ID,
    
    // ⭐⭐ GÖNDEREN KULLANICIYI HARİÇ TUTAN FİLTRE
    filters: [
      // Son 30 gün içinde aktif olan tüm kullanıcılar
      {"field": "last_session", "relation": ">", "value": Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)},
      // Session sayısı 1'den fazla olanlar
      {"field": "session_count", "relation": ">", "value": "1"},
      // ⭐⭐ GÖNDEREN KULLANICIYI HARİÇ TUT (external_user_id ile)
      {"field": "external_user_id", "relation": "!=", "value": authorId}
    ],
    
    headings: { en: "Yeni Gönderi! 🎉" },
    contents: { en: notificationMessage },
    
    // ⭐⭐ HIZLI TESLİMAT AYARLARI
    priority: 10,
    delivery_optimization: "delivery_optimized", 
    ttl: 0,
    
    // Web push ayarları
    web_push_topic: "new-post", 
    chrome_web_icon: "https://instailem.vercel.app/icon-192.png",
    chrome_web_badge: "https://instailem.vercel.app/icon-192.png",
    
    data: {
      postId: postPayload.$id || 'unknown',
      type: 'new_post',
      author: author,
      authorId: authorId, // Gönderen ID'si
      postType: postPayload.postType || 'text',
      timestamp: Date.now()
    },
    url: 'https://instailem.vercel.app/',
    
    // iOS ayarları
    ios_badgeType: 'Increase',
    ios_badgeCount: 1,
    
    // Android ayarları
    android_accent_color: "FF007ACC",
    android_led_color: "FF007ACC",
    android_visibility: 1
  };

  log(`📤 OneSignal payload hazır: ${JSON.stringify({
    app_id: oneSignalPayload.app_id,
    filters: oneSignalPayload.filters,
    headings: oneSignalPayload.headings,
    contents: oneSignalPayload.contents,
    target: `Tüm Aktif Kullanıcılar (${author} HARİÇ)`,
    excluded_user: authorId
  })}`);

  // 6. OneSignal API'sine istek gönder
  try {
    log(`🚀 BİLDİRİM GÖNDERİLİYOR (${author} hariç)...`);
    const startTime = Date.now();

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}` 
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const responseData = await response.json();
    const endTime = Date.now();
    const duration = endTime - startTime;

    log(`⚡ OneSignal API yanıt süresi: ${duration}ms`);

    if (!response.ok) {
      error(`❌ OneSignal API Hatası: ${response.status} - ${JSON.stringify(responseData)}`);
      return res.json({ success: false, error: 'OneSignal API hatası' }, 500);
    }

    // ⭐ BAŞARI KONTROLÜ
    if (responseData.id && !responseData.errors) {
      log(`✅ BİLDİRİM BAŞARIYLA GÖNDERİLDİ! ID: ${responseData.id}`);
      log(`👥 Hedeflenen: ${responseData.recipients || 'Tüm Aktif Kullanıcılar'}`);
      log(`🚫 Hariç Tutulan: ${author} (${authorId})`);
      log(`⏱️ Toplam süre: ${duration}ms`);
      
      if (responseData.recipients) {
        log(`📊 Teslimat: ${responseData.recipients} kullanıcı`);
      }
    } else {
      log('⚠️ OneSignal yanıtı:', JSON.stringify(responseData));
    }
    
    return res.json({ 
      success: true, 
      message: `Bildirim gönderildi (${author} hariç)`,
      notification: notificationMessage,
      target: "Tüm Aktif Kullanıcılar",
      excluded: author,
      deliveryTime: duration + 'ms',
      oneSignalResponse: responseData 
    });

  } catch (e) {
    error(`❌ OneSignal bağlantı hatası: ${e.message}`);
    return res.json({ success: false, error: e.message }, 500);
  }
}; 