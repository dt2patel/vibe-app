<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/users" />
        </ion-buttons>
        <ion-title>{{ otherUser?.email || 'Chat' }}</ion-title>
        <ion-buttons slot="end">
          <ion-spinner v-if="loadingMessages" name="crescent" />
          <ion-button v-else @click="logout">
            <ion-icon :icon="logOutOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-loading :is-open="loadingUser" message="Loading chat..." />
      <ion-text color="danger" v-if="errorMessage" class="ion-padding">
        <p>{{ errorMessage }}</p>
      </ion-text>
      <ion-list>
        <ion-item-sliding v-for="msg in messages" :key="msg.id">
          <ion-item>
            <ion-label>
              <div>
                <strong>{{ msg.from === currentUid ? 'Me' : otherUser?.email }}</strong>
              </div>
              <div>{{ msg.text }}</div>
            </ion-label>
            <ion-icon v-if="confirmIds.has(msg.serverId || msg.id)" :icon="checkmarkDoneOutline" slot="end" />
            <ion-icon v-else-if="msg.status === 'queued'" :icon="timeOutline" slot="end" />
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
      <div class="offline-chip" v-if="!isOnline">
        <ion-chip color="medium">Offline</ion-chip>
      </div>
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
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonChip,
  IonSpinner
} from '@ionic/vue'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
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
  checkmarkDoneOutline,
  timeOutline
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
const messages = ref<any[]>([])
const storedMessages = ref<any[]>([])
const queuedMessages = ref<any[]>([])
const confirmIds = ref<Set<string>>(new Set())
const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
const loadingMessages = ref(true)
const loadingUser = ref(true)
const errorMessage = ref<string | null>(null)

const chatId = computed(() => [currentUid.value, otherUid].sort().join('_'))
const cacheKey = computed(() => `chat_cache_${chatId.value}`)
const queuedKey = computed(() => `chat_queue_${chatId.value}`)

let unsubMessages: (() => void) | null = null
let fromMessages: any[] = []
let toMessages: any[] = []

function handleOnline() {
  isOnline.value = true
  startListener()
  flushQueue()
}

function handleOffline() {
  isOnline.value = false
  if (unsubMessages) {
    unsubMessages()
    unsubMessages = null
  }
}

function persistQueue() {
  localStorage.setItem(queuedKey.value, JSON.stringify(queuedMessages.value))
}

async function flushQueue() {
  if (!queuedMessages.value.length) return
  for (const q of queuedMessages.value) {
    if (q.pending === false) continue
    try {
      const docRef = await addDoc(collection(db, 'messages'), {
        chatId: q.chatId,
        from: q.from,
        to: q.to,
        text: q.text,
        createdAt: serverTimestamp()
      })
      q.serverId = docRef.id
      q.pending = false
      confirmIds.value.add(docRef.id)
      setTimeout(() => confirmIds.value.delete(docRef.id), 3000)
    } catch (err) {
      console.error('Failed to send queued message', err)
      break
    }
  }
  persistQueue()
  mergeMessages()
}

function mergeMessages() {
  const all = [...storedMessages.value, ...queuedMessages.value]
  all.sort((a: any, b: any) => {
    if (a.status === 'queued' && b.status !== 'queued') return 1
    if (b.status === 'queued' && a.status !== 'queued') return -1
    const aTime = a.createdAt?.seconds || new Date(a.createdAt).getTime() / 1000 || 0
    const bTime = b.createdAt?.seconds || new Date(b.createdAt).getTime() / 1000 || 0
    return aTime - bTime
  })
  messages.value = all
  loadingMessages.value = false
}

function updateStored() {
  storedMessages.value = [...fromMessages, ...toMessages].sort((a, b) => {
    const aTime = (a as any).createdAt?.seconds || 0
    const bTime = (b as any).createdAt?.seconds || 0
    return aTime - bTime
  }) as any[]
  localStorage.setItem(cacheKey.value, JSON.stringify(storedMessages.value))
  queuedMessages.value = queuedMessages.value.filter((q) => {
    const serverMatch = q.serverId && storedMessages.value.some((s) => s.id === q.serverId)
    const localMatch = storedMessages.value.some((s) => s.id === q.id)
    return !(serverMatch || localMatch)
  })
  persistQueue()
  mergeMessages()
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

  const onSnapshotError = (err: unknown) => {
    console.error('Firestore onSnapshot error', err)
    loadingMessages.value = false
    errorMessage.value = 'Failed to load messages'
  }

  const unsubSent = onSnapshot(
    sentQ,
    (snapshot) => {
      fromMessages = snapshot.docs
        .filter((d) => !d.metadata.hasPendingWrites)
        .map((d) => ({ id: d.id, ...d.data() }))
      updateStored()
    },
    onSnapshotError
  )
  const unsubReceived = onSnapshot(
    receivedQ,
    (snapshot) => {
      toMessages = snapshot.docs
        .filter((d) => !d.metadata.hasPendingWrites)
        .map((d) => ({ id: d.id, ...d.data() }))
      updateStored()
    },
    onSnapshotError
  )
  unsubMessages = () => {
    unsubSent()
    unsubReceived()
  }
}

onMounted(async () => {
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  const cached = localStorage.getItem(cacheKey.value)
  if (cached) {
    try {
      storedMessages.value = JSON.parse(cached)
    } catch (e) {
      console.warn('Failed to parse cached messages', e)
    }
  }

  const cachedQueue = localStorage.getItem(queuedKey.value)
  if (cachedQueue) {
    try {
      queuedMessages.value = JSON.parse(cachedQueue)
    } catch (e) {
      console.warn('Failed to parse queued messages', e)
    }
  }
  mergeMessages()

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

  if (currentUid.value && isOnline.value) {
    startListener()
  }
})

watch(currentUid, (uid) => {
  if (uid) {
    if (isOnline.value) startListener()
  } else if (unsubMessages) {
    unsubMessages()
    unsubMessages = null
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
  const temp = {
    id: `local_${Date.now()}`,
    chatId: chatId.value,
    from: currentUid.value,
    to: otherUid,
    text,
    createdAt: new Date(),
    status: 'queued',
    pending: true,
    serverId: undefined
  }
  queuedMessages.value.push(temp)
  persistQueue()
  mergeMessages()
  if (isOnline.value) {
    flushQueue()
  }
}

function formatTime(ts: any) {
  if (!ts) return ''
  const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts)
  return date.toLocaleTimeString()
}
</script>

<style scoped>
.offline-chip {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}
</style>
