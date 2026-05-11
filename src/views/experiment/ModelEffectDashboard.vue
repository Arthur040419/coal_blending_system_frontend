<template>
  <div class="model-effect">
    <el-card shadow="never" class="panel">
      <div class="toolbar">
        <el-form :inline="true" :model="filters" class="filter-form">
          <el-form-item label="模型">
            <el-select v-model="filters.modelName" clearable filterable placeholder="全部模型" style="width: 240px">
              <el-option
                v-for="name in modelOptions"
                :key="name"
                :label="name"
                :value="name"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="订单">
            <el-select v-model="filters.orderId" clearable filterable placeholder="全部订单" style="width: 220px">
              <el-option
                v-for="order in orders"
                :key="order.id"
                :label="order.orderCode || `订单${order.id}`"
                :value="order.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="load">查询</el-button>
            <el-button :icon="Refresh" @click="reset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <el-empty v-if="!loading && !rows.length" description="暂无模型实验记录" />

    <template v-else>
      <div class="metric-grid">
        <div class="metric-cell">
          <span class="metric-label">模型数</span>
          <strong>{{ rows.length }}</strong>
        </div>
        <div class="metric-cell">
          <span class="metric-label">累计实验</span>
          <strong>{{ totalExperimentCount }}</strong>
        </div>
        <div class="metric-cell">
          <span class="metric-label">最佳模型</span>
          <strong>{{ bestModel?.modelName || '—' }}</strong>
        </div>
        <div class="metric-cell">
          <span class="metric-label">最高效果</span>
          <strong>{{ formatNum(bestModel?.avgModelEffectScore) }}</strong>
        </div>
      </div>

      <div class="chart-grid">
        <el-card shadow="never" class="panel">
          <template #header>
            <div class="panel-head">
              <span>模型综合评价对比</span>
              <el-tag type="info" effect="plain">{{ rows.length }} 个模型</el-tag>
            </div>
          </template>
          <div ref="barChartRef" class="chart"></div>
        </el-card>

        <el-card shadow="never" class="panel">
          <template #header>
            <div class="panel-head">
              <span>模型能力雷达</span>
              <el-select
                v-model="selectedRadarModelNames"
                multiple
                collapse-tags
                collapse-tags-tooltip
                :multiple-limit="3"
                filterable
                placeholder="最多选择3个模型"
                style="width: 280px"
              >
                <el-option
                  v-for="row in rows"
                  :key="row.modelName"
                  :label="row.modelName"
                  :value="row.modelName"
                />
              </el-select>
            </div>
          </template>
          <div ref="radarChartRef" class="chart"></div>
        </el-card>
      </div>

      <el-card shadow="never" class="panel">
        <template #header>
          <div class="panel-head">
            <span>实验趋势</span>
            <el-tag v-if="selectedModel" type="info" effect="plain">{{ selectedModel.modelName }}</el-tag>
          </div>
        </template>
        <div ref="trendChartRef" class="trend-chart"></div>
      </el-card>

      <el-card shadow="never" class="panel">
        <template #header>模型效果汇总</template>
        <el-table
          v-loading="loading"
          :data="rows"
          border
          row-key="modelName"
          highlight-current-row
          @current-change="onSelectRow"
        >
          <el-table-column prop="modelName" label="模型" min-width="180" show-overflow-tooltip />
          <el-table-column prop="experimentCount" label="实验次数" width="90" align="right" />
          <el-table-column prop="planCount" label="候选记录" width="90" align="right" />
          <el-table-column label="可行率" width="110" align="right">
            <template #default="{ row }">{{ percent(row.feasibleRate) }}</template>
          </el-table-column>
          <el-table-column label="生成成功" width="100" align="right">
            <template #default="{ row }">{{ percent(row.generationSuccessRate) }}</template>
          </el-table-column>
          <el-table-column label="候选有效" width="100" align="right">
            <template #default="{ row }">{{ percent(row.effectiveCandidateRate) }}</template>
          </el-table-column>
          <el-table-column label="模型效果" width="100" align="right">
            <template #default="{ row }">{{ formatNum(row.avgModelEffectScore) }}</template>
          </el-table-column>
          <el-table-column label="方案综合" width="100" align="right">
            <template #default="{ row }">{{ formatNum(row.avgFinalScore) }}</template>
          </el-table-column>
          <el-table-column label="质量" width="85" align="right">
            <template #default="{ row }">{{ formatNum(row.avgQualityScore) }}</template>
          </el-table-column>
          <el-table-column label="成本" width="85" align="right">
            <template #default="{ row }">{{ formatNum(row.avgCostScore) }}</template>
          </el-table-column>
          <el-table-column label="库存" width="85" align="right">
            <template #default="{ row }">{{ formatNum(row.avgInventoryScore) }}</template>
          </el-table-column>
          <el-table-column label="平均总成本" width="125" align="right">
            <template #default="{ row }">{{ formatMoney(row.avgTotalCost, 0) }}</template>
          </el-table-column>
          <el-table-column label="最好综合" width="100" align="right">
            <template #default="{ row }">{{ formatNum(row.bestFinalScore) }}</template>
          </el-table-column>
          <el-table-column label="最近实验" width="160">
            <template #default="{ row }">{{ formatDateTime(row.lastCreateTime) }}</template>
          </el-table-column>
        </el-table>
      </el-card>

      <el-card v-if="selectedModel" shadow="never" class="panel">
        <template #header>选中模型实验明细</template>
        <el-table :data="selectedTrendRows" border size="small">
          <el-table-column prop="experimentCode" label="实验编号" min-width="180" show-overflow-tooltip />
          <el-table-column prop="orderId" label="订单ID" width="90" align="right" />
          <el-table-column prop="planId" label="方案ID" width="90" align="right" />
          <el-table-column label="综合" width="90" align="right">
            <template #default="{ row }">{{ formatNum(row.finalScore) }}</template>
          </el-table-column>
          <el-table-column label="模型效果" width="95" align="right">
            <template #default="{ row }">{{ formatNum(row.modelEffectScore) }}</template>
          </el-table-column>
          <el-table-column label="有效候选" width="95" align="right">
            <template #default="{ row }">{{ `${row.acceptedAiCandidateCount ?? 0}/${row.aiCandidatePlanCount ?? 0}` }}</template>
          </el-table-column>
          <el-table-column label="质量" width="90" align="right">
            <template #default="{ row }">{{ formatNum(row.qualityScore) }}</template>
          </el-table-column>
          <el-table-column label="成本" width="90" align="right">
            <template #default="{ row }">{{ formatNum(row.costScore) }}</template>
          </el-table-column>
          <el-table-column label="库存" width="90" align="right">
            <template #default="{ row }">{{ formatNum(row.inventoryScore) }}</template>
          </el-table-column>
          <el-table-column label="可行" width="80">
            <template #default="{ row }">
              <el-tag :type="row.feasible ? 'success' : 'danger'" size="small">
                {{ row.feasible ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { Refresh, Search } from '@element-plus/icons-vue'
import { fetchExperimentModelEffect } from '@/api/experimentRecord'
import { fetchOrderPage } from '@/api/order'
import { formatDateTime, formatMoney } from '@/utils/format'

const loading = ref(false)
const rows = ref([])
const orders = ref([])
const selectedModelName = ref('')
const selectedRadarModelNames = ref([])
const filters = reactive({
  modelName: '',
  orderId: undefined,
})

const barChartRef = ref(null)
const radarChartRef = ref(null)
const trendChartRef = ref(null)
let barChart = null
let radarChart = null
let trendChart = null

const modelOptions = computed(() => rows.value.map((row) => row.modelName).filter(Boolean))
const selectedModel = computed(() => rows.value.find((row) => row.modelName === selectedModelName.value) || rows.value[0] || null)
const selectedRadarModels = computed(() =>
  selectedRadarModelNames.value
    .map((name) => rows.value.find((row) => row.modelName === name))
    .filter(Boolean)
    .slice(0, 3),
)
const selectedTrendRows = computed(() => [...(selectedModel.value?.trend || [])].reverse())
const totalExperimentCount = computed(() => rows.value.reduce((sum, row) => sum + Number(row.experimentCount || 0), 0))
const bestModel = computed(() => rows.value[0] || null)

async function loadOrders() {
  const page = await fetchOrderPage({ current: 1, size: 200 })
  orders.value = page?.records ?? []
}

async function load() {
  loading.value = true
  try {
    const data = await fetchExperimentModelEffect({
      modelName: filters.modelName || undefined,
      orderId: filters.orderId || undefined,
    })
    rows.value = Array.isArray(data) ? data : []
    if (!rows.value.some((row) => row.modelName === selectedModelName.value)) {
      selectedModelName.value = rows.value[0]?.modelName || ''
    }
    normalizeRadarSelection()
  } finally {
    loading.value = false
    scheduleRender()
  }
}

function reset() {
  filters.modelName = ''
  filters.orderId = undefined
  load()
}

function onSelectRow(row) {
  if (row?.modelName) {
    selectedModelName.value = row.modelName
    includeRadarModel(row.modelName)
  }
}

function renderCharts() {
  renderBarChart()
  renderRadarChart()
  renderTrendChart()
}

function renderBarChart() {
  if (!barChartRef.value || !rows.value.length) {
    barChart?.dispose()
    barChart = null
    return
  }
  if (!barChart) barChart = echarts.init(barChartRef.value)
  const names = rows.value.map((row) => row.modelName)
  barChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 46, right: 18, top: 42, bottom: 72 },
    xAxis: { type: 'category', data: names, axisLabel: { interval: 0, rotate: names.length > 3 ? 24 : 0 } },
    yAxis: { type: 'value', min: 0, max: 100 },
    series: [
      { name: '模型效果', type: 'bar', data: rows.value.map((row) => num(row.avgModelEffectScore)), itemStyle: { color: '#2563eb' } },
      { name: '方案综合', type: 'bar', data: rows.value.map((row) => num(row.avgFinalScore)), itemStyle: { color: '#16a34a' } },
      { name: '可行率', type: 'bar', data: rows.value.map((row) => percentNum(row.feasibleRate)), itemStyle: { color: '#f59e0b' } },
      { name: '有效候选', type: 'bar', data: rows.value.map((row) => percentNum(row.effectiveCandidateRate)), itemStyle: { color: '#7c3aed' } },
    ],
    animation: false,
  })
  barChart.resize()
}

