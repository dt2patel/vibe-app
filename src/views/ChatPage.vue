<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/users" />
        </ion-buttons>
        <ion-title>{{ otherUser?.email || 'Chat' }}</ion-title>
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
      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        @didDismiss="toastOpen = false"
        position="top"
      />
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
  IonSkeletonText,
  IonToast
} from '@ionic/vue'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { db } from '@/firebase'
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
import { useAuth } from '@/store/auth'
import { listenToForegroundMessages } from '@/hooks/useNotifications'

const route = useRoute()
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
const toastOpen = ref(false)
const toastMessage = ref('')

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

  const onSnapshotError = (err: unknown) => {
    console.error('Firestore onSnapshot error', err)
    loadingMessages.value = false
    errorMessage.value = 'Failed to load messages'
  }

  const unsubSent = onSnapshot(
    sentQ,
    (snapshot) => {
      fromMessages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      updateCombined()
    },
    onSnapshotError
  )
  const unsubReceived = onSnapshot(
    receivedQ,
    (snapshot) => {
      toMessages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      updateCombined()
    },
    onSnapshotError
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
  listenToForegroundMessages((payload: any) => {
    const from = payload.data?.from
    const text = payload.data?.text
    const sender = payload.data?.senderName
    if (from && from !== otherUid && text) {
      showToast(`${sender || 'New message'}: ${text}`)
    }
  })
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

function showToast(msg: string) {
  toastMessage.value = msg
  toastOpen.value = true
}
</script>
