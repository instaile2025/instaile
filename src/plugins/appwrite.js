// Appwrite SDK'sından (kütüphanesinden) gerekli her şeyi import et
// YENİ: 'Query' eklendi
import { Client, Account, Databases, Storage, ID, Permission, Role, Avatars, Query } from 'appwrite'

// .env dosyamızdaki VITE_ değişkenlerini al
const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID

// Yeni bir Appwrite istemcisi (client) oluştur
const client = new Client()

// İstemciyi yapılandır (configure)
client
    .setEndpoint(endpoint)      // API Uç Noktası
    .setProject(projectId);     // Proje ID'si

// === DIŞA AKTARMA (EXPORTS) ===
// Projemizin başka yerlerinde kullanmak için
// Appwrite servislerini ve araçlarını dışa aktar

// 0. Ana İstemci (Realtime için GEREKLİ)
export { client } 

// 1. Servisler (Auth, DB, Storage)
export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)
export const avatars = new Avatars(client) 

// 2. Araçlar (ID, Permission, Role)
// YENİ: 'Query' eklendi
export { ID, Permission, Role, Query }