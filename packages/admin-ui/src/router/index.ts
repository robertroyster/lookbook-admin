import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../lib/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue')
    },
    {
      path: '/brands',
      name: 'brands',
      component: () => import('../views/BrandListView.vue')
    },
    {
      path: '/brands/:brand',
      name: 'brand-detail',
      component: () => import('../views/BrandDetailView.vue')
    },
    {
      path: '/brands/:brand/:store',
      name: 'store-detail',
      component: () => import('../views/StoreDetailView.vue')
    },
    {
      path: '/brands/:brand/:store/:menu',
      name: 'menu-detail',
      component: () => import('../views/MenuDetailView.vue')
    }
  ]
})

// Navigation guard for auth
router.beforeEach((to, _from, next) => {
  const { isAuthenticated } = useAuth()

  if (to.meta.public) {
    next()
  } else if (!isAuthenticated.value) {
    next('/login')
  } else {
    next()
  }
})

export default router
