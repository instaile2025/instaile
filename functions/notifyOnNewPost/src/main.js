/* Appwrite Function: Bildirim - DEBUG SÜRÜMÜ */
export default async ({ req, res, log, error }) => {
  
  // ⭐⭐⭐ CORS HEADERS - Appwrite uyumlu
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

  log('🎯 DEBUG: Function başladı');
  log(`📨 Method: ${req.method}`);
  log(`🔗 URL: ${req.url}`);

  try {
    // 1. Environment Variables kontrolü
    log('🔑 Environment variables kontrol ediliyor...');
    const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
    const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    log(`📱 OneSignal App ID: ${ONESIGNAL_APP_ID ? '✅ Var' : '❌ Yok'}`);
    log(`🔐 OneSignal API Key: ${ONESIGNAL_REST_API_KEY ? '✅ Var' : '❌ Yok'}`);

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      error('❌ OneSignal anahtarları eksik');
      return res.json({ 
        success: false, 
        error: 'Environment variables eksik',
        details: {
          hasAppId: !!ONESIGNAL_APP_ID,
          hasApiKey: !!ONESIGNAL_REST_API_KEY
        }
      }, 500, corsHeaders);
    }

    // 2. Request Body analizi
    log('📦 Request body analizi...');
    log(`📊 Body tipi: ${typeof req.body}`);
    log(`📊 Body içeriği: ${JSON.stringify(req.body)}`);

    let postPayload;
    
    if (!req.body) {
      error('❌ Request body boş');
      return res.json({ 
        success: false, 
        error: 'Request body boş' 
      }, 400, corsHeaders);
    }

    // Body parsing
    if (typeof req.body === 'string') {
      try {
        postPayload = JSON.parse(req.body);
        log('✅ String body JSON parse edildi');
      } catch (parseError) {
        error(`❌ JSON parse hatası: ${parseError.message}`);
        return res.json({ 
          success: false, 
          error: 'JSON parse hatası',
          rawBody: req.body
        }, 400, corsHeaders);
      }
    } else if (typeof req.body === 'object') {
      postPayload = req.body;
      log('✅ Object body direkt kullanıldı');
    } else {
      error(`❌ Geçersiz body tipi: ${typeof req.body}`);
      return res.json({ 
        success: false, 
        error: 'Geçersiz body tipi' 
      }, 400, corsHeaders);
    }

    // 3. Payload validasyonu
    log('🔍 Payload validasyonu...');
    
    if (!postPayload.authorId) {
      error('❌ authorId eksik');
      return res.json({ 
        success: false, 
        error: 'authorId eksik',
        receivedPayload: postPayload
      }, 400, corsHeaders);
    }

    if (!postPayload.authorUsername) {
      error('❌ authorUsername eksik');
      return res.json({ 
        success: false, 
        error: 'authorUsername eksik',
        receivedPayload: postPayload
      }, 400, corsHeaders);
    }

    const author = postPayload.authorUsername;
    const authorId = postPayload.authorId;

    log(`✅ Payload geçerli - Gönderen: ${author} (${authorId})`);

    // 4. Bildirim mesajı oluşturma
    log('📝 Bildirim mesajı oluşturuluyor...');
    
    let notificationMessage;
    if (postPayload.text && postPayload.text.trim() !== '') {
      notificationMessage = `${author}: ${postPayload.text.substring(0, 50)}${postPayload.text.length > 50 ? '...' : ''}`;
    } else {
      notificationMessage = `${author} yeni bir gönderi paylaştı`;
    }

    log(`📢 Bildirim mesajı: "${notificationMessage}"`);

    // 5. OneSignal payload hazırlama - BASİT VERSİYON
    log('🎯 OneSignal payload hazırlanıyor...');
    
    const oneSignalPayload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["Subscribed Users"], // ⭐ BASİT FİLTER
      headings: { en: "Yeni Gönderi! 🎉" },
      contents: { en: notificationMessage },
      data: {
        postId: postPayload.$id || 'unknown',
        author: author,
        timestamp: new Date().toISOString()
      },
      url: 'https://instailem.vercel.app/'
    };

    log(`📤 OneSignal payload: ${JSON.stringify(oneSignalPayload, null, 2)}`);

    // 6. OneSignal API çağrısı
    log('🚀 OneSignal API çağrısı yapılıyor...');
    
    try {
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
      const duration = Date.now() - startTime;

      log(`⚡ OneSignal yanıt süresi: ${duration}ms`);
      log(`📨 OneSignal yanıtı: ${JSON.stringify(responseData)}`);

      if (response.ok && responseData.id) {
        log(`✅ BİLDİRİM BAŞARILI! ID: ${responseData.id}`);
        
        return res.json({
          success: true,
          message: 'Bildirim gönderildi',
          notification: notificationMessage,
          oneSignalId: responseData.id,
          recipients: responseData.recipients,
          deliveryTime: `${duration}ms`
        }, 200, corsHeaders);
      } else {
        error(`❌ OneSignal hatası: ${response.status} - ${JSON.stringify(responseData)}`);
        
        return res.json({
          success: false,
          error: 'OneSignal API hatası',
          statusCode: response.status,
          details: responseData
        }, 500, corsHeaders);
      }

    } catch (apiError) {
      error(`❌ OneSignal bağlantı hatası: ${apiError.message}`);
      
      return res.json({
        success: false,
        error: 'OneSignal bağlantı hatası',
        details: apiError.message
      }, 500, corsHeaders);
    }

  } catch (globalError) {
    error(`💥 BEKLENMEYEN HATA: ${globalError.message}`);
    error(`Stack: ${globalError.stack}`);
    
    return res.json({
      success: false,
      error: 'Beklenmeyen hata',
      details: globalError.message,
      stack: globalError.stack
    }, 500, corsHeaders);
  }
};