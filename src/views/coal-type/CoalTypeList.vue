<template>
  <el-card shadow="never" class="panel">
    <template #header>
      <div class="panel-head">
        <span>煤种管理</span>
        <el-button type="primary" @click="openCreate">新增煤种</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="load">
      <el-form-item label="关键词">
        <el-input
          v-model="filters.keyword"
          clearable
          placeholder="编号 / 名称"
          style="width: 200px"
          @clear="load"
        />
      </el-form-item>
      <el-form-item label="类别">
        <el-input
          v-model="filters.coalCategory"
          clearable
          placeholder="模糊匹配"
          style="width: 140px"
          @clear="load"
        />
      </el-form-item>
      <el-form-item label="可配煤">
        <el-select
          v-model="filters.blendableFlag"
          clearable
          placeholder="全部"
          style="width: 120px"
          @clear="load"
        >
          <el-option label="是" :value="1" />
          <el-option label="否" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="rows" border stripe style="width: 100%">
      <el-table-column prop="coalCode" label="煤种编号" width="120" fixed="left" />
      <el-table-column prop="coalName" label="煤种名称" min-width="140" show-overflow-tooltip />
      <el-table-column prop="coalCategory" label="煤种类别" width="110" />
      <el-table-column prop="sourceArea" label="产地" min-width="110" show-overflow-tooltip />
      <el-table-column prop="purchasePrice" label="采购单价(元/吨)" width="130" align="right">
        <template #default="{ row }">{{ formatMoney(row.purchasePrice) }}</template>
      </el-table-column>
      <el-table-column prop="transportMode" label="运输方式" width="100" />
      <el-table-column prop="blendableFlag" label="是否可配" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.blendableFlag === 1 ? 'success' : 'info'" size="small">
            {{ row.blendableFlag === 1 ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
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

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="formVisible"
      :title="formMode === 'create' ? '新增煤种' : '编辑煤种'"
      width="560px"
      destroy-on-close
      @closed="resetFormModel"
    >
      <el-form ref="formRef" :model="formModel" :rules="formRules" label-width="110px">
        <el-form-item label="煤种编号" prop="coalCode">
          <el-input v-model="formModel.coalCode" :disabled="formMode === 'edit'" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="煤种名称" prop="coalName">
          <el-input v-model="formModel.coalName" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="煤种类别" prop="coalCategory">
          <el-input v-model="formModel.coalCategory" maxlength="50" />
        </el-form-item>
        <el-form-item label="产地" prop="sourceArea">
          <el-input v-model="formModel.sourceArea" maxlength="100" />
        </el-form-item>
        <el-form-item label="采购单价" prop="purchasePrice">
          <el-input-number
            v-model="formModel.purchasePrice"
            :min="0"
            :precision="2"
            :step="10"
            controls-position="right"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="运输方式" prop="transportMode">
          <el-input v-model="formModel.transportMode" maxlength="50" placeholder="如 铁路 / 公路" />
        </el-form-item>
        <el-form-item label="是否可配煤" prop="blendableFlag">
          <el-radio-group v-model="formModel.blendableFlag">
            <el-radio :label="1">是</el-radio>
            <el-radio :label="0">否</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="formModel.remark" type="textarea" :rows="2" maxlength="255" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="煤种详情" size="420px" destroy-on-close>
      <el-skeleton v-if="detailLoading" :rows="8" animated />
      <el-descriptions v-else-if="detailRow" :column="1" border size="small">
        <el-descriptions-item label="煤种编号">{{ detailRow.coalCode }}</el-descriptions-item>
        <el-descriptions-item label="煤种名称">{{ detailRow.coalName }}</el-descriptions-item>
        <el-descriptions-item label="煤种类别">{{ detailRow.coalCategory || '—' }}</el-descriptions-item>
        <el-descriptions-item label="产地">{{ detailRow.sourceArea || '—' }}</el-descriptions-item>
        <el-descriptions-item label="采购单价(元/吨)">{{ formatMoney(detailRow.purchasePrice) }}</el-descriptions-item>
        <el-descriptions-item label="运输方式">{{ detailRow.transportMode || '—' }}</el-descriptions-item>
        <el-descriptions-item label="是否可配煤">{{ detailRow.blendableFlag === 1 ? '是' : '否' }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ detailRow.remark || '—' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(detailRow.createTime) }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDateTime(detailRow.updateTime) }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createCoalType,
  deleteCoalType,
  fetchCoalTypeDetail,
  fetchCoalTypePage,
  updateCoalType,
} from '@/api/coalType'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const current = ref(1)
const size = ref(10)

