import { shallowMount, flushPromises } from '@vue/test-utils'
import ChatPage from '@/views/ChatPage.vue'
import { describe, expect, test, vi } from 'vitest'

vi.mock('@/firebase', () => ({
  auth: { currentUser: { uid: 'u1' } },
  db: {}
}))

const mockMessages = [
  { id: '1', chatId: 'u1_u2', from: 'u1', to: 'u2', text: 'Hello', createdAt: { seconds: 1 } },
  { id: '2', chatId: 'u1_u2', from: 'u2', to: 'u1', text: 'Hi there', createdAt: { seconds: 2 } }
]

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: (_q: any, cb: any) => {
    const next = typeof cb === 'function' ? cb : cb.next
    next({
      docs: mockMessages.map((m) => ({
        id: m.id,
        data: () => m,
        metadata: { hasPendingWrites: false }
      }))
    })
    return vi.fn()
  },
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => true, data: () => ({ email: 'other@example.com' }) }))
}))

vi.mock('firebase/auth', () => ({ onAuthStateChanged: vi.fn() }))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { uid: 'u2' } }),
  useRouter: () => ({ push: vi.fn() })
}))

describe('ChatPage', () => {
  test('displays messages from snapshot', async () => {
    const slotStub = { template: '<div><slot /></div>' }
    const wrapper = shallowMount(ChatPage, {
      global: {
        stubs: {
          IonPage: slotStub,
          IonContent: slotStub,
          IonList: slotStub,
          IonItem: slotStub,
          IonLabel: slotStub,
          IonLoading: slotStub,
          IonSkeletonText: slotStub,
          IonText: slotStub,
          IonBackButton: slotStub,
          IonButtons: slotStub,
          IonIcon: slotStub,
          IonInput: slotStub,
          IonButton: slotStub,
          IonItemSliding: slotStub,
          IonItemOptions: slotStub,
          IonItemOption: slotStub,
          IonChip: slotStub,
          IonSpinner: slotStub
        }
      }
    })
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('Hello')
    expect(wrapper.text()).toContain('Hi there')
  })

  test('dismisses loading state after snapshot', async () => {
    const slotStub = { template: '<div><slot /></div>' }
    const wrapper = shallowMount(ChatPage, {
      global: {
        stubs: {
          IonPage: slotStub,
          IonContent: slotStub,
          IonList: slotStub,
          IonItem: slotStub,
          IonLabel: slotStub,
          IonLoading: slotStub,
          IonSkeletonText: slotStub,
          IonText: slotStub,
          IonBackButton: slotStub,
          IonButtons: slotStub,
          IonIcon: slotStub,
          IonInput: slotStub,
          IonButton: slotStub,
          IonItemSliding: slotStub,
          IonItemOptions: slotStub,
          IonItemOption: slotStub,
          IonChip: slotStub,
          IonSpinner: slotStub
        }
      }
    })
    await flushPromises()
    await flushPromises()
    expect((wrapper.vm as any).loadingMessages).toBe(false)
  })
})
