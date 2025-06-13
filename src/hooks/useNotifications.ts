import { messaging } from '@/lib/firebaseMessaging'
import { getToken, onMessage } from 'firebase/messaging'
import { doc, updateDoc } from 'firebase/firestore'
import { db, auth } from '@/firebase'

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY

export async function registerForPushNotifications() {
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return
  }

  try {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
    const user = auth.currentUser
    if (user && token) {
      await updateDoc(doc(db, 'users', user.uid), { fcmToken: token })
    }
  } catch (err) {
    console.error('Push setup failed', err)
  }
}

export function listenToForegroundMessages(callback?: (payload: any) => void) {
  onMessage(messaging, (payload) => {
    console.log('Foreground message:', payload)
    callback?.(payload)
  })
}
