<template>
  <el-row :gutter="16">
    <el-col :xs="24" :lg="10">
      <el-card shadow="never" class="panel">
        <template #header>选择订单并生成方案</template>
        <p class="tip">请先在「订单管理」中确认有数据；此处选择一行后点击生成。</p>
        <el-table
          ref="tableRef"
          v-loading="orderLoading"
          :data="orders"
          highlight-current-row
          height="320"
          border
          @current-change="onSelectOrder"
        >
          <el-table-column prop="orderCode" label="订单编号" width="130" />
          <el-table-column prop="customerName" label="客户" min-width="100" />
          <el-table-column prop="orderStatus" label="状态" width="90" />
        </el-table>
        <div class="actions">
          <el-button
            type="primary"
            :disabled="!selectedOrder"
            :loading="generating"
            @click="onGenerate"
          >
            生成推荐配煤方案
          </el-button>
          <span v-if="selectedOrder" class="sel">已选 id：{{ selectedOrder.id }}</span>
        </div>
      </el-card>
    </el-col>

    <el-col :xs="24" :lg="14">
      <el-card shadow="never" class="panel">
        <template #header>生成结果（/blendPlan/generate）</template>
        <el-empty v-if="!result && !generating" description="暂无结果，请选择订单后生成" />
        <el-skeleton v-else-if="generating" :rows="6" animated />
        <div v-else class="result">
          <el-alert
            v-if="result.explainSummary"
            :title="result.explainSummary"
            type="info"
            :closable="false"
            class="mb"
          />
          <div v-if="result.recommendedPlan" class="sub-title">推荐方案概要</div>
          <el-descriptions
            v-if="result.recommendedPlan?.plan"
            :column="2"
            border
            size="small"
            class="mb"
          >
            <el-descriptions-item label="方案编号">
              {{ result.recommendedPlan.plan.planCode }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              {{ result.recommendedPlan.plan.planStatus }}
            </el-descriptions-item>
            <el-descriptions-item label="综合评分">
              {{ result.recommendedPlan.plan.overallScore }}
            </el-descriptions-item>
            <el-descriptions-item label="总成本估计">
              {{ result.recommendedPlan.plan.totalCost }}
            </el-descriptions-item>
          </el-descriptions>
          <div v-if="matchedRuleTitles.length" class="sub-title">命中规则</div>
          <ul v-if="matchedRuleTitles.length" class="list">
            <li v-for="(t, i) in matchedRuleTitles" :key="i">{{ t }}</li>
          </ul>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { generateBlendPlan } from '@/api/blendPlan'
import { fetchOrderPage } from '@/api/order'
import { auth } from '@/stores/auth'

const orderLoading = ref(false)
const orders = ref([])
const selectedOrder = ref(null)
const generating = ref(false)
const result = ref(null)

const matchedRuleTitles = computed(() => {
  const list = result.value?.matchedRules
  if (!Array.isArray(list)) return []
  return list.map((r) => r.ruleName || r.ruleCode || JSON.stringify(r)).filter(Boolean)
})

function onSelectOrder(row) {
  selectedOrder.value = row || null
}

async function loadOrders() {
  orderLoading.value = true
  try {
    const page = await fetchOrderPage({ current: 1, size: 50 })
    orders.value = page?.records ?? []
  } finally {
    orderLoading.value = false
  }
}

async function onGenerate() {
  if (!selectedOrder.value) return
  generating.value = true
  result.value = null
  try {
    result.value = await generateBlendPlan({
      orderId: selectedOrder.value.id,
      createBy: auth.userId ?? undefined,
    })
  } finally {
    generating.value = false
  }
}

onMounted(loadOrders)
</script>

<style scoped>
.panel {
  border-radius: 8px;
  margin-bottom: 16px;
}

.tip {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 12px;
}

.actions {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.sel {
  font-size: 13px;
  color: #64748b;
}

.result {
  font-size: 14px;
}

.mb {
  margin-bottom: 12px;
}

.sub-title {
  font-weight: 600;
  margin: 8px 0;
  color: #0f172a;
}

.list {
  margin: 0;
  padding-left: 18px;
  color: #334155;
}
</style>
