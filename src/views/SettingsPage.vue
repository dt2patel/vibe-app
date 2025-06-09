<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-item>
        <ion-label>Enable push notifications</ion-label>
        <ion-toggle
          :disabled="!pushSupported"
          :checked="pushEnabled"
          @ionChange="togglePush"
        />
      </ion-item>
      <ion-button
        expand="block"
        color="danger"
        fill="outline"
        class="ion-margin-top"
        @click="logout"
      >
        Logout
      </ion-button>
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
  IonLabel,
  IonToggle,
  IonButton,
  IonToast,
} from '@ionic/vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/firebase'
import { signOut } from 'firebase/auth'
import { registerForPushNotifications } from '@/hooks/useNotifications'

const router = useRouter()
const pushSupported = 'Notification' in window && 'serviceWorker' in navigator
const pushEnabled = ref(Notification.permission === 'granted')
const toastOpen = ref(false)
const toastMessage = ref('')

function showToast(msg: string) {
  toastMessage.value = msg
  toastOpen.value = true
}

async function togglePush(ev: CustomEvent) {
  if (ev.detail.checked) {
    await registerForPushNotifications()
    if (Notification.permission !== 'granted') {
      showToast('Permission denied')
    }
  }
  pushEnabled.value = Notification.permission === 'granted'
}

async function logout() {
  await signOut(auth)
  router.replace('/auth')
}
</script>
