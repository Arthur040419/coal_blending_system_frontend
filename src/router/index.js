import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import { auth, ensureAuthHydrated } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/Login.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '首页总览' },
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/orders/OrderList.vue'),
        meta: { title: '订单管理' },
      },
      {
        path: 'blend',
        name: 'Blend',
        component: () => import('@/views/blend/BlendWorkspace.vue'),
        meta: { title: '智能配煤' },
      },
      {
        path: 'coal-types',
        name: 'CoalTypes',
        component: () => import('@/views/coal-type/CoalTypeList.vue'),
        meta: { title: '煤种管理' },
      },
      {
        path: 'coal-quality',
        name: 'CoalQuality',
        component: () => import('@/views/coal-quality/CoalQualityList.vue'),
        meta: { title: '煤质管理' },
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/inventory/InventoryList.vue'),
        meta: { title: '库存管理' },
      },
      {
        path: 'full-chain',
        name: 'FullChain',
        component: () => import('@/views/chain/FullChainWorkspace.vue'),
        meta: { title: '全链路数据' },
      },
      {
        path: 'rules',
        name: 'Rules',
        component: () => import('@/views/rule/RuleKnowledgeList.vue'),
        meta: { title: '规则知识' },
      },
      {
        path: 'cases',
        name: 'Cases',
        component: () => import('@/views/case/CaseSampleList.vue'),
        meta: { title: '历史案例' },
      },
      {
        path: 'rag',
        name: 'Rag',
        component: () => import('@/views/rag/RagWorkspace.vue'),
        meta: { title: 'RAG 知识库' },
      },
      {
        path: 'plan-history',
        name: 'PlanHistory',
        component: () => import('@/views/plan/PlanHistoryList.vue'),
        meta: { title: '方案追溯' },
      },
      {
        path: 'model-effect',
        name: 'ModelEffect',
        component: () => import('@/views/experiment/ModelEffectDashboard.vue'),
        meta: { title: '模型效果' },
      },
      {
        path: 'model-config',
        name: 'ModelConfig',
        component: () => import('@/views/model/ModelConfigList.vue'),
        meta: { title: '模型配置' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/user/UserList.vue'),
        meta: { title: '用户管理' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, _from, next) => {
  ensureAuthHydrated()
  if (to.meta.public) {
    if (auth.userId && to.name === 'Login') {
      const raw = to.query.redirect
      const redirect = typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'
      return next(redirect)
    }
    return next()
  }
  if (to.matched.some((r) => r.meta.requiresAuth) && !auth.userId) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }
  return next()
})

router.afterEach((to) => {
  const base = '煤矿智能配煤管理系统'
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base
})

export default router
