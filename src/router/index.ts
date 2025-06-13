import { createRouter, createWebHistory } from '@ionic/vue-router'
import { RouteRecordRaw } from 'vue-router'
import { auth } from '@/firebase'
import { useAuth } from '@/store/auth'
import AuthPage from '../views/AuthPage.vue'
import UserListPage from '../views/UserListPage.vue'
import ChatPage from '../views/ChatPage.vue'
import SettingsPage from '../views/SettingsPage.vue'
import TabsPage from '../views/TabsPage.vue'

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
    path: '/',
    component: TabsPage,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'users',
        name: 'Users',
        component: UserListPage
      },
      {
        path: 'settings',
        name: 'Settings',
        component: SettingsPage
      }
    ]
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

async function getCurrentUser() {
  const { currentUser, ready } = useAuth()
  if (!currentUser.value) {
    await ready
  }
  return currentUser.value
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
