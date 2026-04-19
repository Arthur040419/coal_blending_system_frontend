<template>
  <el-card shadow="never" class="panel">
    <template #header>
      <div class="panel-head">
        <span>方案追溯</span>
        <el-button @click="load">刷新</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="onSearch">
      <el-form-item label="订单">
        <el-select v-model="filters.orderId" clearable filterable placeholder="全部" style="width: 200px" @clear="onSearch">
          <el-option v-for="o in orderOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="方案编号">
        <el-input v-model="filters.planCode" clearable placeholder="模糊" style="width: 140px" @clear="onSearch" />
      </el-form-item>
      <el-form-item label="订单编号">
        <el-tooltip content="与后端一致：精确匹配订单编号" placement="top">
          <el-input v-model="filters.orderCode" clearable placeholder="精确" style="width: 130px" @clear="onSearch" />
        </el-tooltip>
      </el-form-item>
      <el-form-item label="状态">
        <el-input v-model="filters.planStatus" clearable placeholder="generated" style="width: 120px" @clear="onSearch" />
      </el-form-item>
      <el-form-item label="开始日期">
        <el-date-picker v-model="filters.createTimeBegin" type="date" value-format="YYYY-MM-DD" placeholder="起" style="width: 140px" @change="onSearch" />
      </el-form-item>
      <el-form-item label="结束日期">
        <el-date-picker v-model="filters.createTimeEnd" type="date" value-format="YYYY-MM-DD" placeholder="止" style="width: 140px" @change="onSearch" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="planCode" label="方案编号" width="150" />
      <el-table-column label="订单编号" width="120">
        <template #default="{ row }">{{ orderLabel(row.orderId) }}</template>
      </el-table-column>
      <el-table-column prop="planName" label="方案名称" min-width="120" show-overflow-tooltip />
      <el-table-column prop="totalCost" label="总成本" width="100" align="right">
        <template #default="{ row }">{{ formatMoney(row.totalCost) }}</template>
      </el-table-column>
      <el-table-column prop="overallScore" label="综合分" width="90" align="right" />
      <el-table-column prop="planStatus" label="状态" width="100" />
      <el-table-column prop="createTime" label="生成时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
          <el-button link type="success" :disabled="row.planStatus === 'selected'" @click="onSelect(row)">选用</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pager">
      <el-pagination
        v-model:current-page="current"
        v-model:page-size="size"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        background
        @current-change="load"
        @size-change="load"
      />
    </div>

    <el-drawer v-model="drawerVisible" title="方案详情" size="640px" destroy-on-close>
      <el-skeleton v-if="detailLoading" :rows="10" animated />
      <template v-else-if="plan">
        <el-descriptions :column="2" border size="small" class="mb">
          <el-descriptions-item label="方案编号">{{ plan.planCode }}</el-descriptions-item>
          <el-descriptions-item label="订单">{{ orderLabel(plan.orderId) }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ plan.planStatus }}</el-descriptions-item>
          <el-descriptions-item label="总成本">{{ formatMoney(plan.totalCost) }}</el-descriptions-item>
          <el-descriptions-item label="质量分">{{ formatMoney(plan.qualityScore) }}</el-descriptions-item>
          <el-descriptions-item label="成本分">{{ formatMoney(plan.costScore) }}</el-descriptions-item>
          <el-descriptions-item label="综合分">{{ formatMoney(plan.overallScore) }}</el-descriptions-item>
          <el-descriptions-item label="生成时间">{{ formatDateTime(plan.createTime) }}</el-descriptions-item>
        </el-descriptions>
        <div v-if="plan.explanation" class="mb">
          <div class="sub">方案说明</div>
          <p class="text">{{ plan.explanation }}</p>
        </div>
        <div v-if="plan.riskTip" class="mb">
          <div class="sub">风险提示</div>
          <p class="text">{{ plan.riskTip }}</p>
        </div>
        <div class="sub">配比明细</div>
        <el-table :data="details" border size="small" class="mt">
          <el-table-column label="煤种" min-width="140">
            <template #default="{ row }">{{ coalLabel(row.coalId) }}</template>
          </el-table-column>
          <el-table-column prop="blendRatio" label="配比%" width="90" align="right" />
          <el-table-column prop="useQuantity" label="用量(吨)" width="100" align="right">
            <template #default="{ row }">{{ formatMoney(row.useQuantity) }}</template>
          </el-table-column>
          <el-table-column prop="predictedSulfur" label="预测硫分" width="90" align="right" />
          <el-table-column prop="predictedCalorific" label="预测热值" width="90" align="right" />
          <el-table-column prop="unitCost" label="单价" width="90" align="right" />
        </el-table>
      </template>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCoalTypes } from '@/composables/useCoalTypes'
