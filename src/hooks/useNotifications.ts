import { messaging } from '@/lib/firebaseMessaging';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/firebase';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_PUBLIC_KEY;

export async function registerForPushNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
  }

  try {
    const token = await getToken(messaging, { vapidKey });
    const user = auth.currentUser;
    if (user && token) {
      await updateDoc(doc(db, 'users', user.uid), { fcmToken: token });
    }
  } catch (err) {
    console.error('Push setup failed', err);
  }
}

export function listenToForegroundMessages(
  handler: (payload: any) => void
) {
  return onMessage(messaging, (payload) => {
    handler(payload);
  });
}
