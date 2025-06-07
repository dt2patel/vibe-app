import { createRouter, createWebHistory } from '@ionic/vue-router'
import { RouteRecordRaw } from 'vue-router'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/firebase'
import AuthPage from '../views/AuthPage.vue'
import UserListPage from '../views/UserListPage.vue'
import ChatPage from '../views/ChatPage.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/auth'
  },
  {
    path: '/auth',
    name: 'Auth',
    component: AuthPage
  },
  {
    path: '/users',
    name: 'Users',
    component: UserListPage
  },
  {
    path: '/chat/:uid',
    name: 'Chat',
    component: ChatPage
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

function getCurrentUser() {
  return new Promise<any>((resolve, reject) => {
    const removeListener = onAuthStateChanged(
      auth,
      (user) => {
        removeListener()
        resolve(user)
      },
      reject
    )
  })
}

router.beforeEach(async (to, from, next) => {
  if (to.name === 'Auth') {
    return next()
  }

  const user = auth.currentUser || (await getCurrentUser())
  if (user) {
    next()
  } else {
    next('/auth')
  }
})

export default router
