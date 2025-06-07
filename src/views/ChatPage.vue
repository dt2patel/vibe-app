<template>
  <ion-page>
    <user-header :title="otherUser?.email || 'Chat'" back-href="/users" />
    <ion-content class="ion-padding">
      <ion-list>
        <ion-item
          v-for="msg in messages"
          :key="msg.id"
          lines="none"
          class="message"
          :class="{ mine: msg.from === currentUid }"
        >
          <ion-label>
            <div class="bubble">
              <strong>{{ msg.from === currentUid ? 'Me' : otherUser?.email }}</strong>
              <div>{{ msg.text }}</div>
            </div>
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
  IonContent,
  IonItem,
  IonInput,
  IonButton,
  IonList,
  IonLabel
} from '@ionic/vue'
import UserHeader from '@/components/UserHeader.vue'
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

<style scoped>
.message {
  --inner-padding-end: 0;
}

.bubble {
  background: var(--ion-color-light);
  border-radius: 8px;
  padding: 8px;
}

.message.mine .bubble {
  background: var(--ion-color-primary);
  color: white;
}
</style>
