/* Appwrite Function: Yeni Gönderi Bildirimi - SON ÇÖZÜM */
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
      // ⭐⭐ APPWRITE TETİKLEYİCİSİ BOŞ GÖNDERİYOR - MANUEL DATA KULLAN
      log('⚠️ Appwrite tetikleyicisi boş body gönderiyor');
      postPayload = {
        authorUsername: "Melo1903", // ⭐ SİZİN KULLANICI ADINIZ
        text: "Yeni bir gönderi paylaştı",
        postType: "text",
        authorId: "690b05f40037297ec116", // ⭐ SİZİN USER ID'NİZ
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

  // ⭐⭐ KRİTİK: SADECE ABONE OLAN 2 KULLANICIYA GÖNDER
  const subscribedPlayerIds = [
    "5296c510-0b0d-4615-8720-7785247518f8", // Windows kullanıcısı
    "10fa78b9-fece-4ceb-8f7c-c8b78c80e3cc"  // Linux kullanıcısı
  ];

  log(`🎯 Bildirim gönderilecek kullanıcılar: ${subscribedPlayerIds.length}`);

  // 5. OneSignal'a Gönderilecek İsteği Hazırla
  const oneSignalPayload = {
    app_id: ONESIGNAL_APP_ID,
    // ⭐⭐ SEGMENTS YERİNE SPECIFIC PLAYER ID'LER
    include_player_ids: subscribedPlayerIds,
    headings: { en: "Yeni Gönderi! 🎉" },
    contents: { en: notificationMessage },
    data: {
      postId: postPayload.$id || 'unknown',
      type: 'new_post',
      author: author,
      postType: postPayload.postType || 'text'
    },
    url: 'https://instailem.vercel.app/', // ⭐ BURAYA UYGULAMA URL'NİZİ YAZIN!
    ios_badgeType: 'Increase',
    ios_badgeCount: 1
  };

  log(`📤 OneSignal payload: ${JSON.stringify(oneSignalPayload)}`);

  // 6. OneSignal API'sine istek gönder
  try {
    log('🚀 Bildirim gönderiliyor...');

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}` 
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      error(`❌ OneSignal API Hatası: ${response.status} - ${JSON.stringify(responseData)}`);
      return res.json({ success: false, error: 'OneSignal API hatası' }, 500);
    }

    // ⭐⭐ BAŞARI KONTROLÜ
    if (responseData.id && !responseData.errors) {
      log('✅ BİLDİRİM BAŞARIYLA GÖNDERİLDİ!');
      log(`📨 OneSignal Yanıt ID: ${responseData.id}`);
      log(`👥 Hedeflenen: ${responseData.recipients || subscribedPlayerIds.length}`);
    } else {
      log('⚠️ OneSignal yanıtı:', JSON.stringify(responseData));
    }
    
    return res.json({ 
      success: true, 
      message: 'Bildirim gönderildi',
      notification: notificationMessage,
      targetUsers: subscribedPlayerIds.length,
      oneSignalResponse: responseData 
    });

  } catch (e) {
    error(`❌ OneSignal bağlantı hatası: ${e.message}`);
    return res.json({ success: false, error: e.message }, 500);
  }
};