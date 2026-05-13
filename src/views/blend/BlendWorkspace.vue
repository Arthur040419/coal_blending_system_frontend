<template>
  <div class="blend-cockpit">
    <div class="top-grid">
      <el-card shadow="never" class="panel">
        <template #header>
          <div class="panel-head">
            <span>智能配煤决策驾驶舱</span>
            <el-button :icon="Refresh" @click="loadOrders">刷新订单</el-button>
          </div>
        </template>

        <el-row :gutter="16">
          <el-col :xs="24" :lg="13">
            <el-table
              v-loading="orderLoading"
              :data="orders"
              highlight-current-row
              height="280"
              border
              @current-change="onSelectOrder"
            >
              <el-table-column prop="orderCode" label="订单编号" width="130" />
              <el-table-column prop="customerName" label="客户" min-width="120" show-overflow-tooltip />
              <el-table-column prop="demandQuantity" label="需求(吨)" width="110" align="right" />
              <el-table-column prop="targetSulfur" label="硫分上限" width="95" align="right" />
              <el-table-column prop="targetCalorific" label="热值下限" width="95" align="right" />
              <el-table-column prop="orderStatus" label="状态" width="90" />
            </el-table>
          </el-col>

          <el-col :xs="24" :lg="11">
            <el-form :model="form" label-width="94px" class="param-form">
              <el-form-item label="当前订单">
                <el-tag v-if="selectedOrder" type="success" effect="plain">
                  {{ selectedOrder.orderCode || `订单${selectedOrder.id}` }}
                </el-tag>
                <el-tag v-else type="info" effect="plain">未选择</el-tag>
              </el-form-item>
              <el-form-item label="候选范围">
                <el-segmented v-model="form.candidateScope" :options="candidateScopeOptions" />
              </el-form-item>
              <el-form-item label="评分策略">
                <el-select v-model="form.scoreStrategy" style="width: 220px">
                  <el-option label="均衡策略" value="BALANCED" />
                  <el-option label="质量优先" value="QUALITY_FIRST" />
                  <el-option label="成本优先" value="COST_FIRST" />
                  <el-option label="库存优先" value="INVENTORY_FIRST" />
                </el-select>
              </el-form-item>
              <el-form-item label="大模型">
                <el-select
                  v-model="form.modelConfigId"
                  :loading="modelConfigLoading"
                  clearable
                  filterable
                  placeholder="自动选择最新启用模型"
                  style="width: 260px"
                >
                  <el-option
                    v-for="model in availableModelOptions"
                    :key="model.id"
                    :label="modelLabel(model)"
                    :value="model.id"
                  />
                </el-select>
              </el-form-item>
              <el-collapse class="advanced">
                <el-collapse-item name="advanced">
                  <template #title>
                    <el-icon><Setting /></el-icon>
                    <span class="advanced-title">高级参数</span>
                  </template>
                  <div class="advanced-grid">
                    <el-form-item label="配比步长">
                      <el-select v-model="form.ratioStep">
                        <el-option label="0.05" :value="0.05" />
                        <el-option label="0.10" :value="0.1" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="短名单数">
                      <el-input-number v-model="form.maxShortlistCoals" :min="3" :max="10" />
                    </el-form-item>
                    <el-form-item label="煤种数">
                      <el-select v-model="form.maxMaterialCount">
                        <el-option label="2" :value="2" />
                        <el-option label="3" :value="3" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="返回方案">
                      <el-input-number v-model="form.maxReturnPlans" :min="3" :max="10" />
                    </el-form-item>
                  </div>
                </el-collapse-item>
              </el-collapse>
              <el-form-item class="generate-row">
                <el-button
                  type="primary"
                  :icon="Cpu"
                  :disabled="!selectedOrder"
                  :loading="generating"
                  @click="onGenerate"
                >
                  生成方案
                </el-button>
              </el-form-item>
            </el-form>
          </el-col>
        </el-row>
      </el-card>

      <div v-if="result" class="static-stack">
        <el-card shadow="never" class="panel">
          <template #header>本次生成配置</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="评分策略">{{ result.generationConfig?.scoreStrategyLabel || '—' }}</el-descriptions-item>
            <el-descriptions-item label="权重">
              质量 {{ percent(result.generationConfig?.qualityWeight) }} · 成本 {{ percent(result.generationConfig?.costWeight) }} · 稳定 {{ percent(result.generationConfig?.stabilityWeight) }}
            </el-descriptions-item>
            <el-descriptions-item label="配比步长">{{ result.generationConfig?.ratioStep }}</el-descriptions-item>
            <el-descriptions-item label="短名单数">{{ result.generationConfig?.maxShortlistCoals }}</el-descriptions-item>
            <el-descriptions-item label="煤种数">{{ result.generationConfig?.maxMaterialCount }}</el-descriptions-item>
            <el-descriptions-item label="返回方案">{{ result.generationConfig?.maxReturnPlans }}</el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card shadow="never" class="panel">
          <template #header>Pareto 多目标分布</template>
          <el-empty v-if="!paretoRows.length" description="暂无 Pareto 坐标" />
          <div v-else ref="paretoChartRef" class="pareto-chart"></div>
        </el-card>
      </div>
    </div>

    <el-skeleton v-if="generating" :rows="8" animated class="panel" />
    <el-empty v-else-if="!result" description="请选择订单后生成方案" />

    <template v-else>
      <el-alert
        :type="decisionAlert.type"
        :title="decisionAlert.title"
        :description="result.decisionSummary"
        show-icon
        :closable="false"
        class="decision-alert"
      />

      <el-card shadow="never" class="panel">
        <template #header>
          <div class="panel-head">
            <span>本次候选物料</span>
            <el-tag type="info" effect="plain">{{ candidateMaterialRows.length }} 个候选</el-tag>
          </div>
        </template>
        <el-empty v-if="!candidateMaterialRows.length" description="暂无候选物料数据" />
        <el-table v-else :data="candidateMaterialRows" border size="small">
          <el-table-column label="编号" min-width="110" show-overflow-tooltip>
            <template #default="{ row }">
              {{ materialCodeText(row) }}
            </template>
          </el-table-column>
          <el-table-column label="名称" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ materialDisplayName(row) }}</template>
          </el-table-column>
          <el-table-column label="可用库存/t" width="120" align="right">
            <template #default="{ row }">{{ formatNum(row.availableQuantity) }}</template>
          </el-table-column>
          <el-table-column label="灰分/%" width="100" align="right">
            <template #default="{ row }">{{ formatNum(row.ashContent) }}</template>
          </el-table-column>
          <el-table-column label="硫分/%" width="100" align="right">
            <template #default="{ row }">{{ formatNum(row.sulfurContent) }}</template>
          </el-table-column>
          <el-table-column label="水分/%" width="100" align="right">
            <template #default="{ row }">{{ formatNum(row.moistureContent) }}</template>
          </el-table-column>
          <el-table-column label="挥发分/%" width="110" align="right">
            <template #default="{ row }">{{ formatNum(row.volatileContent) }}</template>
          </el-table-column>
          <el-table-column label="发热量/kcal·kg⁻¹" width="150" align="right">
            <template #default="{ row }">{{ formatNum(row.calorificValue) }}</template>
          </el-table-column>
          <el-table-column label="单价/元·t⁻¹" width="120" align="right">
            <template #default="{ row }">{{ formatNum(row.purchasePrice) }}</template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card v-if="!allEvaluationRows.length" shadow="never" class="panel">
        <template #header>本次生成诊断</template>
        <el-descriptions :column="2" border size="small" class="mb">
          <el-descriptions-item
            v-for="row in generationDiagnosticRows"
            :key="row.label"
            :label="row.label"
          >
            {{ row.value }}
          </el-descriptions-item>
        </el-descriptions>
        <div v-if="aiRawPreview" class="plain-text diagnostic-preview">{{ aiRawPreview }}</div>
      </el-card>

      <el-card v-if="recommendedPlan?.plan" shadow="never" class="panel">
        <template #header>
          <div class="panel-head">
            <span>{{ recommendedPlan.plan.planName || '推荐方案' }}</span>
            <div class="tag-row">
              <el-tag :type="decisionTagType(recommendedDecision)" effect="plain">
                {{ decisionLabel(recommendedDecision) }}
              </el-tag>
              <el-tag v-if="recommendedPlan.plan.recommendationModeLabel" type="info" effect="plain">
                {{ recommendedPlan.plan.recommendationModeLabel }}
              </el-tag>
              <el-tag v-else type="info" effect="plain">{{ result.recommendationModeLabel }}</el-tag>
            </div>
          </div>
        </template>

        <el-descriptions :column="3" border size="small" class="mb">
          <el-descriptions-item label="Pareto Rank">{{ recommendedPlan.plan.paretoRank ?? '—' }}</el-descriptions-item>
          <el-descriptions-item label="综合评分">{{ formatNum(recommendedPlan.plan.overallScore) }}</el-descriptions-item>
          <el-descriptions-item label="总成本">{{ formatNum(recommendedPlan.plan.totalCost) }}</el-descriptions-item>
          <el-descriptions-item label="质量评分">{{ formatNum(recommendedPlan.plan.qualityScore) }}</el-descriptions-item>
          <el-descriptions-item label="成本评分">{{ formatNum(recommendedPlan.plan.costScore) }}</el-descriptions-item>
          <el-descriptions-item label="稳定性评分">{{ formatNum(recommendedPlan.plan.stabilityScore) }}</el-descriptions-item>
          <el-descriptions-item label="吨煤成本">{{ formatNum(recommendedPlan.plan.objectiveCostPerTon) }}</el-descriptions-item>
          <el-descriptions-item label="质量偏差">{{ formatNum(recommendedPlan.plan.objectiveQualityDeviation, 4) }}</el-descriptions-item>
          <el-descriptions-item label="执行风险">{{ formatNum(recommendedPlan.plan.objectiveExecutionRisk, 4) }}</el-descriptions-item>
          <el-descriptions-item label="预测灰分">{{ formatNum(recommendedMetrics.predictedAsh) }}</el-descriptions-item>
          <el-descriptions-item label="预测硫分">{{ formatNum(recommendedMetrics.predictedSulfur) }}</el-descriptions-item>
          <el-descriptions-item label="预测水分">{{ formatNum(recommendedMetrics.predictedMoisture) }}</el-descriptions-item>
          <el-descriptions-item label="预测挥发分">{{ formatNum(recommendedMetrics.predictedVolatile) }}</el-descriptions-item>
          <el-descriptions-item label="预测发热量">{{ formatNum(recommendedMetrics.predictedCalorific) }}</el-descriptions-item>
          <el-descriptions-item label="评分策略">{{ result.generationConfig?.scoreStrategyLabel || '—' }}</el-descriptions-item>
        </el-descriptions>

        <PlanScoreRadar :plan="recommendedPlan.plan" class="mb" />

        <div class="material-list mb">
          <div
            v-for="(detail, index) in recommendedPlan.details || []"
            :key="`${detail.coalId || index}-${detail.productBatchNo || index}`"
            class="material-row"
          >
            <div class="material-main">
              <span class="material-name">{{ detail.coalName || `煤种${detail.coalId || index + 1}` }}</span>
              <el-tag size="small" effect="plain">{{ ratioText(detail.blendRatio) }}</el-tag>
            </div>
            <div class="material-grid">
              <span>批次：{{ detail.productBatchNo || '—' }}</span>
              <span>用量：{{ formatNum(detail.useQuantity) }} 吨</span>
              <span>单价：{{ formatNum(detail.unitCost) }}</span>
              <span class="material-remark">说明：{{ detail.remark || '—' }}</span>
            </div>
          </div>
        </div>

        <el-alert
          v-if="recommendedDecision === 'RISKY'"
          title="该方案仅供参考，需调整订单或库存后重新生成"
          type="warning"
          :closable="false"
          show-icon
          class="mb"
        />

        <div v-if="recommendedDecision === 'FEASIBLE'" class="action-row">
          <el-button type="success" :icon="Check" @click="onSelectRecommended">选择方案</el-button>
          <el-button type="warning" :icon="VideoPlay" @click="onExecuteRecommended">执行方案</el-button>
        </div>
      </el-card>

      <div class="candidate-work-grid">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="panel-head">
              <span>候选方案对比</span>
              <el-tag type="info" effect="plain">{{ allEvaluationRows.length }} 个候选</el-tag>
            </div>
          </template>
          <el-empty v-if="!allEvaluationRows.length" description="暂无候选方案" />
          <el-collapse
            v-else
            v-model="activeCandidateKey"
            accordion
            class="candidate-collapse"
            @change="onCandidatePanelChange"
          >
            <el-collapse-item
              v-for="row in allEvaluationRows"
              :key="row.rowKey"
              :name="row.rowKey"
            >
              <template #title>
                <div class="candidate-title">
                  <span class="candidate-name">{{ row.planName }}</span>
                  <el-tag :type="decisionTagType(row.decisionStatus)" size="small">
                    {{ decisionLabel(row.decisionStatus) }}
                  </el-tag>
                  <span class="candidate-meta">
                    {{ row.candidateSourceLabel }} · Pareto {{ row.paretoRank ?? '—' }} · 综合 {{ formatNum(row.overallScore) }}
                  </span>
                </div>
              </template>
              <el-descriptions :column="3" border size="small" class="mb candidate-desc">
                <el-descriptions-item label="来源">{{ row.candidateSourceLabel }}</el-descriptions-item>
                <el-descriptions-item label="决策状态">{{ decisionLabel(row.decisionStatus) }}</el-descriptions-item>
                <el-descriptions-item label="Pareto Rank">{{ row.paretoRank ?? '—' }}</el-descriptions-item>
                <el-descriptions-item label="综合评分">{{ formatNum(row.overallScore) }}</el-descriptions-item>
                <el-descriptions-item label="质量评分">{{ formatNum(row.qualityScore) }}</el-descriptions-item>
                <el-descriptions-item label="成本评分">{{ formatNum(row.costScore) }}</el-descriptions-item>
                <el-descriptions-item label="稳定性评分">{{ formatNum(row.stabilityScore) }}</el-descriptions-item>
                <el-descriptions-item label="总成本">{{ formatNum(row.totalCost) }}</el-descriptions-item>
                <el-descriptions-item label="吨煤成本">{{ formatNum(row.objectiveCostPerTon) }}</el-descriptions-item>
                <el-descriptions-item label="质量偏差">{{ formatNum(row.objectiveQualityDeviation, 4) }}</el-descriptions-item>
                <el-descriptions-item label="执行风险">{{ formatNum(row.objectiveExecutionRisk, 4) }}</el-descriptions-item>
                <el-descriptions-item label="灰分">{{ formatNum(row.predictedAsh) }}</el-descriptions-item>
                <el-descriptions-item label="硫分">{{ formatNum(row.predictedSulfur) }}</el-descriptions-item>
                <el-descriptions-item label="水分">{{ formatNum(row.predictedMoisture) }}</el-descriptions-item>
                <el-descriptions-item label="热值">{{ formatNum(row.predictedCalorific) }}</el-descriptions-item>
                <el-descriptions-item label="主要问题" :span="3">
                  <span class="wrap-text">{{ row.mainProblem }}</span>
                </el-descriptions-item>
              </el-descriptions>
              <div v-if="row.details?.length" class="material-list">
                <div
                  v-for="(detail, index) in row.details"
                  :key="`${row.rowKey}-${detail.coalId || index}-${detail.productBatchNo || index}`"
                  class="material-row compact"
                >
                  <div class="material-main">
                    <span class="material-name">{{ detail.coalName || `煤种${detail.coalId || index + 1}` }}</span>
                    <el-tag size="small" effect="plain">{{ ratioText(detail.blendRatio) }}</el-tag>
                  </div>
                  <div class="material-grid">
                    <span>批次：{{ detail.productBatchNo || '—' }}</span>
                    <span>用量：{{ formatNum(detail.useQuantity) }} 吨</span>
                    <span>单价：{{ formatNum(detail.unitCost) }}</span>
                    <span class="material-remark">说明：{{ detail.remark || '—' }}</span>
                  </div>
                </div>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-card>

        <div class="selected-stack">
          <el-card shadow="never" class="panel">
            <template #header>
              <div class="panel-head">
                <span>问题项</span>
                <el-tag v-if="problemPanelTitle" size="small" effect="plain">
                  {{ problemPanelTitle }}
                </el-tag>
              </div>
            </template>
            <el-empty v-if="!problemPanelRows.length" :description="selectedCandidate ? '该候选暂无结构化问题' : '暂无全局问题项'" />
            <div v-else class="info-list">
              <div v-for="row in problemPanelRows" :key="`${row.severity}-${row.type}-${row.message}`" class="info-row">
                <div class="info-row-head">
                  <el-tag :type="row.severity === 'BLOCKER' ? 'danger' : 'warning'" size="small">
                    {{ row.severityLabel }}
                  </el-tag>
                  <strong>{{ row.typeLabel }}</strong>
                  <span v-if="row.coalName" class="muted">{{ row.coalName }}</span>
                </div>
                <div class="wrap-text">{{ row.message }}</div>
              </div>
            </div>
          </el-card>

          <el-card shadow="never" class="panel">
            <template #header>
              <div class="panel-head">
                <span>调整建议</span>
                <el-tag v-if="problemPanelTitle" size="small" effect="plain">
                  {{ problemPanelTitle }}
                </el-tag>
              </div>
            </template>
            <el-empty v-if="!suggestionPanelRows.length" :description="selectedCandidate ? '该候选暂无调整建议' : '暂无全局调整建议'" />
            <div v-else class="info-list">
              <div v-for="row in suggestionPanelRows" :key="`${row.type}-${row.action}`" class="info-row">
                <div class="info-row-head">
                  <el-tag size="small" effect="plain">P{{ row.priority }}</el-tag>
                  <strong>{{ row.action }}</strong>
                </div>
                <div class="wrap-text">{{ row.message }}</div>
              </div>
            </div>
          </el-card>
        </div>
      </div>

      <el-card shadow="never" class="panel">
        <template #header>知识依据与解释</template>
        <el-tabs>
          <el-tab-pane label="规则依据">
            <el-table v-if="result.matchedRules?.length" :data="result.matchedRules" border size="small">
              <el-table-column prop="ruleName" label="规则名称" min-width="160" show-overflow-tooltip />
              <el-table-column prop="ruleType" label="类型" width="120" />
              <el-table-column prop="hitReason" label="命中原因" min-width="260" show-overflow-tooltip />
            </el-table>
            <el-empty v-else description="暂无命中规则" />
          </el-tab-pane>
          <el-tab-pane label="历史案例">
            <el-table v-if="result.matchedCases?.length" :data="result.matchedCases" border size="small">
              <el-table-column prop="caseName" label="案例名称" min-width="160" show-overflow-tooltip />
              <el-table-column prop="summary" label="摘要" min-width="260" show-overflow-tooltip />
              <el-table-column prop="matchReason" label="匹配原因" min-width="220" show-overflow-tooltip />
            </el-table>
            <el-empty v-else description="暂无参考案例" />
          </el-tab-pane>
          <el-tab-pane label="RAG 知识">
            <el-descriptions v-if="result.ragRetrieveResult" :column="1" border size="small" class="mb">
              <el-descriptions-item label="检索关键词">
                {{ result.ragRetrieveResult.keywords?.join('、') || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="命中知识ID">
                {{ result.ragRetrieveResult.matchedKnowledgeIds?.join(', ') || '—' }}
              </el-descriptions-item>
            </el-descriptions>
            <el-table v-if="result.ragRetrieveResult?.all?.length" :data="result.ragRetrieveResult.all" border size="small">
              <el-table-column prop="title" label="知识标题" min-width="180" show-overflow-tooltip />
              <el-table-column prop="knowledgeType" label="类型" width="110" />
              <el-table-column prop="hitReason" label="命中原因" min-width="240" show-overflow-tooltip />
              <el-table-column prop="score" label="得分" width="80" align="right" />
            </el-table>
            <el-empty v-else description="暂无 RAG 命中" />
          </el-tab-pane>
          <el-tab-pane label="AI 解释">
            <div v-if="result.explainSummary" class="plain-text mb">{{ result.explainSummary }}</div>
            <MarkdownContent v-if="result.ragExplanation?.explanation" :content="result.ragExplanation.explanation" />
            <el-empty v-if="!result.explainSummary && !result.ragExplanation?.explanation" description="暂无 AI 解释" />
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { Check, Cpu, Refresh, Setting, VideoPlay } from '@element-plus/icons-vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownContent from '@/components/MarkdownContent.vue'
import PlanScoreRadar from '@/components/PlanScoreRadar.vue'
import { executeBlendPlan, generateBlendPlan, selectBlendPlan } from '@/api/blendPlan'
import { fetchModelConfigList } from '@/api/modelConfig'
import { fetchOrderPage } from '@/api/order'
import { auth } from '@/stores/auth'

const orderLoading = ref(false)
const orders = ref([])
const selectedOrder = ref(null)
const generating = ref(false)
const modelConfigLoading = ref(false)
const result = ref(null)
const modelConfigs = ref([])
const selectedCandidate = ref(null)
const activeCandidateKey = ref('')
const paretoChartRef = ref(null)
let paretoChart = null

const candidateScopeOptions = [
  { label: '煤种级', value: 'coal_type' },
  { label: '产品批次级', value: 'product_batch' },
]

const form = ref({
  candidateScope: 'coal_type',
  scoreStrategy: 'BALANCED',
  modelConfigId: null,
  ratioStep: 0.05,
  maxShortlistCoals: 8,
  maxMaterialCount: 3,
  maxReturnPlans: 6,
})

const recommendedPlan = computed(() => result.value?.recommendedPlan || null)
const recommendedDecision = computed(() => decisionStatus(recommendedPlan.value?.plan))
const recommendedMetrics = computed(() => firstDetailMetrics(recommendedPlan.value?.details || []))
const candidateMaterialRows = computed(() =>
  (result.value?.candidateMaterials || []).map((row, index) => ({
    ...row,
    shortlistRank: row.shortlistRank ?? index + 1,
    rowKey: row.materialKey || `${row.coalId || 'coal'}-${row.productBatchNo || index}`,
  })),
)

const decisionAlert = computed(() => {
  const mode = result.value?.recommendationMode
  if (mode === 'NORMAL') {
    return { type: 'success', title: '已生成可执行推荐方案' }
  }
  if (mode === 'RISK_REFERENCE') {
    return { type: 'warning', title: '当前无完全可行方案，以下为风险最小参考方案' }
  }
  return { type: 'error', title: '当前约束下无法生成可执行方案' }
})

const allEvaluationRows = computed(() => {
  const aiRows = (result.value?.aiEvaluatedCandidates || []).map((row, index) =>
    normalizeEvaluationRow(row, index, 'ai'),
  )
  const systemRows = (result.value?.systemEvaluatedCandidates || []).map((row, index) =>
    normalizeEvaluationRow(row, index, 'system'),
  )
  return [...aiRows, ...systemRows]
})

const availableModelOptions = computed(() =>
  (modelConfigs.value || [])
    .filter((model) => model.status === 1)
    .filter((model) => isCallableLlmType(model.modelType))
    .filter((model) => Boolean(model.apiUrl))
    .sort((a, b) => Number(b.id || 0) - Number(a.id || 0)),
)

const paretoRows = computed(() =>
  allEvaluationRows.value.filter(
    (row) =>
      row.objectiveCostPerTon != null &&
      row.objectiveQualityDeviation != null &&
      row.objectiveExecutionRisk != null,
  ),
)

const problemPanelRows = computed(() => {
  const rows = parseItems(problemPanelSource.value?.problemItems) || []
  return distinctBy(rows, (row) => `${row.severity}|${row.type}|${row.message}`)
})

const suggestionPanelRows = computed(() => {
  const rows = parseItems(problemPanelSource.value?.suggestionItems) || []
  return distinctBy(rows, (row) => `${row.type}|${row.action}|${row.message}`).sort(
    (a, b) => (a.priority ?? 99) - (b.priority ?? 99),
  )
})

const problemPanelSource = computed(() => selectedCandidate.value || result.value || null)

const problemPanelTitle = computed(() => selectedCandidate.value?.planName || (result.value ? '本次生成结果' : ''))

const generationDiagnosticRows = computed(() => {
  const constraints = result.value?.constraints || {}
  const ai = result.value?.aiCandidateResult || {}
  return [
    { label: '候选物料数', value: valueText(constraints.shortlistedCoalCount) },
    { label: '大模型返回方案', value: valueText(constraints.aiCandidatePlanCount ?? ai.plans?.length) },
    { label: '通过校验候选', value: valueText(constraints.acceptedAiCandidateCount) },
    { label: '最终候选数', value: valueText(constraints.totalCandidateCount) },
    { label: '系统枚举', value: constraints.systemEnumerationEnabled ? '已启用' : '未启用' },
    { label: '大模型错误', value: constraints.aiCandidateError || ai.errorMessage || '—' },
  ]
})

const aiRawPreview = computed(() => {
  const raw = result.value?.aiCandidateResult?.rawText
  if (!raw || allEvaluationRows.value.length) return ''
  const text = String(raw).trim()
  if (!text) return ''
  return `大模型原始输出：\n${text.length > 800 ? `${text.slice(0, 800)}...` : text}`
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

async function loadModelConfigs() {
  modelConfigLoading.value = true
  try {
    modelConfigs.value = await fetchModelConfigList()
  } finally {
    modelConfigLoading.value = false
  }
}

async function onGenerate() {
  if (!selectedOrder.value) return
  generating.value = true
  result.value = null
  selectedCandidate.value = null
  activeCandidateKey.value = ''
  disposeParetoChart()
  try {
    result.value = await generateBlendPlan({
      orderId: selectedOrder.value.id,
      createBy: auth.userId ?? undefined,
      modelConfigId: form.value.modelConfigId ?? undefined,
      candidateScope: form.value.candidateScope,
      scoreStrategy: form.value.scoreStrategy,
      ratioStep: form.value.ratioStep,
      maxShortlistCoals: form.value.maxShortlistCoals,
      maxMaterialCount: form.value.maxMaterialCount,
      maxReturnPlans: form.value.maxReturnPlans,
    })
  } finally {
    generating.value = false
  }
}

function onCandidatePanelChange(name) {
  const key = Array.isArray(name) ? name[0] : name
  const row = allEvaluationRows.value.find((item) => item.rowKey === key)
  const fallback = selectedCandidate.value || allEvaluationRows.value[0]
  selectedCandidate.value = row || fallback || null
  activeCandidateKey.value = selectedCandidate.value?.rowKey || ''
}

async function onSelectRecommended() {
  const planId = recommendedPlan.value?.plan?.id
  if (!planId) return
  await selectBlendPlan(planId)
  ElMessage.success('已选择该方案')
}

async function onExecuteRecommended() {
  const planId = recommendedPlan.value?.plan?.id
  if (!planId) return
  const { value } = await ElMessageBox.prompt('请输入执行入库仓库编码', '执行方案', {
    confirmButtonText: '执行',
    cancelButtonText: '取消',
    inputValue: 'WH-FINAL',
  })
  await executeBlendPlan({ planId, warehouseCode: value, operatorName: auth.username || 'system' })
  ElMessage.success('方案已执行')
}

function normalizeEvaluationRow(row, index, fallbackSource) {
  const details = row.details || []
  const metrics = firstDetailMetrics(details)
  const status = decisionStatus(row)
  return {
    ...row,
    rowKey: `${fallbackSource}-${index}`,
    candidateSource: row.candidateSource || fallbackSource,
    candidateSourceLabel: candidateSourceLabel(row.candidateSource || fallbackSource),
    planName: row.planName || (fallbackSource === 'ai' ? 'AI候选方案' : '系统枚举方案'),
    decisionStatus: status,
    decisionStatusLabel: row.decisionStatusLabel || decisionLabel(status),
    totalCost: numberOrNull(row.totalCost),
    qualityScore: numberOrNull(row.qualityScore),
    costScore: numberOrNull(row.costScore),
    stabilityScore: numberOrNull(row.stabilityScore),
    overallScore: numberOrNull(row.overallScore),
    objectiveCostPerTon: numberOrNull(row.objectiveCostPerTon),
    objectiveQualityDeviation: numberOrNull(row.objectiveQualityDeviation),
    objectiveExecutionRisk: numberOrNull(row.objectiveExecutionRisk),
    predictedAsh: metrics.predictedAsh,
    predictedSulfur: metrics.predictedSulfur,
    predictedMoisture: metrics.predictedMoisture,
    predictedCalorific: metrics.predictedCalorific,
    mainProblem: (row.problemItems || []).map((item) => item.typeLabel || item.message).filter(Boolean).join('；') || '—',
  }
}

function firstDetailMetrics(details) {
  const row = details?.[0] || {}
  return {
    predictedAsh: numberOrNull(row.predictedAsh),
    predictedSulfur: numberOrNull(row.predictedSulfur),
    predictedMoisture: numberOrNull(row.predictedMoisture),
    predictedVolatile: numberOrNull(row.predictedVolatile),
    predictedCalorific: numberOrNull(row.predictedCalorific),
  }
}

function renderParetoChart(retry = 0) {
  if (!paretoChartRef.value || !paretoRows.value.length) {
    disposeParetoChart()
    return
  }
  const box = paretoChartRef.value.getBoundingClientRect()
  if (box.width <= 0 || box.height <= 0) {
    if (retry < 5) {
      scheduleParetoRender(retry + 1)
    }
    return
  }
  if (!paretoChart) {
    paretoChart = echarts.init(paretoChartRef.value)
  }
  const data = paretoRows.value.map((row) => ({
    value: [
      row.objectiveCostPerTon,
      row.objectiveQualityDeviation,
      row.overallScore,
      row.objectiveExecutionRisk,
    ],
    row,
    itemStyle: { color: decisionColor(row.decisionStatus) },
  }))
  paretoChart.setOption({
    grid: { left: 58, right: 28, top: 46, bottom: 56 },
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      confine: true,
      extraCssText: 'z-index: 3000; max-width: 260px; white-space: normal;',
      formatter: ({ data }) => {
        const row = data.row
        return [
          `<b>${row.planName}</b>`,
          `来源：${row.candidateSourceLabel}`,
          `决策状态：${decisionLabel(row.decisionStatus)}`,
          `Pareto Rank：${row.paretoRank ?? '—'}`,
          `综合评分：${formatNum(row.overallScore)}`,
          `吨煤成本：${formatNum(row.objectiveCostPerTon)}`,
          `质量偏差：${formatNum(row.objectiveQualityDeviation, 4)}`,
          `执行风险：${formatNum(row.objectiveExecutionRisk, 4)}`,
        ].join('<br/>')
      },
    },
    xAxis: { type: 'value', name: '吨煤成本', nameLocation: 'middle', nameGap: 34 },
    yAxis: { type: 'value', name: '质量偏差', nameLocation: 'middle', nameGap: 42 },
    series: [
      {
        type: 'scatter',
        data,
        symbolSize: (value) => Math.max(8, 24 - Number(value?.[3] || 0) * 14),
      },
    ],
    animation: false,
  })
  paretoChart.resize()
}

function resizeParetoChart() {
  paretoChart?.resize()
}

function scheduleParetoRender(retry = 0) {
  nextTick(() => {
    window.requestAnimationFrame(() => {
      renderParetoChart(retry)
    })
  })
}

function disposeParetoChart() {
  paretoChart?.dispose()
  paretoChart = null
}

function decisionStatus(row) {
  if (!row) return null
  if (row?.decisionStatus) return row.decisionStatus
  if (row?.feasibleFlag === 0) return 'INFEASIBLE'
  return 'FEASIBLE'
}

function decisionLabel(status) {
  const map = { FEASIBLE: '可执行', RISKY: '风险参考', INFEASIBLE: '不可执行' }
  return map[status] || '—'
}

function decisionTagType(status) {
  if (status === 'FEASIBLE') return 'success'
  if (status === 'RISKY') return 'warning'
  if (status === 'INFEASIBLE') return 'danger'
  return 'info'
}

function decisionColor(status) {
  if (status === 'FEASIBLE') return '#2f9e75'
  if (status === 'RISKY') return '#f59e0b'
  return '#dc2626'
}

function candidateSourceLabel(source) {
  if (source === 'ai') return '大模型'
  if (source === 'hybrid') return '混合'
  return '系统枚举'
}

function materialDisplayName(row) {
  return row?.productBatchName || row?.coalName || `煤种${row?.coalId || ''}` || '—'
}

function materialCodeText(row) {
  return row?.productBatchNo || row?.coalCode || row?.rawBatchNo || row?.qualityBatchNo || row?.coalId || '—'
}

function isCallableLlmType(type) {
  return ['LLM', 'LOCAL_OLLAMA', 'OLLAMA'].includes(String(type || '').trim().toUpperCase())
}

function modelLabel(model) {
  const type = model.modelType || 'LLM'
  return `${model.modelName || `模型${model.id}`}（${type}）`
}

function ratioText(value) {
  return value != null ? `${Number(value * 100).toFixed(0)}%` : '—'
}

function percent(value) {
  return value != null ? `${Math.round(Number(value) * 100)}%` : '—'
}

function formatNum(value, digits = 2) {
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(digits).replace(/\.?0+$/, '') : '—'
}

function valueText(value) {
  return value === null || value === undefined || value === '' ? '—' : String(value)
}

function numberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseItems(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function distinctBy(rows, keyFn) {
  const map = new Map()
  for (const row of rows || []) {
    map.set(keyFn(row), row)
  }
  return [...map.values()]
}

watch(allEvaluationRows, (rows) => {
  if (!rows.length) {
    selectedCandidate.value = null
    activeCandidateKey.value = ''
    return
  }
  const current = rows.find((row) => row.rowKey === activeCandidateKey.value)
  const next = current || rows[0]
  selectedCandidate.value = next
  activeCandidateKey.value = next.rowKey
}, { immediate: true })

watch(paretoRows, () => scheduleParetoRender(), { deep: true, flush: 'post' })
watch(result, () => scheduleParetoRender(), { flush: 'post' })

onMounted(() => {
  loadOrders()
  loadModelConfigs()
  window.addEventListener('resize', resizeParetoChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeParetoChart)
  disposeParetoChart()
})
</script>

<style scoped>
.blend-cockpit {
  display: grid;
  gap: 16px;
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

.panel {
  border-radius: 8px;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}

.top-grid,
.candidate-work-grid {
  display: grid;
  gap: 16px;
  align-items: start;
  max-width: 100%;
  min-width: 0;
}

.top-grid {
  grid-template-columns: 1fr;
}

.candidate-work-grid {
  grid-template-columns: minmax(0, 1fr) minmax(340px, 36%);
}

.static-stack,
.selected-stack {
  display: grid;
  gap: 16px;
  align-self: start;
  max-width: 100%;
  min-width: 0;
}

.static-stack {
  grid-template-columns: minmax(320px, 34%) minmax(0, 1fr);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tag-row,
.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.param-form {
  max-width: 560px;
}

.advanced {
  margin: 2px 0 12px;
  border-top: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
}

.advanced-title {
  margin-left: 6px;
}

.advanced-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  column-gap: 12px;
}

.generate-row {
  margin-bottom: 0;
}

.decision-alert {
  margin-bottom: 16px;
}

.mb {
  margin-bottom: 12px;
}

.pareto-chart {
  height: 340px;
  width: 100%;
  max-width: 100%;
}

.plain-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  color: #334155;
}

.diagnostic-preview {
  max-height: 180px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px;
  background: #f8fafc;
  font-size: 13px;
}

.candidate-collapse {
  max-width: 100%;
}

.candidate-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  flex-wrap: wrap;
  line-height: 1.45;
}

.candidate-name {
  font-weight: 600;
  color: #0f172a;
  overflow-wrap: anywhere;
}

.candidate-meta,
.muted {
  color: #64748b;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.wrap-text {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.material-list,
.info-list {
  display: grid;
  gap: 8px;
  max-width: 100%;
}

.material-row,
.info-row {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 10px;
  background: #fff;
  max-width: 100%;
  min-width: 0;
}

.material-row.compact {
  padding: 8px 10px;
}

.material-main,
.info-row-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  margin-bottom: 6px;
}

.material-name {
  font-weight: 600;
  color: #0f172a;
  overflow-wrap: anywhere;
}

.material-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 6px 12px;
  color: #475569;
  font-size: 13px;
  line-height: 1.45;
  min-width: 0;
}

.material-remark {
  grid-column: 1 / -1;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.blend-cockpit :deep(.el-row) {
  max-width: 100%;
  min-width: 0;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

.blend-cockpit :deep(.el-col),
.blend-cockpit :deep(.el-card__body),
.blend-cockpit :deep(.el-collapse-item__content),
.blend-cockpit :deep(.el-tabs__content),
.blend-cockpit :deep(.el-tab-pane) {
  max-width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

.blend-cockpit :deep(.el-descriptions__body table) {
  width: 100% !important;
  table-layout: fixed;
}

.blend-cockpit :deep(.el-descriptions__label),
.blend-cockpit :deep(.el-descriptions__content) {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.blend-cockpit :deep(.el-table) {
  max-width: 100%;
}

.blend-cockpit :deep(.el-table__inner-wrapper),
.blend-cockpit :deep(.el-table__body-wrapper),
.blend-cockpit :deep(.el-scrollbar__wrap) {
  overflow-x: hidden !important;
}

@media (max-width: 720px) {
  .static-stack,
  .candidate-work-grid {
    grid-template-columns: 1fr;
  }

  .advanced-grid {
    grid-template-columns: 1fr;
  }

  .panel-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
