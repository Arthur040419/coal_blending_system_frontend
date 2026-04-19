<template>
  <el-container class="layout-root">
    <el-aside width="220px" class="layout-aside">
      <div class="brand">
        <div class="brand-title">智能配煤管理系统</div>
        <div class="brand-sub">煤矿 · 数据与决策</div>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#0f172a"
        text-color="#cbd5e1"
        active-text-color="#ffffff"
        class="side-menu"
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.path"
          :index="item.path"
        >
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container direction="vertical" class="layout-main-wrap">
      <el-header class="layout-header" height="56px">
        <div class="header-left">
          <span class="page-title">{{ currentTitle }}</span>
        </div>
        <div class="header-right">
          <el-tag type="info" size="small">{{ userRole }}</el-tag>
          <el-dropdown trigger="click" @command="onUserCommand">
            <span class="user-line user-trigger">
              {{ displayName() }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowDown } from '@element-plus/icons-vue'
import { auth, clearAuthSession, displayName } from '@/stores/auth'

const router = useRouter()

const userRole = computed(() => auth.user?.role || '用户')

function onUserCommand(cmd) {
  if (cmd === 'logout') {
    clearAuthSession()
    router.replace({ name: 'Login' })
  }
}

const menuItems = [
  { path: '/dashboard', label: '首页总览' },
  { path: '/orders', label: '订单管理' },
  { path: '/blend', label: '智能配煤' },
  { path: '/coal-types', label: '煤种管理' },
  { path: '/coal-quality', label: '煤质管理' },
  { path: '/inventory', label: '库存管理' },
  { path: '/rules', label: '规则知识' },
  { path: '/cases', label: '历史案例' },
  { path: '/plan-history', label: '方案追溯' },
  { path: '/model-config', label: '模型配置' },
  { path: '/users', label: '用户管理' },
]

const route = useRoute()

const activeMenu = computed(() => {
  const p = route.path
  const hit = menuItems.find((m) => p === m.path || p.startsWith(`${m.path}/`))
  return hit ? hit.path : p
})

const currentTitle = computed(() => route.meta.title || '首页总览')
</script>

<style scoped>
.layout-root {
  height: 100%;
}

.layout-aside {
  background: #0f172a;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
}

.brand {
  padding: 20px 16px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.brand-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.brand-sub {
  margin-top: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.side-menu {
  border-right: none;
  flex: 1;
}

.layout-main-wrap {
  background: #f1f5f9;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  padding: 0 20px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #64748b;
}

.user-trigger {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.user-trigger:hover {
  color: #0f172a;
}

.layout-main {
  padding: 20px;
}
</style>