function renderRadarChart() {
  if (!radarChartRef.value || !selectedRadarModels.value.length) {
    radarChart?.dispose()
    radarChart = null
    return
  }
  if (!radarChart) radarChart = echarts.init(radarChartRef.value)
  radarChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { top: 0, type: 'scroll' },
    radar: {
      radius: '62%',
      center: ['50%', '56%'],
      indicator: [
        { name: '方案质量', max: 100 },
        { name: '可执行性', max: 100 },
        { name: '候选有效', max: 100 },
        { name: '生成稳定', max: 100 },
        { name: '模型效果', max: 100 },
      ],
    },
    series: [
      {
        type: 'radar',
        data: selectedRadarModels.value.map((row, index) => {
          const color = radarColor(index)
          return {
            name: row.modelName,
            value: [
              row.avgFinalScore,
              percentNum(row.feasibleRate),
              percentNum(row.effectiveCandidateRate),
              percentNum(row.generationSuccessRate),
              row.avgModelEffectScore,
            ].map(num),
            areaStyle: { color: radarAreaColor(index) },
            lineStyle: { color, width: 2 },
            itemStyle: { color },
          }
        }),
      },
    ],
    animation: false,
  })
  radarChart.resize()
}

function renderTrendChart() {
  if (!trendChartRef.value || !selectedModel.value?.trend?.length) {
    trendChart?.dispose()
    trendChart = null
    return
  }
  if (!trendChart) trendChart = echarts.init(trendChartRef.value)
  const trend = selectedModel.value.trend || []
  trendChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 48, right: 26, top: 42, bottom: 56 },
    xAxis: {
      type: 'category',
      data: trend.map((row) => formatDateTime(row.createTime).slice(5, 16)),
    },
    yAxis: { type: 'value', min: 0, max: 100 },
    series: [
      { name: '模型效果', type: 'line', smooth: true, data: trend.map((row) => num(row.modelEffectScore)), color: '#2563eb' },
      { name: '方案综合', type: 'line', smooth: true, data: trend.map((row) => num(row.finalScore)), color: '#16a34a' },
      { name: '有效候选', type: 'line', smooth: true, data: trend.map((row) => percentNum(row.effectiveCandidateRate)), color: '#7c3aed' },
    ],
    animation: false,
  })
  trendChart.resize()
}

