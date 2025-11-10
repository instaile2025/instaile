<template>
  <v-container class="py-0 px-0" fluid style="height: 100vh; max-width: 600px; margin: 0 auto;">
    <!-- Üst Bar -->
    <v-app-bar flat color="transparent" class="px-2">
      <v-btn icon @click="goBack" class="mr-2">
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <v-toolbar-title class="text-h6 font-weight-bold">Yeni Gönderi</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn 
        color="primary" 
        variant="text" 
        @click="sharePost"
        :loading="loading"
        :disabled="!canShare"
        class="text-capitalize"
      >
        Paylaş
      </v-btn>
    </v-app-bar>

    <v-divider></v-divider>

    <!-- Ana İçerik -->
    <v-card flat class="mx-2 mt-2" style="border-radius: 12px;">
      
      <!-- Fotoğraf Yükleme Alanı -->
      <div 
        v-if="!selectedFile"
        class="photo-upload-area pa-8 text-center"
        @click="triggerFileInput"
        style="
          border: 2px dashed #ddd;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          min-height: 400px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        "
        @mouseover="uploadAreaHover = true"
        @mouseleave="uploadAreaHover = false"
        :style="{
          'border-color': uploadAreaHover ? '#1976d2' : '#ddd',
          'background-color': uploadAreaHover ? '#f8fbff' : '#fafafa'
        }"
      >
        <v-icon 
          size="64" 
          :color="uploadAreaHover ? 'primary' : 'grey'"
          class="mb-4"
        >
          mdi-image-plus
        </v-icon>
        <div class="text-h6 font-weight-medium mb-2" :class="uploadAreaHover ? 'text-primary' : 'text-grey'">
          Fotoğraf yüklemek için tıkla
        </div>
        <div class="text-body-2 text-grey">
          (Otomatik optimize edilecek)
        </div>
      </div>

      <!-- Gizli File Input -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*,video/*,audio/*"
        @change="onFileSelect"
        style="display: none"
      />

      <!-- Fotoğraf Önizleme -->
      <div v-if="selectedFile && preview" class="photo-preview-container">
        <v-img
          :src="preview"
          class="preview-image"
          style="
            width: 100%;
            max-height: 60vh;
            object-fit: contain;
            background: #f5f5f5;
          "
        ></v-img>
      </div>

      <!-- Video/Audio Önizleme -->
      <div v-if="selectedFile && !preview" class="pa-4 text-center">
        <v-icon size="64" color="primary" class="mb-2">
          {{ selectedFile.type.startsWith('video') ? 'mdi-video' : 'mdi-music' }}
        </v-icon>
        <div class="text-h6">{{ selectedFile.name }}</div>
        <div class="text-body-2 text-grey">
          {{ selectedFile.type.startsWith('video') ? 'Video dosyası' : 'Ses dosyası' }}
        </div>
      </div>

      <!-- Açıklama ve Detaylar -->
      <div v-if="selectedFile" class="pa-4">
        
        <!-- Kullanıcı Bilgisi -->
        <div class="d-flex align-center mb-4">
          <v-avatar size="32" class="mr-3">
            <v-img
              v-if="authStore.userDetails?.profilePicUrl"
              :src="authStore.userDetails.profilePicUrl"
              cover
            ></v-img>
            <v-avatar v-else color="primary">
              <span class="text-white text-caption">
                {{ (authStore.userDetails?.username || 'U').charAt(0).toUpperCase() }}
              </span>
            </v-avatar>
          </v-avatar>
          <span class="font-weight-bold">{{ authStore.userDetails?.username || 'Kullanıcı' }}</span>
        </div>

        <!-- Açıklama Textarea -->
        <v-textarea
          v-model="text"
          variant="outlined"
          rows="3"
          auto-grow
          placeholder="Açıklama yaz..."
          hide-details
          class="mb-4"
          style="font-size: 14px;"
        ></v-textarea>

        <!-- Konum Ekleme -->
        <v-text-field
          v-model="location"
          variant="outlined"
          placeholder="Konum ekle (opsiyonel)"
          prepend-inner-icon="mdi-map-marker-outline"
          hide-details
          class="mb-4"
          style="font-size: 14px;"
        ></v-text-field>

      </div>

      <!-- Sadece Metin Paylaşımı -->
      <div v-if="!selectedFile && text" class="pa-4">
        <!-- Kullanıcı Bilgisi -->
        <div class="d-flex align-center mb-4">
          <v-avatar size="32" class="mr-3">
            <v-img
              v-if="authStore.userDetails?.profilePicUrl"
              :src="authStore.userDetails.profilePicUrl"
              cover
            ></v-img>
            <v-avatar v-else color="primary">
              <span class="text-white text-caption">
                {{ (authStore.userDetails?.username || 'U').charAt(0).toUpperCase() }}
              </span>
            </v-avatar>
          </v-avatar>
          <span class="font-weight-bold">{{ authStore.userDetails?.username || 'Kullanıcı' }}</span>
        </div>

        <!-- Açıklama Textarea -->
        <v-textarea
          v-model="text"
          variant="outlined"
          rows="3"
          auto-grow
          placeholder="Bir şeyler paylaş..."
          hide-details
          class="mb-4"
          style="font-size: 14px;"
        ></v-textarea>
      </div>

    </v-card>

    <!-- Hata Mesajı -->
    <v-alert
      v-if="error"
      type="error"
      density="compact"
      class="mx-2 mt-2"
      style="border-radius: 8px;"
    >
      {{ error }}
    </v-alert>

    <!-- Alt Bar (Sadece dosya seçildiğinde) -->
    <v-bottom-navigation v-if="selectedFile" grow color="primary" class="px-2 py-3">
      <v-btn value="edit" @click="triggerFileInput" variant="text">
        <v-icon>mdi-pencil</v-icon>
        <span>Değiştir</span>
      </v-btn>
    </v-bottom-navigation>

    <!-- Yükleme Overlay -->
    <v-overlay
      :model-value="loading"
      class="align-center justify-center"
      persistent
    >
      <v-card class="pa-4 text-center" style="border-radius: 12px;">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
          class="mb-4"
        ></v-progress-circular>
        <div class="text-h6">Paylaşılıyor...</div>
        <div class="text-body-2 text-grey mt-2">Gönderiniz paylaşılıyor, lütfen bekleyin.</div>
      </v-card>
    </v-overlay>

  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router' 
import { useAuthStore } from '@/stores/auth' 
import { storage, databases, account } from '@/plugins/appwrite'
import { ID, Permission, Role } from 'appwrite' 

const router = useRouter()
const authStore = useAuthStore()

// State - Mevcut kodunuzdaki değişkenler
const text = ref('')
const selectedFile = ref(null)
const preview = ref(null)
const loading = ref(false)
const error = ref(null)
const fileInput = ref(null)

// Yeni state'ler
const location = ref('')
const uploadAreaHover = ref(false)

// Computed
const canShare = computed(() => {
  return selectedFile.value !== null || text.value.trim() !== ''
})

// Methods
const goBack = () => {
  router.back()
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

// MEVCUT KODUNUZ - Aynen korundu
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
}

// MEVCUT KODUNUZ - Aynen korundu
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
        resolve(newFile)
      }, file.type, 0.85)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
  })

// MEVCUT KODUNUZ - Aynen korundu (Sadece location eklendi)
const sharePost = async () => {
  error.value = null
  loading.value = true

  try {
    // (Güvenlik kontrolü için Pinia store'u kullanıyoruz)
    if (!authStore.isApproved) {
      throw new Error("Paylaşım yapmak için onaylı olmalısınız.")
    }
    
    // (Kullanıcıyı 'account.get()' yerine Pinia'dan alıyoruz, daha hızlı)
    const user = authStore.authUser
    const userDetails = authStore.userDetails

    if (!user || !userDetails) {
      throw new Error("Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.")
    }

    let postType = 'text'
    let mediaUrl = '' 

    // === GÜVENLİK DÜZELTMESİ (ADMİN SİLMESİ İÇİN) ===
    // 'posts' (Depolama) Kovamıza eklediğimiz izinlerin aynısını,
    // (Role.any() -> Read, Role.users() -> Create)
    // dosyaya da (createFile) eklememiz gerekiyor.
    const filePermissions = [
      Permission.read(Role.any()), // Herkes okuyabilir
      Permission.delete(Role.users()), // YENİ: Giriş yapmış herkes silebilir
      Permission.update(Role.users())  // YENİ: Giriş yapmış herkes güncelleyebilir
    ]

    if (selectedFile.value) { 
      const uploadFile = selectedFile.value.type.startsWith('image')
        ? await resizeImage(selectedFile.value)
        : selectedFile.value

      const bucketId = 'posts' 

      const uploaded = await storage.createFile(
        bucketId,
        ID.unique(),
        uploadFile,
        filePermissions // <-- DÜZELTME: İzinleri buraya da ekledik
      )

      console.log('Uploaded file object:', uploaded)

      const fv = storage.getFileDownload(bucketId, uploaded.$id)
      mediaUrl = fv?.href || fv || '' 

      if (uploadFile.type.startsWith('image')) postType = 'image'
      else if (uploadFile.type.startsWith('video')) postType = 'video'
      else if (uploadFile.type.startsWith('audio')) postType = 'audio'
    }

    // === GÜVENLİK DÜZELTMESİ (ADMİN SİLMESİ İÇİN) ===
    // 'Posts' (Veritabanı) koleksiyonumuza eklediğimiz izinlerin aynısını,
    // (Role.any() -> Create, Role.users() -> Read/Update/Delete)
    // belgeye de (createDocument) eklememiz gerekiyor.
    const docPermissions = [
      Permission.read(Role.any()),    // Herkes (Any) okuyabilir
      Permission.update(Role.users()),// Giriş yapmış (Users) güncelleyebilir (Admin 'edit' için)
      Permission.delete(Role.users()) // Giriş yapmış (Users) silebilir (Admin 'delete' için)
    ]
    
    // (BÖLÜM 12'den 'authorAvatarUrl' ve BÖLÜM 11'den 'likes' alanlarını ekliyoruz)
    const postData = {
      authorId: user.$id,
      authorUsername: userDetails.username || 'Anonim',
      authorAvatarUrl: userDetails.profilePicUrl || '', 
      text: text.value.trim(),
      location: location.value.trim(), // YENİ: Konum eklendi
      postType,
      mediaUrl,
      likes: [], 
      likeUsernames: [],
      likesCount: 0 
    }
    
    // "Sadece Metin" Kontrolü
    if (!postData.text && !postData.mediaUrl) {
      throw new Error("Paylaşmak için metin veya dosya girmelisiniz.")
    }

    const created = await databases.createDocument(
      'main',
      'posts',
      ID.unique(),
      postData,
      docPermissions // <-- DÜZELTME: İzinleri buraya ekledik
    )

    console.log('Created post:', created)

    // temizle
    text.value = ''
    location.value = ''
    selectedFile.value = null
    if (preview.value) {
      try { URL.revokeObjectURL(preview.value) } catch(e){/*ignore*/ }
    }
    preview.value = null
    if (fileInput.value) fileInput.value.value = null 

    loading.value = false 
    router.push('/') 

  } catch (err) {
    console.error('sharePost error', err)
    error.value = err?.message || String(err)
    alert('Hata: ' + (err?.message || String(err)))
    loading.value = false 
  } 
}

// Sayfa yüklendiğinde auth kontrolü
onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
  }
})
</script>

<style scoped>
.photo-upload-area {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.photo-upload-area:hover {
  transform: translateY(-2px);
}

.preview-image {
  border-radius: 8px;
}

/* Mobil uyumluluk */
@media (max-width: 600px) {
  .photo-upload-area {
    min-height: 300px;
    padding: 2rem;
  }
}
</style>