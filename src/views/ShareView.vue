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

      <!-- Debug Modu Switch -->
      <v-switch
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

      <!-- Debug Bilgisi -->
      <v-alert
        v-if="debugMode && lastPostData"
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
        <div><strong>Tarih:</strong> {{ new Date().toLocaleString('tr-TR') }}</div>
      </v-alert>

    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
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
const debugMode = ref(false) // YENİ: Debug modu
const lastPostData = ref(null) // YENİ: Son gönderi bilgisi

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
  lastPostData.value = null // Debug verisini temizle
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
        if (debugMode.value) console.log('🖼️ Resim seçildi:', file.name, `${img.width}x${img.height}`)
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
  if (debugMode.value) console.log('📁 Dosya seçildi:', file.name, file.type)
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
        if (debugMode.value) console.log('📐 Resim optimize edildi:', `${width}x${height}`)
        resolve(newFile)
      }, file.type, 0.85)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }
  })

// === PAYLAŞIM FONKSİYONU (GÜNCELLENDİ) ===
const sharePost = async () => {
  error.value = null
  loading.value = true

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
      if (debugMode.value) console.log('⬆️ Dosya yükleniyor...', selectedFile.value.name)
      
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

      if (debugMode.value) console.log('✅ Dosya yüklendi:', uploaded.$id, postType)
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

    if (debugMode.value) {
      console.log('📝 Gönderi verisi hazır:', postData)
      console.log('🚀 Appwrite Function tetiklenecek...')
    }

    // GÖNDERİYİ OLUŞTUR
    const created = await databases.createDocument(
      'main',
      'posts',
      ID.unique(),
      postData,
      docPermissions
    )

    console.log('✅ GÖNDERİ OLUŞTURULDU - Appwrite Function TETİKLENMELİ!')
    console.log('📦 Gönderi ID:', created.$id)
    console.log('👤 Gönderen:', created.authorUsername)
    console.log('📝 Metin:', created.text || 'Boş')
    console.log('🎨 Tip:', created.postType)

    // Debug için son gönderi bilgisini kaydet
    lastPostData.value = created

    // BAŞARI MESAJI
    if (debugMode.value) {
      alert(`✅ Gönderi paylaşıldı!\n\nAppwrite Function tetiklendi.\nKonsolu kontrol edin.`)
    }

    clearForm()
    loading.value = false 
    
    // 2 saniye bekle ve ana sayfaya yönlendir
    setTimeout(() => {
      router.push('/')
    }, 2000)

  } catch (err) {
    console.error('❌ sharePost hatası:', err)
    error.value = err?.message || String(err)
    alert('Hata: ' + (err?.message || String(err)))
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
</style>