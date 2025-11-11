<template>
  <v-container class="py-6" style="max-width: 500px;">
    
    <!-- 1. GÜVENLİK KONTROLÜ -->
    <v-alert
      v-if="!authStore.isApproved"
      type="warning"
      variant="tonal"
      prominent
      icon="mdi-alert-circle-outline"
      class="mb-4"
    >
      <template v-slot:title>
        Hesap Onay Bekliyor
      </template>
      Paylaşım yapabilmek için hesabınızın bir admin tarafından onaylanması gerekmektedir.
    </v-alert>

    <!-- 2. YENİ TASARIM -->
    <v-card v-else class="pa-4 rounded-lg" elevation="3">
      
      <!-- Gizli Dosya Girişi -->
      <input
        ref="fileInput" 
        type="file"
        accept="image/*,video/*,audio/*"
        @change="onFileSelect"
        class="d-none"
      />

      <!-- "Fotoğraf Yüklemek için Tıkla" Alanı -->
      <v-sheet
        v-if="!preview"
        border="dashed"
        class="pa-8 d-flex flex-column align-center justify-center text-center dropzone"
        rounded="lg"
        @click="triggerFileInput"
      >
        <v-icon size="64" color="grey-lighten-1">mdi-image-outline</v-icon>
        <div class="text-h6 mt-2">Medya yüklemek için tıkla</div>
        <div class="text-caption text-grey">(Otomatik optimize edilecek)</div>
      </v-sheet>

      <!-- Önizleme -->
      <v-img
        v-if="preview"
        :src="preview"
        class="rounded-lg mb-3"
        height="260"
        style="object-fit: contain; background:#111; cursor: pointer;"
        @click="clearFile"
      />
      
      <!-- Açıklama Alanı -->
      <v-textarea
        v-model="text"
        label="Açıklama yaz..."
        rows="3"
        auto-grow
        variant="outlined"
        class="mt-4 mb-4"
        hide-details
      ></v-textarea>

      <!-- Debug Modu Switch - SADECE ADMIN GÖRÜR -->
      <v-switch
        v-if="isAdmin"
        v-model="debugMode"
        label="Debug Modu (Konsola log yazar)"
        color="primary"
        density="compact"
        class="mb-3"
      ></v-switch>

      <v-alert v-if="error" type="error" class="mb-3" dense>
        {{ error }}
      </v-alert>

      <!-- Butonlar -->
      <v-row class="mt-2">
        <v-col>
          <!-- İptal Butonu -->
          <v-btn
            block
            variant="outlined"
            rounded="lg"
            size="large"
            @click="clearForm"
          >
            İptal
          </v-btn>
        </v-col>
        <v-col>
          <!-- Paylaş Butonu -->
          <v-btn
            block
            :loading="loading"
            @click="sharePost"
            rounded="lg"
            size="large"
            class="gradient-button"
          >
            Paylaş
          </v-btn>
        </v-col>
      </v-row>

      <!-- Debug Bilgisi - SADECE ADMIN GÖRÜR -->
      <v-alert
        v-if="isAdmin && debugMode && lastPostData"
        type="info"
        variant="tonal"
        class="mt-4"
      >
        <template v-slot:title>
          Debug Bilgisi
        </template>
        <div><strong>Son Gönderi ID:</strong> {{ lastPostData.$id }}</div>
        <div><strong>Gönderen:</strong> {{ lastPostData.authorUsername }}</div>
        <div><strong>Metin:</strong> {{ lastPostData.text || 'Boş' }}</div>
        <div><strong>Tip:</strong> {{ lastPostData.postType }}</div>
        <div><strong>Bildirim Durumu:</strong> {{ notificationStatus }}</div>
        <div><strong>Tarih:</strong> {{ new Date().toLocaleString('tr-TR') }}</div>
      </v-alert>

    </v-card>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router' 
import { useAuthStore } from '@/stores/auth' 
import { storage, databases, account } from '@/plugins/appwrite'
import { ID, Permission, Role } from 'appwrite' 

const router = useRouter()
const authStore = useAuthStore()

const text = ref('')
const selectedFile = ref(null)
const preview = ref(null)
const loading = ref(false)
const error = ref(null)
const fileInput = ref(null)
const debugMode = ref(false)
const lastPostData = ref(null)
const notificationStatus = ref('')

// ⭐ ADMIN KONTROLÜ - Sadece adminler debug modunu görsün
const isAdmin = computed(() => {
  const user = authStore.authUser
  if (!user) return false
  
  // Admin kontrolü - email, username veya özel bir role göre
  const adminEmails = ['admin@instaile.com', 'melikdurak@outlook.com'] // Admin emailleri
  const adminUsernames = ['admin', 'Melo1903', 'yönetici'] // Admin kullanıcı adları
  
  return adminEmails.includes(user.email) || 
         adminUsernames.includes(authStore.userDetails?.username) ||
         authStore.userDetails?.role === 'admin'
})

