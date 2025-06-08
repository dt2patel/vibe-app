import { ref } from 'vue'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/firebase'

const currentUser = ref<User | null>(auth.currentUser)
let resolveReady: (u: User | null) => void
export const ready = new Promise<User | null>((resolve) => {
  resolveReady = resolve
})

onAuthStateChanged(auth, (user) => {
  currentUser.value = user
  resolveReady(user)
})

export function useAuth() {
  return { currentUser, ready }
}
