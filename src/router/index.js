import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const routes = [
  {
    path: '/',
    component: MainLayout,
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
        component: () => import('@/views/placeholder/ModulePlaceholder.vue'),
        meta: { title: '煤种管理', apiHint: '/coalType/page' },
      },
      {
        path: 'coal-quality',
        name: 'CoalQuality',
        component: () => import('@/views/placeholder/ModulePlaceholder.vue'),
        meta: { title: '煤质管理', apiHint: '/coalQuality/page' },
      },
      {
        path: 'inventory',
        name: 'Inventory',
        component: () => import('@/views/placeholder/ModulePlaceholder.vue'),
        meta: { title: '库存管理', apiHint: '/inventory/page' },
      },
      {
        path: 'rules',
        name: 'Rules',
        component: () => import('@/views/placeholder/ModulePlaceholder.vue'),
        meta: { title: '规则知识', apiHint: '/ruleKnowledge/page' },
      },
      {
        path: 'cases',
        name: 'Cases',
        component: () => import('@/views/placeholder/ModulePlaceholder.vue'),
        meta: { title: '历史案例', apiHint: '/caseSample/page' },
      },
      {
        path: 'plan-history',
        name: 'PlanHistory',
        component: () => import('@/views/placeholder/ModulePlaceholder.vue'),
        meta: { title: '方案追溯', apiHint: '/blendPlan/history' },
      },
      {
        path: 'model-config',
        name: 'ModelConfig',
        component: () => import('@/views/placeholder/ModulePlaceholder.vue'),
        meta: { title: '模型配置', apiHint: '/modelConfig/page' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.afterEach((to) => {
  const base = '煤矿智能配煤管理系统'
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base
})

export default router
