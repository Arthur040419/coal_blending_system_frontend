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
          <el-select v-model="candidateScope" style="width: 170px">
            <el-option label="煤种级配煤" value="coal_type" />
            <el-option label="产品批次级配煤" value="product_batch" />
          </el-select>
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
          <div class="result-actions">
            <el-button type="primary" plain @click="candidateDetailVisible = true">
              查看候选方案详情
            </el-button>
            <span class="detail-hint">
              AI候选 {{ result.aiCandidateResult?.plans?.length ?? 0 }} 个 ·
              系统枚举 {{ result.constraints?.systemEnumerationEnabled ? systemEvaluatedCandidates.length : '已关闭' }}
            </span>
          </div>
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
            <el-descriptions-item label="候选来源">
              <el-tag :type="candidateSourceTag(result.recommendedPlan.plan.candidateSource)" size="small">
                {{ candidateSourceLabel(result.recommendedPlan.plan.candidateSource, result.recommendedPlan.plan) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="result.recommendedPlan.plan.aiModelName" label="解释模型">
              {{ result.recommendedPlan.plan.aiModelName }}
              <el-tag v-if="result.recommendedPlan.plan.aiGenerateFlag === 1" type="success" size="small" class="ml8"
                >大模型生成</el-tag
              >
              <el-tag v-else type="info" size="small" class="ml8">兜底说明</el-tag>
            </el-descriptions-item>
            <el-descriptions-item v-if="result.constraints?.experimentCode" label="实验编号" :span="2">
              {{ result.constraints.experimentCode }}
            </el-descriptions-item>
          </el-descriptions>
          <div v-if="result.recommendedPlan?.plan" class="mb">
            <div class="sub-title">方案评分雷达图</div>
            <PlanScoreRadar :plan="result.recommendedPlan.plan" />
          </div>

          <!-- ── 多目标权重调节 ── -->
          <el-card shadow="never" class="mb weight-panel">
            <template #header>
              <span class="sub-title" style="margin:0">多目标权重调节</span>
              <el-tag size="small" type="info" effect="plain" style="margin-left: 8px">拖动滑块调整综合评分权重</el-tag>
            </template>
            <div class="weight-sliders">
              <div class="weight-item">
                <span class="weight-label">质量</span>
                <el-slider
                  v-model="qualityWeight"
                  :min="10"
                  :max="80"
                  :step="5"
                  show-input
                  :format-tooltip="(v) => `${v}%`"
                  size="small"
                />
              </div>
              <div class="weight-item">
                <span class="weight-label">成本</span>
                <el-slider
                  v-model="costWeight"
                  :min="5"
                  :max="60"
                  :step="5"
                  show-input
                  :format-tooltip="(v) => `${v}%`"
                  size="small"
                />
              </div>
              <div class="weight-item">
                <span class="weight-label">稳定性</span>
                <el-slider
                  v-model="stabilityWeight"
                  :min="5"
                  :max="60"
                  :step="5"
                  show-input
                  :format-tooltip="(v) => `${v}%`"
                  size="small"
                />
              </div>
            </div>
            <div class="weight-note">
              当前综合评分 = 质量×{{ normalizedWeights.q }}% + 成本×{{ normalizedWeights.c }}% + 稳定性×{{ normalizedWeights.s }}%
            </div>
          </el-card>

          <!-- ── Pareto 前沿散点图 ── -->
          <ParetoScatter
            v-if="paretoData.length > 0"
            :plans="paretoData"
            :recommended-plan-id="recommendedPlanParetoId"
          />
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
          <el-alert
            v-if="result.recommendedPlan?.plan?.aiCandidateReason"
            title="AI候选生成理由"
            type="warning"
            :closable="false"
            class="mb"
          >
            <div class="plain-text">{{ result.recommendedPlan.plan.aiCandidateReason }}</div>
          </el-alert>

          <template v-if="result.recommendedPlan?.details?.length">
            <div class="sub-title">推荐方案配比明细</div>
            <el-table :data="result.recommendedPlan.details" border size="small" class="mb">
              <el-table-column prop="coalName" label="煤种" min-width="120" show-overflow-tooltip />
              <el-table-column prop="productBatchNo" label="产品批次" min-width="150" show-overflow-tooltip />
              <el-table-column prop="blendRatio" label="配比" width="90">
                <template #default="{ row }">
                  {{ row.blendRatio != null ? `${Number(row.blendRatio * 100).toFixed(0)}%` : '—' }}
                </template>
              </el-table-column>
              <el-table-column prop="useQuantity" label="用量(吨)" width="100" />
              <el-table-column prop="unitCost" label="单价" width="90" />
              <el-table-column prop="remark" label="库存说明" min-width="180" show-overflow-tooltip />
            </el-table>
          </template>

          <template v-if="result.aiCandidateResult">
            <div class="sub-title ai-block-title">
              大模型候选方案生成
              <el-tag type="warning" size="small" effect="plain">AI候选</el-tag>
            </div>
            <el-descriptions :column="2" border size="small" class="mb">
              <el-descriptions-item label="候选模型">
                {{ result.aiCandidateResult.modelName || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="模型候选数量">
                {{ result.aiCandidateResult.plans?.length ?? 0 }}
              </el-descriptions-item>
              <el-descriptions-item label="接收状态">
                <el-tag :type="result.constraints?.acceptedAiCandidateCount > 0 ? 'success' : 'info'" size="small">
                  已接收 {{ result.constraints?.acceptedAiCandidateCount ?? 0 }} 个候选
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item v-if="result.constraints?.aiCandidateError" label="候选错误">
                {{ result.constraints.aiCandidateError }}
              </el-descriptions-item>
            </el-descriptions>
            <el-table
              v-if="result.aiCandidateResult.plans?.length"
              :data="result.aiCandidateResult.plans"
              border
              size="small"
              class="mb kb-table"
            >
              <el-table-column prop="planName" label="AI方案名" min-width="130" show-overflow-tooltip />
              <el-table-column prop="strategy" label="策略" min-width="200" show-overflow-tooltip />
              <el-table-column prop="risk" label="风险提示" min-width="160" show-overflow-tooltip />
              <el-table-column label="配比建议" min-width="220" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ formatAiItems(row.items) }}
                </template>
              </el-table-column>
            </el-table>
          </template>

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

          <template v-if="result.ragRetrieveResult">
            <div class="sub-title ai-block-title">
              RAG 知识增强结果
              <el-tag type="success" size="small" effect="plain">统一知识库</el-tag>
            </div>
            <el-descriptions :column="1" border size="small" class="mb">
              <el-descriptions-item label="检索关键词">
                {{ result.ragRetrieveResult.keywords?.join('、') || '—' }}
              </el-descriptions-item>
              <el-descriptions-item label="命中知识ID">
                {{ result.ragRetrieveResult.matchedKnowledgeIds?.join(', ') || '—' }}
              </el-descriptions-item>
            </el-descriptions>
            <el-table
              v-if="result.ragRetrieveResult.all?.length"
              :data="result.ragRetrieveResult.all"
              border
              size="small"
              class="mb kb-table"
            >
              <el-table-column prop="title" label="知识标题" min-width="150" show-overflow-tooltip />
              <el-table-column prop="knowledgeType" label="类型" width="90" />
              <el-table-column prop="hitReason" label="命中原因" min-width="180" show-overflow-tooltip />
              <el-table-column prop="score" label="得分" width="80" align="right" />
            </el-table>
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

          <template v-if="result.ragExplanation">
            <div class="sub-title ai-block-title">
              RAG JSON 解释结果
              <el-tag type="warning" size="small" effect="plain">JSON输出</el-tag>
            </div>
            <el-alert
              v-if="result.ragExplanation.ruleBasis"
              title="规则依据 ruleBasis"
              type="success"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.ragExplanation.ruleBasis" />
              </div>
            </el-alert>
            <el-alert
              v-if="result.ragExplanation.caseReference"
              title="案例参考 caseReference"
              type="info"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.ragExplanation.caseReference" />
              </div>
            </el-alert>
            <el-alert
              v-if="result.ragExplanation.recommendReason"
              title="推荐理由 recommendReason"
              type="success"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.ragExplanation.recommendReason" />
              </div>
            </el-alert>
            <el-alert
              v-if="result.ragExplanation.riskTip"
              title="风险提示 riskTip"
              type="warning"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.ragExplanation.riskTip" />
              </div>
            </el-alert>
            <el-alert
              v-if="result.ragExplanation.explanation"
              title="最终解释 finalExplanation"
              type="info"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.ragExplanation.explanation" />
              </div>
            </el-alert>
          </template>

          <template v-if="result.recommendedPlan?.plan">
            <div class="sub-title ai-block-title">
              方案JSON解释落库结果
              <el-tag type="warning" size="small" effect="plain">RAG</el-tag>
            </div>
            <el-alert
              v-if="result.recommendedPlan.plan.ruleBasis"
              title="规则依据 ruleBasis"
              type="success"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.recommendedPlan.plan.ruleBasis" />
              </div>
            </el-alert>
            <el-alert
              v-if="result.recommendedPlan.plan.caseReference"
              title="案例参考 caseReference"
              type="info"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.recommendedPlan.plan.caseReference" />
              </div>
            </el-alert>
            <el-alert
              v-if="result.recommendedPlan.plan.recommendReason"
              title="推荐理由 recommendReason"
              type="success"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.recommendedPlan.plan.recommendReason" />
              </div>
            </el-alert>
            <el-alert
              v-if="result.recommendedPlan.plan.riskTip"
              title="风险提示 riskTip"
              type="warning"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.recommendedPlan.plan.riskTip" />
              </div>
            </el-alert>
            <el-alert
              v-if="result.recommendedPlan.plan.finalExplanation || result.recommendedPlan.plan.explanation"
              title="最终解释 finalExplanation"
              type="info"
              :closable="false"
              show-icon
              class="mb ai-markdown-alert"
            >
              <div class="ai-markdown-scroll">
                <MarkdownContent :content="result.recommendedPlan.plan.finalExplanation || result.recommendedPlan.plan.explanation" />
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
                  <el-descriptions-item label="候选来源">
                    <el-tag :type="candidateSourceTag(candidate.plan.candidateSource)" size="small">
                      {{ candidateSourceLabel(candidate.plan.candidateSource, candidate.plan) }}
                    </el-tag>
                  </el-descriptions-item>
                </el-descriptions>
                <PlanScoreRadar v-if="candidate.plan" :plan="candidate.plan" class="mb" />
                <el-alert
                  v-if="candidate.plan?.aiCandidateReason"
                  title="AI候选生成理由"
                  type="warning"
                  :closable="false"
                  class="mb"
                >
                  <div class="plain-text">{{ candidate.plan.aiCandidateReason }}</div>
                </el-alert>
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
                  <el-table-column prop="productBatchNo" label="产品批次" min-width="150" show-overflow-tooltip />
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

  <el-drawer
    v-model="candidateDetailVisible"
    title="候选方案生成详情"
    size="76%"
    destroy-on-close
  >
    <div class="candidate-detail">
      <el-alert
        title="说明"
        type="info"
        :closable="false"
        class="mb"
      >
        <div class="plain-text">
          本页将大模型原始候选和系统枚举候选分开展示。系统枚举部分展示当前接口返回并落库的推荐/候选方案；如果需要展示后端内部全部枚举草稿，需要继续扩展后端响应。
        </div>
      </el-alert>

      <div class="detail-section-title">
        大模型生成候选
        <el-tag type="warning" effect="plain" size="small">
          原始 {{ result?.aiCandidateResult?.plans?.length ?? 0 }} 个
        </el-tag>
        <el-tag type="success" effect="plain" size="small">
          已评分 {{ aiEvaluatedCandidates.length }} 个
        </el-tag>
      </div>

      <el-descriptions v-if="result?.aiCandidateResult" :column="2" border size="small" class="mb">
        <el-descriptions-item label="调用模型">
          {{ result.aiCandidateResult.modelName || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="接收数量">
          {{ result.constraints?.acceptedAiCandidateCount ?? 0 }}
        </el-descriptions-item>
        <el-descriptions-item v-if="result.constraints?.aiCandidateError" label="错误信息" :span="2">
          {{ result.constraints.aiCandidateError }}
        </el-descriptions-item>
      </el-descriptions>

      <el-empty
        v-if="!result?.aiCandidateResult?.plans?.length"
        description="本次未返回大模型候选方案"
        class="detail-empty"
      />
      <el-table
        v-else
        :data="result.aiCandidateResult.plans"
        border
        size="small"
        class="mb"
      >
        <el-table-column type="expand">
          <template #default="{ row }">
            <el-table :data="formatAiDetailRows(row.items)" border size="small" class="inner-table">
              <el-table-column prop="coalName" label="煤种" min-width="130" show-overflow-tooltip />
              <el-table-column prop="productBatchNo" label="产品批次" min-width="170" show-overflow-tooltip />
              <el-table-column prop="ratio" label="配比" width="90">
                <template #default="{ row: detail }">
                  {{ detail.ratio != null ? `${Number(detail.ratio * 100).toFixed(0)}%` : '—' }}
                </template>
              </el-table-column>
              <el-table-column prop="useQuantity" label="用量(吨)" width="100" />
              <el-table-column prop="unitCost" label="单价" width="90" />
              <el-table-column prop="remark" label="库存说明" min-width="260" show-overflow-tooltip />
            </el-table>
          </template>
        </el-table-column>
        <el-table-column prop="planName" label="AI方案名" min-width="150" show-overflow-tooltip />
        <el-table-column prop="strategy" label="生成策略" min-width="220" show-overflow-tooltip />
        <el-table-column label="配比建议" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">
            {{ formatAiItems(row.items) }}
          </template>
        </el-table-column>
        <el-table-column prop="risk" label="AI风险提示" min-width="220" show-overflow-tooltip />
      </el-table>

      <template v-if="aiEvaluatedCandidates.length">
        <div class="detail-sub-title">AI候选经系统校验与评分后的结果</div>
        <el-collapse class="mb">
          <el-collapse-item
            v-for="(candidate, index) in aiEvaluatedCandidates"
            :key="`ai-eval-${index}`"
            :title="formatEvaluationTitle(candidate, index)"
            :name="`ai-${index}`"
          >
            <CandidatePlanDetail
              :candidate="candidate"
              :risk-label="riskLabel"
              :risk-tag-type="riskTagType"
              :candidate-source-label="candidateSourceLabel"
              :candidate-source-tag="candidateSourceTag"
            />
          </el-collapse-item>
        </el-collapse>
      </template>

      <div class="detail-section-title">
        系统枚举生成候选
        <el-tag
          :type="result?.constraints?.systemEnumerationEnabled ? 'info' : 'warning'"
          effect="plain"
          size="small"
        >
          {{ result?.constraints?.systemEnumerationEnabled ? `${systemEvaluatedCandidates.length} 个` : '当前已关闭' }}
        </el-tag>
      </div>
      <el-alert
        v-if="!result?.constraints?.systemEnumerationEnabled"
        title="系统枚举已临时禁用"
        type="warning"
        :closable="false"
        class="mb"
      >
        <div class="plain-text">
          当前仅使用大模型候选方案，并继续采用系统原有质量、成本、库存稳定性评分标准。后续可通过后端配置恢复系统枚举，用于与 AI 优化结果对比。
        </div>
      </el-alert>
      <el-empty
        v-if="result?.constraints?.systemEnumerationEnabled && !systemEvaluatedCandidates.length"
        description="当前返回结果中没有系统枚举候选评分"
        class="detail-empty"
      />
      <el-collapse v-else class="mb">
        <el-collapse-item
          v-for="(candidate, index) in systemEvaluatedCandidates"
          :key="`system-eval-${index}`"
          :title="formatEvaluationTitle(candidate, index)"
          :name="`system-${index}`"
        >
          <CandidatePlanDetail
            :candidate="candidate"
            :risk-label="riskLabel"
            :risk-tag-type="riskTagType"
            :candidate-source-label="candidateSourceLabel"
            :candidate-source-tag="candidateSourceTag"
          />
        </el-collapse-item>
      </el-collapse>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, defineComponent, h, onMounted, ref, resolveComponent } from 'vue'
import MarkdownContent from '@/components/MarkdownContent.vue'
import ParetoScatter from '@/components/ParetoScatter.vue'
import PlanScoreRadar from '@/components/PlanScoreRadar.vue'
import { generateBlendPlan } from '@/api/blendPlan'
import { fetchOrderPage } from '@/api/order'
import { auth } from '@/stores/auth'

const orderLoading = ref(false)
const orders = ref([])
const selectedOrder = ref(null)
const generating = ref(false)
const result = ref(null)
const candidateScope = ref('coal_type')
const candidateDetailVisible = ref(false)

// ── 多目标评分权重（当前为展示用，后续可扩展为后端 API 参数） ──
const qualityWeight = ref(50)
const costWeight = ref(20)
const stabilityWeight = ref(30)

// 归一化权重（保证三者和为 100）
const normalizedWeights = computed(() => {
  const sum = qualityWeight.value + costWeight.value + stabilityWeight.value
  if (sum === 0) return { q: 50, c: 20, s: 30 }
  return {
    q: Math.round((qualityWeight.value / sum) * 100),
    c: Math.round((costWeight.value / sum) * 100),
    s: 100 - Math.round((qualityWeight.value / sum) * 100) - Math.round((costWeight.value / sum) * 100),
  }
})

const persistedPlans = computed(() => {
  if (!result.value) return []
  return [result.value.recommendedPlan, ...(result.value.candidatePlans || [])].filter(Boolean)
})

const aiAcceptedPlans = computed(() =>
  persistedPlans.value.filter((item) => item?.plan?.candidateSource === 'ai'),
)

const systemGeneratedPlans = computed(() =>
  persistedPlans.value.filter((item) => item?.plan?.candidateSource !== 'ai'),
)

const aiEvaluatedCandidates = computed(() => {
  const rows = result.value?.aiEvaluatedCandidates || []
  return rows.map((row) => normalizeEvaluationCandidate(row))
})

const systemEvaluatedCandidates = computed(() => {
  const rows = result.value?.systemEvaluatedCandidates || []
  return rows.map((row) => normalizeEvaluationCandidate(row))
})

const materialLookup = computed(() => {
  const map = new Map()
  for (const plan of persistedPlans.value) {
    for (const detail of plan.details || []) {
      if (detail.productBatchNo) {
        map.set(`PB:${detail.productBatchNo}`, detail)
      }
      if (detail.coalId != null && !map.has(`COAL:${detail.coalId}`)) {
        map.set(`COAL:${detail.coalId}`, detail)
      }
    }
  }
  return map
})

// ── Pareto 散点图数据：从 persistedPlans 提取质量/成本 ──
const paretoData = computed(() => {
  return persistedPlans.value.map((item) => {
    const plan = item.plan || {}
    return {
      plan: {
        id: plan.id,
        planName: plan.planName,
        planCode: plan.planCode,
        totalCost: plan.totalCost,
        qualityScore: plan.qualityScore,
        costScore: plan.costScore,
        stabilityScore: plan.stabilityScore,
        overallScore: plan.overallScore,
        feasibleFlag: plan.feasibleFlag,
      },
      demandQuantity: result.value?.order?.demandQuantity || 1,
    }
  })
})

const recommendedPlanParetoId = computed(() => {
  return result.value?.recommendedPlan?.plan?.id || null
})

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

function candidateSourceLabel(source, plan = {}) {
  if (source === 'ai') {
    const modelName =
      plan.candidateModelName ||
      result.value?.aiCandidateResult?.modelName ||
      result.value?.constraints?.experimentModelName ||
      plan.aiModelName
    return modelName ? `大模型候选（${modelName}）` : '大模型候选'
  }
  const map = {
    system: '系统枚举',
    hybrid: '混合生成',
  }
  return map[source] || source || '系统枚举'
}

function candidateSourceTag(source) {
  if (source === 'ai') return 'warning'
  if (source === 'hybrid') return 'success'
  return 'info'
}

function formatAiItems(items = []) {
  if (!items.length) return '—'
  return items
    .map((item) => {
      const name = item.productBatchNo || `煤种${item.coalId ?? '—'}`
      const ratio = item.ratio != null ? `${Number(item.ratio * 100).toFixed(0)}%` : '—'
      return `${name} ${ratio}`
    })
    .join(' + ')
}

function findMaterialForAiItem(item) {
  if (item?.productBatchNo && materialLookup.value.has(`PB:${item.productBatchNo}`)) {
    return materialLookup.value.get(`PB:${item.productBatchNo}`)
  }
  if (item?.coalId != null && materialLookup.value.has(`COAL:${item.coalId}`)) {
    return materialLookup.value.get(`COAL:${item.coalId}`)
  }
  return null
}

function formatAiDetailRows(items = []) {
  const demand = Number(result.value?.order?.demandQuantity || 0)
  return items.map((item) => {
    const material = findMaterialForAiItem(item)
    const ratio = item.ratio != null ? Number(item.ratio) : null
    const useQuantity = ratio != null && demand > 0 ? Number((demand * ratio).toFixed(2)) : '—'
    return {
      coalName: material?.coalName || (item.coalId != null ? `煤种${item.coalId}` : '—'),
      productBatchNo: item.productBatchNo || material?.productBatchNo || '—',
      ratio,
      useQuantity,
      unitCost: material?.unitCost ?? '—',
      remark: material?.remark || item.reason || '—',
    }
  })
}

function formatPlanTitle(candidate, index) {
  const plan = candidate?.plan || {}
  const source = candidateSourceLabel(plan.candidateSource, plan)
  return `${index + 1}. ${plan.planName || '候选方案'}｜${source}｜综合分 ${plan.overallScore ?? '—'}｜总成本 ${plan.totalCost ?? '—'}`
}

function formatEvaluationTitle(candidate, index) {
  const plan = candidate?.plan || {}
  const source = candidateSourceLabel(plan.candidateSource, plan)
  const feasible = plan.feasibleFlag === 0 ? '不可行' : '可行'
  return `${index + 1}. ${plan.planName || '候选方案'}｜${source}｜${feasible}｜综合分 ${plan.overallScore ?? '—'}｜质量 ${plan.qualityScore ?? '—'}｜成本 ${plan.costScore ?? '—'}｜稳定 ${plan.stabilityScore ?? '—'}`
}

function normalizeEvaluationCandidate(row) {
  return {
    plan: {
      planName: row.planName,
      candidateSource: row.candidateSource,
      aiCandidateReason: row.aiCandidateReason,
      totalCost: row.totalCost,
      qualityScore: row.qualityScore,
      costScore: row.costScore,
      stabilityScore: row.stabilityScore,
      overallScore: row.overallScore,
      candidateModelName: result.value?.aiCandidateResult?.modelName || result.value?.constraints?.experimentModelName,
      feasibleFlag: row.feasibleFlag,
      constraintSummary: row.constraintSummary,
      scoreDetail: row.scoreDetail,
      riskLevel: row.riskLevel,
      riskTip: row.riskTip,
    },
    details: row.details || [],
  }
}

const CandidatePlanDetail = defineComponent({
  name: 'CandidatePlanDetail',
  props: {
    candidate: { type: Object, required: true },
    riskLabel: { type: Function, required: true },
    riskTagType: { type: Function, required: true },
    candidateSourceLabel: { type: Function, required: true },
    candidateSourceTag: { type: Function, required: true },
  },
  setup(props) {
    const ElAlert = resolveComponent('el-alert')
    const ElDescriptions = resolveComponent('el-descriptions')
    const ElDescriptionsItem = resolveComponent('el-descriptions-item')
    const ElTable = resolveComponent('el-table')
    const ElTableColumn = resolveComponent('el-table-column')
    const ElTag = resolveComponent('el-tag')
    const ratioText = (value) => (value != null ? `${Number(value * 100).toFixed(0)}%` : '—')
    return () => {
      const plan = props.candidate.plan || {}
      return h('div', { class: 'detail-plan' }, [
        h(
          ElDescriptions,
          { column: 3, border: true, size: 'small', class: 'mb' },
          {
            default: () => [
              h(ElDescriptionsItem, { label: '方案编号' }, () => plan.planCode || '—'),
              h(ElDescriptionsItem, { label: '综合分' }, () => plan.overallScore ?? '—'),
              h(ElDescriptionsItem, { label: '总成本' }, () => plan.totalCost ?? '—'),
              h(ElDescriptionsItem, { label: '质量分' }, () => plan.qualityScore ?? '—'),
              h(ElDescriptionsItem, { label: '成本分' }, () => plan.costScore ?? '—'),
              h(ElDescriptionsItem, { label: '稳定性分' }, () => plan.stabilityScore ?? '—'),
              h(ElDescriptionsItem, { label: '可行性' }, () =>
                h(
                  ElTag,
                  { type: plan.feasibleFlag === 0 ? 'danger' : 'success', size: 'small' },
                  () => (plan.feasibleFlag === 0 ? '存在硬约束问题' : '满足硬约束'),
                ),
              ),
              h(ElDescriptionsItem, { label: '风险等级' }, () =>
                h(
                  ElTag,
                  { type: props.riskTagType(plan.riskLevel), size: 'small' },
                  () => props.riskLabel(plan.riskLevel),
                ),
              ),
              h(ElDescriptionsItem, { label: '候选来源' }, () =>
                h(
                  ElTag,
                  { type: props.candidateSourceTag(plan.candidateSource), size: 'small' },
                  () => props.candidateSourceLabel(plan.candidateSource, plan),
                ),
              ),
            ],
          },
        ),
        plan.aiCandidateReason
          ? h(ElAlert, { title: 'AI候选生成理由', type: 'warning', closable: false, class: 'mb' }, {
              default: () => h('div', { class: 'plain-text' }, plan.aiCandidateReason),
            })
          : null,
        plan.constraintSummary
          ? h(ElAlert, { title: '约束校验', type: 'success', closable: false, class: 'mb' }, {
              default: () => h('div', { class: 'plain-text' }, plan.constraintSummary),
            })
          : null,
        plan.scoreDetail
          ? h(ElAlert, { title: '评分明细', type: 'info', closable: false, class: 'mb' }, {
              default: () => h('div', { class: 'plain-text' }, plan.scoreDetail),
            })
          : null,
        h(
          ElTable,
          { data: props.candidate.details || [], border: true, size: 'small' },
          {
            default: () => [
              h(ElTableColumn, { prop: 'coalName', label: '煤种', minWidth: 130, showOverflowTooltip: true }),
              h(ElTableColumn, { prop: 'productBatchNo', label: '产品批次', minWidth: 170, showOverflowTooltip: true }),
              h(ElTableColumn, { prop: 'blendRatio', label: '配比', width: 90 }, {
                default: ({ row }) => ratioText(row.blendRatio),
              }),
              h(ElTableColumn, { prop: 'useQuantity', label: '用量(吨)', width: 100 }),
              h(ElTableColumn, { prop: 'unitCost', label: '单价', width: 90 }),
              h(ElTableColumn, { prop: 'remark', label: '库存说明', minWidth: 220, showOverflowTooltip: true }),
            ],
          },
        ),
      ])
    }
  },
})

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
      candidateScope: candidateScope.value,
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

/* ── 权重调节面板 ── */
.weight-panel :deep(.el-card__header) {
  display: flex;
  align-items: center;
  padding: 10px 16px;
}

.weight-sliders {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 8px 16px;
}

.weight-item {
  display: grid;
  grid-template-columns: 48px 1fr 56px;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

.weight-label {
  color: #334155;
  font-weight: 500;
  text-align: right;
}

.weight-note {
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
  text-align: center;
}
</style>