const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const clearFile = () => {
  selectedFile.value = null
  if (preview.value) {
    try { URL.revokeObjectURL(preview.value) } catch(e){/*ignore*/ }
  }
  preview.value = null
  if (fileInput.value) fileInput.value.value = null
  error.value = null
}

const clearForm = () => {
  clearFile()
  text.value = ''
  lastPostData.value = null
  notificationStatus.value = ''
}

// === DOSYA SEÇİM FONKSİYONU ===
const onFileSelect = (e) => {
  error.value = null
  const file = e?.target?.files?.[0] || null
  if (!file) {
    selectedFile.value = null
    preview.value = null
    return
  }

  if (file.type.startsWith('image')) {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.src = url
    img.onload = () => {
      if (img.width && img.height) {
        preview.value = url
        selectedFile.value = file
        if (debugMode.value && isAdmin.value) console.log('🖼️ Resim seçildi:', file.name, `${img.width}x${img.height}`)
      } else {
        selectedFile.value = null
        preview.value = null
        URL.revokeObjectURL(url)
        error.value = 'Görsel yüklenemedi.'
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      selectedFile.value = null
      preview.value = null
      error.value = 'Görsel okunamadı.'
    }
    return
  }

  selectedFile.value = file
  preview.value = null
  if (debugMode.value && isAdmin.value) console.log('📁 Dosya seçildi:', file.name, file.type)
}

// === RESİM KÜÇÜLTME FONKSİYONU ===
const resizeImage = (file, maxSize = 1200) =>
  new Promise((resolve) => {
    if (!file || !file.type.startsWith('image')) return resolve(file)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.src = url
    img.onload = () => {
      if (!img.width || !img.height) {
        URL.revokeObjectURL(url)
        return resolve(file)
      }
      let { width, height } = img
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width)
        width = maxSize
      } else if (height > width && height > maxSize) {
        width = Math.round((width * maxSize) / height)
        height = maxSize
      } else if (width > maxSize) {
        height = Math.round((height * maxSize) / width)
        width = maxSize
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        if (!blob) return resolve(file)
        const newFile = new File([blob], file.name, { type: file.type })
        if (debugMode.value && isAdmin.value) console.log('📐 Resim optimize edildi:', `${width}x${height}`)
        resolve(newFile)
      }, file.type, 0.85)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
  })

// === BİLDİRİM FONKSİYONU - GÜNCELLENMİŞ CORS ÇÖZÜMLÜ ===
const triggerNotification = async (postData) => {
  try {
    notificationStatus.value = 'Gönderiliyor...'
    if (debugMode.value && isAdmin.value) {
      console.log('🚀 Bildirim fonksiyonu manuel çağrılıyor...')
      console.log('📦 Gönderilen veri:', postData)
    }
    
    // Appwrite Function URL'si
    const functionUrl = 'https://690df0c900255ed6f16a.fra.appwrite.run'
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Instaile-App/1.0',
        'Accept': 'application/json',
      },
      mode: 'cors',
      body: JSON.stringify(postData)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    if (debugMode.value && isAdmin.value) {
      console.log('📨 Bildirim fonksiyonu yanıtı:', result)
    }
    
    if (result.success) {
      notificationStatus.value = '✅ Başarılı!'
      if (debugMode.value && isAdmin.value) {
        console.log('✅ Bildirim başarıyla tetiklendi!')
        alert(`Bildirim başarıyla gönderildi!\n\n"${result.notification}"\n\nHedef: ${result.target}`)
      }
    } else {
      notificationStatus.value = '❌ Hata!'
      if (debugMode.value && isAdmin.value) {
        console.warn('⚠️ Bildirim tetiklenemedi:', result.error)
        alert(`Bildirim gönderilemedi: ${result.error}\n\nDetay: ${result.details ? JSON.stringify(result.details) : 'Bilinmeyen hata'}`)
      }
    }
    
    return result
    
  } catch (notifError) {
    notificationStatus.value = '❌ Bağlantı Hatası!'
    if (debugMode.value && isAdmin.value) {
      console.error('❌ Bildirim tetikleme hatası:', notifError)
    }
    
    // Geliştirilmiş CORS hatası kontrolü
    if (notifError.message.includes('CORS') || 
        notifError.message.includes('Failed to fetch') || 
        notifError.message.includes('500') ||
        notifError.message.includes('Network Error')) {
      if (debugMode.value && isAdmin.value) {
        console.warn('🌐 CORS/Bağlantı Hatası - Appwrite Function erişilemiyor')
        alert(`🌐 Bağlantı Hatası: Appwrite Function'a erişilemiyor.\n\nOlası nedenler:\n• CORS headers eksik\n• Function deploy edilmemiş\n• Network bağlantı sorunu\n\nGönderiniz başarıyla paylaşıldı ama bildirim gönderilemedi.`)
      }
    } else {
      if (debugMode.value && isAdmin.value) {
        alert(`Bildirim bağlantı hatası: ${notifError.message}`)
      }
    }
    
    return { 
      success: false, 
      error: notifError.message,
      isCorsError: notifError.message.includes('CORS') || notifError.message.includes('Failed to fetch') || notifError.message.includes('500')
    }
  }
}

