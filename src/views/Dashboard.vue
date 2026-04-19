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
          <div class="stat-hint">
            {{ health?.application || '启动 Spring Boot 后自动检测' }}
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">订单（示例分页）</div>
          <div class="stat-value">{{ orderTotal ?? '—' }}</div>
          <div class="stat-hint">接口：GET /order/page</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">开发文档</div>
          <div class="stat-value link">
            <a href="/api/swagger-ui.html" target="_blank" rel="noreferrer">Swagger</a>
          </div>
          <div class="stat-hint">需先启动后端，由 Vite 代理访问</div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-label">主流程</div>
          <div class="stat-value small">订单 → 配煤 → 追溯</div>
          <div class="stat-hint">左侧菜单已按原型划分模块</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="intro-card" shadow="never">
      <template #header>
        <span>框架说明</span>
      </template>
      <p>
        本前端为 Vue 3 + Vite + Element Plus（Vue 3 对应的 Element 组件库，与原型中的「Vue3
        管理系统」一致）。请求统一走
        <code>/api</code>
        前缀，由 Vite 开发服务器代理到后端
        <code>http://127.0.0.1:8080</code>
        ，与现有 REST 路径（如
        <code>/order/page</code>
        、
        <code>/blendPlan/generate</code>
        ）直接对齐。
      </p>
      <p>
        下一步可在各占位页中按
        <code>docs/前端原型方案_煤矿智能配煤管理系统.md</code>
        逐页补全表格与表单；接口封装可继续写在
        <code>src/api/</code>
        下。
      </p>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchHealth } from '@/api/health'
import { fetchOrderPage } from '@/api/order'

const health = ref(null)
const healthChecked = ref(false)
const orderTotal = ref(null)

onMounted(async () => {
  try {
    health.value = await fetchHealth()
  } catch {
    health.value = null
  } finally {
    healthChecked.value = true
  }

  try {
    const page = await fetchOrderPage({ current: 1, size: 1 })
    orderTotal.value = page?.total ?? 0
  } catch {
    orderTotal.value = null
  }
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
  font-size: 15px;
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
  margin: 0 0 12px;
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
