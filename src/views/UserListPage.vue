<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Users</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="logout">
            <ion-icon :icon="logOutOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-list>
        <ion-item
          v-for="user in users"
          :key="user.uid"
          button
          @click="openChat(user.uid)"
        >
          {{ user.email }}
        </ion-item>
      </ion-list>
    </ion-content>
    <ion-toast
      :is-open="showPushToast"
      message="Push notifications?"
      position="bottom"
      :duration="15000"
      :buttons="[
        {
          text: 'Enable',
          handler: enablePush
        }
      ]"
      @didDismiss="showPushToast = false"
    />
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
  IonButtons,
  IonButton,
  IonIcon,
  IonToast
} from '@ionic/vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db, messaging } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { getToken } from 'firebase/messaging'
import { logOutOutline } from 'ionicons/icons'

const router = useRouter()
const users = ref<any[]>([])
const showPushToast = ref(false)

async function loadUsers() {
  const snapshot = await getDocs(collection(db, 'users'))
  const currentUid = auth.currentUser?.uid
  users.value = snapshot.docs
    .map((d) => d.data())
    .filter((u) => u.uid !== currentUid)
}

function openChat(uid: string) {
  router.push(`/chat/${uid}`)
}

async function enablePush() {
  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return
    }
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { type: 'module' }
    )
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    })
    console.log('FCM token:', token)
  } catch (err) {
    console.error('Failed to enable push', err)
  } finally {
    showPushToast.value = false
  }
}

async function logout() {
  await signOut(auth)
  router.push('/auth')
}

onMounted(() => {
  loadUsers()
  if (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    Notification.permission === 'default'
  ) {
    showPushToast.value = true
  }
})
</script>

