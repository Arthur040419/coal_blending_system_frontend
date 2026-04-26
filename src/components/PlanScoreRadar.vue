<template>
  <div class="score-radar">
    <div class="score-list">
      <div v-for="item in normalizedMetrics" :key="item.label" class="score-item">
        <span class="score-name">{{ item.label }}</span>
        <span class="score-value">{{ formatScore(item.value) }}</span>
        <el-progress
          :percentage="item.value"
          :show-text="false"
          :stroke-width="8"
          :color="item.color"
        />
      </div>
    </div>
    <svg class="radar-svg" viewBox="0 0 260 230" role="img" aria-label="方案评分雷达图">
      <polygon
        v-for="scale in gridScales"
        :key="scale"
        :points="polygonPoints(scale)"
        fill="none"
        stroke="#d8dee8"
        stroke-width="1"
      />
      <line
        v-for="(item, index) in normalizedMetrics"
        :key="item.label"
        :x1="center.x"
        :y1="center.y"
        :x2="axisPoint(index, 1).x"
        :y2="axisPoint(index, 1).y"
        stroke="#c6cedb"
        stroke-width="1"
      />
      <polygon :points="scorePolygon" fill="#2f9e75" fill-opacity="0.28" stroke="#1f7a59" stroke-width="2" />
      <circle
        v-for="(item, index) in normalizedMetrics"
        :key="`${item.label}-point`"
        :cx="axisPoint(index, item.value / 100).x"
        :cy="axisPoint(index, item.value / 100).y"
        r="3"
        fill="#1f7a59"
      />
      <text
        v-for="(item, index) in normalizedMetrics"
        :key="`${item.label}-label`"
        :x="axisPoint(index, 1.2).x"
        :y="axisPoint(index, 1.2).y"
        :text-anchor="labelAnchor(index)"
        class="radar-label"
      >
        {{ item.label }}
      </text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  plan: {
    type: Object,
    default: () => ({}),
  },
  metrics: {
    type: Array,
    default: null,
  },
})

const center = { x: 130, y: 112 }
const radius = 72
const gridScales = [0.25, 0.5, 0.75, 1]

const defaultMetrics = computed(() => [
  { label: '质量匹配', value: props.plan?.qualityScore, color: '#2f9e75' },
  { label: '成本优势', value: props.plan?.costScore, color: '#3b82f6' },
  { label: '库存合理', value: props.plan?.stabilityScore ?? props.plan?.inventoryScore, color: '#f59e0b' },
  { label: '综合效果', value: props.plan?.overallScore ?? props.plan?.finalScore, color: '#7c3aed' },
])

const normalizedMetrics = computed(() => {
  const source = props.metrics?.length ? props.metrics : defaultMetrics.value
  return source.map((item) => ({
    ...item,
    value: clampScore(item.value),
  }))
})

const scorePolygon = computed(() =>
  normalizedMetrics.value.map((item, index) => {
    const p = axisPoint(index, item.value / 100)
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
  }).join(' '),
)

function axisPoint(index, scale) {
  const count = normalizedMetrics.value.length || 1
  const angle = -Math.PI / 2 + index * 2 * Math.PI / count
  return {
    x: center.x + Math.cos(angle) * radius * scale,
    y: center.y + Math.sin(angle) * radius * scale,
  }
}

function polygonPoints(scale) {
  return normalizedMetrics.value.map((_, index) => {
    const p = axisPoint(index, scale)
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
  }).join(' ')
}

function labelAnchor(index) {
  const p = axisPoint(index, 1.2)
  if (p.x < center.x - 8) return 'end'
  if (p.x > center.x + 8) return 'start'
  return 'middle'
}

function clampScore(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function formatScore(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(0) : '0'
}
</script>

<style scoped>
.score-radar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 260px;
  gap: 12px;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}

.score-list {
  display: grid;
  gap: 10px;
}

.score-item {
  display: grid;
  grid-template-columns: 72px 40px 1fr;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}

.score-name {
  color: #334155;
}

.score-value {
  text-align: right;
  font-weight: 700;
  color: #0f172a;
}

.radar-svg {
  width: 260px;
  height: 230px;
}

.radar-label {
  font-size: 12px;
  fill: #334155;
}

@media (max-width: 720px) {
  .score-radar {
    grid-template-columns: 1fr;
  }

  .radar-svg {
    justify-self: center;
  }
}
</style>
