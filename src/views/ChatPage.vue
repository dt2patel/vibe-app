<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/users" />
        </ion-buttons>
        <ion-title>{{ otherUser?.email || 'Chat' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="logout">
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
      <ion-list v-if="loadingMessages">
        <ion-item v-for="n in 5" :key="n">
          <ion-label>
            <ion-skeleton-text animated style="width: 100%" />
          </ion-label>
        </ion-item>
      </ion-list>
      <ion-list v-else>
        <ion-item v-for="msg in messages" :key="msg.id">
          <ion-label>
            <div>
              <strong>{{ msg.from === currentUid ? 'Me' : otherUser?.email }}</strong>
            </div>
            <div>{{ msg.text }}</div>
          </ion-label>
        </ion-item>
      </ion-list>
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
  IonSkeletonText
} from '@ionic/vue'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { auth, db } from '@/firebase'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  type Timestamp
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useAuth } from '@/store/auth'
import { logOutOutline } from 'ionicons/icons'

const route = useRoute()
const router = useRouter()
const otherUid = route.params.uid as string
const { currentUser } = useAuth()
const currentUid = ref(currentUser.value?.uid || '')
watch(currentUser, (user) => {
  currentUid.value = user?.uid || ''
})
interface ChatUser { uid: string; email: string }
interface ChatMessage {
  id: string
  chatId: string
  from: string
  to: string
  text: string
  createdAt?: Timestamp
}

const otherUser = ref<ChatUser | null>(null)
const newMessage = ref('')
const messages = ref<ChatMessage[]>([])
const loadingMessages = ref(true)
const loadingUser = ref(true)
const errorMessage = ref<string | null>(null)

const chatId = computed(() => [currentUid.value, otherUid].sort().join('_'))

let unsubMessages: (() => void) | null = null

async function startListener() {
  if (unsubMessages) unsubMessages()
  loadingMessages.value = true
  errorMessage.value = null
  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', chatId.value),
    orderBy('createdAt')
  )
  unsubMessages = onSnapshot(q, {
    next: (snapshot) => {
      messages.value = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChatMessage, 'id'>)
      }))
      loadingMessages.value = false
    },
    error: (err) => {
      console.error('Error fetching chat messages', err)
      errorMessage.value = 'Error loading chat messages'
      loadingMessages.value = false
    }
  })
}

onMounted(async () => {
  try {
    const userSnap = await getDoc(doc(db, 'users', otherUid))
    if (userSnap.exists()) {
      otherUser.value = userSnap.data() as ChatUser
    }
  } catch (err) {
    console.error('Failed to load chat user', err)
    errorMessage.value = 'Error loading chat user'
  } finally {
    loadingUser.value = false
  }

  if (currentUid.value) {
    startListener()
  }
})

watch(currentUid, (uid) => {
  if (uid) {
    startListener()
  } else if (unsubMessages) {
    unsubMessages()
    unsubMessages = null
  }
})

onUnmounted(() => {
  if (unsubMessages) unsubMessages()
})

async function logout() {
  await signOut(auth)
  router.replace('/auth')
}

async function sendMessage() {
  if (!newMessage.value.trim()) return
  await addDoc(collection(db, 'messages'), {
    chatId: chatId.value,
    from: currentUid.value,
    to: otherUid,
    text: newMessage.value,
    createdAt: serverTimestamp()
  })
  newMessage.value = ''
}
</script>
