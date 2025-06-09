<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/users" />
        </ion-buttons>
        <ion-title>{{ otherUser?.email || 'Chat' }}</ion-title>
        <ion-buttons slot="end">
          <ion-spinner v-if="loadingMessages" />
          <ion-button v-else @click="logout">
            <ion-icon :icon="logOutOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-text color="danger" v-if="errorMessage" class="ion-padding">
        <p>{{ errorMessage }}</p>
      </ion-text>
      <ion-list v-if="initialLoading">
        <ion-item v-for="n in 5" :key="n">
          <ion-label>
            <ion-skeleton-text animated style="width: 100%" />
          </ion-label>
        </ion-item>
      </ion-list>
      <ion-list v-else>
        <ion-item-sliding v-for="msg in messages" :key="msg.id">
          <ion-item>
            <ion-label>
              <div>
                <strong>{{ msg.from === currentUid ? 'Me' : otherUser?.email }}</strong>
                <ion-icon
                  :icon="timeOutline"
                  v-if="syncStatus[msg.id]?.pending"
                  class="status-icon"
                />
                <ion-icon
                  :icon="checkmarkCircleOutline"
                  v-if="syncStatus[msg.id]?.showConfirm"
                  class="status-icon"
                />
              </div>
              <div>{{ msg.text }}</div>
            </ion-label>
          </ion-item>
          <ion-item-options side="end">
            <ion-item-option color="light">
              {{ formatTime(msg.createdAt) }}
            </ion-item-option>
          </ion-item-options>
        </ion-item-sliding>
        <ion-item v-if="loadingMessages">
          <ion-label>
            <ion-skeleton-text animated style="width: 100%" />
          </ion-label>
        </ion-item>
      </ion-list>
      <ion-chip color="warning" v-if="isOffline" class="offline-chip">
        Offline - messages will sync when online
      </ion-chip>
      <form @submit.prevent="sendMessage" class="ion-margin-top">
        <ion-item>
          <ion-input v-model="newMessage" placeholder="Type a message"></ion-input>
        </ion-item>
        <ion-button expand="block" type="submit" class="ion-margin-top">Send</ion-button>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonList,
  IonLabel,
  IonText,
  IonBackButton,
  IonButtons,
  IonIcon,
  IonSkeletonText,
  IonChip,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonSpinner
} from '@ionic/vue'
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth, db } from '@/firebase'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useAuth } from '@/store/auth'
import {
  logOutOutline,
  timeOutline,
  checkmarkCircleOutline
} from 'ionicons/icons'

const route = useRoute()
const router = useRouter()
const otherUid = route.params.uid as string
const { currentUser } = useAuth()
const currentUid = ref(currentUser.value?.uid || '')
watch(currentUser, (user) => {
  currentUid.value = user?.uid || ''
})
const otherUser = ref<any | null>(null)
const newMessage = ref('')
const storedMessages = ref<any[]>([])
const queuedMessages = ref<any[]>([])
const messages = computed(() => {
  const stored = [...storedMessages.value].sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0
    const bTime = b.createdAt?.seconds || 0
    return aTime - bTime
  })
  const queued = [...queuedMessages.value].sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0
    const bTime = b.createdAt?.seconds || 0
    return aTime - bTime
  })
  return [...stored, ...queued]
})
const loadingMessages = ref(true)
const loadingUser = ref(true)
const errorMessage = ref<string | null>(null)
const initialLoading = computed(
  () => loadingMessages.value && messages.value.length === 0
)
const isOffline = ref(!navigator.onLine)

function handleOnline() {
  isOffline.value = false
  if (!unsubMessages && currentUid.value) {
    startListener()
  }
}
function handleOffline() {
  isOffline.value = true
}

window.addEventListener('online', handleOnline)
window.addEventListener('offline', handleOffline)

interface SyncState {
  pending: boolean
  showConfirm: boolean
}
const syncStatus = reactive<Record<string, SyncState>>({})

const chatId = computed(() => [currentUid.value, otherUid].sort().join('_'))

let unsubMessages: (() => void) | null = null
let fromMessages: any[] = []
let toMessages: any[] = []

function cacheKey(id: string) {
  return `chat_${id}`
}

function saveCache() {
  const key = cacheKey(chatId.value)
  const data = [
    ...storedMessages.value,
    ...queuedMessages.value.map((m) => ({ ...m, status: 'queued' }))
  ]
  localStorage.setItem(key, JSON.stringify(data))
}

function loadCache() {
  const raw = localStorage.getItem(cacheKey(chatId.value))
  if (raw) {
    try {
      const arr = JSON.parse(raw)
      storedMessages.value = arr.filter((m: any) => m.status !== 'queued')
      queuedMessages.value = arr
        .filter((m: any) => m.status === 'queued')
        .map((m: any) => ({ ...m, status: undefined }))
    } catch (err) {
      console.warn('Failed to parse chat cache', err)
    }
  }
}

