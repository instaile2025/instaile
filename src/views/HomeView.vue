<template>
  <v-container class="py-6" style="max-width: 650px;">
    <v-row>
      <v-col cols="12" v-for="(post, index) in posts" :key="post.$id">

        <v-card class="mb-4 rounded-xl" variant="outlined">

          <!-- Yazar -->
          <v-card-title class="d-flex align-center py-3">
            
            <!-- Avatar -->
            <v-avatar size="42">
              <v-img
                v-if="post.authorAvatarUrl"
                :src="post.authorAvatarUrl"
                cover
              ></v-img>
              <v-img
                v-else
                :src="getUserAvatar(post.authorUsername)"
              ></v-img>
            </v-avatar>
            
            <div class="ml-3">
              <strong>{{ post.authorUsername }}</strong>
              <span class="text-grey text-caption"> · {{ formatTime(post.$createdAt) }}</span>
              <div v-if="post.location" class="text-caption text-grey">
                <v-icon size="14">mdi-map-marker</v-icon>
                {{ post.location }}
              </div>
            </div>

            <!-- Admin/Kullanıcı Kontrolleri -->
            <div v-if="isAdmin || post.authorId === currentUser?.$id" class="ml-auto d-flex">
              <v-btn v-if="post.authorId === currentUser?.$id" icon size="small" @click="editPost(post)">
                <v-icon size="small">mdi-pencil</v-icon>
              </v-btn>
              <v-btn icon size="small" color="red-darken-1" @click="deletePost(post)">
                <v-icon size="small">mdi-delete</v-icon>
              </v-btn>
            </div>
            
          </v-card-title>

          <!-- Metin -->
          <v-card-text v-if="post.text" class="pb-0 text-body-1">
            {{ post.text }}
          </v-card-text>

          <!-- Medya (Video/Ses/Resim) -->
          <div 
            class="media-wrapper" 
            @dblclick="handleDoubleClickLike(post, index)"
          >
            <!-- Patlayan Kalp Animasyonu -->
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
              style="
                max-height: 420px;
                width: 100%;
                object-fit: contain;
                background: #111;
                cursor: pointer;
              "
            />
             <video
              v-else-if="post.postType === 'video'"
              :src="post.mediaUrl"
              controls
              class="my-3"
              style="width: 100%; height: auto; max-height: 420px; cursor: pointer;"
              @dblclick="handleDoubleClickLike(post, index)"
            ></video>
             <audio
              v-else-if="post.postType === 'audio'"
              :src="post.mediaUrl"
              controls
              class="my-3"
              style="width: 100%;"
            ></audio>
          </div>

          <!-- Like Butonu ve Beğenenler -->
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

            <!-- Yorum Sayacı -->
            <v-btn variant="text" icon disabled>
              <v-icon size="26">mdi-chat-outline</v-icon>
              <span class="ml-1 text-body-2">{{ post.comments.length }}</span>
            </v-btn>

          </v-card-actions>
          
          <!-- YORUM BÖLÜMÜ -->
          <v-divider></v-divider>
          
          <div class="px-4 py-2">
            <div v-if="post.comments.length === 0" class="text-caption text-grey">
              Henüz yorum yok. İlk yorumu yapın!
            </div>
            
            <div v-for="comment in post.comments" :key="comment.$id" class="mb-1">
              <span class="font-weight-bold text-body-2">{{ comment.authorUsername }}</span>
              <span class="text-body-2"> {{ comment.text }}</span>
            </div>
          </div>

          <!-- Yorum Ekleme Formu -->
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
import { useAuthStore } from '@/stores/auth' 
import { databases, account, avatars, Query, client, ID, storage } from '@/plugins/appwrite'

const posts = ref([])
let currentUser = null
let unsubscribePosts = null 
let unsubscribeComments = null 

const authStore = useAuthStore() 
const isAdmin = ref(false)

const poppingHeartRefs = ref([])
const setPoppingHeartRef = (el, index) => {
  if (el) {
    poppingHeartRefs.value[index] = el
  }
}

const newCommentText = ref({})

// Admin kontrol fonksiyonu
const checkAdminStatus = async () => {
  try {
    if (!currentUser) return
    
    const userDetails = await databases.getDocument(
      'main', 
      'users', 
      currentUser.$id
    )
    isAdmin.value = userDetails.isAdmin === true
    console.log('Admin durumu:', isAdmin.value, 'Kullanıcı ID:', currentUser.$id)
  } catch (error) {
    console.error('Admin kontrol hatası:', error)
    isAdmin.value = false
  }
}

