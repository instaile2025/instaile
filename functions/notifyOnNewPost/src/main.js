/* Appwrite Function: Bildirim - CORS DÜZELTMESİ */
export default async ({ req, res, log, error }) => {
  
  // ⭐⭐⭐ CORS HEADERS - EN BAŞA EKLEYİN ⭐⭐⭐
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, User-Agent, X-Requested-With');
  
  // OPTIONS isteği için (preflight)
  if (req.method === 'OPTIONS') {
    log('🔄 CORS Preflight isteği alındı');
    return res.json({ success: true });
  }

  log('🔔 OneSignal Function - MANUEL ÇAĞRILDI');

  // 1. Gizli Anahtarları Al
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    error('❌ OneSignal anahtarları eksik');
    return res.json({ success: false, error: 'Gizli anahtarlar eksik' }, 500);
  }

  // 2. MANUEL PAYLOAD AL - DÜZELTİLDİ
  let postPayload;
  try {
    log(`📦 Gelen req.body: ${JSON.stringify(req.body)}`);
    log(`📦 Gelen req.body tipi: ${typeof req.body}`);
    
    // ⭐⭐ YENİ YÖNTEM: Body'yi doğru şekilde parse et
    if (typeof req.body === 'string') {
      if (req.body.trim() === '') {
        error('❌ Boş body alındı');
        return res.json({ success: false, error: 'Boş body' }, 400);
      }
      postPayload = JSON.parse(req.body);
    } else if (typeof req.body === 'object' && req.body !== null) {
      // Zaten object ise direkt kullan
      postPayload = req.body;
    } else {
      error(`❌ Geçersiz body tipi: ${typeof req.body}`);
      return res.json({ success: false, error: 'Geçersiz body tipi' }, 400);
    }
    
    log(`✅ Payload başarıyla alındı:`, {
      author: postPayload.authorUsername,
      text: postPayload.text ? postPayload.text.substring(0, 30) + '...' : 'Boş',
      type: postPayload.postType,
      id: postPayload.$id
    });
    
  } catch (e) {
    error(`❌ Payload parse hatası: ${e.message}`);
    log(`❌ Raw body: ${req.body}`);
    return res.json({ 
      success: false, 
      error: 'Payload parse hatası',
      rawBody: req.body
    }, 400);
  }

  // 3. Payload kontrolü - GÜÇLENDİRİLDİ
  if (!postPayload) {
    error('❌ Post payload boş');
    return res.json({ success: false, error: 'Post payload boş' }, 400);
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

  if (!postPayload.authorId) {
    error('❌ authorId eksik');
    return res.json({ success: false, error: 'authorId eksik' }, 400);
  }

  const author = postPayload.authorUsername;
  const authorId = postPayload.authorId;

  log(`👤 Gönderen: ${author} (ID: ${authorId})`);

  // 4. Bildirim Mesajını Hazırla
  let notificationMessage;
  
  if (postPayload.text && postPayload.text.trim() !== '') {
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

  log(`📝 Bildirim mesajı: ${notificationMessage}`);

  // 5. OneSignal'a Gönder - GÖNDEREN HARİÇ
  const oneSignalPayload = {
    app_id: ONESIGNAL_APP_ID,
    filters: [
      {"field": "last_session", "relation": ">", "value": Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60)},
      {"field": "session_count", "relation": ">", "value": "1"},
      {"field": "external_user_id", "relation": "!=", "value": authorId}
    ],
    headings: { en: "Yeni Gönderi! 🎉" },
    contents: { en: notificationMessage },
    priority: 10,
    delivery_optimization: "delivery_optimized",
    ttl: 0,
    data: {
      postId: postPayload.$id || 'unknown',
      type: 'new_post',
      author: author,
      authorId: authorId,
      postType: postPayload.postType || 'text',
      timestamp: Date.now()
    },
    url: 'https://instailem.vercel.app/',
    chrome_web_icon: "https://instailem.vercel.app/icon-192.png"
  };

  log(`🎯 OneSignal payload: ${JSON.stringify({
    target: `Aktif kullanıcılar (${author} hariç)`,
    message: notificationMessage,
    filters: oneSignalPayload.filters.length
  })}`);

  // 6. OneSignal API'sine istek gönder
  try {
    log('🚀 BİLDİRİM ONE SIGNAL\'A GÖNDERİLİYOR...');
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
      log(`👥 Hedeflenen: ${responseData.recipients || 'Tüm aktif kullanıcılar'}`);
      log(`⏱️ Süre: ${duration}ms`);
      
      if (responseData.recipients) {
        log(`📊 ${responseData.recipients} kullanıcıya iletildi`);
      }
    } else {
      log('⚠️ OneSignal yanıtı:', JSON.stringify(responseData));
    }
    
    return res.json({ 
      success: true, 
      message: 'Bildirim gönderildi',
      notification: notificationMessage,
      target: "Tüm aktif kullanıcılar",
      excluded: author,
      deliveryTime: duration + 'ms',
      oneSignalResponse: responseData 
    });

  } catch (e) {
    error(`❌ OneSignal bağlantı hatası: ${e.message}`);
    return res.json({ success: false, error: e.message }, 500);
  }
};