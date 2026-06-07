<template>
  <div class="rag-workspace">
    <el-card shadow="never" class="panel">
      <template #header>
        <div class="panel-head">
          <span>RAG 知识库</span>
          <div class="actions">
            <el-tag :type="health?.qdrantAvailable ? 'success' : 'danger'" effect="plain">
              Qdrant {{ health?.qdrantAvailable ? '正常' : '不可用' }}
            </el-tag>
            <el-button :icon="Refresh" :loading="loadingHealth" @click="loadHealth">刷新状态</el-button>
            <el-button type="primary" :icon="Upload" :loading="ingesting" @click="onIngestAll">同步知识库</el-button>
          </div>
        </div>
      </template>

      <el-row :gutter="16">
        <el-col :xs="24" :lg="8">
          <el-statistic title="文档数" :value="documents.length" />
        </el-col>
        <el-col :xs="24" :lg="8">
          <el-statistic title="切片数" :value="chunks.length" />
        </el-col>
        <el-col :xs="24" :lg="8">
          <el-statistic title="最近同步切片" :value="lastIngestChunks" />
        </el-col>
      </el-row>
    </el-card>

    <div class="work-grid">
      <el-card shadow="never" class="panel">
        <template #header>
          <div class="panel-head">
            <span>RAG 文档</span>
            <el-button :icon="Refresh" :loading="loadingDocs" @click="loadDocuments">刷新</el-button>
          </div>
        </template>
        <el-table
          v-loading="loadingDocs"
          :data="documents"
          border
          height="390"
          highlight-current-row
          @current-change="onDocumentSelect"
        >
          <el-table-column prop="docCode" label="编号" width="120" show-overflow-tooltip />
          <el-table-column prop="title" label="标题" min-width="170" show-overflow-tooltip />
          <el-table-column prop="docType" label="类型" width="80" />
          <el-table-column prop="sourceType" label="来源" width="120" show-overflow-tooltip />
          <el-table-column prop="updateTime" label="更新时间" width="160" />
        </el-table>
      </el-card>

      <el-card shadow="never" class="panel">
        <template #header>
          <div class="panel-head">
            <span>知识切片</span>
            <el-tag v-if="selectedDocument" effect="plain">{{ selectedDocument.title }}</el-tag>
          </div>
        </template>
        <el-table v-loading="loadingChunks" :data="chunks" border height="390">
          <el-table-column prop="chunkCode" label="切片编号" width="140" show-overflow-tooltip />
          <el-table-column prop="embeddingModel" label="向量模型" width="120" show-overflow-tooltip />
          <el-table-column prop="vectorId" label="向量ID" width="100" />
          <el-table-column label="内容" min-width="260" show-overflow-tooltip>
            <template #default="{ row }">{{ row.chunkText }}</template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-card shadow="never" class="panel">
      <template #header>
        <div class="panel-head">
          <span>订单检索验证</span>
          <div class="actions">
            <el-select
              v-model="selectedOrderId"
              filterable
              placeholder="选择订单"
              class="order-select"
              :loading="loadingOrders"
            >
              <el-option
                v-for="order in orders"
                :key="order.id"
                :label="`${order.orderCode || order.id} · ${order.customerName || ''}`"
                :value="order.id"
              />
            </el-select>
            <el-input-number v-model="topK" :min="3" :max="20" controls-position="right" />
            <el-button type="primary" :icon="Search" :disabled="!selectedOrderId" :loading="retrieving" @click="onRetrieve">
              检索
            </el-button>
          </div>
        </div>
      </template>

      <el-descriptions v-if="retrieveResult" :column="3" border size="small" class="mb">
        <el-descriptions-item label="召回模式">{{ retrieveResult.retrievalMode || '—' }}</el-descriptions-item>
        <el-descriptions-item label="向量模型">{{ retrieveResult.embeddingModel || '—' }}</el-descriptions-item>
        <el-descriptions-item label="命中切片">{{ retrieveResult.matchedChunkIds?.length || 0 }}</el-descriptions-item>
        <el-descriptions-item label="查询文本" :span="3">
          <span class="wrap-text">{{ retrieveResult.queryText || '—' }}</span>
        </el-descriptions-item>
      </el-descriptions>

      <el-empty v-if="!retrieveRows.length" description="暂无检索结果" />
      <el-table v-else :data="retrieveRows" border>
        <el-table-column label="证据" width="130">
          <template #default="{ row }">RAG-CHUNK-{{ row.chunkId || row.id }}</template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <el-table-column prop="knowledgeType" label="类型" width="90" />
        <el-table-column label="得分" width="100" align="right">
          <template #default="{ row }">{{ formatNum(row.score, 4) }}</template>
        </el-table-column>
        <el-table-column label="召回方式" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.retrievalMode || '—' }}</template>
        </el-table-column>
        <el-table-column label="内容" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">{{ row.content }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Search, Upload } from '@element-plus/icons-vue'