import { formatDateTime, formatMoney } from '@/utils/format'
import {
  fetchBlendPlanDetail,
  fetchBlendPlanDetails,
  fetchBlendPlanHistory,
  selectBlendPlan,
} from '@/api/blendPlan'
import { fetchOrderPage } from '@/api/order'

const { coalLabel, load: loadCoals } = useCoalTypes()

const orderOptions = ref([])
const orderMap = reactive({})

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const current = ref(1)
const size = ref(10)
const filters = reactive({
  orderId: undefined,
  planCode: '',
  orderCode: '',
  planStatus: '',
  createTimeBegin: '',
  createTimeEnd: '',
})

const drawerVisible = ref(false)
const detailLoading = ref(false)
const plan = ref(null)
const details = ref([])

function orderLabel(orderId) {
  return orderMap[orderId] || orderId || '—'
}

function buildQuery() {
  return {
    current: current.value,
    size: size.value,
    orderId: filters.orderId,
    planCode: filters.planCode?.trim() || undefined,
    orderCode: filters.orderCode?.trim() || undefined,
    planStatus: filters.planStatus?.trim() || undefined,
    createTimeBegin: filters.createTimeBegin || undefined,
    createTimeEnd: filters.createTimeEnd || undefined,
  }
}

async function load() {
  loading.value = true
  try {
    const page = await fetchBlendPlanHistory(buildQuery())
    rows.value = page?.records ?? []
    total.value = page?.total ?? 0
  } finally {
    loading.value = false
  }
}

function onSearch() {
  current.value = 1
  load()
}

function onReset() {
  filters.orderId = undefined
  filters.planCode = ''
  filters.orderCode = ''
  filters.planStatus = ''
  filters.createTimeBegin = ''
  filters.createTimeEnd = ''
  current.value = 1
  load()
}

async function openDetail(id) {
  drawerVisible.value = true
  plan.value = null
  details.value = []
  detailLoading.value = true
  try {
    await loadCoals()
    const [p, d] = await Promise.all([fetchBlendPlanDetail(id), fetchBlendPlanDetails(id)])
    plan.value = p
    details.value = Array.isArray(d) ? d : []
  } finally {
    detailLoading.value = false
  }
}

async function onSelect(row) {
  await ElMessageBox.confirm(`确定选用方案「${row.planCode}」吗？`, '选用方案', { type: 'warning' })
  await selectBlendPlan(row.id)
  ElMessage.success('已选用')
  await load()
}

async function loadOrders() {
  const p = await fetchOrderPage({ current: 1, size: 500 })
  const records = p?.records ?? []
  orderOptions.value = records.map((o) => ({
    value: o.id,
    label: `${o.orderCode} ${o.customerName || ''}`,
  }))
  for (const k of Object.keys(orderMap)) delete orderMap[k]
  for (const o of records) {
    orderMap[o.id] = o.orderCode
  }
}

onMounted(async () => {
  await loadOrders()
  await load()
})
</script>

<style scoped>
.panel {
  border-radius: 8px;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.filter-form {
  margin-bottom: 12px;
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.mb {
  margin-bottom: 12px;
}
.mt {
  margin-top: 8px;
}
.sub {
  font-weight: 600;
  margin-bottom: 6px;
  color: #0f172a;
}
.text {
  margin: 0;
  font-size: 13px;
  color: #475569;
  white-space: pre-wrap;
}
</style>