watch(storedMessages, saveCache, { deep: true })
watch(queuedMessages, saveCache, { deep: true })

function updateCombined() {
  storedMessages.value = [...fromMessages, ...toMessages].sort((a, b) => {
    const aTime = (a as any).createdAt?.seconds || 0
    const bTime = (b as any).createdAt?.seconds || 0
    return aTime - bTime
  }) as any[]
  loadingMessages.value = false
  saveCache()
}

async function startListener() {
  if (unsubMessages) unsubMessages()
  loadingMessages.value = true
  errorMessage.value = null
  fromMessages = []
  toMessages = []
  const sentQ = query(
    collection(db, 'messages'),
    where('from', '==', currentUid.value),
    where('to', '==', otherUid)
  )
  const receivedQ = query(
    collection(db, 'messages'),
    where('from', '==', otherUid),
    where('to', '==', currentUid.value)
  )

  const unsubSent = onSnapshot(
    sentQ,
    {
      next: (snapshot) => {
        fromMessages = []
        snapshot.docs.forEach((d) => {
          const data = { id: d.id, ...d.data() }
          const status =
            syncStatus[data.id] || { pending: false, showConfirm: false }
          if (d.metadata && d.metadata.hasPendingWrites) {
            status.pending = true
            const idx = queuedMessages.value.findIndex((m) => m.id === data.id)
            if (idx === -1) queuedMessages.value.push(data)
            else queuedMessages.value[idx] = data
          } else {
            fromMessages.push(data)
            const qIdx = queuedMessages.value.findIndex((m) => m.id === data.id)
            if (qIdx !== -1) {
              queuedMessages.value.splice(qIdx, 1)
              status.pending = false
              status.showConfirm = true
              setTimeout(() => (status.showConfirm = false), 3000)
            }
          }
          syncStatus[data.id] = status
        })
        updateCombined()
      },
      error: (err) => {
        console.error('Error fetching sent messages', err)
        errorMessage.value = 'Error loading chat messages'
        loadingMessages.value = false
      }
    }
  )
  const unsubReceived = onSnapshot(
    receivedQ,
    {
      next: (snapshot) => {
        toMessages = []
        snapshot.docs.forEach((d) => {
          const data = { id: d.id, ...d.data() }
          syncStatus[data.id] = syncStatus[data.id] || { pending: false, showConfirm: false }
          toMessages.push(data)
          const qIdx = queuedMessages.value.findIndex((m) => m.id === data.id)
          if (qIdx !== -1) queuedMessages.value.splice(qIdx, 1)
        })
        updateCombined()
      },
      error: (err) => {
        console.error('Error fetching received messages', err)
        errorMessage.value = 'Error loading chat messages'
        loadingMessages.value = false
      }
    }
  )
  unsubMessages = () => {
    unsubSent()
    unsubReceived()
  }
}

onMounted(async () => {
  loadCache()
  try {
    const userSnap = await getDoc(doc(db, 'users', otherUid))
    if (userSnap.exists()) {
      otherUser.value = userSnap.data()
    }
  } catch (err) {
    console.error('Failed to load chat user', err)
    errorMessage.value = 'Error loading chat user'
  } finally {
    loadingUser.value = false
  }

  if (currentUid.value && navigator.onLine) {
    startListener()
  }
})

watch(currentUid, (uid) => {
  if (uid && navigator.onLine) {
    startListener()
  } else if (unsubMessages) {
    unsubMessages()
    unsubMessages = null
  }
})

watch(isOffline, (offline) => {
  if (!offline && currentUid.value && !unsubMessages) {
    startListener()
  }
})

onUnmounted(() => {
  if (unsubMessages) unsubMessages()
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})

async function logout() {
  await signOut(auth)
  router.replace('/auth')
}

async function sendMessage() {
  if (!newMessage.value.trim()) return
  const text = newMessage.value
  newMessage.value = ''
  const ref = await addDoc(collection(db, 'messages'), {
    chatId: chatId.value,
    from: currentUid.value,
    to: otherUid,
    text,
    createdAt: serverTimestamp()
  })
  queuedMessages.value.push({
    id: ref.id,
    chatId: chatId.value,
    from: currentUid.value,
    to: otherUid,
    text,
    createdAt: { seconds: Math.floor(Date.now() / 1000) }
  })
  syncStatus[ref.id] = { pending: true, showConfirm: false }
  saveCache()
}

function formatTime(ts: any) {
  if (!ts?.seconds) return ''
  const date = new Date(ts.seconds * 1000)
  return date.toLocaleTimeString()
}
</script>
