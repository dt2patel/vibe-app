import { createRouter, createWebHistory } from '@ionic/vue-router'
import { RouteRecordRaw } from 'vue-router'
import { auth } from '@/firebase'
import { useAuth } from '@/store/auth'
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
    component: UserListPage,
    meta: { requiresAuth: true }
  },
  {
    path: '/chat/:uid',
    name: 'Chat',
    component: ChatPage,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

function getCurrentUser() {
  const { currentUser, ready } = useAuth()
  if (currentUser.value) {
    return Promise.resolve(currentUser.value)
  }
  return ready
}

router.beforeEach(async (to, from, next) => {
  if (!to.matched.some((record) => record.meta.requiresAuth)) {
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
