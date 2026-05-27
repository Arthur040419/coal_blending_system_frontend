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
              <el-table-column prop="targetAsh" label="灰分上限" width="95" align="right" />
              <el-table-column prop="targetSulfur" label="硫分上限" width="95" align="right" />
              <el-table-column prop="targetMoisture" label="水分上限" width="95" align="right" />
              <el-table-column prop="targetVolatile" label="挥发分参考" width="105" align="right" />
              <el-table-column prop="targetCalorific" label="热值下限" width="95" align="right" />
              <el-table-column prop="priorityLevel" label="优先级" width="80" align="right" />
              <el-table-column prop="deliveryDate" label="交货日期" width="115" />
              <el-table-column prop="orderStatus" label="状态" width="90" />
            </el-table>

            <div class="selected-order-detail">
              <div class="subsection-head">
                <span>选中订单详情</span>
                <el-tag v-if="selectedOrder" size="small" effect="plain">{{ selectedOrder.orderStatus || '—' }}</el-tag>
              </div>
              <el-empty v-if="!selectedOrder" description="请选择订单查看完整信息" />
              <el-descriptions v-else :column="2" border size="small">
                <el-descriptions-item label="订单编号">{{ selectedOrder.orderCode || '—' }}</el-descriptions-item>
                <el-descriptions-item label="客户">{{ selectedOrder.customerName || '—' }}</el-descriptions-item>
                <el-descriptions-item label="需求量">{{ formatNum(selectedOrder.demandQuantity) }} 吨</el-descriptions-item>
                <el-descriptions-item label="交货日期">{{ selectedOrder.deliveryDate || '—' }}</el-descriptions-item>
                <el-descriptions-item label="灰分上限">{{ formatOrderMetric(selectedOrder.targetAsh, '%') }}</el-descriptions-item>
                <el-descriptions-item label="硫分上限">{{ formatOrderMetric(selectedOrder.targetSulfur, '%') }}</el-descriptions-item>
                <el-descriptions-item label="水分上限">{{ formatOrderMetric(selectedOrder.targetMoisture, '%') }}</el-descriptions-item>
                <el-descriptions-item label="挥发分参考">{{ formatOrderMetric(selectedOrder.targetVolatile, '%') }}</el-descriptions-item>
                <el-descriptions-item label="发热量下限">{{ formatOrderMetric(selectedOrder.targetCalorific, ' kcal/kg') }}</el-descriptions-item>
                <el-descriptions-item label="优先级">{{ selectedOrder.priorityLevel ?? '—' }}</el-descriptions-item>
                <el-descriptions-item label="备注" :span="2">
                  <span class="wrap-text">{{ selectedOrder.remark || '—' }}</span>
                </el-descriptions-item>
              </el-descriptions>
            </div>
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
              <el-collapse class="advanced history-collapse">
                <el-collapse-item name="history">
                  <template #title>
                    <el-icon><Clock /></el-icon>
                    <span class="advanced-title">历史方案</span>
                  </template>
                  <div class="history-panel">
                    <div class="history-summary">
                      <span class="history-label">最近一次：</span>
                      <strong>{{ latestHistoryGroup?.key || '—' }}</strong>
                    </div>
                    <div class="history-meta">
                      {{ latestHistorySummary }}
                    </div>
                    <div class="history-control-row">
                      <el-select
                        v-model="selectedHistoryGroupKey"
                        :loading="historyLoading"
                        :disabled="!selectedOrder"
                        filterable
                        placeholder="选择一次历史生成记录"
                        class="history-select"
                      >
                        <el-option
                          v-for="group in historyGroups"
                          :key="group.key"
                          :label="historyGroupLabel(group)"
                          :value="group.key"
                        />
                      </el-select>
                      <el-button :disabled="!selectedOrder" :loading="historyLoading" @click.stop="loadOrderHistory">
                        刷新历史
                      </el-button>
                      <el-button
                        type="primary"
                        plain
                        :disabled="!selectedHistoryGroupKey"
                        :loading="historyViewing"
                        @click.stop="onViewHistoryPlans"
                      >
                        查看历史方案
                      </el-button>
                    </div>
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
            <span>{{ recommendedPlanTitle }}</span>
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
              <span>煤种编号：{{ detail.coalCode || '—' }}</span>
              <span>批次：{{ detail.productBatchNo || '—' }}</span>
              <span>用量：{{ formatNum(detail.useQuantity) }} 吨</span>
              <span>单价：{{ formatNum(detail.unitCost) }} 元/吨</span>
              <span>成本小计：{{ formatNum(detailCost(detail)) }} 元</span>
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

      <el-card v-if="humanBaselinePlan?.generated" shadow="never" class="panel">
        <template #header>
          <div class="panel-head">
            <span>人工经验对照方案（基线）</span>
            <div class="tag-row">
              <el-tag
                :type="humanBaselinePlan.hardConstraintsPassed ? 'success' : 'danger'"
                effect="plain"
              >
                {{ humanBaselinePlan.hardConstraintsPassed ? '硬约束通过' : '硬约束超限' }}
              </el-tag>
              <el-tag type="info" effect="plain">仅作对照，不参与最终推荐</el-tag>
            </div>
          </div>
        </template>

        <el-alert
          type="info"
          :closable="false"
          show-icon
          class="mb"
          title="基线算法说明"
        >
          <template #default>
            <div class="plain-text">
              该方案模拟工程师常规经验决策：① 按 0.4×热值得分 + 0.2×灰分得分 + 0.2×硫分得分 + 0.2×价格得分
              对候选物料计算综合分；② 按综合分降序固定取前 2 种煤，主煤 60% + 辅煤 40%；
              ③ 仅做硬约束粗校验（灰/硫/水≤上限，热值≥下限）。
              <strong>不查规则知识库、不查历史案例、不查 RAG、不做 Pareto 多目标优化、不做安全余量分级。</strong>
              用于与系统推荐方案形成对照。
            </div>
          </template>
        </el-alert>

        <el-descriptions :column="3" border size="small" class="mb">
          <el-descriptions-item label="单位成本">{{ formatNum(humanBaselinePlan.costPerTon) }} 元/吨</el-descriptions-item>
          <el-descriptions-item label="总成本">{{ formatNum(humanBaselinePlan.totalCost) }} 元</el-descriptions-item>
          <el-descriptions-item label="需求量">{{ formatNum(humanBaselinePlan.demandQuantity) }} 吨</el-descriptions-item>
          <el-descriptions-item label="加权灰分">{{ formatNum(humanBaselinePlan.predictedAsh) }}</el-descriptions-item>
          <el-descriptions-item label="加权硫分">{{ formatNum(humanBaselinePlan.predictedSulfur) }}</el-descriptions-item>
          <el-descriptions-item label="加权水分">{{ formatNum(humanBaselinePlan.predictedMoisture) }}</el-descriptions-item>
          <el-descriptions-item label="加权挥发分">{{ formatNum(humanBaselinePlan.predictedVolatile) }}</el-descriptions-item>
          <el-descriptions-item label="加权热值">{{ formatNum(humanBaselinePlan.predictedCalorific) }}</el-descriptions-item>
          <el-descriptions-item label="入选煤种">{{ (humanBaselinePlan.items || []).length }}</el-descriptions-item>
        </el-descriptions>

        <div class="material-list mb">
          <div
            v-for="(item, index) in humanBaselinePlan.items || []"
            :key="`baseline-${item.coalId || index}`"
            class="material-row"
          >
            <div class="material-main">
              <span class="material-name">{{ item.coalName || `煤种${item.coalId || index + 1}` }}</span>
              <el-tag size="small" effect="plain">{{ ratioText(item.ratio) }}</el-tag>
              <el-tag size="small" type="info" effect="plain">综合分 {{ formatNum(item.experienceScore) }}</el-tag>
            </div>
            <div class="material-grid">
              <span>煤种编号：{{ item.coalCode || '—' }}</span>
              <span>单价：{{ formatNum(item.purchasePrice) }} 元/吨</span>
              <span>灰分：{{ formatNum(item.ash) }}</span>
              <span>硫分：{{ formatNum(item.sulfur) }}</span>
              <span>水分：{{ formatNum(item.moisture) }}</span>
              <span>热值：{{ formatNum(item.calorific) }}</span>
            </div>
          </div>
        </div>

        <el-alert
          v-if="!humanBaselinePlan.hardConstraintsPassed && (humanBaselinePlan.violations || []).length"
          type="error"
          :closable="false"
          show-icon
          class="mb"
          title="人工经验方案未通过订单硬约束"
        >
          <template #default>
            <ul class="violation-list">
              <li v-for="(v, idx) in humanBaselinePlan.violations" :key="idx">{{ v }}</li>
            </ul>
          </template>
        </el-alert>

        <el-alert
          v-if="humanBaselineCostDelta"
          :type="humanBaselineCostDelta.savedPerTon > 0 ? 'success' : 'warning'"
          :closable="false"
          show-icon
          class="mb"
          :title="humanBaselineCostDelta.savedPerTon > 0
            ? `相较人工经验方案，系统推荐方案吨煤成本下降 ${humanBaselineCostDelta.savedPerTon.toFixed(2)} 元（${humanBaselineCostDelta.savedPercent.toFixed(2)}%）`
            : `本次系统推荐方案吨煤成本未优于人工经验基线（差值 ${humanBaselineCostDelta.savedPerTon.toFixed(2)} 元）`"
        />
      </el-card>

      <el-card v-else-if="humanBaselinePlan && !humanBaselinePlan.generated" shadow="never" class="panel">
        <template #header>
          <div class="panel-head">
            <span>人工经验对照方案（基线）</span>
            <el-tag type="warning" effect="plain">未能生成</el-tag>
          </div>
        </template>
        <el-empty :description="humanBaselinePlan.errorMessage || '人工经验基线未能生成对照方案'" />
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
                  <span class="candidate-name">{{ row.planCode || row.planName }}</span>
                  <el-tag :type="decisionTagType(row.decisionStatus)" size="small">
                    {{ decisionLabel(row.decisionStatus) }}
                  </el-tag>
                  <span class="candidate-meta">
                    {{ rowTitleMeta(row) }} · Pareto {{ row.paretoRank ?? '—' }} · 综合 {{ formatNum(row.overallScore) }}
                  </span>
                </div>
              </template>
              <el-descriptions :column="3" border size="small" class="mb candidate-desc">
                <el-descriptions-item label="方案编号">{{ row.planCode || '—' }}</el-descriptions-item>
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
                    <span>煤种编号：{{ detail.coalCode || '—' }}</span>
                    <span>批次：{{ detail.productBatchNo || '—' }}</span>
                    <span>用量：{{ formatNum(detail.useQuantity) }} 吨</span>
                    <span>单价：{{ formatNum(detail.unitCost) }} 元/吨</span>
                    <span>成本小计：{{ formatNum(detailCost(detail)) }} 元</span>
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

      <div v-if="scoreComparisonRows.length" class="score-chart-grid">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="panel-head">
              <span>候选方案评分柱状图</span>
              <el-select
                v-model="selectedChartRowKeys"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="选择展示方案"
                class="chart-select"
              >
                <el-option
                  v-for="option in chartCandidateOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>
          </template>
          <div ref="scoreBarChartRef" class="score-chart"></div>
        </el-card>
        <el-card shadow="never" class="panel">
          <template #header>候选方案评分雷达图</template>
          <div ref="scoreRadarChartRef" class="score-chart"></div>
        </el-card>
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
            <MarkdownContent v-else-if="result.historyRuleBasis" :content="result.historyRuleBasis" />
            <el-empty v-else description="暂无命中规则" />
          </el-tab-pane>
          <el-tab-pane label="历史案例">
            <el-table v-if="result.matchedCases?.length" :data="result.matchedCases" border size="small">
              <el-table-column prop="caseName" label="案例名称" min-width="160" show-overflow-tooltip />
              <el-table-column prop="summary" label="摘要" min-width="260" show-overflow-tooltip />
              <el-table-column prop="matchReason" label="匹配原因" min-width="220" show-overflow-tooltip />
            </el-table>
            <MarkdownContent v-else-if="result.historyCaseReference" :content="result.historyCaseReference" />
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
import { Check, Clock, Cpu, Refresh, Setting, VideoPlay } from '@element-plus/icons-vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownContent from '@/components/MarkdownContent.vue'
import PlanScoreRadar from '@/components/PlanScoreRadar.vue'
import {
  executeBlendPlan,
  fetchBlendPlanByOrder,
  fetchBlendPlanDetails,
  generateBlendPlan,
  selectBlendPlan,
} from '@/api/blendPlan'
import { fetchModelConfigList } from '@/api/modelConfig'
import { fetchOrderPage } from '@/api/order'
import { useCoalTypes } from '@/composables/useCoalTypes'
import { auth } from '@/stores/auth'