import {
  fetchRagChunks,
  fetchRagDocuments,
  fetchRagHealth,
  ingestAllRag,
  retrieveRagByOrder,
} from '@/api/rag'
import { fetchOrderPage } from '@/api/order'

const health = ref(null)
const documents = ref([])
const chunks = ref([])
const orders = ref([])
const selectedDocument = ref(null)
const selectedOrderId = ref(null)
const retrieveResult = ref(null)
const topK = ref(8)
const lastIngest = ref(null)

const loadingHealth = ref(false)
const loadingDocs = ref(false)
const loadingChunks = ref(false)
const loadingOrders = ref(false)
const ingesting = ref(false)
const retrieving = ref(false)

const retrieveRows = computed(() => retrieveResult.value?.all || [])
const lastIngestChunks = computed(() => Number(lastIngest.value?.chunks || 0))

async function loadHealth() {
  loadingHealth.value = true
  try {
    health.value = await fetchRagHealth()
  } finally {
    loadingHealth.value = false
  }
}

async function loadDocuments() {
  loadingDocs.value = true
  try {
    documents.value = await fetchRagDocuments({ limit: 50 })
  } finally {
    loadingDocs.value = false
  }
}

async function loadChunks(documentId = null) {
  loadingChunks.value = true
  try {
    chunks.value = await fetchRagChunks({ documentId: documentId || undefined, limit: 100 })
  } finally {
    loadingChunks.value = false
  }
}

async function loadOrders() {
  loadingOrders.value = true
  try {
    const page = await fetchOrderPage({ current: 1, size: 50 })
    orders.value = page?.records || []
    selectedOrderId.value = selectedOrderId.value || orders.value[0]?.id || null
  } finally {
    loadingOrders.value = false
  }
}

async function onIngestAll() {
  ingesting.value = true
  try {
    lastIngest.value = await ingestAllRag()
    ElMessage.success('RAG 知识库同步完成')
    await Promise.all([loadHealth(), loadDocuments(), loadChunks(selectedDocument.value?.id)])
  } finally {
    ingesting.value = false
  }
}

async function onDocumentSelect(row) {
  selectedDocument.value = row || null
  await loadChunks(row?.id || null)
}

async function onRetrieve() {
  if (!selectedOrderId.value) return
  retrieving.value = true
  try {
    retrieveResult.value = await retrieveRagByOrder(selectedOrderId.value, { topK: topK.value })
  } finally {
    retrieving.value = false
  }
}

function formatNum(value, digits = 2) {
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(digits).replace(/\.?0+$/, '') : '—'
}

onMounted(async () => {
  await Promise.all([loadHealth(), loadDocuments(), loadChunks(), loadOrders()])
})
</script>

<style scoped>
.rag-workspace {
  display: grid;
  gap: 16px;
}

.panel {
  border-radius: 8px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.work-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.order-select {
  width: 280px;
}

.mb {
  margin-bottom: 12px;
}

.wrap-text {
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1100px) {
  .work-grid {
    grid-template-columns: 1fr;
  }

  .panel-head,
  .actions {
    align-items: stretch;
    flex-direction: column;
  }

  .order-select {
    width: 100%;
  }
}
</style>