const filters = reactive({
  keyword: '',
  coalCategory: '',
  blendableFlag: undefined,
})

const formVisible = ref(false)
const formMode = ref('create')
const formSubmitting = ref(false)
const formRef = ref(null)
const formModel = reactive({
  id: undefined,
  coalCode: '',
  coalName: '',
  coalCategory: '',
  sourceArea: '',
  purchasePrice: undefined,
  transportMode: '',
  blendableFlag: 1,
  remark: '',
})

const formRules = {
  coalCode: [{ required: true, message: '请输入煤种编号', trigger: 'blur' }],
  coalName: [{ required: true, message: '请输入煤种名称', trigger: 'blur' }],
}

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailRow = ref(null)

function formatMoney(v) {
  if (v === null || v === undefined || v === '') return '—'
  const n = Number(v)
  if (Number.isNaN(n)) return '—'
  return n.toFixed(2)
}

function formatDateTime(v) {
  if (!v) return '—'
  return String(v).replace('T', ' ').slice(0, 19)
}

function buildQuery() {
  return {
    current: current.value,
    size: size.value,
    keyword: filters.keyword || undefined,
    coalCategory: filters.coalCategory || undefined,
    blendableFlag:
      filters.blendableFlag === 0 || filters.blendableFlag === 1 ? filters.blendableFlag : undefined,
  }
}

async function load() {
  loading.value = true
  try {
    const page = await fetchCoalTypePage(buildQuery())
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
  filters.keyword = ''
  filters.coalCategory = ''
  filters.blendableFlag = undefined
  current.value = 1
  load()
}

function resetFormModel() {
  formModel.id = undefined
  formModel.coalCode = ''
  formModel.coalName = ''
  formModel.coalCategory = ''
  formModel.sourceArea = ''
  formModel.purchasePrice = undefined
  formModel.transportMode = ''
  formModel.blendableFlag = 1
  formModel.remark = ''
  formRef.value?.clearValidate?.()
}

function openCreate() {
  formMode.value = 'create'
  resetFormModel()
  formVisible.value = true
}

function openEdit(row) {
  formMode.value = 'edit'
  resetFormModel()
  Object.assign(formModel, {
    id: row.id,
    coalCode: row.coalCode,
    coalName: row.coalName,
    coalCategory: row.coalCategory,
    sourceArea: row.sourceArea,
    purchasePrice: row.purchasePrice != null ? Number(row.purchasePrice) : undefined,
    transportMode: row.transportMode,
    blendableFlag: row.blendableFlag === 0 ? 0 : 1,
    remark: row.remark,
  })
  formVisible.value = true
}

async function submitForm() {
  await formRef.value?.validate?.()
  formSubmitting.value = true
  try {
    const body = {
      coalCode: formModel.coalCode?.trim(),
      coalName: formModel.coalName?.trim(),
      coalCategory: formModel.coalCategory?.trim() || null,
      sourceArea: formModel.sourceArea?.trim() || null,
      purchasePrice: formModel.purchasePrice,
      transportMode: formModel.transportMode?.trim() || null,
      blendableFlag: formModel.blendableFlag,
      remark: formModel.remark?.trim() || null,
    }
    if (formMode.value === 'create') {
      await createCoalType(body)
      ElMessage.success('新增成功')
    } else {
      body.id = formModel.id
      await updateCoalType(body)
      ElMessage.success('保存成功')
    }
    formVisible.value = false
    await load()
  } finally {
    formSubmitting.value = false
  }
}

async function openDetail(id) {
  detailVisible.value = true
  detailRow.value = null
  detailLoading.value = true
  try {
    detailRow.value = await fetchCoalTypeDetail(id)
  } finally {
    detailLoading.value = false
  }
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确定删除煤种「${row.coalName}」吗？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
  await deleteCoalType(row.id)
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
  align-items: center;
  justify-content: space-between;
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
