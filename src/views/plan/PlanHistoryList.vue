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
          <el-button link type="warning" :disabled="row.traceStatus === 'executed' || row.planStatus === 'executed'" @click="onExecute(row)">执行</el-button>
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
      <div v-else-if="plan" class="drawer-detail-scroll">
        <el-descriptions :column="2" border size="small" class="mb">
          <el-descriptions-item label="方案编号">{{ plan.planCode }}</el-descriptions-item>
          <el-descriptions-item label="订单">{{ orderLabel(plan.orderId) }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ plan.planStatus }}</el-descriptions-item>
          <el-descriptions-item label="追溯状态">{{ plan.traceStatus || 'not_executed' }}</el-descriptions-item>
          <el-descriptions-item v-if="plan.finalProductBatchNo" label="最终产品批次" :span="2">
            {{ plan.finalProductBatchNo }}
          </el-descriptions-item>
          <el-descriptions-item label="总成本">{{ formatMoney(plan.totalCost) }}</el-descriptions-item>
          <el-descriptions-item label="质量分">{{ formatMoney(plan.qualityScore) }}</el-descriptions-item>
          <el-descriptions-item label="成本分">{{ formatMoney(plan.costScore) }}</el-descriptions-item>
          <el-descriptions-item label="稳定性分">{{ formatMoney(plan.stabilityScore) }}</el-descriptions-item>
          <el-descriptions-item label="综合分">{{ formatMoney(plan.overallScore) }}</el-descriptions-item>
          <el-descriptions-item label="可行性">
            <el-tag :type="plan.feasibleFlag === 0 ? 'danger' : 'success'" size="small">
              {{ plan.feasibleFlag === 0 ? '存在硬约束问题' : '满足硬约束' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="风险等级">
            <el-tag :type="riskTagType(plan.riskLevel)" size="small">
              {{ riskLabel(plan.riskLevel) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="生成时间">{{ formatDateTime(plan.createTime) }}</el-descriptions-item>
          <el-descriptions-item v-if="plan.aiModelName" label="解释模型" :span="2">
            {{ plan.aiModelName }}
            <el-tag v-if="plan.aiGenerateFlag === 1" type="success" size="small" class="ml8">大模型</el-tag>
            <el-tag v-else type="info" size="small" class="ml8">兜底</el-tag>
          </el-descriptions-item>
        </el-descriptions>
        <div v-if="plan.constraintSummary" class="mb">
          <div class="sub">约束校验</div>
          <div class="text">{{ plan.constraintSummary }}</div>
        </div>
        <div v-if="plan.scoreDetail" class="mb">
          <div class="sub">评分明细</div>
          <div class="text">{{ plan.scoreDetail }}</div>
        </div>
        <div v-if="plan.ruleBasis" class="mb">
          <div class="sub">规则依据 ruleBasis</div>
          <div class="ai-markdown-scroll">
            <MarkdownContent :content="plan.ruleBasis" />
          </div>
        </div>
        <div v-if="plan.caseReference" class="mb">
          <div class="sub">案例参考 caseReference</div>
          <div class="ai-markdown-scroll">
            <MarkdownContent :content="plan.caseReference" />
          </div>
        </div>
        <div v-if="plan.recommendReason" class="mb">
          <div class="sub">推荐理由 recommendReason</div>
          <div class="ai-markdown-scroll">
            <MarkdownContent :content="plan.recommendReason" />
          </div>
        </div>
        <div v-if="plan.riskTip" class="mb">
          <div class="sub">风险提示 riskTip</div>
          <div class="ai-markdown-scroll">
            <MarkdownContent :content="plan.riskTip" />
          </div>
        </div>
        <div v-if="plan.finalExplanation || plan.explanation" class="mb">
          <div class="sub">最终解释 finalExplanation</div>
          <div class="ai-markdown-scroll">
            <MarkdownContent :content="plan.finalExplanation || plan.explanation" />
          </div>
        </div>
        <div v-if="plan.optimizeSuggestion" class="mb">
          <div class="sub">优化建议（旧字段兼容）</div>
          <div class="ai-markdown-scroll">
            <MarkdownContent :content="plan.optimizeSuggestion" />
          </div>
        </div>
        <div class="sub">配比明细</div>
        <el-table :data="details" border size="small" class="mt">
          <el-table-column label="煤种" min-width="140">
            <template #default="{ row }">{{ coalLabel(row.coalId) }}</template>
          </el-table-column>
          <el-table-column prop="productBatchNo" label="产品批次" min-width="150" show-overflow-tooltip />
          <el-table-column prop="blendRatio" label="配比%" width="90" align="right" />
          <el-table-column prop="useQuantity" label="用量(吨)" width="100" align="right">
            <template #default="{ row }">{{ formatMoney(row.useQuantity) }}</template>
          </el-table-column>
          <el-table-column prop="predictedSulfur" label="预测硫分" width="90" align="right" />
          <el-table-column prop="predictedCalorific" label="预测热值" width="90" align="right" />
          <el-table-column prop="unitCost" label="单价" width="90" align="right" />
        </el-table>

        <div class="feedback-head">
          <div class="sub">执行反馈</div>
          <el-button type="primary" size="small" @click="openFeedbackCreate">录入反馈</el-button>
        </div>
        <el-empty v-if="!feedbackRows.length" description="暂无执行反馈" />
        <el-table v-else :data="feedbackRows" border size="small" class="mt">
          <el-table-column prop="executeDate" label="执行日期" width="110" />
          <el-table-column prop="actualQuantity" label="执行量" width="90" align="right" />
          <el-table-column prop="actualSulfur" label="实际硫分" width="90" align="right" />
          <el-table-column prop="actualCalorific" label="实际热值" width="90" align="right" />
          <el-table-column prop="qualifiedFlag" label="达标" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.qualifiedFlag === 1 ? 'success' : 'danger'" size="small">
                {{ row.qualifiedFlag === 1 ? '达标' : '未达标' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="effectivenessEval" label="评价" width="80" />
          <el-table-column label="案例回流" width="110" fixed="right">
            <template #default="{ row }">
              <el-tag v-if="row.caseGeneratedFlag === 1" type="success" size="small">已回流</el-tag>
              <el-button v-else link type="primary" @click="onConvertToCase(row)">转案例</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-drawer>

    <el-dialog v-model="feedbackVisible" title="录入执行反馈" width="680px" destroy-on-close @closed="resetFeedbackForm">
      <el-form ref="feedbackFormRef" :model="feedbackForm" :rules="feedbackRules" label-width="110px">
        <el-form-item label="实际执行量" prop="actualQuantity">
          <el-input-number v-model="feedbackForm.actualQuantity" :min="0" :precision="2" style="width: 220px" />
        </el-form-item>
        <el-form-item label="执行日期" prop="executeDate">
          <el-date-picker v-model="feedbackForm.executeDate" type="date" value-format="YYYY-MM-DD" style="width: 220px" />
        </el-form-item>
        <el-form-item label="实际灰分">
          <el-input-number v-model="feedbackForm.actualAsh" :min="0" :precision="2" style="width: 220px" />
        </el-form-item>
        <el-form-item label="实际硫分">
          <el-input-number v-model="feedbackForm.actualSulfur" :min="0" :precision="2" style="width: 220px" />
        </el-form-item>
        <el-form-item label="实际水分">
          <el-input-number v-model="feedbackForm.actualMoisture" :min="0" :precision="2" style="width: 220px" />
        </el-form-item>
        <el-form-item label="实际挥发分">
          <el-input-number v-model="feedbackForm.actualVolatile" :min="0" :precision="2" style="width: 220px" />
        </el-form-item>
        <el-form-item label="实际热值">
          <el-input-number v-model="feedbackForm.actualCalorific" :min="0" :precision="2" style="width: 220px" />
        </el-form-item>
        <el-form-item label="实际成本">
          <el-input-number v-model="feedbackForm.actualCost" :min="0" :precision="2" style="width: 220px" />
        </el-form-item>
        <el-form-item label="是否达标">
          <el-radio-group v-model="feedbackForm.qualifiedFlag">
            <el-radio :label="1">达标</el-radio>
            <el-radio :label="0">未达标</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="执行评价">
          <el-select v-model="feedbackForm.effectivenessEval" style="width: 220px">
            <el-option label="优秀" value="优秀" />
            <el-option label="良好" value="良好" />
            <el-option label="一般" value="一般" />
            <el-option label="较差" value="较差" />
          </el-select>
        </el-form-item>
        <el-form-item label="反馈说明">
          <el-input v-model="feedbackForm.feedbackDesc" type="textarea" :rows="3" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="feedbackVisible = false">取消</el-button>
        <el-button type="primary" :loading="feedbackSaving" @click="submitFeedback">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import MarkdownContent from '@/components/MarkdownContent.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCoalTypes } from '@/composables/useCoalTypes'
import { formatDateTime, formatMoney } from '@/utils/format'
import {
  fetchBlendPlanDetail,
  fetchBlendPlanDetails,
  fetchBlendPlanHistory,
  executeBlendPlan,
  selectBlendPlan,
} from '@/api/blendPlan'
import {
  convertFeedbackToCase,
  createFeedback,
  fetchFeedbackByPlan,
} from '@/api/blendPlanFeedback'
import { fetchOrderPage } from '@/api/order'
import { auth } from '@/stores/auth'

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
const feedbackRows = ref([])

const feedbackVisible = ref(false)
const feedbackSaving = ref(false)
const feedbackFormRef = ref(null)
const feedbackForm = reactive({
  actualQuantity: undefined,
  actualAsh: undefined,
  actualSulfur: undefined,
  actualMoisture: undefined,
  actualVolatile: undefined,
  actualCalorific: undefined,
  actualCost: undefined,
  qualifiedFlag: 1,
  effectivenessEval: '良好',
  feedbackDesc: '',
  executeDate: '',
})
const feedbackRules = {
  actualQuantity: [{ required: true, message: '请输入实际执行量', trigger: 'change' }],
}

function orderLabel(orderId) {
  return orderMap[orderId] || orderId || '—'
}

function riskLabel(level) {
  const map = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  }
  return map[level] || level || '—'
}

function riskTagType(level) {
  if (level === 'high') return 'danger'
  if (level === 'medium') return 'warning'
  if (level === 'low') return 'success'
  return 'info'
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
  feedbackRows.value = []
  detailLoading.value = true
  try {
    await loadCoals()
    const [p, d, f] = await Promise.all([
      fetchBlendPlanDetail(id),
      fetchBlendPlanDetails(id),
      fetchFeedbackByPlan(id),
    ])
    plan.value = p
    details.value = Array.isArray(d) ? d : []
    feedbackRows.value = Array.isArray(f) ? f : []
  } finally {
    detailLoading.value = false
  }
}

function resetFeedbackForm() {
  feedbackForm.actualQuantity = undefined
  feedbackForm.actualAsh = undefined
  feedbackForm.actualSulfur = undefined
  feedbackForm.actualMoisture = undefined
  feedbackForm.actualVolatile = undefined
  feedbackForm.actualCalorific = undefined
  feedbackForm.actualCost = undefined
  feedbackForm.qualifiedFlag = 1
  feedbackForm.effectivenessEval = '良好'
  feedbackForm.feedbackDesc = ''
  feedbackForm.executeDate = ''
  feedbackFormRef.value?.clearValidate?.()
}

function openFeedbackCreate() {
  if (!plan.value) return
  resetFeedbackForm()
  feedbackVisible.value = true
}

async function submitFeedback() {
  await feedbackFormRef.value?.validate?.()
  if (!plan.value) return
  feedbackSaving.value = true
  try {
    await createFeedback({
      planId: plan.value.id,
      actualQuantity: feedbackForm.actualQuantity,
      actualAsh: feedbackForm.actualAsh,
      actualSulfur: feedbackForm.actualSulfur,
      actualMoisture: feedbackForm.actualMoisture,
      actualVolatile: feedbackForm.actualVolatile,
      actualCalorific: feedbackForm.actualCalorific,
      actualCost: feedbackForm.actualCost,
      qualifiedFlag: feedbackForm.qualifiedFlag,
      effectivenessEval: feedbackForm.effectivenessEval,
      feedbackDesc: feedbackForm.feedbackDesc?.trim() || null,
      executeDate: feedbackForm.executeDate || undefined,
      operatorId: auth.userId ?? undefined,
    })
    ElMessage.success('反馈已保存')
    feedbackVisible.value = false
    await openDetail(plan.value.id)
    await load()
  } finally {
    feedbackSaving.value = false
  }
}

async function onConvertToCase(row) {
  await ElMessageBox.confirm('确定将该执行反馈沉淀为历史案例吗？', '案例回流', { type: 'warning' })
  await convertFeedbackToCase(row.id)
  ElMessage.success('已生成历史案例')
  if (plan.value?.id) {
    await openDetail(plan.value.id)
  }
}

async function onSelect(row) {
  await ElMessageBox.confirm(`确定选用方案「${row.planCode}」吗？`, '选用方案', { type: 'warning' })
  await selectBlendPlan(row.id)
  ElMessage.success('已选用')
  await load()
}

async function onExecute(row) {
  await ElMessageBox.confirm(`确定执行方案「${row.planCode}」并生成最终产品批次吗？`, '执行方案', { type: 'warning' })
  const res = await executeBlendPlan({
    planId: row.id,
    operatorName: auth.user?.realName || auth.user?.username || 'admin',
    warehouseCode: 'FP001',
    remark: '方案追溯页执行生成最终产品批次',
  })
  ElMessage.success(`已生成最终产品批次：${res?.finalProductBatchNo || '—'}`)
  if (plan.value?.id === row.id) {
    await openDetail(row.id)
  }
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

.ml8 {
  margin-left: 8px;
}

.drawer-detail-scroll {
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.ai-markdown-scroll {
  overflow-x: hidden;
}
</style>
