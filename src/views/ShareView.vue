<template>
  <v-container class="py-6" style="max-width: 500px;">
    
    <!-- 1. GÜVENLİK KONTROLÜ (Değişmedi) -->
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

    <!-- 2. YENİ TASARIM (Resimdeki gibi) -->
    <v-card v-else class="pa-4 rounded-lg" elevation="3">
      
      <!-- Gizli Dosya Girişi (Hâlâ Sizin Mantığınızı Kullanıyor, ama gizli) -->
      <input
        ref="fileInput" 
        type="file"
        accept="image/*,video/*,audio/*"
        @change="onFileSelect"
        class="d-none"
      />

      <!-- "Fotoğraf Yüklemek için Tıkla" Alanı (Dropzone) -->
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

      <!-- Önizleme (Sizin Kodunuz) -->
      <v-img
        v-if="preview"
        :src="preview"
        class="rounded-lg mb-3"
        height="260"
        style="object-fit: contain; background:#111; cursor: pointer;"
        @click="triggerFileInput"
      />
      
      <!-- Açıklama Alanı (Yeni Stil) -->
      <v-textarea
        v-model="text"
        label="Açıklama yaz..."
        rows="3"
        auto-grow
        variant="solo-filled"
        bg-color="grey-darken-3"
        dark
        class="mt-4 mb-2"
        hide-details
      ></v-textarea>

      <!-- Konum Alanı (Yeni Stil - Şimdilik devre dışı) -->
      <v-text-field
        v-model="location"
        label="Konum ekle (opsiyonel)"
        variant="solo-filled"
        bg-color="grey-darken-3"
        dark
        class="mb-4"
        prepend-inner-icon="mdi-map-marker-outline"
        hide-details
        disabled
      ></v-text-field>

      <v-alert v-if="error" type="error" class="mb-3" dense>
        {{ error }}
      </v-alert>

      <!-- Butonlar (Yeni Stil) -->
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
          <!-- Paylaş Butonu (Degrade Stil) -->
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

    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router' 
// YENİ: Pinia Store'u import ediyoruz (Kullanıcı bilgisi için)
import { useAuthStore } from '@/stores/auth' 
import { storage, databases, account } from '@/plugins/appwrite'
// YENİ: 'Query' eklendi (import listesine)
import { ID, Permission, Role, Query } from 'appwrite' 

const router = useRouter()
// YENİ: Pinia Store'u çağırıyoruz
const authStore = useAuthStore()

const text = ref('')
const location = ref('') // YENİ: Konum alanı (henüz kullanılmıyor)
const selectedFile = ref(null)
const preview = ref(null)
const loading = ref(false)
const error = ref(null)
const fileInput = ref(null) // <input> etiketine erişmek için

// YENİ: "Fotoğraf Yükle" alanına tıklandığında gizli input'u tetikler
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

// YENİ: "İptal" butonu formu temizler
const clearForm = () => {
  text.value = ''
  location.value = ''
  selectedFile.value = null
  if (preview.value) {
    try { URL.revokeObjectURL(preview.value) } catch(e){/*ignore*/ }
  }
  preview.value = null
  if (fileInput.value) fileInput.value.value = null
  error.value = null
}

// === Aşağıdaki kodun tamamı, sizin çalışan kodunuzdur ===
// === (Sadece 'authStore'dan bilgi alacak şekilde güncellendi) ===

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

    if (selectedFile.value) { 
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
    }

    const docPermissions = [
      Permission.read(Role.any()),
      Permission.update(Role.users()),
      Permission.delete(Role.users())
    ]
    
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

    await databases.createDocument(
      'main',
      'posts',
      ID.unique(),
      postData,
      docPermissions
    )

    clearForm() // Formu temizle
    loading.value = false 
    router.push('/') // Yönlendir

  } catch (err) {
    console.error('sharePost error', err)
    error.value = err?.message || String(err)
    alert('Hata: ' + (err?.message || String(err)))
    loading.value = false 
  } 
}
</script>

<!-- YENİ: Yeni tasarıma ait stiller -->
<style scoped>
/* YENİ: Dropzone stili */
.dropzone {
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;
}
.dropzone:hover {
  background-color: #f0f0f0; /* Aydınlık tema için hafif hover */
}

/* YENİ: Resimdeki degrade (gradient) buton */
.gradient-button {
  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  color: white !important; /* Vuetify'ı ezmek için */
}

/* YENİ: Koyu (dark) text field'ların içindeki 'label' rengini
   aydınlık temada daha görünür yap */
/* 'deep' seçicisi, Vuetify'ın iç stillerini ezmemizi sağlar */
:deep(.v-textarea .v-label) {
  color: rgba(255, 255, 255, 0.6) !important;
}
:deep(.v-text-field .v-label) {
  color: rgba(255, 255, 255, 0.6) !important;
}
</style>