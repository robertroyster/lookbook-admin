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

// Navigation guard for auth and brand access
router.beforeEach((to, _from, next) => {
  const { isAuthenticated, brandSlug } = useAuth()

  if (to.meta.public) {
    next()
  } else if (!isAuthenticated.value) {
    next('/login')
  } else {
    // Check brand access - users can only access their own brand
    const routeBrand = to.params.brand as string | undefined
    if (routeBrand && brandSlug.value && routeBrand !== brandSlug.value) {
      // Redirect to their own brand equivalent route
      const newPath = to.path.replace(`/brands/${routeBrand}`, `/brands/${brandSlug.value}`)
      next(newPath)
    } else {
      next()
    }
  }
})

export default router
