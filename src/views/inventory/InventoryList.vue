<template>
  <el-card shadow="never" class="panel">
    <template #header>
      <div class="panel-head">
        <span>库存管理</span>
        <el-button type="primary" @click="openCreate">新增库存</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="onSearch">
      <el-form-item label="煤种">
        <el-select v-model="filters.coalId" clearable filterable placeholder="全部" style="width: 220px" @clear="onSearch">
          <el-option v-for="o in coalOptions" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="煤仓">
        <el-input v-model="filters.warehouseCode" clearable placeholder="模糊" style="width: 140px" @clear="onSearch" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部" style="width: 110px" @clear="onSearch">
          <el-option label="正常" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
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
      <el-table-column prop="warehouseCode" label="煤仓编号" width="120" />
      <el-table-column prop="stockQuantity" label="库存量(吨)" width="120" align="right">
        <template #default="{ row }">{{ formatMoney(row.stockQuantity) }}</template>
      </el-table-column>
      <el-table-column prop="availableQuantity" label="可用量(吨)" width="120" align="right">
        <template #default="{ row }">{{ formatMoney(row.availableQuantity) }}</template>
      </el-table-column>
      <el-table-column prop="updateTime" label="更新时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '正常' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
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

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增库存' : '编辑库存'" width="520px" destroy-on-close @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="煤种" prop="coalId">
          <el-select v-model="form.coalId" filterable placeholder="选择煤种" style="width: 100%" :disabled="formMode === 'edit'">
            <el-option v-for="o in coalOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="煤仓编号" prop="warehouseCode">
          <el-input v-model="form.warehouseCode" maxlength="50" />
        </el-form-item>
        <el-form-item label="库存量(吨)" prop="stockQuantity">
          <el-input-number v-model="form.stockQuantity" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="可用量(吨)" prop="availableQuantity">
          <el-input-number v-model="form.availableQuantity" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">正常</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="255" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="库存详情" size="400px" destroy-on-close>
      <el-skeleton v-if="detailLoading" :rows="8" animated />
      <el-descriptions v-else-if="detail" :column="1" border size="small">
        <el-descriptions-item label="煤种">{{ coalLabel(detail.coalId) }}</el-descriptions-item>
        <el-descriptions-item label="煤仓">{{ detail.warehouseCode || '—' }}</el-descriptions-item>
        <el-descriptions-item label="库存量">{{ formatMoney(detail.stockQuantity) }} 吨</el-descriptions-item>
        <el-descriptions-item label="可用量">{{ formatMoney(detail.availableQuantity) }} 吨</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status === 1 ? '正常' : '停用' }}</el-descriptions-item>
        <el-descriptions-item label="备注">{{ detail.remark || '—' }}</el-descriptions-item>
        <el-descriptions-item label="更新时间">{{ formatDateTime(detail.updateTime) }}</el-descriptions-item>
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
  createInventory,
  deleteInventory,
  fetchInventoryDetail,
  fetchInventoryPage,
  updateInventory,
} from '@/api/inventory'

const { coalOptions, load: loadCoals, coalLabel } = useCoalTypes()

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const current = ref(1)
const size = ref(10)
const filters = reactive({ coalId: undefined, status: undefined, warehouseCode: '' })

const formVisible = ref(false)
const formMode = ref('create')
const saving = ref(false)
const formRef = ref(null)
const form = reactive({
  id: undefined,
  coalId: undefined,
  warehouseCode: '',
  stockQuantity: undefined,
  availableQuantity: undefined,
  status: 1,
  remark: '',
})
const rules = {
  coalId: [{ required: true, message: '请选择煤种', trigger: 'change' }],
  stockQuantity: [{ required: true, message: '请输入库存量', trigger: 'change' }],
  availableQuantity: [{ required: true, message: '请输入可用量', trigger: 'change' }],
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
    warehouseCode: filters.warehouseCode?.trim() || undefined,
  }
}

async function load() {
  loading.value = true
  try {
    const page = await fetchInventoryPage(buildQuery())
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
  filters.warehouseCode = ''
  current.value = 1
  load()
}

function resetForm() {
  form.id = undefined
  form.coalId = undefined
  form.warehouseCode = ''
  form.stockQuantity = undefined
  form.availableQuantity = undefined
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
    coalId: row.coalId,
    warehouseCode: row.warehouseCode,
    stockQuantity: row.stockQuantity != null ? Number(row.stockQuantity) : undefined,
    availableQuantity: row.availableQuantity != null ? Number(row.availableQuantity) : undefined,
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
      coalId: form.coalId,
      warehouseCode: form.warehouseCode?.trim() || null,
      stockQuantity: form.stockQuantity,
      availableQuantity: form.availableQuantity,
      status: form.status,
      remark: form.remark?.trim() || null,
    }
    if (formMode.value === 'create') {
      await createInventory(body)
      ElMessage.success('新增成功')
    } else {
      body.id = form.id
      await updateInventory(body)
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
    detail.value = await fetchInventoryDetail(id)
  } finally {
    detailLoading.value = false
  }
}

async function onDelete(row) {
  await ElMessageBox.confirm('确定删除该库存记录吗？', '删除确认', { type: 'warning' })
  await deleteInventory(row.id)
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
