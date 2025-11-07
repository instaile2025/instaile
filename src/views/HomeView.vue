<template>
  <v-container class="py-6" style="max-width: 650px;">
    <v-row>
      <v-col cols="12" v-for="(post, index) in posts" :key="post.$id">

        <v-card class="mb-4 rounded-xl" variant="outlined">

          <!-- Yazar -->
          <v-card-title class="d-flex align-center py-3">
            <v-avatar size="42">
              <v-img v-if="post.avatarUrl" :src="post.avatarUrl" cover/>
              <span v-else class="text-h6">{{ post.authorUsername.charAt(0).toUpperCase() }}</span>
            </v-avatar>
            
            <div class="ml-3">
              <strong>{{ post.authorUsername }}</strong>
              <span class="text-grey text-caption"> · {{ formatTime(post.$createdAt) }}</span>
            </div>

            <!-- ✅ Admin Controls -->
            <div v-if="isAdmin" class="ml-auto d-flex">
              <v-btn icon @click="editPost(post)">
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
              <v-btn icon color="red" @click="deletePost(post)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </div>
          </v-card-title>

          <!-- Metin -->
          <v-card-text v-if="post.text" class="pb-0 text-body-1">
            {{ post.text }}
          </v-card-text>

          <!-- Medya -->
          <div class="media-wrapper" @dblclick="handleDoubleClickLike(post, index)">
            <v-icon 
              :ref="el => setPoppingHeartRef(el, index)" 
              class="like-heart-animation"
              color="white"
              size="100"
            >
              mdi-heart
            </v-icon>

            <v-img
              v-if="post.postType === 'image'"
              :src="post.mediaUrl"
              class="my-3"
              style="max-height: 420px; width: 100%; object-fit: contain; background: #111; cursor: pointer;"
            />

            <video
              v-else-if="post.postType === 'video'"
              :src="post.mediaUrl"
              controls
              class="my-3"
              style="width: 100%; height: auto; max-height: 420px; cursor: pointer;"
            ></video>

            <audio
              v-else-if="post.postType === 'audio'"
              :src="post.mediaUrl"
              controls
              class="my-3"
              style="width: 100%;"
            ></audio>
          </div>

          <!-- Like ve Beğeniler -->
          <v-card-actions class="d-flex justify-space-between align-center px-4 pb-3">
            <v-btn
              variant="text"
              @click="toggleLike(post)"
              :color="post.isLiked ? 'red' : ''"
              rounded="lg"
            >
              <v-icon size="26">
                {{ post.isLiked ? 'mdi-heart' : 'mdi-heart-outline' }}
              </v-icon>
              <span class="ml-1 text-body-2">{{ post.likesCount }}</span>
            </v-btn>

            <span v-if="post.likeUsernames.length > 0" class="text-caption text-grey ml-2">
              {{ post.likeUsernames.slice(0, 3).join(', ') }}
              <span v-if="post.likeUsernames.length > 3">
                ve {{ post.likeUsernames.length - 3 }} kişi daha
              </span>
              beğendi.
            </span>

            <v-spacer></v-spacer>

            <v-btn variant="text" icon disabled>
              <v-icon size="26">mdi-chat-outline</v-icon>
              <span class="ml-1 text-body-2">{{ post.comments.length }}</span>
            </v-btn>
          </v-card-actions>

          <v-divider></v-divider>

          <!-- Yorum Listesi -->
          <div class="px-4 py-2">
            <div v-if="post.comments.length === 0" class="text-caption text-grey">
              Henüz yorum yok. İlk yorumu yapın!
            </div>

            <div v-for="comment in post.comments" :key="comment.$id" class="mb-1">
              <span class="font-weight-bold text-body-2">{{ comment.authorUsername }}</span>
              <span class="text-body-2"> {{ comment.text }}</span>
            </div>
          </div>

          <!-- Yorum Ekleme -->
          <v-card-text class="pt-0">
            <v-text-field
              v-model="newCommentText[post.$id]"
              label="Yorum ekle..."
              variant="solo"
              flat
              dense
              hide-details
              append-inner-icon="mdi-send"
              @click:append-inner="handleCommentSubmit(post)"
              @keydown.enter.prevent="handleCommentSubmit(post)"
            ></v-text-field>
          </v-card-text>

        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { databases, account, avatars, Query, client, ID } from '@/plugins/appwrite'

const posts = ref([])
let currentUser = null
let unsubscribePosts = null
let unsubscribeComments = null

const poppingHeartRefs = ref([])
const setPoppingHeartRef = (el, index) => { if (el) poppingHeartRefs.value[index] = el }

const newCommentText = ref({})

// ✅ Avatar Cache
const avatarCache = ref({})

// ✅ Admin kontrolü
let isAdmin = false

// ✅ Avatar URL Getir
const fetchUserAvatar = async (userId, username) => {
  if (avatarCache.value[userId]) return avatarCache.value[userId]
  try {
    const user = await databases.getDocument("main", "users", userId)
    if (user.profilePicUrl) {
      avatarCache.value[userId] = user.profilePicUrl
      return user.profilePicUrl
    }
  } catch {}
  const fallback = avatars.getInitials(username || '?')
  avatarCache.value[userId] = fallback
  return fallback
}