// === PAYLAŞIM FONKSİYONU (MANUEL BİLDİRİM İLE) ===
const sharePost = async () => {
  error.value = null
  loading.value = true
  notificationStatus.value = ''

  try {
    if (!authStore.isApproved) {
      throw new Error("Paylaşım yapmak için onaylı olmalısınız.")
    }
    
    const user = authStore.authUser
    const userDetails = authStore.userDetails

    if (!user || !userDetails) {
      throw new Error("Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.")
    }

    let postType = 'text'
    let mediaUrl = '' 

    const filePermissions = [
      Permission.read(Role.any()),
      Permission.delete(Role.users()),
      Permission.update(Role.users())
    ]

    // DOSYA YÜKLEME
    if (selectedFile.value) { 
      if (debugMode.value && isAdmin.value) console.log('⬆️ Dosya yükleniyor...', selectedFile.value.name)
      
      const uploadFile = selectedFile.value.type.startsWith('image')
        ? await resizeImage(selectedFile.value)
        : selectedFile.value

      const bucketId = 'posts' 

      const uploaded = await storage.createFile(
        bucketId,
        ID.unique(),
        uploadFile,
        filePermissions
      )

      const fv = storage.getFileDownload(bucketId, uploaded.$id)
      mediaUrl = fv?.href || fv || '' 

      if (uploadFile.type.startsWith('image')) postType = 'image'
      else if (uploadFile.type.startsWith('video')) postType = 'video'
      else if (uploadFile.type.startsWith('audio')) postType = 'audio'

      if (debugMode.value && isAdmin.value) console.log('✅ Dosya yüklendi:', uploaded.$id, postType)
    }

    const docPermissions = [
      Permission.read(Role.any()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ]
    
    // GÖNDERİ VERİSİ
    const postData = {
      authorId: user.$id,
      authorUsername: userDetails.username || 'Anonim',
      authorAvatarUrl: userDetails.profilePicUrl || '', 
      text: text.value.trim(),
      postType,
      mediaUrl,
      likes: [], 
      likeUsernames: [],
      likesCount: 0 
    }
    
    if (!postData.text && !postData.mediaUrl) {
      throw new Error("Paylaşmak için metin veya dosya girmelisiniz.")
    }

    if (debugMode.value && isAdmin.value) {
      console.log('📝 Gönderi verisi hazır:', postData)
    }

    // 1. ÖNCE GÖNDERİYİ OLUŞTUR
    const created = await databases.createDocument(
      'main',
      'posts',
      ID.unique(),
      postData,
      docPermissions
    )

    if (debugMode.value && isAdmin.value) {
      console.log('✅ GÖNDERİ OLUŞTURULDU:', created.$id)
      console.log('👤 Gönderen:', created.authorUsername)
      console.log('📝 Metin:', created.text || 'Boş')
      console.log('🎨 Tip:', created.postType)
    }

    // Debug için son gönderi bilgisini kaydet
    lastPostData.value = created

    // 2. SONRA BİLDİRİMİ MANUEL TETİKLE
    if (debugMode.value && isAdmin.value) {
      console.log('🚀 Manuel bildirim tetikleniyor...')
    }
    
    const notificationResult = await triggerNotification(created)
    
    if (debugMode.value && isAdmin.value) {
      console.log('📊 Bildirim sonucu:', notificationResult)
    }

    Ana sayfaya yönlendir
    setTimeout(() => {
      router.push('/')
    }, 1500)

  } catch (err) {
    console.error('❌ sharePost hatası:', err)
    error.value = err?.message || String(err)
    notificationStatus.value = '❌ Paylaşım Hatası!'
    
    if (debugMode.value && isAdmin.value) {
      alert(`❌ Paylaşım Hatası:\n${err?.message || String(err)}\n\nLütfen konsolu kontrol edin.`)
    } else {
      alert('❌ Gönderi paylaşılırken bir hata oluştu. Lütfen tekrar deneyin.')
    }
    
    loading.value = false 
  } 
}
</script>

<style scoped>
.dropzone {
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}
.dropzone:hover {
  background-color: #f0f0f0;
}

.gradient-button {
  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  color: white !important;
}

/* Responsive tasarım için ek stiller */
@media (max-width: 600px) {
  .v-container {
    padding: 16px !important;
  }
  
  .v-card {
    padding: 16px !important;
  }
  
  .dropzone {
    padding: 40px 16px !important;
  }
}

/* Yükleniyor animasyonu */
.v-btn--loading {
  position: relative;
}

.v-btn--loading::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: inherit;
}
</style>