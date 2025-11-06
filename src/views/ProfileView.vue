<template>
  <v-container class="py-6" style="max-width: 650px;">
    <v-card class="mx-auto pa-4 rounded-xl" variant="outlined">
      
      <v-card-title class="text-center text-h5">
        Profil
      </v-card-title>
      
      <v-responsive class="align-center text-center fill-height">
        
        <!-- 1. PROFİL RESMİ GÖSTERME ALANI -->
        <v-avatar
          color="surface-variant"
          size="128"
          class="my-4"
        >
          <v-img
            v-if="authStore.userDetails?.profilePicUrl"
            :src="authStore.userDetails.profilePicUrl"
            cover
          ></v-img>
          <span v-else class="text-h3">
            {{ authStore.userDetails?.username.charAt(0).toUpperCase() }}
          </span>
        </v-avatar>

        <h3 class="text-h6">{{ authStore.userDetails?.username }}</h3>
        <p class="text-caption text-grey">{{ authStore.userDetails?.email }}</p>

        <v-divider class="my-6"></v-divider>

        <!-- 2. PROFİL RESMİ YÜKLEME FORMU -->
        <h4 class="text-subtitle-1 mb-2">Profil Resmini Güncelle</h4>
        <v-form @submit.prevent="handleProfilePicUpdate">
          <v-file-input
            v-model="file"
            label="Yeni resim seç"
            variant="outlined"
            accept="image/*"
            show-size
            prepend-icon="mdi-camera"
          ></v-file-input>
          
          <v-alert
            v-if="uploadError"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-2"
          >
            {{ uploadError }}
          </v-alert>
          
           <v-alert
            v-if="uploadSuccess"
            type="success"
            variant="tonal"
            density="compact"
            class="mb-2"
          >
            Profil resmi güncellendi!
          </v-alert>

          <v-btn
            :loading="loading"
            type="submit"
            color="primary"
            block
            class="mt-2"
          >
            Güncelle
          </v-btn>
        </v-form>

        <v-divider class="my-6"></v-divider>

        <!-- 3. ÇIKIŞ YAP BUTONU -->
        <v-btn
          color="error"
          variant="tonal"
          block
          @click="handleLogout"
        >
          Çıkış Yap
        </v-btn>

      </v-responsive>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { storage, databases, ID, Role, Permission } from '@/plugins/appwrite'

const authStore = useAuthStore()
const router = useRouter()

const file = ref(null)
const loading = ref(false)
const uploadError = ref(null)
const uploadSuccess = ref(false)

const handleProfilePicUpdate = async () => {
  if (loading.value) return
  loading.value = true
  uploadError.value = null
  uploadSuccess.value = false
  
  const selectedFile = file.value || null
  
  if (!selectedFile) {
    uploadError.value = 'Lütfen bir dosya seçin.'
    loading.value = false
    return
  }

  try {
    console.log('Profil resmi yükleniyor...')
    
    const filePermissions = [
      Permission.read(Role.any()),
    ]
    
    const uploadedFile = await storage.createFile(
      'posts',
      ID.unique(),
      selectedFile,
      filePermissions
    )
    console.log('Dosya Storagea yüklendi:', uploadedFile.$id)

    /* ✅ BURASI DÜZELTİLDİ — ARTIK .href YOK */
    const newUrl = storage.getFileView('posts', uploadedFile.$id)

    if (!newUrl) {
      console.error("URL alınamadı!")
      throw new Error("Dosya yüklendi ancak URL alınamadı.")
    }

    console.log('Yeni URL:', newUrl)

    await databases.updateDocument(
      'main',
      'users',
      authStore.authUser.$id,
      { profilePicUrl: newUrl }
    )
    console.log('Kullanıcı veritabanı güncellendi.')

    await authStore.fetchUser()

    uploadSuccess.value = true
    file.value = null
    
  } catch (err) {
    console.error("Profil resmi güncelleme hatası:", err.message)
    uploadError.value = 'Bir hata oluştu: ' + err.message
  } finally {
    loading.value = false
  }
}

const handleLogout = async () => {
  await authStore.logout()
  router.replace({ name: 'Login' })
}
</script>
