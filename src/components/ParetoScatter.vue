<template>
  <div class="pareto-container">
    <div class="pareto-header">
      <span class="pareto-title">质量-成本 Pareto 前沿</span>
      <span class="pareto-subtitle">{{ paretoPlans.length }} 个候选方案，{{ paretoFrontier.length }} 个 Pareto 最优</span>
    </div>
    <svg
      ref="svgRef"
      class="pareto-svg"
      :viewBox="`0 0 ${width} ${height}`"
      role="img"
      aria-label="质量-成本 Pareto 前沿图"
    >
      <!-- Y 轴网格线 -->
      <line
        v-for="tick in yTicks"
        :key="'y-' + tick"
        :x1="pad.left"
        :y1="y(tick)"
        :x2="width - pad.right"
        :y2="y(tick)"
        stroke="#e5e7eb"
        stroke-width="0.5"
      />
      <!-- X 轴网格线 -->
      <line
        v-for="tick in xTicks"
        :key="'x-' + tick"
        :x1="x(tick)"
        :y1="pad.top"
        :x2="x(tick)"
        :y2="height - pad.bottom"
        stroke="#e5e7eb"
        stroke-width="0.5"
      />

      <!-- 坐标轴 -->
      <line :x1="pad.left" :y1="height - pad.bottom" :x2="width - pad.right" :y2="height - pad.bottom" stroke="#64748b" stroke-width="1" />
      <line :x1="pad.left" :y1="pad.top" :x2="pad.left" :y2="height - pad.bottom" stroke="#64748b" stroke-width="1" />

      <!-- Y 轴标签 -->
      <text v-for="tick in yTicks" :key="'yl-' + tick" :x="pad.left - 8" :y="y(tick) + 4" text-anchor="end" class="axis-label">{{ tick }}</text>

      <!-- X 轴标签 -->
      <text v-for="tick in xTicks" :key="'xl-' + tick" :x="x(tick)" :y="height - pad.bottom + 16" text-anchor="middle" class="axis-label">{{ tick }}</text>

      <!-- 轴标题 -->
      <text :x="width / 2" :y="height - 4" text-anchor="middle" class="axis-title">吨煤成本（元/吨）→ 越低越好</text>
      <text :x="14" :y="height / 2" text-anchor="middle" class="axis-title" transform="rotate(-90, 14, 192)">质量评分 → 越高越好</text>

      <!-- Pareto 前沿连线 -->
      <polyline
        v-if="paretoFrontier.length > 1"
        :points="paretoLine"
        fill="none"
        stroke="#dc2626"
        stroke-width="2"
        stroke-dasharray="6,3"
        opacity="0.6"
      />

      <!-- 散点 -->
      <g v-for="(plan, index) in paretoPlans" :key="index">
        <circle
          :cx="x(plan.unitCost)"
          :cy="y(plan.qualityScore)"
          :r="plan.isRecommended ? 6 : 4.5"
          :fill="planFill(plan)"
          :stroke="plan.isRecommended ? '#1e40af' : planStroke(plan)"
          :stroke-width="plan.isRecommended ? 2 : 1.2"
          :opacity="plan.isRecommended ? 1 : plan.feasible ? 0.8 : 0.5"
          class="pareto-dot"
          @mouseenter="hoveredPlan = plan; hoverX = $event.offsetX; hoverY = $event.offsetY"
          @mouseleave="hoveredPlan = null"
        />
        <!-- 推荐方案标签 -->
        <text
          v-if="plan.isRecommended"
          :x="x(plan.unitCost) + 10"
          :y="y(plan.qualityScore) - 6"
          class="rec-tag"
          fill="#1e40af"
        >推荐</text>
      </g>

      <!-- Tooltip -->
      <g v-if="hoveredPlan" class="tooltip-group">
        <rect
          :x="tooltipX"
          :y="tooltipY"
          :width="tooltipWidth"
          :height="tooltipHeight"
          rx="4"
          fill="#1e293b"
          opacity="0.92"
        />
        <text :x="tooltipX + 8" :y="tooltipY + 16" fill="#fff" class="tooltip-text" font-weight="600">
          {{ hoveredPlan.planName || '候选方案' }}
        </text>
        <text :x="tooltipX + 8" :y="tooltipY + 32" fill="#cbd5e1" class="tooltip-text">
          质量 {{ formatNum(hoveredPlan.qualityScore) }} · 成本 {{ formatNum(hoveredPlan.unitCost) }} 元/吨
        </text>
        <text :x="tooltipX + 8" :y="tooltipY + 46" fill="#cbd5e1" class="tooltip-text">
          综合 {{ formatNum(hoveredPlan.overallScore) }} · {{ hoveredPlan.feasible ? '可行' : '存在硬约束问题' }}
        </text>
      </g>
    </svg>

    <!-- 图例 -->
    <div class="legend">
      <span class="legend-item"><span class="dot feasible"></span>满足硬约束</span>
      <span class="legend-item"><span class="dot infeasible"></span>存在硬约束问题</span>
      <span class="legend-item"><span class="dot recommended"></span>推荐方案</span>
      <span class="legend-item"><span class="line pareto-line"></span>Pareto 前沿</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  plans: { type: Array, default: () => [] },
  recommendedPlanId: { type: [Number, String], default: null },
})

