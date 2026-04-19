<template>
  <el-card shadow="never" class="panel">
    <template #header>
      <div class="panel-head">
        <span>规则知识</span>
        <el-button type="primary" @click="openCreate">新增规则</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="onSearch">
      <el-form-item label="类型">
        <el-input v-model="filters.ruleType" clearable placeholder="精确" style="width: 120px" @clear="onSearch" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部" style="width: 110px" @clear="onSearch">
          <el-option label="启用" :value="1" />
          <el-option label="停用" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item label="关键词">
        <el-input v-model="filters.keyword" clearable placeholder="名称/编号/内容" style="width: 180px" @clear="onSearch" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="ruleCode" label="规则编号" width="120" />
      <el-table-column prop="ruleName" label="规则名称" min-width="140" show-overflow-tooltip />
      <el-table-column prop="ruleType" label="类型" width="100" />
      <el-table-column prop="priorityLevel" label="优先级" width="80" align="center" />
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="applicableScope" label="适用范围" min-width="120" show-overflow-tooltip />
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

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增规则' : '编辑规则'" width="640px" destroy-on-close @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="规则编号" prop="ruleCode">
          <el-input v-model="form.ruleCode" :disabled="formMode === 'edit'" maxlength="50" />
        </el-form-item>
        <el-form-item label="规则名称" prop="ruleName">
          <el-input v-model="form.ruleName" maxlength="100" />
        </el-form-item>
        <el-form-item label="规则类型" prop="ruleType">
          <el-input v-model="form.ruleType" maxlength="50" placeholder="如 constraint / strategy" />
        </el-form-item>
        <el-form-item label="规则内容" prop="ruleContent">
          <el-input v-model="form.ruleContent" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="适用范围" prop="applicableScope">
          <el-input v-model="form.applicableScope" maxlength="255" />
        </el-form-item>
        <el-form-item label="优先级" prop="priorityLevel">
          <el-input-number v-model="form.priorityLevel" :min="0" :max="999" style="width: 160px" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="来源说明" prop="sourceDesc">
          <el-input v-model="form.sourceDesc" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" title="规则详情" size="480px" destroy-on-close>
      <el-skeleton v-if="detailLoading" :rows="8" animated />
      <el-descriptions v-else-if="detail" :column="1" border size="small">
        <el-descriptions-item label="规则编号">{{ detail.ruleCode }}</el-descriptions-item>
        <el-descriptions-item label="规则名称">{{ detail.ruleName }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detail.ruleType || '—' }}</el-descriptions-item>
        <el-descriptions-item label="内容">{{ detail.ruleContent || '—' }}</el-descriptions-item>
        <el-descriptions-item label="适用范围">{{ detail.applicableScope || '—' }}</el-descriptions-item>
        <el-descriptions-item label="优先级">{{ detail.priorityLevel ?? '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ detail.status === 1 ? '启用' : '停用' }}</el-descriptions-item>
        <el-descriptions-item label="来源">{{ detail.sourceDesc || '—' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createTime) }}</el-descriptions-item>
      </el-descriptions>
    </el-drawer>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime } from '@/utils/format'
import {
  createRuleKnowledge,
  deleteRuleKnowledge,
  fetchRuleKnowledgeDetail,
  fetchRuleKnowledgePage,
  updateRuleKnowledge,
} from '@/api/ruleKnowledge'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const current = ref(1)
const size = ref(10)
const filters = reactive({ ruleType: '', status: undefined, keyword: '' })

const formVisible = ref(false)
const formMode = ref('create')
const saving = ref(false)
const formRef = ref(null)
const form = reactive({
  id: undefined,
  ruleCode: '',
  ruleName: '',
  ruleType: '',
  ruleContent: '',
  applicableScope: '',
  priorityLevel: 0,
  status: 1,
  sourceDesc: '',
})
const rules = {
  ruleCode: [{ required: true, message: '请输入规则编号', trigger: 'blur' }],
  ruleName: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
}

const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)

function buildQuery() {
  return {
    current: current.value,
    size: size.value,
    ruleType: filters.ruleType?.trim() || undefined,
    status: filters.status,
    keyword: filters.keyword?.trim() || undefined,
  }
}

async function load() {
  loading.value = true
  try {
    const page = await fetchRuleKnowledgePage(buildQuery())
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
  filters.ruleType = ''
  filters.status = undefined
  filters.keyword = ''
  current.value = 1
  load()
}

function resetForm() {
  form.id = undefined
  form.ruleCode = ''
  form.ruleName = ''
  form.ruleType = ''
  form.ruleContent = ''
  form.applicableScope = ''
  form.priorityLevel = 0
  form.status = 1
  form.sourceDesc = ''
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
    ruleCode: row.ruleCode,
    ruleName: row.ruleName,
    ruleType: row.ruleType,
    ruleContent: row.ruleContent,
    applicableScope: row.applicableScope,
    priorityLevel: row.priorityLevel ?? 0,
    status: row.status === 0 ? 0 : 1,
    sourceDesc: row.sourceDesc,
  })
  formVisible.value = true
}

async function submitForm() {
  await formRef.value?.validate?.()
  saving.value = true
  try {
    const body = {
      ruleCode: form.ruleCode?.trim(),
      ruleName: form.ruleName?.trim(),
      ruleType: form.ruleType?.trim() || null,
      ruleContent: form.ruleContent?.trim() || null,
      applicableScope: form.applicableScope?.trim() || null,
      priorityLevel: form.priorityLevel,
      status: form.status,
      sourceDesc: form.sourceDesc?.trim() || null,
    }
    if (formMode.value === 'create') {
      await createRuleKnowledge(body)
      ElMessage.success('新增成功')
    } else {
      body.id = form.id
      await updateRuleKnowledge(body)
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
    detail.value = await fetchRuleKnowledgeDetail(id)
  } finally {
    detailLoading.value = false
  }
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确定删除规则「${row.ruleName}」吗？`, '删除确认', { type: 'warning' })
  await deleteRuleKnowledge(row.id)
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
