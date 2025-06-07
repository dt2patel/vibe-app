<template>
  <ion-header>
    <ion-toolbar color="primary">
      <ion-buttons slot="start" v-if="backHref">
        <ion-back-button :default-href="backHref" />
      </ion-buttons>
      <ion-title>{{ title }}</ion-title>
      <ion-buttons slot="end">
        <ion-label v-if="userEmail" class="ion-margin-end">{{ userEmail }}</ion-label>
        <ion-button size="small" @click="logout">Logout</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { auth } from '@/firebase'
import { signOut } from 'firebase/auth'
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonTitle,
  IonLabel
} from '@ionic/vue'

interface Props {
  title: string
  backHref?: string
}

defineProps<Props>()

const userEmail = computed(() => auth.currentUser?.email)

function logout() {
  signOut(auth)
}
</script>

<style scoped>
ion-label {
  font-weight: 500;
}
</style>