// Gelen 'post' belgesini işler (map eder)
const mapPostDocument = (doc, user) => {
  return {
    ...doc,
    likes: doc.likes || [],
    likeUsernames: doc.likeUsernames || [],
    likesCount: doc.likesCount || 0,
    isLiked: user ? doc.likes.includes(user.$id) : false,
    comments: doc.comments || [], 
  }
}

const mapCommentDocument = (doc) => {
  return { ...doc }
}

// Silme fonksiyonu
const deletePost = async (post) => {
  if (!confirm("Bu gönderiyi kalıcı olarak silmek istediğine emin misin?")) return
  
  try {
    // Önce kullanıcının bu gönderiyi silmeye yetkisi olup olmadığını kontrol et
    const canDelete = isAdmin.value || post.authorId === currentUser?.$id
    
    if (!canDelete) {
      alert('Bu gönderiyi silme yetkiniz yok!')
      return
    }
    
    console.log('Silme yetkisi var. Gönderi siliniyor...', post.$id)
    
    // 1. Veritabanından belgeyi (document) sil
    await databases.deleteDocument("main", "posts", post.$id)
    console.log('Veritabanı belgesi silindi:', post.$id)
    
    // 2. Eğer medya (resim/video) varsa, onu da Storage'dan sil
    if (post.mediaUrl && post.postType !== 'text') {
      const urlParts = post.mediaUrl.split('/')
      const fileId = urlParts[urlParts.length - 2]
      
      if (fileId) {
        await storage.deleteFile('posts', fileId)
        console.log('Storage dosyası silindi:', fileId)
      }
    }
    
  } catch (err) {
    console.error("Gönderi silme hatası:", err)
    
    if (err.code === 401) {
      alert('Bu işlem için yetkiniz yok! Lütfen admin ile iletişime geçin.')
    } else {
      alert("Hata (Silme): " + err.message)
    }
  }
}

// Düzenleme fonksiyonu
const editPost = async (post) => {
  // Sadece kendi gönderilerini düzenleyebilsin
  if (post.authorId !== currentUser?.$id) {
    alert('Sadece kendi gönderilerinizi düzenleyebilirsiniz!')
    return
  }
  
  const newText = prompt("Yeni metni girin:", post.text)
  
  if (newText !== null) { 
    try {
      await databases.updateDocument("main", "posts", post.$id, { text: newText })
    } catch (err) {
      console.error("Gönderi güncelleme hatası:", err)
      alert("Hata (Güncelleme): " + err.message)
    }
  }
}

// Ana Yükleme ve Realtime
const subscribeToContent = async () => {
  try {
    currentUser = await account.get().catch(() => null)
    
    // Admin kontrolünü yap
    if (currentUser) {
      await checkAdminStatus()
    }
    
    // 1. Tüm Gönderileri Yükle
    const postsRes = await databases.listDocuments('main', 'posts', [
      Query.orderDesc('$createdAt')
    ])
    
    // 2. Tüm Yorumları Yükle
    const commentsRes = await databases.listDocuments('main', 'comments', [
      Query.orderAsc('$createdAt')
    ])
    const allComments = commentsRes.documents.map(mapCommentDocument)

    // 3. Gönderileri ve Yorumları Birleştir
    posts.value = postsRes.documents.map(doc => {
      const mappedPost = mapPostDocument(doc, currentUser)
      mappedPost.comments = allComments.filter(comment => comment.postId === doc.$id)
      return mappedPost
    })
    console.log('İlk gönderiler ve yorumlar yüklendi.')

    // 4. Gönderilere Abone Ol (Realtime)
    const dbId = 'main'
    
    unsubscribePosts = client.subscribe(
      `databases.${dbId}.collections.posts.documents`, 
      (response) => {
        console.log('Realtime POST olayı geldi:', response.events[0])
        
        const event = response.events[0]
        const doc = response.payload
        const updatedPost = mapPostDocument(doc, currentUser)
        
        if (event.includes('create')) {
          updatedPost.comments = []
          posts.value.unshift(updatedPost)
        }
        else if (event.includes('update')) {
          const index = posts.value.findIndex(p => p.$id === updatedPost.$id)
          if (index !== -1) {
            updatedPost.comments = posts.value[index].comments
            posts.value[index] = updatedPost
          }
        }
        else if (event.includes('delete')) {
          posts.value = posts.value.filter(p => p.$id !== updatedPost.$id)
        }
      }
    )
    
    // 5. Yorumlara Abone Ol (Realtime)
    unsubscribeComments = client.subscribe(
      `databases.${dbId}.collections.comments.documents`,
      (response) => {
        console.log('Realtime COMMENT olayı geldi:', response.events[0])
        
        if (response.events[0].includes('create')) {
          const newComment = mapCommentDocument(response.payload)
          const post = posts.value.find(p => p.$id === newComment.postId)
          if (post) {
            post.comments.push(newComment)
          }
        }
      }
    )
    
    console.log('Realtime abonelikleri başlatıldı.')
  } catch (error) {
    console.error('İçerik yükleme hatası:', error)
  }
}

