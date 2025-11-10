/* Appwrite Function: Basit Bildirim - MANUEL ÇAĞRI İÇİN */
export default async ({ req, res, log, error }) => {
  
  log('🔔 OneSignal Function - MANUEL ÇAĞRILDI');

  // 1. Gizli Anahtarları Al
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    error('❌ OneSignal anahtarları eksik');
    return res.json({ success: false, error: 'Gizli anahtarlar eksik' }, 500);
  }

  // 2. MANUEL PAYLOAD AL (ShareView'den gelecek)
  let postPayload;
  try {
    postPayload = req.body;
    
    if (typeof postPayload === 'string' && postPayload.trim() !== '') {
      postPayload = JSON.parse(postPayload);
    }
    
    log(`📦 GERÇEK payload alındı: ${postPayload.authorUsername} - "${postPayload.text}"`);
    
  } catch (e) {
    error(`❌ Payload hatası: ${e.message}`);
    return res.json({ success: false, error: 'Payload hatası' }, 400);
  }

  // 3. Payload kontrolü
  if (!postPayload || !postPayload.authorUsername || !postPayload.authorId) {
    error('❌ Eksik payload');
    return res.json({ success: false, error: 'Eksik payload' }, 400);
  }

  const author = postPayload.authorUsername;
  const authorId = postPayload.authorId;

  // 4. Bildirim Mesajını Hazırla - GERÇEK MESAJ
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
    data: {
      postId: postPayload.$id,
      type: 'new_post',
      author: author,
      authorId: authorId
    },
    url: 'https://instailem.vercel.app/'
  };

  try {
    log(`🚀 GERÇEK BİLDİRİM GÖNDERİLİYOR: ${notificationMessage}`);

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}` 
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      error(`❌ OneSignal hatası: ${JSON.stringify(responseData)}`);
      return res.json({ success: false, error: 'OneSignal hatası' }, 500);
    }

    if (responseData.id) {
      log(`✅ GERÇEK BİLDİRİM GÖNDERİLDİ! ID: ${responseData.id}`);
      if (responseData.recipients) {
        log(`📊 ${responseData.recipients} kullanıcıya iletildi`);
      }
    }
    
    return res.json({ 
      success: true, 
      message: 'Bildirim gönderildi',
      notification: notificationMessage,
      oneSignalResponse: responseData 
    });

  } catch (e) {
    error(`❌ OneSignal bağlantı hatası: ${e.message}`);
    return res.json({ success: false, error: e.message }, 500);
  }
}; 