<template>
  <el-card shadow="never" class="panel">
    <template #header>
      <div class="panel-head">
        <span>订单管理</span>
        <div>
          <el-button size="small" @click="load">刷新</el-button>
          <el-button type="primary" size="small" @click="openCreate">新建订单</el-button>
        </div>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="onSearch">
      <el-form-item label="关键词">
        <el-input v-model="keyword" clearable placeholder="订单编号 / 客户名" style="width: 200px" @clear="onSearch" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="orderStatus" clearable placeholder="全部" style="width: 140px" @clear="onSearch">
          <el-option label="待处理 pending" value="pending" />
          <el-option label="已生成 generated" value="generated" />
          <el-option label="已完成 completed" value="completed" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="rows" border stripe style="width: 100%">
      <el-table-column prop="orderCode" label="订单编号" min-width="120" />
      <el-table-column prop="customerName" label="客户" min-width="120" />
      <el-table-column prop="demandQuantity" label="需求量(吨)" width="110" />
      <el-table-column prop="targetAsh" label="目标灰分" width="100" />
      <el-table-column prop="targetSulfur" label="目标硫分" width="100" />
      <el-table-column prop="targetCalorific" label="目标热值" width="100" />
      <el-table-column prop="priorityLevel" label="优先级" width="80" />
      <el-table-column prop="orderStatus" label="状态" width="110" />
      <el-table-column prop="deliveryDate" label="交货日期" width="120" />
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row.id)">详情</el-button>
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

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新建订单' : '编辑订单'" width="640px" destroy-on-close @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="订单编号" prop="orderCode">
          <el-input v-model="form.orderCode" :disabled="formMode === 'edit'" maxlength="50" />
        </el-form-item>
        <el-form-item label="客户名称" prop="customerName">
          <el-input v-model="form.customerName" maxlength="100" />
        </el-form-item>
        <el-form-item label="需求量(吨)" prop="demandQuantity">
          <el-input-number v-model="form.demandQuantity" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="目标灰分" prop="targetAsh">
          <el-input-number v-model="form.targetAsh" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="目标硫分" prop="targetSulfur">
          <el-input-number v-model="form.targetSulfur" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="目标水分" prop="targetMoisture">
          <el-input-number v-model="form.targetMoisture" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="目标挥发分" prop="targetVolatile">
          <el-input-number v-model="form.targetVolatile" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="目标热值" prop="targetCalorific">
          <el-input-number v-model="form.targetCalorific" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="优先级" prop="priorityLevel">
          <el-input-number v-model="form.priorityLevel" :min="1" :max="9" style="width: 160px" />
        </el-form-item>
        <el-form-item label="交货日期" prop="deliveryDate">
          <el-date-picker v-model="form.deliveryDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="订单状态" prop="orderStatus">
          <el-select v-model="form.orderStatus" style="width: 100%">
            <el-option label="pending" value="pending" />
            <el-option label="generated" value="generated" />
            <el-option label="completed" value="completed" />
          </el-select>
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

    <el-drawer v-model="detailVisible" title="订单详情" size="420px" destroy-on-close>
      <el-skeleton v-if="detailLoading" :rows="10" animated />
      <template v-else-if="detail">
        <el-descriptions :column="1" border size="small" class="mb">
          <el-descriptions-item label="订单编号">{{ detail.orderCode }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ detail.customerName }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ detail.orderStatus }}</el-descriptions-item>
          <el-descriptions-item label="需求量">{{ detail.demandQuantity }}</el-descriptions-item>
          <el-descriptions-item label="交货日期">{{ detail.deliveryDate || '—' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createTime) }}</el-descriptions-item>
        </el-descriptions>
        <el-form label-width="100px" class="inline-status">
          <el-form-item label="快速改状态">
            <el-select v-model="quickStatus" style="width: 200px">
              <el-option label="pending" value="pending" />
              <el-option label="generated" value="generated" />
              <el-option label="completed" value="completed" />
            </el-select>
            <el-button type="primary" class="ml" :loading="statusSaving" @click="saveQuickStatus">更新</el-button>
          </el-form-item>
        </el-form>
      </template>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime } from '@/utils/format'
