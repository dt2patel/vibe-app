<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/users" />
        </ion-buttons>
        <ion-title>{{ otherUser?.email || 'Chat' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list>
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
  IonBackButton,
  IonButtons
} from '@ionic/vue'
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
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
import { onAuthStateChanged } from 'firebase/auth'

const route = useRoute()
const otherUid = route.params.uid as string
const currentUid = ref(auth.currentUser?.uid || '')
const otherUser = ref<any | null>(null)
const newMessage = ref('')
const messages = ref<any[]>([])

const chatId = computed(() => [currentUid.value, otherUid].sort().join('_'))

let unsubMessages: (() => void) | null = null

async function startListener() {
  if (unsubMessages) unsubMessages()
  const q = query(collection(db, 'messages'), where('chatId', '==', chatId.value))
  unsubMessages = onSnapshot(q, (snapshot) => {
    messages.value = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aTime = (a as any).createdAt?.seconds || 0
        const bTime = (b as any).createdAt?.seconds || 0
        return aTime - bTime
      }) as any[]
  })
}

onMounted(async () => {
  const userSnap = await getDoc(doc(db, 'users', otherUid))
  if (userSnap.exists()) {
    otherUser.value = userSnap.data()
  }

  if (currentUid.value) {
    startListener()
  } else {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUid.value = user.uid
        startListener()
        unsubAuth()
      }
    })
  }
})

watch(currentUid, (uid) => {
  if (uid) startListener()
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
</script>
