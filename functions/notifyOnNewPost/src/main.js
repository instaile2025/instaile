/* Appwrite Function: Yeni Gönderi Bildirimi - DÜZELTİLMİŞ TAM KOD */
export default async ({ req, res, log, error }) => {
  
  // 1. Gizli Anahtarları Appwrite Değişkenlerinden Al
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    error('❌ OneSignal anahtarları (APP_ID veya API_KEY) bulunamadı.');
    return res.json({ success: false, error: 'Gizli anahtarlar eksik' }, 500);
  }

  log('🔔 OneSignal Function başlatıldı');

  // 2. Tetikleyici Verisini (Payload) Al - DÜZELTİLDİ!
  let postPayload;
  try {
    // ⭐⭐ ÖNEMLİ DÜZELTME: Appwrite Functions'ta body doğrudan object olarak gelir
    postPayload = req.body;
    
    log(`📦 Raw payload type: ${typeof postPayload}`);
    log(`📦 Raw payload: ${JSON.stringify(postPayload)}`);
    
    // Eğer string geliyorsa parse et, değilse direkt kullan
    if (typeof postPayload === 'string') {
      log('🔧 Payload string olarak geldi, parsing...');
      postPayload = JSON.parse(postPayload);
    }
    
    log(`✅ Parsed payload: ${JSON.stringify(postPayload)}`);
    
  } catch (e) {
    error(`❌ Payload işleme hatası: ${e.message}`);
    log(`❌ Raw req.body: ${req.body}`);
    log(`❌ Error stack: ${e.stack}`);
    
    return res.json({ 
      success: false, 
      error: 'Payload işleme hatası',
      debug: {
        bodyType: typeof req.body,
        body: req.body,
        error: e.message
      }
    }, 400);
  }

  // 3. Payload kontrolü
  if (!postPayload) {
    error('❌ Boş payload alındı');
    return res.json({ success: false, error: 'Boş payload' }, 400);
  }

  if (!postPayload.authorUsername) {
    error('❌ authorUsername eksik');
    log(`❌ Mevcut payload: ${JSON.stringify(postPayload)}`);
    return res.json({ 
      success: false, 
      error: 'authorUsername eksik',
      receivedPayload: postPayload
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
    url: 'https://instailem.vercel.app/', // ⭐ BURAYA UYGULAMA URL'NİZİ YAZIN!
    ios_badgeType: 'Increase',
    ios_badgeCount: 1
  };

  log(`📤 OneSignal'a gönderilecek: ${JSON.stringify(oneSignalPayload)}`);

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
      oneSignalResponse: responseData 
    });

  } catch (e) {
    error(`❌ OneSignal'a bağlantı hatası: ${e.message}`);
    return res.json({ success: false, error: e.message }, 500);
  }
};