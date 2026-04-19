<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <h1>煤矿智能配煤管理系统</h1>
        <p>请使用系统账号登录</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" class="login-form" @submit.prevent="onSubmit">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" size="large" clearable autocomplete="username" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            show-password
            clearable
            autocomplete="current-password"
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" class="login-btn" :loading="loading" native-type="submit">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
      <p class="hint">演示账号（与初始化 SQL 一致）：<code>admin</code> / <code>123456</code></p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '@/api/auth'
import { setAuthSession } from '@/stores/auth'

const route = useRoute()
const router = useRouter()

const formRef = ref(null)
const loading = ref(false)
const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

function safeRedirect(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/dashboard'
  }
  return raw
}

async function onSubmit() {
  await formRef.value?.validate?.()
  loading.value = true
  try {
    const user = await login({
      username: form.username.trim(),
      password: form.password,
    })
    setAuthSession(user)
    ElMessage.success('登录成功')
    const target = safeRedirect(route.query.redirect)
    await router.replace(target)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #0f172a 0%, #1e3a5f 45%, #334155 100%);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px 36px 32px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
}

.login-brand h1 {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  text-align: center;
}

.login-brand p {
  margin: 0 0 28px;
  font-size: 14px;
  color: #64748b;
  text-align: center;
}

.login-form {
  margin-top: 8px;
}

.login-btn {
  width: 100%;
}

.hint {
  margin: 16px 0 0;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
  line-height: 1.6;
}

.hint code {
  padding: 1px 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
}
</style>
