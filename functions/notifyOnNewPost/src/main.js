/* Appwrite Function: Bildirim - CORS & OneSignal DÜZELTMESİ */
export default async ({ req, res, log, error }) => {
  
  // ⭐⭐⭐ APPWRITE CORS HEADERS - Doğru yöntem ⭐⭐⭐
  // Appwrite'da headers bu şekilde ayarlanır
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent, X-Requested-With'
  };
  
  // OPTIONS isteği için (preflight)
  if (req.method === 'OPTIONS') {
    log('🔄 CORS Preflight isteği alındı');
    return res.send('', 204, corsHeaders);
  }

  log('🔔 OneSignal Function - MANUEL ÇAĞRILDI');

  // 1. Gizli Anahtarları Al
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    error('❌ OneSignal anahtarları eksik');
    return res.json({ success: false, error: 'Gizli anahtarlar eksik' }, 500, corsHeaders);
  }

  // 2. MANUEL PAYLOAD AL
  let postPayload;
  try {
    log(`📦 Gelen req.body: ${JSON.stringify(req.body)}`);
    
    if (typeof req.body === 'string') {
      if (req.body.trim() === '') {
        error('❌ Boş body alındı');
        return res.json({ success: false, error: 'Boş body' }, 400, corsHeaders);
      }
      postPayload = JSON.parse(req.body);
    } else if (typeof req.body === 'object' && req.body !== null) {
      postPayload = req.body;
    } else {
      error(`❌ Geçersiz body tipi: ${typeof req.body}`);
      return res.json({ success: false, error: 'Geçersiz body tipi' }, 400, corsHeaders);
    }
    
    log(`✅ Payload başarıyla alındı:`, {
      author: postPayload.authorUsername,
      text: postPayload.text ? postPayload.text.substring(0, 30) + '...' : 'Boş',
      type: postPayload.postType,
      id: postPayload.$id
    });
    
  } catch (e) {
    error(`❌ Payload parse hatası: ${e.message}`);
    return res.json({ 
      success: false, 
      error: 'Payload parse hatası'
    }, 400, corsHeaders);
  }

  // 3. Payload kontrolü
  if (!postPayload || !postPayload.authorUsername || !postPayload.authorId) {
    error('❌ Eksik payload verisi');
    return res.json({ 
      success: false, 
      error: 'Eksik payload verisi' 
    }, 400, corsHeaders);
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

  // 5. OneSignal'a Gönder - DÜZELTİLMİŞ FILTER
  const oneSignalPayload = {
    app_id: ONESIGNAL_APP_ID,
    // ⭐ DÜZELTİLDİ: external_user_id yerine tags kullan
    filters: [
      {"field": "tag", "key": "user_id", "relation": "!=", "value": authorId},
      {"field": "last_session", "relation": ">", "hours_ago": "24"}
    ],
    headings: { en: "Yeni Gönderi! 🎉" },
    contents: { en: notificationMessage },
    priority: 10,
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

  log(`🎯 OneSignal payload: ${JSON.stringify(oneSignalPayload)}`);

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
    log(`📨 OneSignal yanıtı: ${JSON.stringify(responseData)}`);

    if (!response.ok) {
      error(`❌ OneSignal API Hatası: ${response.status} - ${JSON.stringify(responseData)}`);
      return res.json({ 
        success: false, 
        error: 'OneSignal API hatası',
        details: responseData
      }, 500, corsHeaders);
    }

    // ⭐ BAŞARI KONTROLÜ
    if (responseData.id && !responseData.errors) {
      log(`✅ BİLDİRİM BAŞARIYLA GÖNDERİLDİ! ID: ${responseData.id}`);
      log(`👥 Hedeflenen: ${responseData.recipients || 'Tüm aktif kullanıcılar'}`);
      
      return res.json({ 
        success: true, 
        message: 'Bildirim gönderildi',
        notification: notificationMessage,
        target: "Tüm aktif kullanıcılar",
        excluded: author,
        deliveryTime: duration + 'ms',
        oneSignalResponse: responseData 
      }, 200, corsHeaders);
    } else {
      error(`❌ OneSignal gönderim hatası: ${JSON.stringify(responseData)}`);
      return res.json({ 
        success: false, 
        error: 'Bildirim gönderilemedi',
        details: responseData
      }, 500, corsHeaders);
    }

  } catch (e) {
    error(`❌ OneSignal bağlantı hatası: ${e.message}`);
    return res.json({ 
      success: false, 
      error: e.message 
    }, 500, corsHeaders);
  }
};