<template>
  <el-card shadow="never" class="panel">
    <template #header>
      <div class="panel-head">
        <span>煤质管理</span>
        <el-button type="primary" @click="openCreate">新增煤质</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="onSearch">
      <el-form-item label="煤种">
        <el-select
          v-model="filters.coalId"
          clearable
          filterable
          placeholder="全部"
          style="width: 220px"
          @clear="onSearch"
        >
          <el-option v-for="o in coalOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部" style="width: 110px" @clear="onSearch">
          <el-option label="有效" :value="1" />
          <el-option label="无效" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item label="批次号">
        <el-input v-model="filters.keyword" clearable placeholder="模糊" style="width: 140px" @clear="onSearch" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column label="煤种" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ coalLabel(row.coalId) }}</template>
      </el-table-column>
      <el-table-column prop="batchNo" label="批次号" width="130" />
      <el-table-column prop="sampleTime" label="采样时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.sampleTime) }}</template>
      </el-table-column>
      <el-table-column prop="ashContent" label="灰分" width="80" align="right" />
      <el-table-column prop="sulfurContent" label="硫分" width="80" align="right" />
      <el-table-column prop="moistureContent" label="水分" width="80" align="right" />
      <el-table-column prop="volatileContent" label="挥发分" width="80" align="right" />
      <el-table-column prop="calorificValue" label="发热量" width="90" align="right" />
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '有效' : '无效' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
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

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增煤质' : '编辑煤质'" width="560px" destroy-on-close @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="煤种" prop="coalId">
          <el-select v-model="form.coalId" filterable placeholder="选择煤种" style="width: 100%" :disabled="formMode === 'edit'">
            <el-option v-for="o in coalOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="批次号" prop="batchNo">
          <el-input v-model="form.batchNo" maxlength="50" />
        </el-form-item>
        <el-form-item label="采样时间" prop="sampleTime">
          <el-date-picker
            v-model="form.sampleTime"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            style="width: 100%"
            placeholder="选择时间"
          />
        </el-form-item>
        <el-form-item label="灰分" prop="ashContent">
          <el-input-number v-model="form.ashContent" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="硫分" prop="sulfurContent">
          <el-input-number v-model="form.sulfurContent" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="水分" prop="moistureContent">
          <el-input-number v-model="form.moistureContent" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="挥发分" prop="volatileContent">
          <el-input-number v-model="form.volatileContent" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="发热量" prop="calorificValue">
          <el-input-number v-model="form.calorificValue" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="固定碳" prop="fixedCarbon">
          <el-input-number v-model="form.fixedCarbon" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">有效</el-radio>
            <el-radio :label="0">无效</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="煤质详情" size="420px" destroy-on-close>
      <el-skeleton v-if="detailLoading" :rows="10" animated />
      <el-descriptions v-else-if="detail" :column="1" border size="small">
        <el-descriptions-item label="煤种">{{ coalLabel(detail.coalId) }}</el-descriptions-item>
        <el-descriptions-item label="批次号">{{ detail.batchNo }}</el-descriptions-item>
        <el-descriptions-item label="采样时间">{{ formatDateTime(detail.sampleTime) }}</el-descriptions-item>
        <el-descriptions-item label="灰分">{{ formatMoney(detail.ashContent) }}</el-descriptions-item>
        <el-descriptions-item label="硫分">{{ formatMoney(detail.sulfurContent) }}</el-descriptions-item>
        <el-descriptions-item label="水分">{{ formatMoney(detail.moistureContent) }}</el-descriptions-item>
        <el-descriptions-item label="挥发分">{{ formatMoney(detail.volatileContent) }}</el-descriptions-item>
        <el-descriptions-item label="发热量">{{ formatMoney(detail.calorificValue) }}</el-descriptions-item>
        <el-descriptions-item label="固定碳">{{ formatMoney(detail.fixedCarbon) }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status === 1 ? '有效' : '无效' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createTime) }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useCoalTypes } from '@/composables/useCoalTypes'
import { formatDateTime, formatMoney } from '@/utils/format'
import {
  createCoalQuality,
  deleteCoalQuality,
  fetchCoalQualityDetail,
  fetchCoalQualityPage,
  updateCoalQuality,
} from '@/api/coalQuality'

const { coalOptions, load: loadCoals, coalLabel } = useCoalTypes()

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const current = ref(1)
const size = ref(10)
const filters = reactive({ coalId: undefined, status: undefined, keyword: '' })

const formVisible = ref(false)
const formMode = ref('create')
const saving = ref(false)
const formRef = ref(null)
const form = reactive({
  id: undefined,
  coalId: undefined,
  batchNo: '',
  sampleTime: '',
  ashContent: undefined,
  sulfurContent: undefined,
  moistureContent: undefined,
  volatileContent: undefined,
  calorificValue: undefined,
  fixedCarbon: undefined,
  status: 1,
})
const rules = {
  coalId: [{ required: true, message: '请选择煤种', trigger: 'change' }],
  batchNo: [{ required: true, message: '请输入批次号', trigger: 'blur' }],
}

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

function buildQuery() {
  return {
    current: current.value,
    size: size.value,
    coalId: filters.coalId,
    status: filters.status,
    keyword: filters.keyword?.trim() || undefined,
  }
}

async function load() {
  loading.value = true
  try {
    const page = await fetchCoalQualityPage(buildQuery())
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
  filters.coalId = undefined
  filters.status = undefined
  filters.keyword = ''
  current.value = 1
  load()
}

function resetForm() {
  form.id = undefined
  form.coalId = undefined
  form.batchNo = ''
  form.sampleTime = ''
  form.ashContent = undefined
  form.sulfurContent = undefined
  form.moistureContent = undefined
  form.volatileContent = undefined
  form.calorificValue = undefined
  form.fixedCarbon = undefined
  form.status = 1
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
    coalId: row.coalId,
    batchNo: row.batchNo,
    sampleTime: row.sampleTime ? String(row.sampleTime).replace(' ', 'T').slice(0, 19) : '',
    ashContent: row.ashContent != null ? Number(row.ashContent) : undefined,
    sulfurContent: row.sulfurContent != null ? Number(row.sulfurContent) : undefined,
    moistureContent: row.moistureContent != null ? Number(row.moistureContent) : undefined,
    volatileContent: row.volatileContent != null ? Number(row.volatileContent) : undefined,
    calorificValue: row.calorificValue != null ? Number(row.calorificValue) : undefined,
    fixedCarbon: row.fixedCarbon != null ? Number(row.fixedCarbon) : undefined,
    status: row.status === 0 ? 0 : 1,
  })
  formVisible.value = true
}

async function submitForm() {
  await formRef.value?.validate?.()
  saving.value = true
  try {
    const body = {
      coalId: form.coalId,
      batchNo: form.batchNo?.trim(),
      sampleTime: form.sampleTime || null,
      ashContent: form.ashContent,
      sulfurContent: form.sulfurContent,
      moistureContent: form.moistureContent,
      volatileContent: form.volatileContent,
      calorificValue: form.calorificValue,
      fixedCarbon: form.fixedCarbon,
      status: form.status,
    }
    if (formMode.value === 'create') {
      await createCoalQuality(body)
      ElMessage.success('新增成功')
    } else {
      body.id = form.id
      await updateCoalQuality(body)
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
    detail.value = await fetchCoalQualityDetail(id)
  } finally {
    detailLoading.value = false
  }
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确定删除批次「${row.batchNo}」的煤质记录吗？`, '删除确认', { type: 'warning' })
  await deleteCoalQuality(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(async () => {
  await loadCoals()
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
</style>
