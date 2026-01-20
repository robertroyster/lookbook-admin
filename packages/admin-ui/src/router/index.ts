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
    },
    {
      path: '/deploy',
      name: 'deploy-brand',
      component: () => import('../views/DeployBrandView.vue'),
      meta: { superAdminOnly: true }
    }
  ]
})

// Navigation guard for auth and brand access
router.beforeEach((to, _from, next) => {
  const { isAuthenticated, isAdmin, isSuperAdmin, brandSlug } = useAuth()

  if (to.meta.public) {
    next()
  } else if (!isAuthenticated.value) {
    next('/login')
  } else if (to.meta.superAdminOnly && !isSuperAdmin.value) {
    // Super-admin only routes
    next('/')
  } else if (isAdmin.value) {
    // Admins can access all brands
    next()
  } else {
    // Check brand access - users can only access their own brand (case-insensitive)
    const routeBrand = to.params.brand as string | undefined
    const userBrand = brandSlug.value?.toLowerCase()
    if (routeBrand && userBrand && routeBrand.toLowerCase() !== userBrand) {
      // Redirect to their own brand equivalent route
      const newPath = to.path.replace(`/brands/${routeBrand}`, `/brands/${userBrand}`)
      next(newPath)
    } else {
      next()
    }
  }
})

export default router