import {
  createOrder,
  deleteOrder,
  fetchOrderDetail,
  fetchOrderPage,
  updateOrder,
  updateOrderStatus,
} from '@/api/order'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const current = ref(1)
const size = ref(10)
const keyword = ref('')
const orderStatus = ref('')

const formVisible = ref(false)
const formMode = ref('create')
const saving = ref(false)
const formRef = ref(null)
const form = ref({
  id: undefined,
  orderCode: '',
  customerName: '',
  demandQuantity: undefined,
  targetAsh: undefined,
  targetSulfur: undefined,
  targetMoisture: undefined,
  targetVolatile: undefined,
  targetCalorific: undefined,
  priorityLevel: 1,
  deliveryDate: '',
  orderStatus: 'pending',
  remark: '',
})
const rules = {
  orderCode: [{ required: true, message: '请输入订单编号', trigger: 'blur' }],
  customerName: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  demandQuantity: [{ required: true, message: '请输入需求量', trigger: 'change' }],
}

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)
const quickStatus = ref('')
const statusSaving = ref(false)

watch(detail, (d) => {
  quickStatus.value = d?.orderStatus || ''
})

function onSearch() {
  current.value = 1
  load()
}

async function load() {
  loading.value = true
  try {
    const page = await fetchOrderPage({
      current: current.value,
      size: size.value,
      keyword: keyword.value || undefined,
      orderStatus: orderStatus.value || undefined,
    })
    rows.value = page?.records ?? []
    total.value = page?.total ?? 0
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = {
    id: undefined,
    orderCode: '',
    customerName: '',
    demandQuantity: undefined,
    targetAsh: undefined,
    targetSulfur: undefined,
    targetMoisture: undefined,
    targetVolatile: undefined,
    targetCalorific: undefined,
    priorityLevel: 1,
    deliveryDate: '',
    orderStatus: 'pending',
    remark: '',
  }
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
  form.value = {
    id: row.id,
    orderCode: row.orderCode,
    customerName: row.customerName,
    demandQuantity: row.demandQuantity != null ? Number(row.demandQuantity) : undefined,
    targetAsh: row.targetAsh != null ? Number(row.targetAsh) : undefined,
    targetSulfur: row.targetSulfur != null ? Number(row.targetSulfur) : undefined,
    targetMoisture: row.targetMoisture != null ? Number(row.targetMoisture) : undefined,
    targetVolatile: row.targetVolatile != null ? Number(row.targetVolatile) : undefined,
    targetCalorific: row.targetCalorific != null ? Number(row.targetCalorific) : undefined,
    priorityLevel: row.priorityLevel ?? 1,
    deliveryDate: row.deliveryDate || '',
    orderStatus: row.orderStatus || 'pending',
    remark: row.remark,
  }
  formVisible.value = true
}

async function submitForm() {
  await formRef.value?.validate?.()
  saving.value = true
  try {
    const body = {
      orderCode: form.value.orderCode?.trim(),
      customerName: form.value.customerName?.trim(),
      demandQuantity: form.value.demandQuantity,
      targetAsh: form.value.targetAsh,
      targetSulfur: form.value.targetSulfur,
      targetMoisture: form.value.targetMoisture,
      targetVolatile: form.value.targetVolatile,
      targetCalorific: form.value.targetCalorific,
      priorityLevel: form.value.priorityLevel,
      deliveryDate: form.value.deliveryDate || null,
      orderStatus: form.value.orderStatus,
      remark: form.value.remark?.trim() || null,
    }
    if (formMode.value === 'create') {
      await createOrder(body)
      ElMessage.success('创建成功')
    } else {
      body.id = form.value.id
      await updateOrder(body)
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
    detail.value = await fetchOrderDetail(id)
  } finally {
    detailLoading.value = false
  }
}

async function saveQuickStatus() {
  if (!detail.value) return
  statusSaving.value = true
  try {
    await updateOrderStatus(detail.value.id, quickStatus.value)
    ElMessage.success('状态已更新')
    detail.value.orderStatus = quickStatus.value
    await load()
  } finally {
    statusSaving.value = false
  }
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确定删除订单「${row.orderCode}」吗？`, '删除确认', { type: 'warning' })
  await deleteOrder(row.id)
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
.mb {
  margin-bottom: 16px;
}
.ml {
  margin-left: 8px;
}
</style>
