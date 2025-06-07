<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Login / Register</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <form @submit.prevent="onSubmit">
        <ion-item>
          <ion-label position="stacked">Email</ion-label>
          <ion-input v-model="email" type="email" required></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="stacked">Password</ion-label>
          <ion-input v-model="password" type="password" required></ion-input>
        </ion-item>
        <ion-row class="ion-margin-top">
          <ion-col>
            <ion-button expand="block" type="submit" :disabled="loading">
              <ion-spinner v-if="loading" slot="start" name="crescent" />
              {{ submitLabel }}
            </ion-button>
          </ion-col>
        </ion-row>
        <ion-row>
          <ion-col class="ion-text-center">
            <ion-button fill="clear" size="small" @click="toggleMode">
              {{ toggleLabel }}
            </ion-button>
          </ion-col>
        </ion-row>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonRow,
  IonCol,
  IonSpinner
} from '@ionic/vue'
import { auth, db } from '@/firebase'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'

const router = useRouter()
const email = ref('')
const password = ref('')
const isLogin = ref(true)
const loading = ref(false)

const modeLabel = computed(() => (isLogin.value ? 'Login' : 'Register'))
const submitLabel = computed(() =>
  loading.value ? (isLogin.value ? 'Logging in' : 'Registering') : modeLabel.value
)
const toggleLabel = computed(() =>
  isLogin.value ? "Don't have an account? Register" : 'Already have an account? Login'
)

function toggleMode() {
  isLogin.value = !isLogin.value
}

async function onSubmit() {
  loading.value = true
  try {
    if (isLogin.value) {
      await signInWithEmailAndPassword(auth, email.value, password.value)
    } else {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      )
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email
      })
    }
    router.push('/users')
  } catch (err) {
    console.error(err)
    alert('Authentication failed')
  } finally {
    loading.value = false
  }
}
</script>
