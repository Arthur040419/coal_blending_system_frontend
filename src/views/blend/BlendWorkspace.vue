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
        <div v-else class="result result-scroll">
          <el-alert
            v-if="result.explainSummary"
            type="info"
            :closable="false"
            show-icon
            class="mb ai-markdown-alert ai-summary-alert"
          >
            <template #title>解释摘要（完整，可滚动）</template>
            <div class="ai-plain-full">{{ result.explainSummary }}</div>
          </el-alert>
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
            <el-descriptions-item label="可行性">
              <el-tag :type="result.recommendedPlan.plan.feasibleFlag === 0 ? 'danger' : 'success'" size="small">
                {{ result.recommendedPlan.plan.feasibleFlag === 0 ? '存在硬约束问题' : '满足硬约束' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="风险等级">
              <el-tag :type="riskTagType(result.recommendedPlan.plan.riskLevel)" size="small">
                {{ riskLabel(result.recommendedPlan.plan.riskLevel) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="result.recommendedPlan.plan.aiModelName" label="解释模型">
              {{ result.recommendedPlan.plan.aiModelName }}
              <el-tag v-if="result.recommendedPlan.plan.aiGenerateFlag === 1" type="success" size="small" class="ml8"
                >大模型生成</el-tag
              >
              <el-tag v-else type="info" size="small" class="ml8">兜底说明</el-tag>
            </el-descriptions-item>
          </el-descriptions>
          <el-alert
            v-if="result.recommendedPlan?.plan?.constraintSummary"
            title="约束校验"
            type="success"
            :closable="false"
            class="mb"
          >
            <div class="plain-text">{{ result.recommendedPlan.plan.constraintSummary }}</div>
          </el-alert>
          <el-alert
            v-if="result.recommendedPlan?.plan?.scoreDetail"
            title="评分明细"
            type="info"
            :closable="false"
            class="mb"
          >
            <div class="plain-text">{{ result.recommendedPlan.plan.scoreDetail }}</div>
          </el-alert>

          <template v-if="result.knowledgeSummary">
            <div class="sub-title">订单与知识摘要</div>
            <el-descriptions :column="1" border size="small" class="mb">
              <el-descriptions-item label="订单摘要">{{
                result.knowledgeSummary.orderSummary || '—'
              }}</el-descriptions-item>
              <el-descriptions-item label="库存摘要">{{
                result.knowledgeSummary.inventorySummary || '—'
              }}</el-descriptions-item>
              <el-descriptions-item v-if="result.knowledgeSummary.planSummary" label="方案摘要">{{
                result.knowledgeSummary.planSummary
              }}</el-descriptions-item>
              <el-descriptions-item label="命中统计">
                规则 {{ result.knowledgeSummary.ruleCount ?? 0 }} 条 · 案例
                {{ result.knowledgeSummary.caseCount ?? 0 }} 条
              </el-descriptions-item>
            </el-descriptions>
          </template>

          <template v-if="result.matchedRules?.length">
            <div class="sub-title">命中规则（知识库）</div>
            <el-table :data="result.matchedRules" border size="small" class="mb kb-table">
              <el-table-column prop="ruleName" label="规则名称" min-width="130" show-overflow-tooltip />
              <el-table-column prop="ruleType" label="类型" width="100" show-overflow-tooltip />
              <el-table-column prop="hitReason" label="命中原因" min-width="220" show-overflow-tooltip />
            </el-table>
          </template>

          <template v-if="result.matchedCases?.length">
            <div class="sub-title">参考案例（知识库）</div>
            <el-table :data="result.matchedCases" border size="small" class="mb kb-table">
              <el-table-column prop="caseName" label="案例名称" min-width="120" show-overflow-tooltip />
              <el-table-column prop="summary" label="摘要" min-width="180" show-overflow-tooltip />
              <el-table-column prop="effectivenessEval" label="效果评价" width="90" show-overflow-tooltip />
              <el-table-column prop="matchReason" label="匹配原因" min-width="160" show-overflow-tooltip />
            </el-table>
          </template>

          <template v-if="result.recommendedPlan?.plan">
            <div class="sub-title ai-block-title">
              AI 方案说明
              <el-tag type="warning" size="small" effect="plain">知识增强</el-tag>
            </div>
            <el-alert
              v-if="result.recommendedPlan.plan.explanation"
              title="方案说明"
              type="success"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.recommendedPlan.plan.explanation" />
              </div>
            </el-alert>
            <div class="sub-title ai-block-title">
              AI 规则依据
              <el-tag type="warning" size="small" effect="plain">知识增强</el-tag>
            </div>
            <el-alert
              v-if="result.recommendedPlan.plan.ruleBasis"
              title="规则依据"
              type="success"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.recommendedPlan.plan.ruleBasis" />
              </div>
            </el-alert>
            <div class="sub-title ai-block-title">
              AI 风险提示
              <el-tag type="warning" size="small" effect="plain">知识增强</el-tag>
            </div>
            <el-alert
              v-if="result.recommendedPlan.plan.riskTip"
              title="风险提示"
              type="warning"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.recommendedPlan.plan.riskTip" />
              </div>
            </el-alert>
            <div class="sub-title ai-block-title">
              AI 优化建议
              <el-tag type="warning" size="small" effect="plain">知识增强</el-tag>
            </div>
            <el-alert
              v-if="result.recommendedPlan.plan.optimizeSuggestion"
              title="优化建议"
              type="info"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.recommendedPlan.plan.optimizeSuggestion" />
              </div>
            </el-alert>
          </template>

          <template v-if="result.candidatePlans?.length">
            <div class="sub-title">候选方案对比</div>
            <el-collapse class="mb">
              <el-collapse-item
                v-for="(candidate, index) in result.candidatePlans"
                :key="candidate.plan?.id || index"
                :title="`${candidate.plan?.planName || '候选方案'}｜综合分 ${candidate.plan?.overallScore ?? '—'}｜总成本 ${candidate.plan?.totalCost ?? '—'}`"
                :name="String(index)"
              >
                <el-descriptions v-if="candidate.plan" :column="2" border size="small" class="mb">
                  <el-descriptions-item label="方案编号">
                    {{ candidate.plan.planCode }}
                  </el-descriptions-item>
                  <el-descriptions-item label="状态">
                    {{ candidate.plan.planStatus }}
                  </el-descriptions-item>
                  <el-descriptions-item label="质量分">
                    {{ candidate.plan.qualityScore }}
                  </el-descriptions-item>
                  <el-descriptions-item label="成本分">
                    {{ candidate.plan.costScore }}
                  </el-descriptions-item>
                  <el-descriptions-item label="稳定性分">
                    {{ candidate.plan.stabilityScore }}
                  </el-descriptions-item>
                  <el-descriptions-item label="总成本">
                    {{ candidate.plan.totalCost }}
                  </el-descriptions-item>
                  <el-descriptions-item label="可行性">
                    <el-tag :type="candidate.plan.feasibleFlag === 0 ? 'danger' : 'success'" size="small">
                      {{ candidate.plan.feasibleFlag === 0 ? '存在硬约束问题' : '满足硬约束' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="风险等级">
                    <el-tag :type="riskTagType(candidate.plan.riskLevel)" size="small">
                      {{ riskLabel(candidate.plan.riskLevel) }}
                    </el-tag>
                  </el-descriptions-item>
                </el-descriptions>
                <el-alert
                  v-if="candidate.plan?.constraintSummary"
                  title="约束校验"
                  type="success"
                  :closable="false"
                  class="mb"
                >
                  <div class="plain-text">{{ candidate.plan.constraintSummary }}</div>
                </el-alert>
                <el-alert
                  v-if="candidate.plan?.scoreDetail"
                  title="评分明细"
                  type="info"
                  :closable="false"
                  class="mb"
                >
                  <div class="plain-text">{{ candidate.plan.scoreDetail }}</div>
                </el-alert>
                <el-table v-if="candidate.details?.length" :data="candidate.details" border size="small">
                  <el-table-column prop="coalName" label="煤种" min-width="120" show-overflow-tooltip />
                  <el-table-column prop="blendRatio" label="配比" width="90">
                    <template #default="{ row }">
                      {{ row.blendRatio != null ? `${Number(row.blendRatio * 100).toFixed(0)}%` : '—' }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="useQuantity" label="用量(吨)" width="100" />
                  <el-table-column prop="unitCost" label="单价" width="90" />
                  <el-table-column prop="remark" label="库存说明" min-width="180" show-overflow-tooltip />
                </el-table>
              </el-collapse-item>
            </el-collapse>
          </template>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import MarkdownContent from '@/components/MarkdownContent.vue'
import { generateBlendPlan } from '@/api/blendPlan'
import { fetchOrderPage } from '@/api/order'
import { auth } from '@/stores/auth'

const orderLoading = ref(false)
const orders = ref([])
const selectedOrder = ref(null)
const generating = ref(false)
const result = ref(null)

function onSelectOrder(row) {
  selectedOrder.value = row || null
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

/* 整块生成结果过长时随页面区域纵向滚动，不截断正文 */
.result-scroll {
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 6px;
}

/* 正文不截断；纵向滚动由外层 .result-scroll 统一承担 */
.ai-markdown-scroll {
  overflow-x: hidden;
}

.ai-plain-full {
  margin-top: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: hidden;
  font-size: 14px;
  line-height: 1.55;
}

.ai-summary-alert :deep(.el-alert__title) {
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

.ml8 {
  margin-left: 8px;
}

.ai-block-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-markdown-alert :deep(.el-alert__content) {
  width: 100%;
  display: block;
}

.ai-markdown-alert :deep(.el-alert__description) {
  -webkit-line-clamp: unset;
  line-clamp: unset;
  display: block;
}

.ai-markdown-alert :deep(.markdown-body) {
  margin-top: 4px;
}

.kb-table {
  width: 100%;
}

.plain-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.55;
}
</style>