const width = 480
const height = 384
const pad = { top: 32, right: 32, bottom: 48, left: 64 }

const hoveredPlan = ref(null)
const hoverX = ref(0)
const hoverY = ref(0)

const tooltipWidth = 200
const tooltipHeight = 58

const tooltipX = computed(() => {
  const raw = hoverX.value + 12
  return raw + tooltipWidth > width - pad.right ? raw - tooltipWidth - 24 : raw
})
const tooltipY = computed(() => {
  const raw = hoverY.value - tooltipHeight - 8
  return raw < pad.top ? hoverY.value + 12 : raw
})

const paretoPlans = computed(() => {
  if (!props.plans?.length) return []
  return props.plans
    .map((item) => {
      const plan = item.plan || {}
      const demand = item.demandQuantity || 1
      const totalCost = Number(plan.totalCost) || 0
      const unitCost = demand > 0 ? totalCost / demand : 0
      const qualityScore = Number(plan.qualityScore) || 0
      const overallScore = Number(plan.overallScore) || 0
      const feasible = plan.feasibleFlag !== 0
      return {
        planId: plan.id,
        planName: plan.planName,
        planCode: plan.planCode,
        unitCost,
        totalCost,
        qualityScore,
        overallScore,
        costScore: Number(plan.costScore) || 0,
        stabilityScore: Number(plan.stabilityScore) || 0,
        feasible,
        isRecommended: plan.id === props.recommendedPlanId || plan.planCode === props.recommendedPlanId,
      }
    })
    .filter((p) => p.qualityScore > 0 || p.unitCost > 0)
})

// 计算 Pareto 前沿（质量高且成本低的点不被任何其他点支配）
const paretoFrontier = computed(() => {
  const plans = paretoPlans.value.filter((p) => p.feasible)
  if (plans.length < 2) return plans
  const dominated = new Set()
  for (let i = 0; i < plans.length; i++) {
    for (let j = 0; j < plans.length; j++) {
      if (i === j) continue
      // i 被 j 支配：j 质量>=i 且 成本<=i 且至少一个严格
      if (
        plans[j].qualityScore >= plans[i].qualityScore &&
        plans[j].unitCost <= plans[i].unitCost &&
        (plans[j].qualityScore > plans[i].qualityScore || plans[j].unitCost < plans[i].unitCost)
      ) {
        dominated.add(i)
        break
      }
    }
  }
  const frontier = plans.filter((_, i) => !dominated.has(i))
  frontier.sort((a, b) => a.unitCost - b.unitCost)
  return frontier
})

const paretoLine = computed(() =>
  paretoFrontier.value
    .map((p) => `${x(p.unitCost).toFixed(1)},${y(p.qualityScore).toFixed(1)}`)
    .join(' '),
)

