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
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc
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
const otherUser = ref<any | null>(null)
const newMessage = ref('')
const messages = ref<any[]>([])
const loadingMessages = ref(true)
const loadingUser = ref(true)
const errorMessage = ref<string | null>(null)

const chatId = computed(() => [currentUid.value, otherUid].sort().join('_'))

let unsubMessages: (() => void) | null = null
let fromMessages: any[] = []
let toMessages: any[] = []

function updateCombined() {
  messages.value = [...fromMessages, ...toMessages]
    .sort((a, b) => {
      const aTime = (a as any).createdAt?.seconds || 0
      const bTime = (b as any).createdAt?.seconds || 0
      return aTime - bTime
    }) as any[]
  loadingMessages.value = false
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
        fromMessages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
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
        toMessages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
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