const { coalMap, load: loadCoals } = useCoalTypes()

const orderLoading = ref(false)
const orders = ref([])
const selectedOrder = ref(null)
const generating = ref(false)
const historyLoading = ref(false)
const historyViewing = ref(false)
const historyPlans = ref([])
const selectedHistoryGroupKey = ref(null)
const modelConfigLoading = ref(false)
const result = ref(null)
const modelConfigs = ref([])
const selectedCandidate = ref(null)
const activeCandidateKey = ref('')
const selectedChartRowKeys = ref([])
const paretoChartRef = ref(null)
const scoreBarChartRef = ref(null)
const scoreRadarChartRef = ref(null)
let paretoChart = null
let scoreBarChart = null
let scoreRadarChart = null

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
const recommendedPlanTitle = computed(() => {
  const plan = recommendedPlan.value?.plan || {}
  return plan.planCode || plan.planName || '推荐方案'
})
const recommendedDecision = computed(() =>
  resultDecisionStatus.value || decisionStatus(recommendedPlan.value?.plan),
)
const recommendedMetrics = computed(() => firstDetailMetrics(recommendedPlan.value?.details || []))

const humanBaselinePlan = computed(() => result.value?.humanBaselinePlan || null)
const humanBaselineCostDelta = computed(() => {
  const baseline = humanBaselinePlan.value
  const recommendedCostPerTon = recommendedPlan.value?.plan?.objectiveCostPerTon
  if (!baseline?.costPerTon || !recommendedCostPerTon) return null
  const baselineCost = Number(baseline.costPerTon)
  const recommendedCost = Number(recommendedCostPerTon)
  if (!isFinite(baselineCost) || !isFinite(recommendedCost) || baselineCost <= 0) return null
  const saved = baselineCost - recommendedCost
  return {
    baselineCostPerTon: baselineCost,
    recommendedCostPerTon: recommendedCost,
    savedPerTon: saved,
    savedPercent: (saved / baselineCost) * 100,
  }
})

