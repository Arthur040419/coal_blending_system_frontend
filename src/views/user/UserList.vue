<template>
  <el-card shadow="never" class="panel">
    <template #header>
      <div class="panel-head">
        <span>用户管理</span>
        <el-button type="primary" @click="openCreate">新增用户</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="onSearch">
      <el-form-item label="关键词">
        <el-input v-model="filters.keyword" clearable placeholder="用户名/姓名" style="width: 160px" @clear="onSearch" />
      </el-form-item>
      <el-form-item label="角色">
        <el-input v-model="filters.role" clearable placeholder="精确" style="width: 120px" @clear="onSearch" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" clearable placeholder="全部" style="width: 110px" @clear="onSearch">
          <el-option label="正常" :value="1" />
          <el-option label="禁用" :value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSearch">查询</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="rows" border stripe>
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="realName" label="姓名" width="100" />
      <el-table-column prop="role" label="角色" width="100" />
      <el-table-column prop="phone" label="手机" width="120" />
      <el-table-column prop="email" label="邮箱" min-width="160" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-switch :model-value="row.status === 1" @change="(v) => onToggleStatus(row, v)" />
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
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

    <el-dialog v-model="formVisible" :title="formMode === 'create' ? '新增用户' : '编辑用户'" width="520px" destroy-on-close @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="formMode === 'edit'" maxlength="50" />
        </el-form-item>
        <el-form-item v-if="formMode === 'create'" label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password maxlength="64" />
        </el-form-item>
        <el-form-item v-else label="新密码" prop="password">
          <el-input v-model="form.password" type="password" show-password maxlength="64" placeholder="不修改请留空" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" maxlength="50" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-input v-model="form.role" maxlength="32" placeholder="如 admin / user" />
        </el-form-item>
        <el-form-item label="手机" prop="phone">
          <el-input v-model="form.phone" maxlength="20" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" maxlength="100" />
        </el-form-item>
        <el-form-item v-if="formMode === 'create'" label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">正常</el-radio>
            <el-radio :label="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { formatDateTime } from '@/utils/format'
import { createUser, deleteUser, fetchUserPage, updateUser, updateUserStatus } from '@/api/user'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const current = ref(1)
const size = ref(10)
const filters = reactive({ keyword: '', role: '', status: undefined })

const formVisible = ref(false)
const formMode = ref('create')
const saving = ref(false)
const formRef = ref(null)
const form = reactive({
  id: undefined,
  username: '',
  password: '',
  realName: '',
  role: 'user',
  phone: '',
  email: '',
  status: 1,
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    {
      validator: (_r, v, cb) => {
        if (formMode.value === 'create' && !v) cb(new Error('请输入密码'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
}

function buildQuery() {
  return {
    current: current.value,
    size: size.value,
    keyword: filters.keyword?.trim() || undefined,
    role: filters.role?.trim() || undefined,
    status: filters.status,
  }
}

async function load() {
  loading.value = true
  try {
    const page = await fetchUserPage(buildQuery())
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
  filters.role = ''
  filters.status = undefined
  current.value = 1
  load()
}

function resetForm() {
  form.id = undefined
  form.username = ''
  form.password = ''
  form.realName = ''
  form.role = 'user'
  form.phone = ''
  form.email = ''
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
    username: row.username,
    password: '',
    realName: row.realName,
    role: row.role,
    phone: row.phone,
    email: row.email,
    status: row.status,
  })
  formVisible.value = true
}

async function submitForm() {
  await formRef.value?.validate?.()
  saving.value = true
  try {
    if (formMode.value === 'create') {
      await createUser({
        username: form.username?.trim(),
        password: form.password,
        realName: form.realName?.trim() || null,
        role: form.role?.trim() || 'user',
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        status: form.status,
      })
      ElMessage.success('新增成功')
    } else {
      const body = {
        id: form.id,
        username: form.username?.trim(),
        realName: form.realName?.trim() || null,
        role: form.role?.trim() || null,
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
      }
      if (form.password?.trim()) {
        body.password = form.password
      }
      await updateUser(body)
      ElMessage.success('保存成功')
    }
    formVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function onToggleStatus(row, enabled) {
  try {
    await updateUserStatus(row.id, enabled ? 1 : 0)
    ElMessage.success('状态已更新')
    row.status = enabled ? 1 : 0
  } catch {
    await load()
  }
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确定删除用户「${row.username}」吗？`, '删除确认', { type: 'warning' })
  await deleteUser(row.id)
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
