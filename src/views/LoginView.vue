<template>
  <v-container>
    <v-card class="mx-auto pa-4" max-width="400">
      <v-card-title class="text-center">
        instaile
      </v-card-title>
      <v-card-subtitle class="text-center mb-4">
        Giriş Yap
      </v-card-subtitle>

      <v-form @submit.prevent="handleLogin">
        <v-text-field
          v-model="email"
          label="E-posta"
          type="email"
          variant="outlined"
          class="mb-2"
        />

        <v-text-field
          v-model="password"
          label="Şifre"
          type="password"
          variant="outlined"
          class="mb-2"
        />

        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          class="mb-2"
          density="compact"
        >
          {{ error }}
        </v-alert>

        <v-btn
          :loading="loading"
          type="submit"
          color="primary"
          block
          class="mb-2"
        >
          Giriş Yap
        </v-btn>
      </v-form>

      <v-card-text class="text-center">
        Hesabın yok mu?
        <router-link to="/register" class="text-primary">Kayıt Ol</router-link>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { account, databases } from '@/plugins/appwrite'
import { useAuthStore } from '@/stores/auth'

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(null)
const router = useRouter()
const authStore = useAuthStore()

const checkApproval = async (userId) => {
  const userDoc = await databases.getDocument(
    'main',
    'users',
    userId
  )

  if (userDoc && userDoc.isApproved === true) {
    await authStore.fetchUser()
    router.push('/')
  } else {
    error.value = 'Hesabınız henüz admin tarafından onaylanmadı.'
    await account.deleteSession('current')
  }
}

const handleLogin = async () => {
  if (loading.value) return

  loading.value = true
  error.value = null

  try {
    // ✅ SENİN SDK SÜRÜME UYGUN LOGIN METODU
    await account.createEmailPasswordSession(email.value, password.value)

    const user = await account.get()

    await checkApproval(user.$id)

  } catch (err) {
    console.error('Login error:', err.message)

    if (err.message.includes('Invalid credentials')) {
      error.value = 'E-posta veya şifre yanlış.'
    } else {
      error.value = 'Hata: ' + err.message
    }
  } finally {
    loading.value = false
  }
}
</script>