// Yorum Gönderme
const handleCommentSubmit = async (post) => {
  if (!currentUser) return alert("Yorum yapmak için giriş yapmalısınız.")
  
  const text = newCommentText.value[post.$id]
  if (!text || text.trim() === '') return 

  try {
    await databases.createDocument(
      'main',
      'comments',
      ID.unique(),
      {
        postId: post.$id, 
        authorUsername: currentUser.name || 'Anonim',
        text: text
      }
    )
    newCommentText.value[post.$id] = ''
  } catch (err) {
    console.error("Yorum gönderme hatası:", err.message)
    alert("Yorumunuz gönderilirken bir hata oluştu.")
  }
}

// Beğen (Like) Aç/Kapa
const toggleLike = async (post) => {
  if (!currentUser) return alert("Giriş yapman gerekiyor.")

  const userId = currentUser.$id
  const username = currentUser.name || 'Anonim'
  let likes = [...(post.likes || [])]
  let names = [...(post.likeUsernames || [])]
  
  if (post.isLiked) {
    likes = likes.filter(id => id !== userId)
    names = names.filter(n => n !== username)
    post.isLiked = false
    post.likesCount--
  } else {
    likes.push(userId)
    names.push(username)
    post.isLiked = true
    post.likesCount++
  }
  
  post.likes = likes
  post.likeUsernames = names

  try {
    await databases.updateDocument('main', 'posts', post.$id, {
      likes: likes,
      likeUsernames: names,
      likesCount: likes.length
    })
  } catch (err) {
    console.error("Like hatası:", err.message)
  }
}

// Çift Tıklama (DoubleClick) ile Beğenme
const handleDoubleClickLike = (post, index) => {
  const heartEl = poppingHeartRefs.value[index]
  if (heartEl && heartEl.$el) {
    heartEl.$el.classList.add('popping')
    setTimeout(() => {
      heartEl.$el.classList.remove('popping')
    }, 1000) 
  }
  if (!post.isLiked) {
    toggleLike(post)
  }
}

// Avatar
const getUserAvatar = (name) => {
  try {
    return avatars.getInitials(name || '?')
  } catch (e) {
    return avatars.getInitials('?')
  }
}

// Zaman
const formatTime = (timestamp) => {
  const diff = (Date.now() - new Date(timestamp)) / 1000
  if (diff < 60) return "Az önce"
  if (diff < 3600) return Math.floor(diff / 60) + " dk önce"
  if (diff < 86400) return Math.floor(diff / 3600) + " saat önce"
  return Math.floor(diff / 86400) + " gün önce"
}

// Yaşam Döngüsü (Lifecycle)
onMounted(() => {
  subscribeToContent()
})

onUnmounted(() => {
  if (unsubscribePosts) {
    unsubscribePosts() 
    console.log('Gönderi aboneliği sonlandırıldı.')
  }
  if (unsubscribeComments) {
    unsubscribeComments()
    console.log('Yorum aboneliği sonlandırıldı.')
  }
})
</script>

<style scoped>
.media-wrapper {
  position: relative;
  overflow: hidden; 
}

.like-heart-animation {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  opacity: 0;
  z-index: 10;
  pointer-events: none; 
}

.like-heart-animation.popping {
  animation: pop 1s ease-out;
}

@keyframes pop {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0.9;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.8);
    opacity: 0;
  }
}

.text-grey { 
  color: #777; 
}

.v-card-text .v-text-field {
  padding-top: 4px;
}
</style>