function scheduleRender() {
  nextTick(() => window.requestAnimationFrame(renderCharts))
}

function resizeCharts() {
  barChart?.resize()
  radarChart?.resize()
  trendChart?.resize()
}

function disposeCharts() {
  barChart?.dispose()
  radarChart?.dispose()
  trendChart?.dispose()
  barChart = null
  radarChart = null
  trendChart = null
}

function normalizeRadarSelection() {
  const valid = selectedRadarModelNames.value
    .filter((name) => rows.value.some((row) => row.modelName === name))
    .slice(0, 3)
  selectedRadarModelNames.value = valid.length ? valid : rows.value.slice(0, 3).map((row) => row.modelName)
}

function includeRadarModel(modelName) {
  if (!modelName) return
  const names = selectedRadarModelNames.value.filter((name) => name !== modelName)
  names.unshift(modelName)
  selectedRadarModelNames.value = names.slice(0, 3)
}

function radarColor(index) {
  return ['#2563eb', '#16a34a', '#f59e0b'][index] || '#64748b'
}

function radarAreaColor(index) {
  return ['rgba(37, 99, 235, 0.14)', 'rgba(22, 163, 74, 0.12)', 'rgba(245, 158, 11, 0.12)'][index] || 'rgba(100, 116, 139, 0.12)'
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0
}

