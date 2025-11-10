/* Appwrite Function: Yeni Gönderi Bildirimi - TAM KOD */
export default async ({ req, res, log, error }) => {
  // 1. Gizli Anahtarları Appwrite Değişkenlerinden Al
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    error('❌ OneSignal anahtarları (APP_ID veya API_KEY) bulunamadı.');
    return res.json({ success: false, error: 'Gizli anahtarlar eksik' }, 500);
  }

  log('🔔 OneSignal Function başlatıldı');

  // 2. Tetikleyici Verisini (Payload) Al
  let postPayload;
  try {
    postPayload = req.body;
    
    // Eğer string ise parse et
    if (typeof postPayload === 'string') {
      postPayload = JSON.parse(postPayload);
    }
    
    log(`📦 Payload alındı: ${JSON.stringify(postPayload)}`);
    
  } catch (e) {
    error(`❌ Payload parse hatası: ${e.message}`);
    return res.json({ success: false, error: 'Payload parse hatası' }, 400);
  }

  // 3. Payload kontrolü
  if (!postPayload || !postPayload.authorUsername) {
    error('❌ Geçersiz tetikleyici verisi. authorUsername eksik.');
    return res.json({ success: false, error: 'Geçersiz payload' }, 400);
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
    url: 'https://instailem.vercel.app/', // Uygulamanızın URL'sini buraya yazın
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