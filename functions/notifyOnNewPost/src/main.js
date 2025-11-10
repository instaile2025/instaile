/* Appwrite Function: Yeni Gönderi Bildirimi - BOŞ BODY DÜZELTMESİ */
export default async ({ req, res, log, error }) => {
  
  log('🔔 OneSignal Function başlatıldı');

  // 1. Gizli Anahtarları Appwrite Değişkenlerinden Al
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    error('❌ OneSignal anahtarları (APP_ID veya API_KEY) bulunamadı.');
    return res.json({ success: false, error: 'Gizli anahtarlar eksik' }, 500);
  }

  // ⭐⭐ KRİTİK DÜZELTME: Appwrite tetikleyiciden data kontrolü
  log(`📦 Gelen veri tipi: ${typeof req.body}`);
  log(`📦 Gelen veri: "${req.body}"`);
  log(`📦 Gelen veri uzunluğu: ${req.body ? req.body.length : 0}`);

  // 2. Tetikleyici Verisini (Payload) Al - YENİ MANTIK
  let postPayload;

  // ⭐ DURUM 1: Body boşsa (tetikleyici data göndermiyor)
  if (!req.body || req.body === '' || req.body === '{}') {
    log('⚠️ Boş body - Tetikleyici veri göndermiyor');
    
    // ⭐⭐ ACİL ÇÖZÜM: Manuel test için default data
    postPayload = {
      authorUsername: "TestKullanici",
      text: "Bu bir test bildirimidir",
      postType: "text",
      authorId: "test-id",
      $id: "manual-test-" + Date.now()
    };
    
    log('🔧 Manuel test verisi kullanılıyor:', JSON.stringify(postPayload));
  }
  // ⭐ DURUM 2: Body string ise parse et
  else if (typeof req.body === 'string') {
    try {
      postPayload = JSON.parse(req.body);
      log('✅ String body parse edildi:', JSON.stringify(postPayload));
    } catch (e) {
      error(`❌ String parse hatası: ${e.message}`);
      return res.json({ 
        success: false, 
        error: 'String parse hatası',
        debug: { body: req.body, error: e.message }
      }, 400);
    }
  }
  // ⭐ DURUM 3: Body object ise direkt kullan
  else {
    postPayload = req.body;
    log('✅ Object body direkt kullanılıyor:', JSON.stringify(postPayload));
  }

  // 3. Payload kontrolü
  if (!postPayload || !postPayload.authorUsername) {
    error('❌ Geçersiz payload - authorUsername eksik');
    return res.json({ 
      success: false, 
      error: 'authorUsername eksik',
      debug: { finalPayload: postPayload }
    }, 400);
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

  // 5. OneSignal'a Gönderilecek İsteği Hazırla
  const oneSignalPayload = {
    app_id: ONESIGNAL_APP_ID,
    included_segments: ["Subscribed Users"], 
    headings: { en: "Yeni Gönderi! 🎉" },
    contents: { en: notificationMessage },
    data: {
      postId: postPayload.$id || 'unknown',
      type: 'new_post',
      author: author,
      postType: postPayload.postType || 'text'
    },
    url: 'https://yourapp.com', // ⭐ BURAYA UYGULAMA URL'NİZİ YAZIN!
    ios_badgeType: 'Increase',
    ios_badgeCount: 1
  };

  log(`📤 OneSignal'a gönderilecek: ${JSON.stringify(oneSignalPayload, null, 2)}`);

  // 6. OneSignal API'sine istek gönder
  try {
    log('🚀 Bildirim OneSignal\'a gönderiliyor...');

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

    log('✅ Bildirim başarıyla gönderildi!');
    log(`📨 OneSignal Yanıtı: ${JSON.stringify(responseData)}`);
    
    return res.json({ 
      success: true, 
      message: 'Bildirim gönderildi',
      notification: notificationMessage,
      oneSignalResponse: responseData 
    });

  } catch (e) {
    error(`❌ OneSignal'a bağlantı hatası: ${e.message}`);
    return res.json({ success: false, error: e.message }, 500);
  }
};