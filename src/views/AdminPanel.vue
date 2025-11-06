<template>
  <v-container class="py-6" style="max-width: 900px;">
    <v-card class="pa-4 rounded-xl" variant="outlined">
      <v-card-title class="text-h5">Admin - Yeni Kayıt Onayları</v-card-title>

      <v-card-text>
        <v-alert v-if="loading" type="info" dense>Yükleniyor...</v-alert>

        <v-list v-if="users.length > 0">
          <v-list-item v-for="u in users" :key="u.$id" class="d-flex align-center">
            <v-list-item-avatar>
              <v-img :src="u.profilePicUrl || ''" v-if="u.profilePicUrl" />
              <v-avatar v-else color="grey lighten-2">{{ (u.username || '').charAt(0).toUpperCase() }}</v-avatar>
            </v-list-item-avatar>

            <v-list-item-content>
              <v-list-item-title>{{ u.username }}</v-list-item-title>
              <v-list-item-subtitle>{{ u.email }}</v-list-item-subtitle>
            </v-list-item-content>

            <v-list-item-action>
              <v-btn color="primary" @click="approveUser(u.$id)">Onayla</v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-list>

        <div v-else class="text-grey">Onay bekleyen kullanıcı yok.</div>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { databases } from '@/plugins/appwrite'
import { Query } from 'appwrite'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const users = ref([])
const loading = ref(false)

const fetchWaiting = async () => {
  loading.value = true
  try {
    const res = await databases.listDocuments('main', 'users', [
      Query.equal('isApproved', false)
    ])
    users.value = res.documents
  } catch (err) {
    console.error('fetchWaiting error', err)
    users.value = []
  } finally {
    loading.value = false
  }
}

const approveUser = async (id) => {
  try {
    await databases.updateDocument('main', 'users', id, { isApproved: true })
    await fetchWaiting()
  } catch (err) {
    console.error('approve error', err)
    alert('Onaylama sırasında hata oldu.')
  }
}

onMounted(async () => {
  // güvenlik: sayfaya sadece adminler erişebilsin
  await authStore.fetchUser()
  if (!authStore.userDetails?.isAdmin) {
    return router.replace({ name: 'Home' })
  }
  fetchWaiting()
})
</script>