// 散点配色
function planFill(plan) {
  if (plan.isRecommended) return '#3b82f6'
  if (plan.feasible) return '#10b981'
  return '#f59e0b'
}
function planStroke(plan) {
  if (plan.isRecommended) return '#1e40af'
  if (plan.feasible) return '#059669'
  return '#d97706'
}

// 坐标范围
const xRange = computed(() => {
  const costs = paretoPlans.value.map((p) => p.unitCost).filter((v) => isFinite(v))
  if (!costs.length) return { min: 300, max: 600 }
  const rawMin = Math.min(...costs)
  const rawMax = Math.max(...costs)
  const padding = Math.max((rawMax - rawMin) * 0.1, 10)
  return { min: Math.floor(rawMin - padding), max: Math.ceil(rawMax + padding) }
})

const yRange = computed(() => {
  const scores = paretoPlans.value.map((p) => p.qualityScore).filter((v) => isFinite(v))
  if (!scores.length) return { min: 0, max: 100 }
  const rawMin = Math.min(...scores)
  const rawMax = Math.max(...scores)
  const padding = Math.max((rawMax - rawMin) * 0.1, 2)
  return { min: Math.max(0, Math.floor(rawMin - padding)), max: Math.min(100, Math.ceil(rawMax + padding)) }
})

const xTicks = computed(() => {
  const range = xRange.value
  const step = niceStep(range.max - range.min, 5)
  const ticks = []
  for (let v = Math.ceil(range.min / step) * step; v <= range.max; v += step) {
    ticks.push(Math.round(v))
  }
  return ticks
})
const yTicks = computed(() => {
  const range = yRange.value
  const step = niceStep(range.max - range.min, 5)
  const ticks = []
  for (let v = Math.ceil(range.min / step) * step; v <= range.max; v += step) {
    ticks.push(Math.round(v))
  }
  return ticks
})

function x(raw) {
  const range = xRange.value
  return pad.left + ((raw - range.min) / (range.max - range.min)) * (width - pad.left - pad.right)
}
function y(raw) {
  const range = yRange.value
  return pad.top + ((range.max - raw) / (range.max - range.min)) * (height - pad.top - pad.bottom)
}

function niceStep(span, targetTicks) {
  const raw = span / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const residual = raw / magnitude
  let nice = magnitude
  if (residual > 5) nice = magnitude * 10
  else if (residual > 2) nice = magnitude * 5
  else if (residual > 1) nice = magnitude * 2
  return nice
}

function formatNum(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(1) : '—'
}
</script>

<style scoped>
.pareto-container {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px 8px;
  margin-bottom: 12px;
}

.pareto-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

.pareto-title {
  font-weight: 600;
  font-size: 14px;
  color: #0f172a;
}

.pareto-subtitle {
  font-size: 12px;
  color: #64748b;
}

.pareto-svg {
  width: 100%;
  height: auto;
  display: block;
}

.axis-label {
  font-size: 11px;
  fill: #64748b;
}

.axis-title {
  font-size: 12px;
  fill: #334155;
}

.pareto-dot {
  cursor: pointer;
  transition: opacity 0.15s;
}

.pareto-dot:hover {
  opacity: 1 !important;
  stroke-width: 2.5;
}

.rec-tag {
  font-size: 11px;
  font-weight: 700;
}

.tooltip-text {
  font-size: 11px;
}

.legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 6px;
  font-size: 12px;
  color: #475569;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1.5px solid;
}

.dot.feasible {
  background: #10b981;
  border-color: #059669;
}

.dot.infeasible {
  background: #f59e0b;
  border-color: #d97706;
}

.dot.recommended {
  background: #3b82f6;
  border-color: #1e40af;
  width: 12px;
  height: 12px;
}

.line.pareto-line {
  display: inline-block;
  width: 20px;
  height: 2px;
  background: repeating-linear-gradient(
    90deg,
    #dc2626 0,
    #dc2626 6px,
    transparent 6px,
    transparent 9px
  );
  border: none;
  border-radius: 0;
  margin-top: -1px;
}
</style>
