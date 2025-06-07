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
  IonIcon
} from '@ionic/vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { logOutOutline } from 'ionicons/icons'

const router = useRouter()
const users = ref<any[]>([])

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

async function logout() {
  await signOut(auth)
  router.push('/auth')
}

onMounted(() => {
  loadUsers()
})
</script>

