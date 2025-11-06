<template>
  <v-app>
    
    <!-- ÜST BAR - AÇIK TEMA + BILLABONG LOGO -->
    <v-app-bar app flat class="topbar">
      <v-toolbar-title class="logo cursor-pointer" @click="goHome">
        instaile
      </v-toolbar-title>

      <v-spacer />

      <v-btn text v-if="authStore.userDetails?.isAdmin" @click="goAdmin">
        Admin Panel
      </v-btn>

      <v-menu v-if="authStore.authUser" offset-y>
        <template #activator="{ props }">
          <v-btn v-bind="props" icon>
            <v-avatar size="36">
              <v-img
                v-if="authStore.userDetails?.profilePicUrl"
                :src="authStore.userDetails.profilePicUrl"
                cover
              />
              <span v-else>{{ authStore.userDetails?.username?.charAt(0).toUpperCase() }}</span>
            </v-avatar>
          </v-btn>
        </template>

        <v-list>
          <v-list-item @click="goProfile">
            <v-list-item-title>Profil</v-list-item-title>
          </v-list-item>

          <v-list-item @click="logout">
            <v-list-item-title>Çıkış Yap</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-btn text v-else @click="goLogin">
        Giriş
      </v-btn>
    </v-app-bar>

    <!-- İÇERİK -->
    <v-main>
      <router-view />
    </v-main>

    <!-- ALT NAV (AÇIK TEMA) -->
    <v-bottom-navigation
      v-if="authStore.authUser"
      v-model="activeTab"
      app
      grow
      height="68"
      class="bottom-nav"
    >
      <v-btn :value="'home'" @click="goHome" :class="{ 'active-nav': activeTab === 'home' }">
        <v-icon>mdi-home</v-icon>
      </v-btn>

      <v-btn :value="'share'" @click="goShare" class="center-button">
        <v-icon size="28">mdi-plus-box</v-icon>
      </v-btn>

      <v-btn :value="'profile'" @click="goProfile" :class="{ 'active-nav': activeTab === 'profile' }">
        <v-icon>mdi-account</v-icon>
      </v-btn>
    </v-bottom-navigation>

  </v-app>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()

const activeTab = ref('home')

const syncTab = () => {
  const name = (route.name || '').toLowerCase()
  if (name.includes('home')) activeTab.value = 'home'
  else if (name.includes('share')) activeTab.value = 'share'
  else if (name.includes('profile')) activeTab.value = 'profile'
}
onMounted(syncTab)
watch(() => route.fullPath, syncTab)

const goHome = () => router.push({ name: 'Home' })
const goShare = () => router.push({ name: 'Share' })
const goProfile = () => router.push({ name: 'Profile' })
const goAdmin = () => router.push({ name: 'Admin' })
const goLogin = () => router.push({ name: 'Login' })

const logout = async () => {
  await authStore.logout()
  router.replace({ name: 'Login' })
}
</script>

<style scoped>
/* BILLABONG LOGO FONT */
@import url('https://fonts.cdnfonts.com/css/billabong');

/* ANA FONT = INTER (INSTAGRAM FONT FEEL) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

* {
  font-family: 'Inter', sans-serif;
}

/* ÜST BAR - AÇIK / CAM */
.topbar {
  background: rgba(255,255,255,0.85) !important;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0,0,0,0.08);
}

/* LOGO */
.logo {
  font-family: 'Billabong', sans-serif !important;
  font-size: 34px;
  letter-spacing: 0.5px;
  color: #111 !important;
}

/* ALT NAV - AÇIK */
.bottom-nav {
  background: rgba(255,255,255,0.9);
  border-top: 1px solid rgba(0,0,0,0.12);
  backdrop-filter: blur(10px);
}

.bottom-nav .v-btn {
  color: rgba(0,0,0,0.55);
}

.bottom-nav .v-btn.active-nav {
  color: #000 !important;
}

/* ORTA PAYLAŞ BUTONU */
.center-button {
  transform: translateY(-8px);
  background: linear-gradient(45deg,#F58529,#DD2A7B,#8134AF);
  color: white !important;
  width: 62px;
  height: 62px;
  border-radius: 16px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
}

.cursor-pointer { cursor: pointer; }

/* -------------------------------------------
   → ✅ POST STİLİ (HER YERDE KULLANILABİLİR)
------------------------------------------- */

/* Kullanıcı adı */
.post-username {
  font-weight: 600; /* yarı kalın */
  font-size: 15px;
  color: #111;
}

/* Açıklama (caption) */
.post-caption {
  font-weight: 400;
  font-size: 14px;
  line-height: 1.42;
  color: #222;
  white-space: pre-line;
}

/* Mention Renklendirme */
.post-caption .mention {
  color: #0064d3;
  font-weight: 500;
}

/* Hashtag Renklendirme */
.post-caption .hashtag {
  color: #bb0077;
}
</style>
