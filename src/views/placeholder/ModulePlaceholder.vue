<template>
  <el-card shadow="never" class="panel">
    <el-result icon="info" :title="title" :sub-title="subtitle">
      <template #extra>
        <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
      </template>
    </el-result>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const title = computed(() => `${route.meta.title || '模块'} · 待开发`)

const subtitle = computed(() => {
  const hint = route.meta.apiHint
  return hint
    ? `原型与后端已约定接口：${hint}，可在 src/api/ 增加封装后在此页实现表格与表单。`
    : '该页面为占位路由，后续按《前端原型方案》补全界面与联调逻辑即可。'
})
</script>

<style scoped>
.panel {
  border-radius: 8px;
  min-height: 360px;
}
</style>
