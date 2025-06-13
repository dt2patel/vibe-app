<template>
  <ion-app>
    <ion-router-outlet />
    <ion-toast :is-open="showToast" :message="toastMessage" @didDismiss="showToast = false" />
  </ion-app>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IonApp, IonRouterOutlet, IonToast } from '@ionic/vue'
import { registerForPushNotifications, listenToForegroundMessages } from '@/hooks/useNotifications'

const toastMessage = ref('')
const showToast = ref(false)

onMounted(() => {
  registerForPushNotifications()
  listenToForegroundMessages((payload) => {
    const title = payload.notification?.title || ''
    const body = payload.notification?.body || ''
    toastMessage.value = title ? `${title}: ${body}` : body
    showToast.value = true
  })
})
</script>
