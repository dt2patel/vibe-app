<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Users</ion-title>
        
      </ion-toolbar>
    </ion-header>
  <ion-content class="ion-padding">
      <ion-list v-if="loading">
        <ion-item v-for="n in 5" :key="n">
          <ion-skeleton-text animated style="width: 100%" />
        </ion-item>
      </ion-list>
      <ion-list v-else>
        <ion-item
          v-for="user in users"
          :key="user.uid"
          button
          @click="openChat(user.uid)"
        >
          <ion-label class="ion-text-wrap">
            <h2>{{ user.email }}</h2>
            <p v-if="lastMessages[user.uid]">{{ lastMessages[user.uid] }}</p>
          </ion-label>
          <ion-badge slot="end" v-if="unread.has(user.uid)">1</ion-badge>
        </ion-item>
      </ion-list>
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
  IonList,
  IonItem,
  IonSkeletonText,
  IonLabel,
  IonBadge,
  IonToast
} from '@ionic/vue'
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { listenToForegroundMessages } from '@/hooks/useNotifications'

const router = useRouter()
const users = ref<any[]>([])
const loading = ref(true)
const lastMessages = reactive<Record<string, string>>({})
const unread = reactive<Set<string>>(new Set())
const toastOpen = ref(false)
const toastMessage = ref('')

async function loadUsers() {
  loading.value = true
  const snapshot = await getDocs(collection(db, 'users'))
  const currentUid = auth.currentUser?.uid
  users.value = snapshot.docs
    .map((d) => d.data())
    .filter((u) => u.uid !== currentUid)
  loading.value = false
}

function openChat(uid: string) {
  router.push(`/chat/${uid}`)
  unread.delete(uid)
}

function showToast(msg: string) {
  toastMessage.value = msg
  toastOpen.value = true
}

let unsub: (() => void) | null = null

onMounted(() => {
  loadUsers()
  unsub = listenToForegroundMessages((payload: any) => {
    const from = payload.data?.from
    const text = payload.data?.text
    const sender = payload.data?.senderName
    if (from && text) {
      lastMessages[from] = text
      unread.add(from)
      showToast(`${sender || 'New message'}: ${text}`)
    }
  })
})

onUnmounted(() => {
  if (unsub) unsub()
})
</script>

