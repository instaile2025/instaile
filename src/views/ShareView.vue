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

      <input
        ref="fileInput" 
        type="file"
        accept="image/*,video/*,audio/*"
        @change="onFileSelect"
        class="mb-4"
      />

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
import { storage, databases, account } from '@/plugins/appwrite'
import { ID, Permission, Role } from 'appwrite' 

const router = useRouter()
const text = ref('')
const selectedFile = ref(null)
const preview = ref(null)
const loading = ref(false)
const error = ref(null)
const fileInput = ref(null)

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
    const user = await account.get()

    let postType = 'text'
    let mediaUrl = '' 

    if (selectedFile.value) { 
      const uploadFile = selectedFile.value.type.startsWith('image')
        ? await resizeImage(selectedFile.value)
        : selectedFile.value

      const uploaded = await storage.createFile(
        'posts',
        ID.unique(),
        uploadFile,
        [Permission.read(Role.any())]
      )

      const fv = storage.getFileDownload('posts', uploaded.$id)
      mediaUrl = fv?.href || fv || '' 

      if (uploadFile.type.startsWith('image')) postType = 'image'
      else if (uploadFile.type.startsWith('video')) postType = 'video'
      else if (uploadFile.type.startsWith('audio')) postType = 'audio'
    }

    const postData = {
      authorId: user.$id,
      authorUsername: user.name || 'Anonim',
      text: text.value.trim(),   // <-- ✅ Caption düzgün kaydedilir
      postType,
      mediaUrl,
      likes: [],
      likeUsernames: [],
      likesCount: 0
    }

    if (!postData.text && !postData.mediaUrl) {
      throw new Error("Paylaşmak için metin veya dosya girmelisiniz.")
    }

    await databases.createDocument('main', 'posts', ID.unique(), postData)

    text.value = ''
    selectedFile.value = null
    preview.value && URL.revokeObjectURL(preview.value)
    preview.value = null
    fileInput.value && (fileInput.value.value = null)

    loading.value = false
    router.push('/')

  } catch (err) {
    error.value = err?.message || String(err)
    alert('Hata: ' + error.value)
    loading.value = false 
  }
}
</script>
