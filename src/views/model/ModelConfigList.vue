<template>
  <el-card shadow="never" class="panel">
    <template #header>
      <div class="panel-head">
        <span>模型配置</span>
        <el-button type="primary" @click="openCreate">新增配置</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="onSearch">
      <el-form-item label="类型">
        <el-input v-model="filters.modelType" clearable placeholder="如 LLM" style="width: 120px" @clear="onSearch" />
      </el-form-item>
      <el-form-item label="关键词">
        <el-input v-model="filters.keyword" clearable placeholder="模型名称/备注" style="width: 180px" @clear="onSearch" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="modelName" label="模型名称" min-width="140" />
      <el-table-column prop="modelType" label="类型" width="100" />
      <el-table-column prop="apiUrl" label="接口地址" min-width="160" show-overflow-tooltip />
      <el-table-column label="密钥" width="120">
        <template #default="{ row }">{{ maskApiKey(row.apiKey) }}</template>
      </el-table-column>
      <el-table-column prop="temperature" label="温度" width="70" align="right" />
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.status === 1"
            @change="(v) => onToggleStatus(row, v)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row.id)">查看</el-button>
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
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

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增模型配置' : '编辑模型配置'" width="600px" destroy-on-close @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="模型名称" prop="modelName">
          <el-input v-model="form.modelName" maxlength="100" />
        </el-form-item>
        <el-form-item label="模型类型" prop="modelType">
          <el-input v-model="form.modelType" maxlength="50" placeholder="LLM / RAG / OPT" />
        </el-form-item>
        <el-form-item label="接口地址" prop="apiUrl">
          <el-input v-model="form.apiUrl" maxlength="255" />
        </el-form-item>
        <el-form-item label="API Key" prop="apiKey">
          <el-input v-model="form.apiKey" type="password" show-password maxlength="255" placeholder="留空表示不修改（编辑时）" />
        </el-form-item>
        <el-form-item label="温度" prop="temperature">
          <el-input-number v-model="form.temperature" :min="0" :max="2" :step="0.1" :precision="2" style="width: 160px" />
        </el-form-item>
        <el-form-item label="Top P" prop="topP">
          <el-input-number v-model="form.topP" :min="0" :max="1" :step="0.05" :precision="2" style="width: 160px" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="配置详情" size="440px" destroy-on-close>
      <el-skeleton v-if="detailLoading" :rows="8" animated />
      <el-descriptions v-else-if="detail" :column="1" border size="small">
        <el-descriptions-item label="模型名称">{{ detail.modelName }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detail.modelType || '—' }}</el-descriptions-item>
        <el-descriptions-item label="接口">{{ detail.apiUrl || '—' }}</el-descriptions-item>
        <el-descriptions-item label="密钥">{{ maskApiKey(detail.apiKey) }}</el-descriptions-item>
        <el-descriptions-item label="温度">{{ detail.temperature ?? '—' }}</el-descriptions-item>
        <el-descriptions-item label="Top P">{{ detail.topP ?? '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status === 1 ? '启用' : '停用' }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ detail.remark || '—' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createTime) }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime, maskApiKey } from '@/utils/format'
import {
  createModelConfig,
  deleteModelConfig,
  fetchModelConfigDetail,
  fetchModelConfigPage,
  updateModelConfig,
  updateModelConfigStatus,
} from '@/api/modelConfig'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const current = ref(1)
const size = ref(10)
const filters = reactive({ modelType: '', keyword: '' })

const formVisible = ref(false)
const formMode = ref('create')
const saving = ref(false)
const formRef = ref(null)
const form = reactive({
  id: undefined,
  modelName: '',
  modelType: '',
  apiUrl: '',
  apiKey: '',
  temperature: undefined,
  topP: undefined,
  status: 1,
  remark: '',
})
const rules = {
  modelName: [{ required: true, message: '请输入模型名称', trigger: 'blur' }],
}

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

function buildQuery() {
  return {
    current: current.value,
    size: size.value,
    modelType: filters.modelType?.trim() || undefined,
    keyword: filters.keyword?.trim() || undefined,
  }
}

async function load() {
  loading.value = true
  try {
    const page = await fetchModelConfigPage(buildQuery())
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
  filters.modelType = ''
  filters.keyword = ''
  current.value = 1
  load()
}

function resetForm() {
  form.id = undefined
  form.modelName = ''
  form.modelType = ''
  form.apiUrl = ''
  form.apiKey = ''
  form.temperature = undefined
  form.topP = undefined
  form.status = 1
  form.remark = ''
  formRef.value?.clearValidate?.()
}

function openCreate() {
  formMode.value = 'create'
  resetForm()
  formVisible.value = true
}

function openEdit(row) {
  formMode.value = 'edit'
  resetForm()
  Object.assign(form, {
    id: row.id,
    modelName: row.modelName,
    modelType: row.modelType,
    apiUrl: row.apiUrl,
    apiKey: '',
    temperature: row.temperature != null ? Number(row.temperature) : undefined,
    topP: row.topP != null ? Number(row.topP) : undefined,
    status: row.status === 0 ? 0 : 1,
    remark: row.remark,
  })
  formVisible.value = true
}

async function submitForm() {
  await formRef.value?.validate?.()
  saving.value = true
  try {
    const body = {
      modelName: form.modelName?.trim(),
      modelType: form.modelType?.trim() || null,
      apiUrl: form.apiUrl?.trim() || null,
      temperature: form.temperature,
      topP: form.topP,
      status: form.status,
      remark: form.remark?.trim() || null,
    }
    if (form.apiKey?.trim()) {
      body.apiKey = form.apiKey.trim()
    }
    if (formMode.value === 'create') {
      await createModelConfig(body)
      ElMessage.success('新增成功')
    } else {
      body.id = form.id
      await updateModelConfig(body)
      ElMessage.success('保存成功')
    }
    formVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function openDetail(id) {
  detailVisible.value = true
  detail.value = null
  detailLoading.value = true
  try {
    detail.value = await fetchModelConfigDetail(id)
  } finally {
    detailLoading.value = false
  }
}

async function onToggleStatus(row, enabled) {
  try {
    await updateModelConfigStatus(row.id, enabled ? 1 : 0)
    ElMessage.success('状态已更新')
    row.status = enabled ? 1 : 0
  } catch {
    await load()
  }
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确定删除模型配置「${row.modelName}」吗？`, '删除确认', { type: 'warning' })
  await deleteModelConfig(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
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
</style>
