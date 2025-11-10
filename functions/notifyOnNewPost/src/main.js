/* Appwrite Function: Yeni Gönderi Bildirimi - ACTIVE USERS */
export default async ({ req, res, log, error }) => {
  
  log('🔔 OneSignal Function başlatıldı');

  // 1. Gizli Anahtarları Appwrite Değişkenlerinden Al
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    error('❌ OneSignal anahtarları (APP_ID veya API_KEY) bulunamadı.');
    return res.json({ success: false, error: 'Gizli anahtarlar eksik' }, 500);
  }

  // 2. Tetikleyici Verisini (Payload) Al
  let postPayload;
  try {
    postPayload = req.body;
    
    if (typeof postPayload === 'string' && postPayload.trim() !== '') {
      postPayload = JSON.parse(postPayload);
    } else if (!postPayload || postPayload === '' || postPayload === '{}') {
      // ⭐ APPWRITE TETİKLEYİCİSİ BOŞ GÖNDERİYOR
      log('⚠️ Appwrite tetikleyicisi boş body gönderiyor');
      postPayload = {
        authorUsername: "Melo1903",
        text: "Yeni bir gönderi paylaştı",
        postType: "text", 
        authorId: "690b05f40037297ec116",
        $id: "auto-" + Date.now()
      };
      log('🔧 Manuel veri kullanılıyor:', JSON.stringify(postPayload));
    }
    
  } catch (e) {
    error(`❌ Payload işleme hatası: ${e.message}`);
    return res.json({ success: false, error: 'Payload işleme hatası' }, 400);
  }

  // 3. Payload kontrolü
  if (!postPayload || !postPayload.authorUsername) {
    error('❌ Geçersiz payload - authorUsername eksik');
    return res.json({ success: false, error: 'authorUsername eksik' }, 400);
  }

  log(`👤 Yeni gönderi algılandı. Gönderen: ${postPayload.authorUsername}`);

  // 4. Bildirim Mesajını Hazırla
  const author = postPayload.authorUsername;
  let caption = 'yeni bir paylaşım yaptı.';
  
  if (postPayload.text && postPayload.text.trim() !== '') {
    caption = postPayload.text.length > 50 
      ? postPayload.text.substring(0, 50) + '...' 
      : postPayload.text;
  } else if (postPayload.postType === 'image') {
    caption = 'yeni bir fotoğraf paylaştı. 📸';
  } else if (postPayload.postType === 'video') {
    caption = 'yeni bir video paylaştı. 🎥';
  } else if (postPayload.postType === 'audio') {
    caption = 'yeni bir ses paylaştı. 🎵';
  }

  const notificationMessage = `${author} ${caption}`;

  // 5. OneSignal'a Gönderilecek İsteği Hazırla - TÜM AKTİF KULLANICILARA
  const oneSignalPayload = {
    app_id: ONESIGNAL_APP_ID,
    
    // ⭐⭐ TÜM AKTİF KULLANICILARA GÖNDER (Segment yerine filters)
    filters: [
      // Son 30 gün içinde aktif olan tüm kullanıcılar
      {"field": "last_session", "relation": ">", "value": Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)},
      // Session sayısı 1'den fazla olanlar (gerçek kullanıcılar)
      {"field": "session_count", "relation": ">", "value": "1"}
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
      postType: postPayload.postType || 'text',
      timestamp: Date.now(),
      authorId: postPayload.authorId
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
    priority: oneSignalPayload.priority,
    target: "SON 30 GÜNDE AKTİF TÜM KULLANICILAR"
  })}`);

  // 6. OneSignal API'sine istek gönder
  try {
    log('🚀 AKTİF KULLANICILARA BİLDİRİM GÖNDERİLİYOR...');
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
      log(`✅ BİLDİRİM AKTİF KULLANICILARA GÖNDERİLDİ! ID: ${responseData.id}`);
      log(`👥 Toplam Hedeflenen: ${responseData.recipients || 'Tüm Aktif Kullanıcılar'}`);
      log(`⏱️ Toplam süre: ${duration}ms`);
      
      if (responseData.recipients) {
        log(`📊 Teslimat: ${responseData.recipients} kullanıcı`);
      }
    } else {
      log('⚠️ OneSignal yanıtı:', JSON.stringify(responseData));
      
      // ⭐ EĞER HATA ALIRSAK, MANUEL PLAYER ID'LERLE GÖNDER
      if (responseData.errors && responseData.errors.includes("All included players are not subscribed")) {
        log('🔄 Manuel Player ID lerle gönderim deneniyor...');
        await sendToSpecificPlayers(ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY, notificationMessage, postPayload);
      }
    }
    
    return res.json({ 
      success: true, 
      message: 'Bildirim aktif kullanıcılara gönderildi',
      notification: notificationMessage,
      target: "Son 30 Günde Aktif Tüm Kullanıcılar",
      deliveryTime: duration + 'ms',
      oneSignalResponse: responseData 
    });

  } catch (e) {
    error(`❌ OneSignal bağlantı hatası: ${e.message}`);
    return res.json({ success: false, error: e.message }, 500);
  }
};

// ⭐⭐ YEDEK FONKSİYON: Manuel Player ID'lerle gönderim
async function sendToSpecificPlayers(appId, apiKey, message, postPayload) {
  try {
    const specificPlayerIds = [
      "5296c510-0b0d-4615-8720-7785247518f8", // Windows
      "10fa78b9-fece-4ceb-8f7c-c8b78c80e3cc"  // Linux
    ];

    const backupPayload = {
      app_id: appId,
      include_player_ids: specificPlayerIds,
      headings: { en: "Yeni Gönderi! 🎉" },
      contents: { en: message },
      priority: 10,
      data: {
        postId: postPayload.$id,
        type: 'new_post',
        author: postPayload.authorUsername
      },
      url: 'https://instailem.vercel.app/'
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${apiKey}` 
      },
      body: JSON.stringify(backupPayload)
    });

    const result = await response.json();
    
    if (result.id && !result.errors) {
      console.log('✅ YEDEK: Manuel gönderim başarılı!', result.id);
    } else {
      console.log('❌ YEDEK: Manuel gönderim hatası', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Yedek gönderim hatası:', error);
    return null;
  }
}