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
        <ion-toggle :checked="pushEnabled" :disabled="toggleDisabled" @ionChange="onToggle" />
      </ion-item>
      <ion-button color="danger" fill="outline" expand="block" class="ion-margin-top" @click="logout">
        Logout
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonToggle, IonButton } from '@ionic/vue'
import { auth } from '@/firebase'
import { signOut } from 'firebase/auth'
import { registerForPushNotifications } from '@/hooks/useNotifications'

const router = useRouter()
const pushEnabled = ref(Notification.permission === 'granted')
const toggleDisabled = computed(() => !('Notification' in window) || !('serviceWorker' in navigator))

async function onToggle(ev: CustomEvent) {
  if (ev.detail.checked) {
    await registerForPushNotifications()
    pushEnabled.value = Notification.permission === 'granted'
  } else {
    pushEnabled.value = false
  }
}

async function logout() {
  await signOut(auth)
  router.replace('/auth')
}
</script>
