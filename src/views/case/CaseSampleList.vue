<template>
  <el-card shadow="never" class="panel">
    <template #header>
      <div class="panel-head">
        <span>历史案例</span>
        <el-button type="primary" @click="openCreate">新增案例</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="onSearch">
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部" style="width: 110px" @clear="onSearch">
          <el-option label="有效" :value="1" />
          <el-option label="无效" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词">
        <el-input v-model="filters.keyword" clearable placeholder="名称/编号/描述" style="width: 200px" @clear="onSearch" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="caseCode" label="案例编号" width="130" />
      <el-table-column prop="caseName" label="案例名称" min-width="140" show-overflow-tooltip />
      <el-table-column prop="qualityResult" label="质量结果" min-width="120" show-overflow-tooltip />
      <el-table-column prop="costResult" label="成本(万元)" width="110" align="right">
        <template #default="{ row }">{{ formatMoney(row.costResult) }}</template>
      </el-table-column>
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

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增案例' : '编辑案例'" width="720px" destroy-on-close @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="案例编号" prop="caseCode">
          <el-input v-model="form.caseCode" :disabled="formMode === 'edit'" maxlength="50" />
        </el-form-item>
        <el-form-item label="案例名称" prop="caseName">
          <el-input v-model="form.caseName" maxlength="100" />
        </el-form-item>
        <el-form-item label="订单描述" prop="orderDesc">
          <el-input v-model="form.orderDesc" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="配煤描述" prop="blendDesc">
          <el-input v-model="form.blendDesc" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="结果描述" prop="resultDesc">
          <el-input v-model="form.resultDesc" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="质量结果" prop="qualityResult">
          <el-input v-model="form.qualityResult" maxlength="255" />
        </el-form-item>
        <el-form-item label="成本结果" prop="costResult">
          <el-input-number v-model="form.costResult" :min="0" :precision="2" style="width: 200px" />
        </el-form-item>
        <el-form-item label="效果评价" prop="effectivenessEval">
          <el-input v-model="form.effectivenessEval" maxlength="255" />
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

    <el-drawer v-model="detailVisible" title="案例详情" size="520px" destroy-on-close>
      <el-skeleton v-if="detailLoading" :rows="10" animated />
      <div v-else-if="detail" class="detail-block">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="案例编号">{{ detail.caseCode }}</el-descriptions-item>
          <el-descriptions-item label="案例名称">{{ detail.caseName }}</el-descriptions-item>
          <el-descriptions-item label="质量结果">{{ detail.qualityResult || '—' }}</el-descriptions-item>
          <el-descriptions-item label="成本结果">{{ formatMoney(detail.costResult) }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detail.status === 1 ? '有效' : '无效' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createTime) }}</el-descriptions-item>
        </el-descriptions>
        <div class="mt"><strong>订单描述</strong><p class="text">{{ detail.orderDesc || '—' }}</p></div>
        <div class="mt"><strong>配煤描述</strong><p class="text">{{ detail.blendDesc || '—' }}</p></div>
        <div class="mt"><strong>结果描述</strong><p class="text">{{ detail.resultDesc || '—' }}</p></div>
        <div class="mt"><strong>效果评价</strong><p class="text">{{ detail.effectivenessEval || '—' }}</p></div>
      </div>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime, formatMoney } from '@/utils/format'
import {
  createCaseSample,
  deleteCaseSample,
  fetchCaseSampleDetail,
  fetchCaseSamplePage,
  updateCaseSample,
} from '@/api/caseSample'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const current = ref(1)
const size = ref(10)
const filters = reactive({ status: undefined, keyword: '' })

const formVisible = ref(false)
const formMode = ref('create')
const saving = ref(false)
const formRef = ref(null)
const form = reactive({
  id: undefined,
  caseCode: '',
  caseName: '',
  orderDesc: '',
  blendDesc: '',
  resultDesc: '',
  qualityResult: '',
  costResult: undefined,
  effectivenessEval: '',
  status: 1,
})
const rules = {
  caseCode: [{ required: true, message: '请输入案例编号', trigger: 'blur' }],
  caseName: [{ required: true, message: '请输入案例名称', trigger: 'blur' }],
}

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

function buildQuery() {
  return {
    current: current.value,
    size: size.value,
    status: filters.status,
    keyword: filters.keyword?.trim() || undefined,
  }
}

async function load() {
  loading.value = true
  try {
    const page = await fetchCaseSamplePage(buildQuery())
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
  filters.status = undefined
  filters.keyword = ''
  current.value = 1
  load()
}

function resetForm() {
  form.id = undefined
  form.caseCode = ''
  form.caseName = ''
  form.orderDesc = ''
  form.blendDesc = ''
  form.resultDesc = ''
  form.qualityResult = ''
  form.costResult = undefined
  form.effectivenessEval = ''
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
    caseCode: row.caseCode,
    caseName: row.caseName,
    orderDesc: row.orderDesc,
    blendDesc: row.blendDesc,
    resultDesc: row.resultDesc,
    qualityResult: row.qualityResult,
    costResult: row.costResult != null ? Number(row.costResult) : undefined,
    effectivenessEval: row.effectivenessEval,
    status: row.status === 0 ? 0 : 1,
  })
  formVisible.value = true
}

async function submitForm() {
  await formRef.value?.validate?.()
  saving.value = true
  try {
    const body = {
      caseCode: form.caseCode?.trim(),
      caseName: form.caseName?.trim(),
      orderDesc: form.orderDesc?.trim() || null,
      blendDesc: form.blendDesc?.trim() || null,
      resultDesc: form.resultDesc?.trim() || null,
      qualityResult: form.qualityResult?.trim() || null,
      costResult: form.costResult,
      effectivenessEval: form.effectivenessEval?.trim() || null,
      status: form.status,
    }
    if (formMode.value === 'create') {
      await createCaseSample(body)
      ElMessage.success('新增成功')
    } else {
      body.id = form.id
      await updateCaseSample(body)
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
    detail.value = await fetchCaseSampleDetail(id)
  } finally {
    detailLoading.value = false
  }
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确定删除案例「${row.caseName}」吗？`, '删除确认', { type: 'warning' })
  await deleteCaseSample(row.id)
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
.detail-block .text {
  margin: 6px 0 0;
  font-size: 13px;
  color: #475569;
  white-space: pre-wrap;
}
.mt {
  margin-top: 16px;
}
</style>
