<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/users" />
        </ion-buttons>
        <ion-title>{{ otherUser?.email || "Chat" }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="logout">
            <ion-icon :icon="logOutOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-loading :is-open="loadingUser" message="Loading chat..." />
      <ion-list v-if="loadingMessages">
        <ion-item v-for="n in 5" :key="n">
          <ion-label>
            <ion-skeleton-text animated style="width: 100%" />
          </ion-label>
        </ion-item>
      </ion-list>
      <ion-list v-else>
        <ion-item v-for="msg in messages" :key="msg.id">
          <ion-label>
            <div>
              <strong>{{
                msg.from === currentUid ? "Me" : otherUser?.email
              }}</strong>
            </div>
            <div>{{ msg.text }}</div>
          </ion-label>
        </ion-item>
      </ion-list>
      <form @submit.prevent="sendMessage" class="ion-margin-top">
        <ion-item>
          <ion-input
            v-model="newMessage"
            placeholder="Type a message"
          ></ion-input>
        </ion-item>
        <ion-button expand="block" type="submit" class="ion-margin-top"
          >Send</ion-button
        >
      </form>
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
  IonInput,
  IonButton,
  IonList,
  IonLabel,
  IonBackButton,
  IonButtons,
  IonIcon,
  IonSkeletonText,
  IonLoading,
} from "@ionic/vue";
import { ref, onMounted, onUnmounted, computed, watch, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { auth, db } from "@/firebase";
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { logOutOutline } from "ionicons/icons";

const route = useRoute();
const router = useRouter();
const otherUid = computed(() => route.params.uid as string);
const currentUid = ref(auth.currentUser?.uid || "");
const otherUser = ref<any | null>(null);
const newMessage = ref("");
const messages = ref<any[]>([]);
const loadingMessages = ref(true);
const loadingUser = ref(true);

const chatId = computed(() => [currentUid.value, otherUid.value].sort().join("_"));
const chatRef = computed(() => doc(db, "chats", chatId.value));

let unsubMessages: (() => void) | null = null;

async function ensureChat() {
  const snap = await getDoc(chatRef.value);
  if (!snap.exists()) {
    await setDoc(chatRef.value, {
      participants: [currentUid.value, otherUid.value],
      createdAt: serverTimestamp(),
    });
  }
}

async function loadOtherUser(uid: string) {
  loadingUser.value = true;
  const userSnap = await getDoc(doc(db, "users", uid));
  if (userSnap.exists()) {
    otherUser.value = userSnap.data();
  } else {
    otherUser.value = null;
  }
  loadingUser.value = false;
}

async function startListener() {
  if (unsubMessages) unsubMessages();
  await ensureChat();
  const q = query(
    collection(chatRef.value, "messages"),
    orderBy("createdAt")
  );
  loadingMessages.value = true;
  unsubMessages = onSnapshot(q, (snapshot) => {
    messages.value = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aTime = (a as any).createdAt?.seconds || 0;
        const bTime = (b as any).createdAt?.seconds || 0;
        return aTime - bTime;
      }) as any[];
    loadingMessages.value = false;
  });
}

onMounted(async () => {
  loadOtherUser(otherUid.value);

  if (!currentUid.value) {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUid.value = user.uid;
        unsubAuth();
      }
    });
  }
});

watch(otherUid, (uid) => {
  loadOtherUser(uid);
});

watchEffect(() => {
  if (currentUid.value && otherUid.value) {
    startListener();
  }
});

onUnmounted(() => {
  if (unsubMessages) unsubMessages();
});

async function logout() {
  await signOut(auth);
  router.push("/auth");
}

async function sendMessage() {
  if (!newMessage.value.trim()) return;
  await ensureChat();
  await addDoc(collection(chatRef.value, "messages"), {
    from: currentUid.value,
    text: newMessage.value,
    createdAt: serverTimestamp(),
  });
  newMessage.value = "";
}
</script>
