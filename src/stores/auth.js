import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { account, databases } from '@/plugins/appwrite'

export const useAuthStore = defineStore('auth', () => {
  // STATE
  const authUser = ref(null)
  const userDetails = ref(null)
  const isAuthReady = ref(false)

  // SABİT ADMIN ID (Senin istediğin)
  const ADMIN_ID = "690b05f40037297ec116"

  // ACTIONS
  const fetchUser = async () => {
    try {
      // Oturum açık mı kontrol et
      const currentUser = await account.get()
      authUser.value = currentUser

      // Kullanıcı detaylarını veritabanından çek
      const userDoc = await databases.getDocument(
        'main',
        'users',
        currentUser.$id
      )

      // ⬇️ Admin ataması otomatik — koleksiyonda yoksa bile
      if (currentUser.$id === ADMIN_ID && !userDoc.isAdmin) {
        // UPGRADE: Admin olduğunu garanti altına alalım
        await databases.updateDocument('main', 'users', currentUser.$id, {
          isAdmin: true,
          isApproved: true
        })
        userDoc.isAdmin = true
        userDoc.isApproved = true
      }

      userDetails.value = userDoc

    } catch (e) {
      authUser.value = null
      userDetails.value = null
    } finally {
      isAuthReady.value = true
    }
  }

  const logout = async () => {
    try {
      await account.deleteSession('current')
      authUser.value = null
      userDetails.value = null
    } catch (e) {
      console.error('Appwrite Logout hatası:', e.message)
    }
  }

  // GETTERS
  const isLoggedIn = computed(() => !!authUser.value)

  const isAdmin = computed(() =>
    userDetails.value ? userDetails.value.isAdmin === true : false
  )

  const isApproved = computed(() =>
    userDetails.value ? userDetails.value.isApproved === true : false
  )

  return {
    authUser,
    userDetails,
    isAuthReady,
    fetchUser,
    logout,
    isLoggedIn,
    isAdmin,
    isApproved,
  }
})
