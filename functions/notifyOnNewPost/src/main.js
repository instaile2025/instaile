/* Appwrite Function: Bildirim - SEGMENT DÜZELTMESİ */
export default async ({ req, res, log, error }) => {
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent, X-Requested-With'
  };
  
  if (req.method === 'OPTIONS') {
    return res.send('', 204, corsHeaders);
  }

  try {
    log('🎯 Function başladı');

    // Environment variables
    const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
    const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      return res.json({ success: false, error: 'Environment variables eksik' }, 500, corsHeaders);
    }

    // Payload parsing
    let postPayload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const author = postPayload.authorUsername;
    const text = postPayload.text || '';

    // Bildirim mesajı
    const notificationMessage = text 
      ? `${author}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`
      : `${author} yeni bir gönderi paylaştı`;

    log(`📢 Bildirim: "${notificationMessage}"`);

    // OneSignal payload - Tüm kullanıcılara gönder
    const oneSignalPayload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["All"], // "All" segmentini kullan
      headings: { en: "Yeni Gönderi! 🎉" },
      contents: { en: notificationMessage },
      data: {
        postId: postPayload.$id,
        author: author,
        type: 'new_post'
      },
      url: 'https://instailem.vercel.app/',
      chrome_web_icon: "https://instailem.vercel.app/icon-192.png"
    };

    log('🚀 OneSignal API çağrısı...');

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const responseData = await response.json();
    log(`📨 OneSignal yanıtı: ${JSON.stringify(responseData)}`);

    if (response.ok && responseData.id) {
      log(`✅ BİLDİRİM BAŞARILI! ID: ${responseData.id}`);
      
      return res.json({
        success: true,
        message: 'Bildirim gönderildi!',
        notification: notificationMessage,
        oneSignalId: responseData.id,
        recipients: responseData.recipients || 'Tüm kullanıcılar'
      }, 200, corsHeaders);
    } else {
      log(`❌ OneSignal hatası: ${JSON.stringify(responseData)}`);
      
      return res.json({
        success: false,
        error: 'OneSignal hatası',
        details: responseData
      }, 500, corsHeaders);
    }

  } catch (err) {
    error(`💥 HATA: ${err.message}`);
    return res.json({
      success: false,
      error: err.message
    }, 500, corsHeaders);
  }
};