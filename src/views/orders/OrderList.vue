<template>
  <el-card shadow="never" class="panel">
    <template #header>
      <div class="panel-head">
        <span>订单列表</span>
        <el-button type="primary" size="small" @click="load">刷新</el-button>
      </div>
    </template>

    <el-form :inline="true" class="filter-form" @submit.prevent="load">
      <el-form-item label="关键词">
        <el-input
          v-model="keyword"
          clearable
          placeholder="订单编号 / 客户名"
          style="width: 200px"
          @clear="load"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-input
          v-model="orderStatus"
          clearable
          placeholder="如 pending"
          style="width: 140px"
          @clear="load"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load">查询</el-button>
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
      <el-table-column prop="orderStatus" label="状态" width="100" />
      <el-table-column prop="deliveryDate" label="交货日期" width="120" />
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
  </el-card>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchOrderPage } from '@/api/order'

const loading = ref(false)
const rows = ref([])
const total = ref(0)
const current = ref(1)
const size = ref(10)
const keyword = ref('')
const orderStatus = ref('')

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