// ✅ Postları Hazırla
const mapPostDocument = async (doc, user) => {
  return {
    ...doc,
    likes: doc.likes || [],
    likeUsernames: doc.likeUsernames || [],
    likesCount: doc.likesCount || 0,
    isLiked: user ? doc.likes.includes(user.$id) : false,
    comments: doc.comments || [],
    avatarUrl: await fetchUserAvatar(doc.authorId, doc.authorUsername)
  }
}

const mapCommentDocument = (doc) => ({ ...doc })

// ✅ Silme ve Düzenleme Fonksiyonları
const deletePost = async (post) => {
  if (!confirm("Bu gönderiyi silmek istediğine emin misin?")) return
  try {
    await databases.deleteDocument("main", "posts", post.$id)
    posts.value = posts.value.filter(p => p.$id !== post.$id)
  } catch (err) {
    console.error("Gönderi silme hatası:", err)
  }
}

const editPost = async (post) => {
  const newText = prompt("Yeni metni gir:", post.text)
  if (newText === null) return
  try {
    await databases.updateDocument("main", "posts", post.$id, { text: newText })
    post.text = newText
  } catch (err) {
    console.error("Gönderi güncelleme hatası:", err)
  }
}

// ✅ Ana yükleme & realtime
const subscribeToContent = async () => {
  currentUser = await account.get().catch(() => null)
  
  // 🔹 Admin kontrolü kesin çalışacak
  isAdmin = currentUser?.isAdmin === true || currentUser?.isAdmin === "true"

  const postsRes = await databases.listDocuments('main', 'posts', [ Query.orderDesc('$createdAt') ])
  const commentsRes = await databases.listDocuments('main', 'comments', [ Query.orderAsc('$createdAt') ])
  const allComments = commentsRes.documents.map(mapCommentDocument)

  posts.value = await Promise.all(postsRes.documents.map(async doc => {
    const mapped = await mapPostDocument(doc, currentUser)
    mapped.comments = allComments.filter(c => c.postId === doc.$id)
    return mapped
  }))

  unsubscribePosts = client.subscribe('databases.main.collections.posts.documents', async response => {
    const doc = response.payload
    const updated = await mapPostDocument(doc, currentUser)

    if (response.events[0].includes('create')) {
      updated.comments = []
      posts.value.unshift(updated)
    } else if (response.events[0].includes('update')) {
      const i = posts.value.findIndex(p => p.$id === updated.$id)
      if (i !== -1) updated.comments = posts.value[i].comments
      posts.value[i] = updated
    } else if (response.events[0].includes('delete')) {
      posts.value = posts.value.filter(p => p.$id !== updated.$id)
    }
  })

  unsubscribeComments = client.subscribe('databases.main.collections.comments.documents', response => {
    if (response.events[0].includes('create')) {
      const c = mapCommentDocument(response.payload)
      const p = posts.value.find(p => p.$id === c.postId)
      if (p) p.comments.push(c)
    }
  })
}

// ✅ Yorum Gönder
const handleCommentSubmit = async (post) => {
  if (!currentUser) return alert("Giriş yapmalısın.")
  const text = newCommentText.value[post.$id]
  if (!text?.trim()) return
  await databases.createDocument('main', 'comments', ID.unique(), {
    postId: post.$id,
    authorUsername: currentUser.name,
    text
  })
  newCommentText.value[post.$id] = ''
}

// ✅ Like
const toggleLike = async (post) => {
  if (!currentUser) return alert("Giriş yapmalısın.")
  const uid = currentUser.$id
  const uname = currentUser.name
  let likes = [...post.likes]
  let names = [...post.likeUsernames]

  if (post.isLiked) {
    likes = likes.filter(id => id !== uid)
    names = names.filter(n => n !== uname)
    post.isLiked = false
    post.likesCount--
  } else {
    likes.push(uid)
    names.push(uname)
    post.isLiked = true
    post.likesCount++
  }

  post.likes = likes
  post.likeUsernames = names

  await databases.updateDocument('main', 'posts', post.$id, {
    likes,
    likeUsernames: names,
    likesCount: likes.length
  })
}

// ❤️ Double-Click Heart
const handleDoubleClickLike = (post, i) => {
  const el = poppingHeartRefs.value[i]?.$el
  if (el) {
    el.classList.add('popping')
    setTimeout(() => el.classList.remove('popping'), 1000)
  }
  if (!post.isLiked) toggleLike(post)
}

// ⏱ Zaman Formatı
const formatTime = (ts) => {
  const s = (Date.now() - new Date(ts)) / 1000
  if (s < 60) return "Az önce"
  if (s < 3600) return Math.floor(s/60) + " dk önce"
  if (s < 86400) return Math.floor(s/3600) + " saat önce"
  return Math.floor(s/86400) + " gün önce"
}

onMounted(subscribeToContent)
onUnmounted(() => unsubscribePosts?.() || unsubscribeComments?.())
</script>

<style scoped>
.media-wrapper { position: relative; overflow: hidden; }
.like-heart-animation {
  position: absolute; top:50%; left:50%;
  transform: translate(-50%, -50%) scale(0); opacity:0; z-index:10;
}
.like-heart-animation.popping { animation: pop .8s ease-out; }
@keyframes pop {
  0% { transform:translate(-50%,-50%) scale(0); opacity:0; }
  50% { transform:translate(-50%,-50%) scale(1.4); opacity:.9; }
  100% { transform:translate(-50%,-50%) scale(1.8); opacity:0; }
}
.text-grey { color:#777; }
</style>
