/* Appwrite Function: Yeni Gönderi Bildirimi - TÜM ABONELERE */
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

  // 5. OneSignal'a Gönderilecek İsteği Hazırla - TÜM ABONELERE
  const oneSignalPayload = {
    app_id: ONESIGNAL_APP_ID,
    
    // ⭐⭐ TÜM ABONE OLAN KULLANICILARA GÖNDER
    included_segments: ["Subscribed Users"],
    
    // ⭐⭐ GÖNDEREN KULLANICIYI HARİÇ TUT
    excluded_segments: ["Test Users"], // Test segmenti yoksa boş kalabilir
    // excluded_players: ["GONDEREN_PLAYER_ID"], // Eğer gönderenin player ID'sini biliyorsanız
    
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
      authorId: postPayload.authorId // Gönderen ID'si (filtreleme için)
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
    included_segments: oneSignalPayload.included_segments,
    excluded_segments: oneSignalPayload.excluded_segments,
    headings: oneSignalPayload.headings,
    contents: oneSignalPayload.contents,
    priority: oneSignalPayload.priority,
    target: "TÜM ABONE OLAN KULLANICILAR (Gönderen Hariç)"
  })}`);

  // 6. OneSignal API'sine istek gönder
  try {
    log('🚀 TÜM ABONELERE BİLDİRİM GÖNDERİLİYOR...');
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
      log(`✅ BİLDİRİM TÜM ABONELERE GÖNDERİLDİ! ID: ${responseData.id}`);
      log(`👥 Toplam Hedeflenen: ${responseData.recipients || 'Tüm Aboneler'}`);
      log(`⏱️ Toplam süre: ${duration}ms`);
      
      // Teslimat istatistikleri
      if (responseData.recipients) {
        log(`📊 Teslimat: ${responseData.recipients} kullanıcı`);
      } else {
        log(`📊 Teslimat: Tüm abone olan kullanıcılara gönderildi`);
      }
    } else {
      log('⚠️ OneSignal yanıtı:', JSON.stringify(responseData));
    }
    
    return res.json({ 
      success: true, 
      message: 'Bildirim tüm abonelere gönderildi (gönderen hariç)',
      notification: notificationMessage,
      target: "Tüm Abone Olan Kullanıcılar",
      excluded: "Gönderen Kullanıcı",
      deliveryTime: duration + 'ms',
      oneSignalResponse: responseData 
    });

  } catch (e) {
    error(`❌ OneSignal bağlantı hatası: ${e.message}`);
    return res.json({ success: false, error: e.message }, 500);
  }
};