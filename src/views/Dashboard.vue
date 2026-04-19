<template>
  <div class="dashboard">
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">后端服务</div>
          <div class="stat-value">
            <el-tag v-if="health?.status === 'UP'" type="success">已连接</el-tag>
            <el-tag v-else-if="healthChecked" type="danger">未就绪</el-tag>
            <el-tag v-else type="info">检测中</el-tag>
          </div>
          <div class="stat-hint">{{ health?.application || '默认端口 8080' }}</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">待处理订单</div>
          <div class="stat-value">{{ stats.pendingOrders ?? '—' }}</div>
          <div class="stat-hint">状态 pending</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">煤种 / 启用规则</div>
          <div class="stat-value small">{{ stats.coalTypes ?? '—' }} / {{ stats.rules ?? '—' }}</div>
          <div class="stat-hint">煤种总数 · 启用规则数</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">历史方案</div>
          <div class="stat-value">{{ stats.plans ?? '—' }}</div>
          <div class="stat-hint">GET /blendPlan/history</div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="stat-row">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">订单总数</div>
          <div class="stat-value">{{ stats.orders ?? '—' }}</div>
          <div class="stat-hint">订单管理模块</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">库存记录</div>
          <div class="stat-value">{{ stats.inventory ?? '—' }}</div>
          <div class="stat-hint">库存管理分页 total</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">开发文档</div>
          <div class="stat-value link">
            <a href="/api/swagger-ui.html" target="_blank" rel="noreferrer">Swagger</a>
          </div>
          <div class="stat-hint">需后端与 Vite 代理</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">主流程</div>
          <div class="stat-value small">订单 → 配煤 → 追溯</div>
          <div class="stat-hint">各模块页面已接通 REST</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="intro-card" shadow="never">
      <template #header>
        <span>说明</span>
      </template>
      <p>
        前端已对接后端现有接口（含分页、增删改、方案选用、模型/用户状态等）。开发请求走
        <code>/api</code>
        代理至
        <code>http://127.0.0.1:8080</code>
        。
      </p>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { fetchHealth } from '@/api/health'
import { fetchBlendPlanHistory } from '@/api/blendPlan'
import { fetchCoalTypePage } from '@/api/coalType'
import { fetchInventoryPage } from '@/api/inventory'
import { fetchOrderPage } from '@/api/order'
import { fetchRuleKnowledgePage } from '@/api/ruleKnowledge'

const health = ref(null)
const healthChecked = ref(false)
const stats = reactive({
  orders: null,
  pendingOrders: null,
  coalTypes: null,
  rules: null,
  plans: null,
  inventory: null,
})

onMounted(async () => {
  try {
    health.value = await fetchHealth()
  } catch {
    health.value = null
  } finally {
    healthChecked.value = true
  }

  const safeTotal = async (fn) => {
    try {
      const p = await fn()
      return p?.total ?? 0
    } catch {
      return null
    }
  }

  stats.orders = await safeTotal(() => fetchOrderPage({ current: 1, size: 1 }))
  stats.pendingOrders = await safeTotal(() =>
    fetchOrderPage({ current: 1, size: 1, orderStatus: 'pending' })
  )
  stats.coalTypes = await safeTotal(() => fetchCoalTypePage({ current: 1, size: 1 }))
  stats.rules = await safeTotal(() => fetchRuleKnowledgePage({ current: 1, size: 1, status: 1 }))
  stats.plans = await safeTotal(() => fetchBlendPlanHistory({ current: 1, size: 1 }))
  stats.inventory = await safeTotal(() => fetchInventoryPage({ current: 1, size: 1 }))
})
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
}

.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  margin-bottom: 16px;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.stat-value {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 600;
  color: #0f172a;
}

.stat-value.small {
  font-size: 16px;
  font-weight: 500;
}

.stat-value.link a {
  font-size: 16px;
  color: #2563eb;
  text-decoration: none;
}

.stat-value.link a:hover {
  text-decoration: underline;
}

.stat-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.intro-card {
  border-radius: 8px;
}

.intro-card p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #334155;
}

.intro-card code {
  padding: 1px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  font-size: 13px;
}
</style>
