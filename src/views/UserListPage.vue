<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Users</ion-title>
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
  IonItem
} from '@ionic/vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'

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

onMounted(() => {
  loadUsers()
})
</script>

