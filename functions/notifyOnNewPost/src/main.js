/* Appwrite Fonksiyonu: Yeni Gönderi Bildirimi
  Tetikleyici: 'posts' koleksiyonuna yeni belge (document) eklendiğinde.
  Görev: OneSignal'a "Tüm Abonelere" (Subscribed Users) bildirim gönderir.
*/

// 'fetch' (Node.js 20+ ortamında mevcuttur), log ve error Appwrite tarafından sağlanır.
export default async ({ req, res, log, error }) => {

  // 1. Gizli Anahtarları Appwrite Değişkenlerinden Al
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    error('OneSignal anahtarları (APP_ID veya API_KEY) bulunamadı.');
    return res.json({ success: false, error: 'Gizli anahtarlar eksik' }, 500);
  }

  // 2. Tetikleyici Verisini (Payload) Al
  let postPayload;
  try {
    if (typeof req.body === 'string' && req.body.length > 0) {
      postPayload = JSON.parse(req.body);
    } else {
      postPayload = req.body;
    }
  } catch (e) {
    error('Gelen tetikleyici verisi (req.body) JSON olarak parse edilemedi.');
    log(`Alınan ham veri: ${req.body}`);
    return res.json({ success: false, error: 'Payload parse hatası' }, 400);
  }

  if (!postPayload || !postPayload.authorUsername) {
    error('Geçersiz tetikleyici verisi (payload) alındı. authorUsername eksik.');
    log(`Alınan veri: ${JSON.stringify(postPayload)}`);
    return res.json({ success: false, error: 'Geçersiz payload' }, 400);
  }

  log(`Yeni gönderi algılandı. Gönderen: ${postPayload.authorUsername}`);

  // 3. Bildirim Mesajını Hazırla
  const author = postPayload.authorUsername;
  const caption = postPayload.text || 'yeni bir paylaşım yaptı.'; 
  const notificationMessage = `${author}: ${caption}`;

  // 4. OneSignal'a Gönderilecek İsteği Hazırla
  const oneSignalPayload = {
    app_id: ONESIGNAL_APP_ID,
    included_segments: ["Subscribed Users"], 
    headings: { tr: "Yeni Gönderi!", en: "New Post!" },
    contents: { tr: notificationMessage, en: notificationMessage }
  };

  // 5. 'fetch' ile OneSignal API'sine isteği gönder
  try {
    log('Bildirim OneSignal\'a gönderiliyor...');

    const response = await fetch('https.onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}` 
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const responseData = await response.json();

    if (!response.ok) {
       error(`OneSignal API Hatası: ${response.status} ${JSON.stringify(responseData)}`);
       return res.json({ success: false, error: 'OneSignal API hatası' }, 500);
    }

    log('Bildirim başarıyla gönderildi!');
    log(JSON.stringify(responseData));
    return res.json({ success: true, oneSignalResponse: responseData });

  } catch (e) {
    error(`OneSignal'a fetch hatası: ${e.message}`);
    return res.json({ success: false, error: e.message }, 500);
  }
};