function percentNum(value) {
  return num(value) * 100
}

function formatNum(value) {
  return num(value).toFixed(2).replace(/\.?0+$/, '')
}

function percent(value) {
  return `${Math.round(num(value) * 100)}%`
}

watch(selectedModelName, () => scheduleRender())
watch(selectedRadarModelNames, () => {
  if (selectedRadarModelNames.value.length > 3) {
    selectedRadarModelNames.value = selectedRadarModelNames.value.slice(0, 3)
    return
  }
  scheduleRender()
}, { deep: true })
watch(rows, () => scheduleRender(), { deep: true })

onMounted(() => {
  loadOrders()
  load()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  disposeCharts()
})
</script>

<style scoped>
.model-effect {
  display: grid;
  gap: 16px;
  max-width: 100%;
  min-width: 0;
}

.panel {
  border-radius: 8px;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
}

.toolbar,
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-form {
  margin-bottom: -18px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 12px;
}

.metric-cell {
  min-height: 78px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 14px 16px;
  display: grid;
  align-content: center;
  gap: 6px;
}

.metric-label {
  color: #64748b;
  font-size: 13px;
}

.metric-cell strong {
  color: #0f172a;
  font-size: 22px;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(340px, 0.7fr);
  gap: 16px;
  min-width: 0;
}

.chart,
.trend-chart {
  width: 100%;
  height: 340px;
}

.trend-chart {
  height: 300px;
}

@media (max-width: 900px) {
  .metric-grid,
  .chart-grid {
    grid-template-columns: 1fr;
  }
}
</style>
