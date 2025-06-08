import { ref } from 'vue'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/firebase'

const currentUser = ref<User | null>(auth.currentUser)
let resolveReady: () => void
export const ready = new Promise<void>((resolve) => {
  resolveReady = resolve
})

onAuthStateChanged(auth, (user) => {
  currentUser.value = user
  resolveReady()
})

export function useAuth() {
  return { currentUser, ready }
}