const candidateMaterialRows = computed(() =>
  (result.value?.candidateMaterials || []).map((row, index) => ({
    ...row,
    shortlistRank: row.shortlistRank ?? index + 1,
    rowKey: row.materialKey || `${row.coalId || 'coal'}-${row.productBatchNo || index}`,
  })),
)

const decisionAlert = computed(() => {
  const mode = result.value?.recommendationMode
  if (result.value?.isHistoryView) {
    return { type: 'info', title: '已加载该订单历史配煤方案' }
  }
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

const historyGroups = computed(() => {
  const map = new Map()
  for (const plan of historyPlans.value || []) {
    const key = historyGroupKey(plan)
    const group = map.get(key) || {
      key,
      createTime: plan.createTime,
      plans: [],
      recommendedPlan: null,
    }
    group.plans.push(plan)
    if (!group.recommendedPlan || isRecommendedHistoryPlan(plan)) {
      group.recommendedPlan = plan
    }
    if (String(plan.createTime || '') > String(group.createTime || '')) {
      group.createTime = plan.createTime
    }
    map.set(key, group)
  }
  return [...map.values()]
    .map((group) => ({
      ...group,
      plans: group.plans.sort((a, b) => historyPlanSuffix(a).localeCompare(historyPlanSuffix(b))),
    }))
    .sort((a, b) => String(b.createTime || '').localeCompare(String(a.createTime || '')))
})

const latestHistoryGroup = computed(() => historyGroups.value[0] || null)

const latestHistorySummary = computed(() => {
  const group = latestHistoryGroup.value
  if (!group) {
    return selectedOrder.value ? '暂无历史生成记录' : '请选择订单后查看历史'
  }
  return `${formatHistoryTime(group.createTime)} · ${group.plans.length}个方案`
})

const paretoRows = computed(() =>
  allEvaluationRows.value.filter(
    (row) =>
      row.objectiveCostPerTon != null &&
      row.objectiveQualityDeviation != null &&
      row.objectiveExecutionRisk != null,
  ),
)

const scoreComparisonRows = computed(() =>
  allEvaluationRows.value.filter(
    (row) =>
      row.qualityScore != null &&
      row.costScore != null &&
      row.stabilityScore != null &&
      row.overallScore != null,
  ),
)

const chartCandidateOptions = computed(() =>
  scoreComparisonRows.value.map((row, index) => ({
    label: chartPlanName(row, index, scoreComparisonRows.value),
    value: row.rowKey,
  })),
)

const displayedScoreRows = computed(() => {
  const selected = new Set(selectedChartRowKeys.value)
  return scoreComparisonRows.value.filter((row) => selected.has(row.rowKey))
})

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

const resultDecisionStatus = computed(() => {
  if (!result.value || result.value.isHistoryView) return null
  const explicit = String(result.value.decisionStatus || '').trim().toUpperCase()
  if (['FEASIBLE', 'RISKY', 'INFEASIBLE'].includes(explicit)) {
    return explicit
  }
  const mode = String(result.value.recommendationMode || '').trim().toUpperCase()
  if (mode === 'NORMAL') return 'FEASIBLE'
  if (mode === 'RISK_REFERENCE') return 'RISKY'
  if (mode === 'NO_SOLUTION') return 'INFEASIBLE'
  return null
})

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

async function onSelectOrder(row) {
  selectedOrder.value = row || null
  historyPlans.value = []
  selectedHistoryGroupKey.value = null
  if (row?.id) {
    await loadOrderHistory()
  }
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

async function loadOrderHistory() {
  if (!selectedOrder.value?.id) return
  historyLoading.value = true
  try {
    const rows = await fetchBlendPlanByOrder(selectedOrder.value.id)
    historyPlans.value = Array.isArray(rows) ? rows : []
    if (!selectedHistoryGroupKey.value && historyGroups.value.length) {
      selectedHistoryGroupKey.value = historyGroups.value[0].key
    } else if (
      selectedHistoryGroupKey.value &&
      !historyGroups.value.some((group) => group.key === selectedHistoryGroupKey.value)
    ) {
      selectedHistoryGroupKey.value = historyGroups.value[0]?.key || null
    }
  } finally {
    historyLoading.value = false
  }
}

async function onGenerate() {
  if (!selectedOrder.value) return
  generating.value = true
  result.value = null
  selectedCandidate.value = null
  activeCandidateKey.value = ''
  selectedChartRowKeys.value = []
  disposeAllCharts()
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
    await loadOrderHistory()
  } finally {
    generating.value = false
  }
}

async function onViewHistoryPlans() {
  if (!selectedOrder.value?.id || !selectedHistoryGroupKey.value) return
  historyViewing.value = true
  result.value = null
  selectedCandidate.value = null
  activeCandidateKey.value = ''
  selectedChartRowKeys.value = []
  disposeAllCharts()
  try {
    await loadCoals()
    if (!historyPlans.value.length) {
      await loadOrderHistory()
    }
    const group = historyGroups.value.find((item) => item.key === selectedHistoryGroupKey.value)
    const plans = group?.plans ? [...group.plans] : []
    if (!plans.length) {
      ElMessage.warning('该历史生成记录下没有方案')
      return
    }
    const detailsList = await Promise.all(plans.map((plan) => fetchBlendPlanDetails(plan.id)))
    result.value = buildHistoryResult(plans, detailsList, group)
  } finally {
    historyViewing.value = false
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
  const inferredProblems = mergeDecisionProblems(
    parseItems(row.problemItems || row.problemItemsJson),
    inferMetricProblems(row, metrics),
  )
  const status = decisionStatus({ ...row, problemItems: inferredProblems }, metrics, inferredProblems)
  return {
    ...row,
    rowKey: `${fallbackSource}-${index}`,
    candidateSource: row.candidateSource || fallbackSource,
    candidateSourceLabel: candidateSourceLabel(row.candidateSource || fallbackSource),
    planCode: row.planCode || candidateDisplayCode(row.candidateSource || fallbackSource, index),
    planName: row.planName || (fallbackSource === 'ai' ? 'AI候选方案' : '系统枚举方案'),
    decisionStatus: status,
    decisionStatusLabel: row.decisionStatusLabel || decisionLabel(status),
    problemItems: inferredProblems,
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
    mainProblem: inferredProblems.map((item) => item.typeLabel || item.message).filter(Boolean).join('；') || '—',
  }
}

function buildHistoryResult(plans, detailsList, group) {
  const selectedPlan = group?.recommendedPlan || plans.find(isRecommendedHistoryPlan) || plans[0]
  const items = plans.map((plan, index) => historyPlanToEvaluationItem(plan, detailsList[index] || []))
  const selectedDetails = enrichHistoryDetails(detailsList[plans.findIndex((plan) => plan.id === selectedPlan?.id)] || [])
  const candidateMaterials = readJsonArray(selectedPlan?.candidateMaterialsJson)
  const matchedRules = readJsonArray(selectedPlan?.matchedRulesJson)
  const matchedCases = readJsonArray(selectedPlan?.matchedCasesJson)
  const ragRetrieveResult = parseJsonObject(selectedPlan?.ragRetrieveResultJson)
  const feasible = items.filter((item) => decisionStatus(item) === 'FEASIBLE').length
  const risky = items.filter((item) => decisionStatus(item) === 'RISKY').length
  const infeasible = items.filter((item) => decisionStatus(item) === 'INFEASIBLE').length
  return {
    isHistoryView: true,
    order: selectedOrder.value,
    candidateMaterials: candidateMaterials.length ? candidateMaterials : buildCandidateMaterialsFromHistoryDetails(plans, detailsList),
    recommendedPlan: selectedPlan ? { plan: selectedPlan, details: selectedDetails } : null,
    candidatePlans: [],
    aiEvaluatedCandidates: [],
    systemEvaluatedCandidates: items,
    matchedRules,
    matchedCases,
    ragRetrieveResult,
    historyRuleBasis: selectedPlan?.ruleBasis || '',
    historyCaseReference: selectedPlan?.caseReference || '',
    decisionStatus: decisionStatus(selectedPlan),
    decisionStatusLabel: decisionLabel(decisionStatus(selectedPlan)),
    recommendationMode: 'HISTORY',
    recommendationModeLabel: '历史方案',
    decisionSummary: `已加载订单 ${selectedOrder.value?.orderCode || selectedOrder.value?.id || ''} 在 ${formatHistoryTime(group?.createTime)} 的一次历史生成记录，共 ${plans.length} 个方案，其中可执行 ${feasible} 个，风险参考 ${risky} 个，不可执行 ${infeasible} 个。`,
    problemItems: parseItems(selectedPlan?.problemItems || selectedPlan?.problemItemsJson),
    suggestionItems: parseItems(selectedPlan?.suggestionItems || selectedPlan?.suggestionItemsJson),
    paretoSummary: {
      totalCandidateCount: plans.length,
      feasibleCount: feasible,
      riskyCount: risky,
      infeasibleCount: infeasible,
    },
    generationConfig: parseJsonObject(selectedPlan?.generationConfigJson),
    explainSummary: buildHistoryExplainSummary(selectedPlan),
  }
}

function historyPlanToEvaluationItem(plan, details) {
  return {
    candidateSource: plan.candidateSource || 'history',
    planName: `${plan.planName || '历史方案'}（${plan.planCode || plan.id}）`,
    planCode: plan.planCode,
    totalCost: plan.totalCost,
    qualityScore: plan.qualityScore,
    costScore: plan.costScore,
    stabilityScore: plan.stabilityScore,
    overallScore: plan.overallScore,
    feasibleFlag: plan.feasibleFlag,
    constraintSummary: plan.constraintSummary,
    scoreDetail: plan.scoreDetail,
    riskLevel: plan.riskLevel,
    riskTip: plan.riskTip,
    decisionStatus: decisionStatus(plan),
    decisionStatusLabel: decisionLabel(decisionStatus(plan)),
    recommendationMode: plan.recommendationMode,
    problemItems: parseItems(plan.problemItems || plan.problemItemsJson),
    suggestionItems: parseItems(plan.suggestionItems || plan.suggestionItemsJson),
    paretoRank: plan.paretoRank,
    objectiveCostPerTon: plan.objectiveCostPerTon,
    objectiveQualityDeviation: plan.objectiveQualityDeviation,
    objectiveExecutionRisk: plan.objectiveExecutionRisk,
    scoreStrategy: plan.scoreStrategy,
    details: enrichHistoryDetails(details),
  }
}

function enrichHistoryDetails(details) {
  return (Array.isArray(details) ? details : []).map((detail) => {
    const coal = coalMap[detail.coalId] || {}
    return {
      ...detail,
      coalCode: detail.coalCode || coal.coalCode,
      coalName: detail.coalName || coal.coalName,
    }
  })
}

function buildCandidateMaterialsFromHistoryDetails(plans, detailsList) {
  const map = new Map()
  for (const details of detailsList || []) {
    for (const detail of enrichHistoryDetails(details)) {
      const key = detail.productBatchNo || detail.coalId
      if (!key || map.has(key)) continue
      map.set(key, {
        shortlistRank: map.size + 1,
        materialKey: String(key),
        coalId: detail.coalId,
        coalCode: detail.coalCode,
        coalName: detail.coalName,
        productBatchId: detail.productBatchId,
        productBatchNo: detail.productBatchNo,
        availableQuantity: null,
        ashContent: detail.predictedAsh,
        sulfurContent: detail.predictedSulfur,
        moistureContent: detail.predictedMoisture,
        volatileContent: detail.predictedVolatile,
        calorificValue: detail.predictedCalorific,
        purchasePrice: detail.unitCost,
      })
    }
  }
  if (map.size) return [...map.values()]
  return (plans || []).flatMap((plan, index) => {
    const coal = coalMap[plan.coalId] || {}
    return plan.coalId ? [{
      shortlistRank: index + 1,
      materialKey: String(plan.coalId),
      coalId: plan.coalId,
      coalCode: coal.coalCode,
      coalName: coal.coalName,
    }] : []
  })
}

function buildHistoryExplainSummary(plan = {}) {
  const blocks = []
  if (plan.ruleBasis) blocks.push(`【规则依据】\n${plan.ruleBasis}`)
  if (plan.caseReference) blocks.push(`【案例参考】\n${plan.caseReference}`)
  if (plan.recommendReason) blocks.push(`【推荐理由】\n${plan.recommendReason}`)
  if (plan.riskTip) blocks.push(`【风险提示】\n${plan.riskTip}`)
  if (plan.finalExplanation || plan.explanation) {
    blocks.push(`【最终解释】\n${plan.finalExplanation || plan.explanation}`)
  }
  return blocks.join('\n\n')
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
  scoreBarChart?.resize()
  scoreRadarChart?.resize()
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

function renderScoreCharts(retry = 0) {
  if (!displayedScoreRows.value.length) {
    disposeScoreCharts()
    return
  }
  renderScoreBarChart(retry)
  renderScoreRadarChart(retry)
}

function renderScoreBarChart(retry = 0) {
  if (!scoreBarChartRef.value) return
  const box = scoreBarChartRef.value.getBoundingClientRect()
  if (box.width <= 0 || box.height <= 0) {
    if (retry < 5) scheduleScoreRender(retry + 1)
    return
  }
  if (!scoreBarChart) {
    scoreBarChart = echarts.init(scoreBarChartRef.value)
  }
  const rows = displayedScoreRows.value
  const names = rows.map((row, index) => chartPlanName(row, index, rows))
  scoreBarChart.setOption({
    color: ['#2563eb', '#16a34a', '#f59e0b', '#7c3aed'],
    legend: { type: 'scroll', top: 0 },
    grid: { left: 42, right: 20, top: 54, bottom: 72 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      appendToBody: true,
    },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { interval: 0, rotate: names.length > 5 ? 28 : 0, overflow: 'truncate', width: 90 },
    },
    yAxis: { type: 'value', min: 0, max: 100, name: '评分' },
    series: [
      { name: '质量评分', type: 'bar', data: rows.map((row) => row.qualityScore) },
      { name: '成本评分', type: 'bar', data: rows.map((row) => row.costScore) },
      { name: '库存评分', type: 'bar', data: rows.map((row) => row.stabilityScore) },
      { name: '综合评分', type: 'bar', data: rows.map((row) => row.overallScore) },
    ],
    animation: false,
  })
  scoreBarChart.resize()
}

function renderScoreRadarChart(retry = 0) {
  if (!scoreRadarChartRef.value) return
  const box = scoreRadarChartRef.value.getBoundingClientRect()
  if (box.width <= 0 || box.height <= 0) {
    if (retry < 5) scheduleScoreRender(retry + 1)
    return
  }
  if (!scoreRadarChart) {
    scoreRadarChart = echarts.init(scoreRadarChartRef.value)
  }
  const rows = displayedScoreRows.value
  scoreRadarChart.setOption({
    color: ['#2563eb', '#16a34a', '#f59e0b', '#7c3aed', '#dc2626', '#0891b2', '#9333ea', '#65a30d'],
    legend: {
      type: 'scroll',
      top: 0,
      data: rows.map((row, index) => chartPlanName(row, index, rows)),
    },
    tooltip: { trigger: 'item', appendToBody: true },
    radar: {
      center: ['50%', '58%'],
      radius: '62%',
      indicator: [
        { name: '质量', max: 100 },
        { name: '成本', max: 100 },
        { name: '库存', max: 100 },
        { name: '综合', max: 100 },
      ],
    },
    series: [
      {
        type: 'radar',
        data: rows.map((row, index) => ({
          name: chartPlanName(row, index, rows),
          value: [row.qualityScore, row.costScore, row.stabilityScore, row.overallScore],
        })),
        symbolSize: 4,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.05 },
      },
    ],
    animation: false,
  })
  scoreRadarChart.resize()
}

function scheduleScoreRender(retry = 0) {
  nextTick(() => {
    window.requestAnimationFrame(() => {
      renderScoreCharts(retry)
    })
  })
}

function disposeScoreCharts() {
  scoreBarChart?.dispose()
  scoreRadarChart?.dispose()
  scoreBarChart = null
  scoreRadarChart = null
}

function disposeAllCharts() {
  disposeParetoChart()
  disposeScoreCharts()
}

function decisionStatus(row, metrics = null, problems = null) {
  if (!row) return null
  const explicit = String(row?.decisionStatus || '').trim().toUpperCase()
  const rows = problems || parseItems(row.problemItems || row.problemItemsJson)
  const metricProblems = inferMetricProblems(row, metrics || firstDetailMetrics(row.details || []))
  const summaryStatus = decisionStatusFromSummary(row.constraintSummary)
  if (explicit === 'INFEASIBLE') return explicit
  if (rows.some((item) => item?.severity === 'BLOCKER')) return 'INFEASIBLE'
  if (metricProblems.some((item) => item?.severity === 'BLOCKER')) return 'INFEASIBLE'
  if (summaryStatus === 'INFEASIBLE') return summaryStatus
  if (explicit === 'RISKY') return explicit
  if (rows.some((item) => item?.severity === 'WARNING')) return 'RISKY'
  if (metricProblems.some((item) => item?.severity === 'WARNING')) return 'RISKY'
  if (summaryStatus === 'RISKY') return summaryStatus
  if (explicit === 'FEASIBLE') return explicit
  if (summaryStatus) return summaryStatus
  if (row?.riskLevel === 'high') return 'INFEASIBLE'
  if (row?.riskLevel === 'medium') return 'RISKY'
  if (row?.riskLevel === 'low') return 'FEASIBLE'
  if (row?.feasibleFlag === 0) return 'INFEASIBLE'
  if (row?.feasibleFlag === 1) return 'FEASIBLE'
  return null
}

function decisionStatusFromSummary(summary) {
  if (!summary) return null
  const text = String(summary)
  if (text.includes('可行性：不可行') || text.includes('可行性:不可行') || summarySectionHasContent(text, '违反项')) {
    return 'INFEASIBLE'
  }
  if (summarySectionHasContent(text, '风险提示')) {
    return 'RISKY'
  }
  if (text.includes('可行性：可行') || text.includes('可行性:可行')) {
    return 'FEASIBLE'
  }
  return null
}

function summarySectionHasContent(text, label) {
  const markers = [`${label}：`, `${label}:`]
  for (const marker of markers) {
    const start = text.indexOf(marker)
    if (start < 0) continue
    const value = text
      .slice(start + marker.length)
      .split(/[；;。]/)[0]
      .trim()
    return Boolean(value && !['无', '—', '-', '暂无'].includes(value))
  }
  return false
}

function inferMetricProblems(row, metrics = {}) {
  const order = result.value?.order || selectedOrder.value || {}
  const problems = []
  addUpperMetricProblem(problems, 'ASH_EXCEED', '灰分超标', 'predictedAsh', '预测灰分', metrics.predictedAsh, order.targetAsh, '%')
  addUpperMetricProblem(problems, 'SULFUR_EXCEED', '硫分超标', 'predictedSulfur', '预测硫分', metrics.predictedSulfur, order.targetSulfur, '%')
  addUpperMetricProblem(problems, 'MOISTURE_EXCEED', '水分超标', 'predictedMoisture', '预测水分', metrics.predictedMoisture, order.targetMoisture, '%')
  const calorific = numberOrNull(metrics.predictedCalorific)
  const targetCalorific = numberOrNull(order.targetCalorific)
  if (calorific != null && targetCalorific != null && calorific < targetCalorific) {
    problems.push({
      type: 'CALORIFIC_NOT_ENOUGH',
      typeLabel: '发热量不足',
      severity: 'BLOCKER',
      severityLabel: '硬约束违规',
      fieldName: 'predictedCalorific',
      message: `预测发热量 ${formatNum(calorific)} kcal/kg 低于订单下限 ${formatNum(targetCalorific)} kcal/kg，缺口 ${formatNum(targetCalorific - calorific)} kcal/kg。`,
      actualValue: calorific,
      targetValue: targetCalorific,
      deviation: targetCalorific - calorific,
      unit: 'kcal/kg',
    })
  }
  if (row?.feasibleFlag === 0 && !problems.length) {
    problems.push({
      type: 'RULE_VIOLATION',
      typeLabel: '规则校验未通过',
      severity: 'BLOCKER',
      severityLabel: '硬约束违规',
      fieldName: 'feasibleFlag',
      message: '后端已将该候选标记为不可执行。',
    })
  }
  return problems
}

function addUpperMetricProblem(problems, type, typeLabel, fieldName, label, actualValue, targetValue, unit) {
  const actual = numberOrNull(actualValue)
  const target = numberOrNull(targetValue)
  if (actual == null || target == null || actual <= target) return
  problems.push({
    type,
    typeLabel,
    severity: 'BLOCKER',
    severityLabel: '硬约束违规',
    fieldName,
    message: `${label} ${formatNum(actual)}${unit} 超过订单上限 ${formatNum(target)}${unit}，超出 ${formatNum(actual - target)}${unit}。`,
    actualValue: actual,
    targetValue: target,
    deviation: actual - target,
    unit,
  })
}

function mergeDecisionProblems(...groups) {
  const map = new Map()
  for (const rows of groups) {
    for (const row of rows || []) {
      const key = `${row?.severity || ''}|${row?.type || ''}|${row?.message || ''}`
      if (!map.has(key)) {
        map.set(key, row)
      }
    }
  }
  return [...map.values()]
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
  if (source === 'history') return '历史方案'
  return '系统枚举'
}

function candidateDisplayCode(source, index) {
  const prefix = String(source || '').toLowerCase() === 'ai' ? 'AI' : 'SYS'
  return `${prefix}-${String(index + 1).padStart(3, '0')}`
}

function rowTitleMeta(row) {
  const name = row?.planName && row.planName !== row.planCode ? row.planName : row?.candidateSourceLabel
  return [name, row?.candidateSourceLabel].filter(Boolean).filter((item, index, arr) => arr.indexOf(item) === index).join(' · ')
}

function chartPlanName(row, index, rows = scoreComparisonRows.value) {
  const code = row.planCode || ''
  if (code) return code
  const baseName = row.planName || `方案${index + 1}`
  const sameNameRows = (rows || []).filter((item) => (item.planName || '') === baseName)
  const name = sameNameRows.length > 1
    ? `${baseName}-${index + 1}`
    : baseName
  return name.length > 16 ? `${name.slice(0, 16)}…` : name
}

function historyGroupLabel(group) {
  const recommended = group.recommendedPlan || group.plans?.[0] || {}
  const score = recommended.overallScore == null ? '—' : formatNum(recommended.overallScore)
  return `${group.key} · ${formatHistoryTime(group.createTime)} · ${group.plans.length}个方案 · 推荐综合${score}`
}

function historyGroupKey(plan) {
  const code = String(plan?.planCode || plan?.id || '')
  const match = code.match(/^(.*?)([A-Z])$/)
  if (match && match[1]) return match[1]
  const time = String(plan?.createTime || '').replace('T', ' ').slice(0, 16)
  return time || code
}

function historyPlanSuffix(plan) {
  const code = String(plan?.planCode || '')
  const match = code.match(/([A-Z])$/)
  return match?.[1] || code
}

function isRecommendedHistoryPlan(plan) {
  return (
    plan?.recommendationMode ||
    String(plan?.planName || '').startsWith('推荐方案') ||
    historyPlanSuffix(plan) === 'A'
  )
}

function formatHistoryTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 16) : '—'
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

function formatOrderMetric(value, unit = '') {
  const text = formatNum(value)
  return text === '—' ? text : `${text}${unit}`
}

function detailCost(detail) {
  const qty = Number(detail?.useQuantity)
  const price = Number(detail?.unitCost)
  return Number.isFinite(qty) && Number.isFinite(price) ? qty * price : null
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

function readJsonArray(value) {
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

function parseJsonObject(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
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

watch(scoreComparisonRows, (rows) => {
  const valid = new Set(rows.map((row) => row.rowKey))
  const kept = selectedChartRowKeys.value.filter((key) => valid.has(key))
  selectedChartRowKeys.value = kept.length ? kept : rows.slice(0, 3).map((row) => row.rowKey)
}, { immediate: true })

watch(paretoRows, () => scheduleParetoRender(), { deep: true, flush: 'post' })
watch(result, () => scheduleParetoRender(), { flush: 'post' })
watch(displayedScoreRows, () => scheduleScoreRender(), { deep: true, flush: 'post' })
watch(result, () => scheduleScoreRender(), { flush: 'post' })

onMounted(() => {
  loadOrders()
  loadModelConfigs()
  window.addEventListener('resize', resizeParetoChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeParetoChart)
  disposeAllCharts()
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

.score-chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  max-width: 100%;
  min-width: 0;
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

.selected-order-detail {
  margin-top: 12px;
}

.subsection-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
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

.history-collapse {
  margin-top: -12px;
}

.history-panel {
  display: grid;
  gap: 10px;
  padding: 2px 0 4px;
}

.history-summary {
  display: flex;
  gap: 6px;
  align-items: center;
  color: #0f172a;
  line-height: 1.4;
}

.history-label,
.history-meta {
  color: #64748b;
  font-size: 13px;
}

.history-control-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
  width: 100%;
}

.history-select {
  flex: 1 1 300px;
  max-width: 420px;
}

.chart-select {
  width: min(420px, 100%);
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

.score-chart {
  height: 360px;
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

.violation-list {
  margin: 4px 0 0;
  padding-left: 20px;
  color: #c0392b;
}

.violation-list li + li {
  margin-top: 4px;
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
  .candidate-work-grid,
  .score-chart-grid {
    grid-template-columns: 1fr;
  }

  .advanced-grid {
    grid-template-columns: 1fr;
  }

  .history-select {
    max-width: none;
    width: 100%;
  }

  .panel-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
