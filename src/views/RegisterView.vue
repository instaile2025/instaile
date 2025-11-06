<template>
  <v-container>
    <v-card class="mx-auto pa-4" max-width="400">
      <v-card-title class="text-center">
        instaile
      </v-card-title>
      <v-card-subtitle class="text-center mb-4">
        Kayıt Ol
      </v-card-subtitle>

      <v-form @submit.prevent="handleRegister">
        <v-text-field
          v-model="username"
          label="Kullanıcı Adı (nickname)"
          type="text"
          variant="outlined"
          class="mb-2"
        ></v-text-field>

        <v-text-field
          v-model="email"
          label="E-posta"
          type="email"
          variant="outlined"
          class="mb-2"
        ></v-text-field>

        <v-text-field
          v-model="password"
          label="Şifre"
          type="password"
          variant="outlined"
          class="mb-2"
        ></v-text-field>

        <!-- Hata veya Başarı Mesajı Alanı -->
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-2"
          density="compact"
        >
          {{ error }}
        </v-alert>
        
        <v-alert
          v-if="successMessage"
          type="success"
          variant="tonal"
          class="mb-2"
          density="compact"
        >
          {{ successMessage }}
        </v-alert>

        <v-btn
          :loading="loading"
          type="submit"
          color="primary"
          block
          class="mb-2"
        >
          Kayıt Ol
        </v-btn>
      </v-form>

      <v-card-text class="text-center">
        Zaten hesabın var mı?
        <router-link to="/login" class="text-primary"> Giriş Yap </router-link>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { account, databases, ID } from '@/plugins/appwrite'

const username = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(null)
const successMessage = ref(null)
const router = useRouter()

const handleRegister = async () => {
  if (loading.value) return
  loading.value = true
  error.value = null
  successMessage.value = null

  if (!username.value || !email.value || !password.value) {
    error.value = 'Tüm alanlar doldurulmalıdır.'
    loading.value = false
    return
  }

  try {
    // 1. ADIM: Auth'a kaydet
    const userAuth = await account.create(
      ID.unique(),
      email.value,
      password.value,
      username.value
    )
    console.log('Appwrite Auth kaydı başarılı:', userAuth.$id)

    // 2. ADIM: Veritabanına kaydet
    const userDoc = {
      username: username.value,
      email: email.value,
      isApproved: false,
      isAdmin: false,
    }
    await databases.createDocument(
      'main',
      'users',
      userAuth.$id,
      userDoc
    )
    console.log('Appwrite Veritabanı kaydı başarılı.')

    // 3. ADIM (DÜZELTME): Hatalı olan 'deleteSession' kodu kaldırıldı.
    // Kullanıcı otomatik olarak giriş yapmış olarak kalacak.

    // Başarı mesajı göster
    successMessage.value = 'Kayıt başarılı! Lütfen giriş yapmak için admin onayını bekleyin.'
    
    // Formu temizle
    username.value = ''
    email.value = ''
    password.value = ''

    // 3 saniye sonra Giriş Yap sayfasına yönlendir
    setTimeout(() => {
      router.push('/login')
    }, 3000)

  } catch (err) {
    console.error("Appwrite Kayıt hatası:", err.message)
    if (err.message.includes('User already exists')) {
      error.value = 'Bu e-posta adresi zaten kullanılıyor.'
    } else if (err.message.includes('Password must be at least 8 characters')) {
      error.value = 'Şifre çok zayıf. (En az 8 karakter olmalı).'
    } else if (err.message.includes('Invalid email')) {
      error.value = 'Geçersiz e-posta adresi.'
    } else {
      error.value = 'Kayıt sırasında bir hata oluştu: ' + err.message
    }
  } finally {
    loading.value = false
  }
}
</script>