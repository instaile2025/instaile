<template>
  <v-container class="py-6" style="max-width: 600px;">
    <v-card class="pa-4 rounded-lg" elevation="3">

      <v-card-title class="text-h6">Yeni Gönderi</v-card-title>

      <v-textarea
        v-model="text"
        label="Bir şeyler paylaş..."
        rows="4"
        auto-grow
        variant="outlined"
        class="mb-4"
      ></v-textarea>

      <!-- native input (Sizin çözümünüz) -->
      <input
        ref="fileInput" 
        type="file"
        accept="image/*,video/*,audio/*"
        @change="onFileSelect"
        class="mb-4"
      />

      <!-- Önizleme -->
      <v-img
        v-if="preview"
        :src="preview"
        class="rounded-lg mb-3"
        height="260"
        style="object-fit: contain; background:#111;"
      />

      <v-alert v-if="error" type="error" class="mb-3" dense>
        {{ error }}
      </v-alert>

      <v-btn
        color="primary"
        block
        :loading="loading"
        @click="sharePost"
        rounded="lg"
      >
        Paylaş
      </v-btn>
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
const selectedFile = ref(null)
const preview = ref(null)
const loading = ref(false)
const error = ref(null)
const fileInput = ref(null)

// Sizin onFileSelect fonksiyonunuz (harika)
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

// Sizin resim küçültme fonksiyonunuz (harika)
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

// Sizin sharePost fonksiyonunuz (düzeltmelerle)
const sharePost = async () => {
  error.value = null
  loading.value = true

  try {
    // (Güvenlik kontrolü için Pinia store'u kullanıyoruz)
    if (!authStore.isApproved) {
      throw new Error("Paylaşım yapmak için onaylı olmalısınız.")
    }
    
    // Kullanıcı bilgilerini hem Pinia'dan hem de doğrudan account'tan alalım
    const user = await account.get()
    const userDetails = authStore.userDetails

    if (!user || !userDetails) {
      throw new Error("Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.")
    }

    let postType = 'text'
    let mediaUrl = '' 

    // DÜZELTİLMİŞ: Hem kullanıcı hem de admin için izin yapısı
    const filePermissions = [
      Permission.read(Role.any()), // Herkes okuyabilir
      Permission.delete(Role.user(user.$id)), // Sadece yazar silebilir
      Permission.update(Role.user(user.$id)), // Sadece yazar güncelleyebilir
      Permission.delete(Role.team('admins')), // Adminler silebilir (TEAM OLMALI)
      Permission.update(Role.team('admins'))  // Adminler güncelleyebilir (TEAM OLMALI)
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
        filePermissions // DÜZELTİLMİŞ: Tam izinler
      )

      console.log('Uploaded file object:', uploaded)

      const fv = storage.getFileDownload(bucketId, uploaded.$id)
      mediaUrl = fv?.href || fv || '' 

      if (uploadFile.type.startsWith('image')) postType = 'image'
      else if (uploadFile.type.startsWith('video')) postType = 'video'
      else if (uploadFile.type.startsWith('audio')) postType = 'audio'
    }

    // DÜZELTİLMİŞ: Hem kullanıcı hem de admin için izin yapısı
    const docPermissions = [
      Permission.read(Role.any()),    // Herkes okuyabilir
      Permission.update(Role.user(user.$id)), // Sadece yazar güncelleyebilir
      Permission.delete(Role.user(user.$id)), // Sadece yazar silebilir
      Permission.update(Role.team('admins')), // Adminler güncelleyebilir (TEAM OLMALI)
      Permission.delete(Role.team('admins'))  // Adminler silebilir (TEAM OLMALI)
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
    
    // "Sadece Metin" Kontrolü
    if (!postData.text && !postData.mediaUrl) {
      throw new Error("Paylaşmak için metin veya dosya girmelisiniz.")
    }

    const created = await databases.createDocument(
      'main',
      'posts',
      ID.unique(),
      postData,
      docPermissions // DÜZELTİLMİŞ: Tam izinler
    )

    console.log('Created post:', created)

    // temizle
    text.value = ''
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
</script>