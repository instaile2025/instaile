// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/default/Default.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'Home', component: () => import('@/views/HomeView.vue') },
      { path: 'share', name: 'Share', component: () => import('@/views/ShareView.vue') },
      { path: 'profile', name: 'Profile', component: () => import('@/views/ProfileView.vue') },
      { path: 'admin', name: 'Admin', component: () => import('@/views/AdminPanel.vue'), meta: { requiresAdmin: true } },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/auth/AuthLayout.vue'),
    meta: { requiresGuest: true },
    children: [
      { path: 'login', name: 'Login', component: () => import('@/views/LoginView.vue') },
      { path: 'register', name: 'Register', component: () => import('@/views/RegisterView.vue') },
    ],
  },
  // fallback
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // ensure auth status loaded
  if (!authStore.isAuthReady) {
    await authStore.fetchUser()
  }

  const isLoggedIn = !!authStore.authUser
  const isAdmin = !!authStore.userDetails?.isAdmin
  const isApproved = authStore.userDetails?.isApproved ?? true

  // If route requires auth and not logged in -> go login
  if (to.meta.requiresAuth && !isLoggedIn) {
    return next({ name: 'Login' })
  }

  // If route requires guest and logged in -> go home
  if (to.meta.requiresGuest && isLoggedIn) {
    // If user is not approved, log them out and show login
    if (!isApproved) {
      await authStore.logout()
      return next({ name: 'Login' })
    }
    return next({ name: 'Home' })
  }

  // If route requires admin
  if (to.meta.requiresAdmin && !isAdmin) {
    return next({ name: 'Home' })
  }

  // If logged in but not approved, block access to authenticated routes
  if (isLoggedIn && !isApproved) {
    // allow only register/login pages (guest)
    if (to.meta.requiresGuest) {
      return next()
    }
    // otherwise send them to login with message
    await authStore.logout()
    return next({ name: 'Login' })
  }

  return next()
})

export default router
