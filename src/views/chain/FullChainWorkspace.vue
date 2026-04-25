<template>
  <el-card shadow="never" class="panel">
    <template #header>
      <div class="panel-head">
        <span>煤炭配选全链路数据管理</span>
        <el-button @click="loadAll">刷新全部</el-button>
      </div>
    </template>

    <el-alert
      type="info"
      :closable="false"
      class="mb"
      title="演示链路：矿区来源 → 原煤生产 → 洗选加工 → 产品批次 → 最终质检 → 发运交付 → 批次追溯"
    />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="矿区来源" name="source">
        <el-form :inline="true" :model="mineForm" class="chain-form">
          <el-form-item label="矿区"><el-input v-model="mineForm.mineArea" placeholder="山西朔州矿区" /></el-form-item>
          <el-form-item label="矿井"><el-input v-model="mineForm.mineName" placeholder="示例一矿" /></el-form-item>
          <el-form-item label="煤层"><el-input v-model="mineForm.coalSeam" placeholder="4#煤层" /></el-form-item>
          <el-form-item label="工作面"><el-input v-model="mineForm.workingFace" placeholder="4101工作面" /></el-form-item>
          <el-form-item><el-button type="primary" @click="submitMine">新增来源</el-button></el-form-item>
        </el-form>
        <el-table :data="mineRows" border stripe>
          <el-table-column prop="sourceCode" label="来源编码" width="170" />
          <el-table-column prop="mineArea" label="矿区" min-width="140" />
          <el-table-column prop="mineName" label="矿井" min-width="120" />
          <el-table-column prop="coalSeam" label="煤层" width="100" />
          <el-table-column prop="workingFace" label="工作面" width="120" />
          <el-table-column prop="geologicalSulfur" label="地质硫分" width="100" />
          <el-table-column prop="geologicalCalorific" label="地质热值" width="100" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="原煤生产" name="raw">
        <el-form :inline="true" :model="rawForm" class="chain-form">
          <el-form-item label="来源ID"><el-input-number v-model="rawForm.sourceId" :min="1" /></el-form-item>
          <el-form-item label="煤种ID"><el-input-number v-model="rawForm.coalId" :min="1" /></el-form-item>
          <el-form-item label="生产日期"><el-date-picker v-model="rawForm.productionDate" value-format="YYYY-MM-DD" /></el-form-item>
          <el-form-item label="产量"><el-input-number v-model="rawForm.outputQuantity" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="仓号"><el-input v-model="rawForm.warehouseCode" placeholder="RW001" /></el-form-item>
          <el-form-item label="灰分"><el-input-number v-model="rawForm.quality.ashContent" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="硫分"><el-input-number v-model="rawForm.quality.sulfurContent" :min="0" :precision="3" /></el-form-item>
          <el-form-item label="热值"><el-input-number v-model="rawForm.quality.calorificValue" :min="0" /></el-form-item>
          <el-form-item><el-button type="primary" @click="submitRaw">新增原煤批次并入库</el-button></el-form-item>
        </el-form>
        <el-table :data="rawRows" border stripe>
          <el-table-column prop="rawBatchNo" label="原煤批次号" width="170" />
          <el-table-column prop="sourceId" label="来源ID" width="90" />
          <el-table-column prop="coalId" label="煤种ID" width="90" />
          <el-table-column prop="productionDate" label="生产日期" width="120" />
          <el-table-column prop="outputQuantity" label="产量" width="100" />
          <el-table-column prop="warehouseCode" label="仓号" width="100" />
          <el-table-column prop="status" label="状态" width="100" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="洗选加工" name="wash">
        <el-form :inline="true" :model="washForm" class="chain-form">
          <el-form-item label="工艺"><el-input v-model="washForm.processType" placeholder="重介洗选" /></el-form-item>
          <el-form-item label="设备"><el-input v-model="washForm.equipmentCode" placeholder="WASH-LINE-01" /></el-form-item>
          <el-form-item label="操作员"><el-input v-model="washForm.operatorName" /></el-form-item>
          <el-form-item><el-button type="primary" @click="submitWash">创建洗选批次</el-button></el-form-item>
        </el-form>
        <el-divider content-position="left">添加入洗原煤</el-divider>
        <el-form :inline="true" :model="washInputForm" class="chain-form">
          <el-form-item label="洗选ID"><el-input-number v-model="washInputForm.washBatchId" :min="1" /></el-form-item>
          <el-form-item label="原煤ID"><el-input-number v-model="washInputForm.rawBatchId" :min="1" /></el-form-item>
          <el-form-item label="投入量"><el-input-number v-model="washInputForm.inputQuantity" :min="0" :precision="2" /></el-form-item>
          <el-form-item><el-button @click="submitWashInput">添加投入</el-button></el-form-item>
        </el-form>
        <el-divider content-position="left">完成洗选并产出产品</el-divider>
        <el-form :model="washFinishForm" class="json-form">
          <el-form-item label="洗选ID"><el-input-number v-model="washFinishForm.washBatchId" :min="1" /></el-form-item>
          <el-form-item label="产品JSON">
            <el-input v-model="washFinishProductsJson" type="textarea" :rows="5" />
          </el-form-item>
          <el-form-item><el-button type="success" @click="submitWashFinish">完成洗选</el-button></el-form-item>
        </el-form>
        <el-table :data="washRows" border stripe>
          <el-table-column prop="id" label="ID" width="70" />
          <el-table-column prop="washBatchNo" label="洗选批次号" width="170" />
          <el-table-column prop="processType" label="工艺" width="120" />
          <el-table-column prop="feedQuantity" label="入洗量" width="100" />
          <el-table-column prop="status" label="状态" width="100" />
          <el-table-column prop="equipmentCode" label="设备" min-width="130" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="产品批次" name="product">
        <el-table :data="productRows" border stripe>
          <el-table-column prop="productBatchNo" label="产品批次号" width="170" />
          <el-table-column prop="productType" label="类型" width="120" />
          <el-table-column prop="productName" label="名称" min-width="120" />
          <el-table-column prop="quantity" label="产量" width="100" />
          <el-table-column prop="availableQuantity" label="可用量" width="100" />
          <el-table-column prop="warehouseCode" label="仓号" width="100" />
          <el-table-column prop="sulfurContent" label="硫分" width="90" />
          <el-table-column prop="calorificValue" label="热值" width="100" />
          <el-table-column prop="status" label="状态" width="100" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="最终质检" name="inspection">
        <el-form :inline="true" :model="inspectionForm" class="chain-form">
          <el-form-item label="产品ID"><el-input-number v-model="inspectionForm.productBatchId" :min="1" /></el-form-item>
          <el-form-item label="订单ID"><el-input-number v-model="inspectionForm.orderId" :min="1" /></el-form-item>
          <el-form-item label="方案ID"><el-input-number v-model="inspectionForm.planId" :min="1" /></el-form-item>
          <el-form-item label="采样时间"><el-date-picker v-model="inspectionForm.sampleTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" /></el-form-item>
          <el-form-item label="灰分"><el-input-number v-model="inspectionForm.ashContent" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="硫分"><el-input-number v-model="inspectionForm.sulfurContent" :min="0" :precision="3" /></el-form-item>
          <el-form-item label="热值"><el-input-number v-model="inspectionForm.calorificValue" :min="0" /></el-form-item>
          <el-form-item><el-button type="primary" @click="submitInspection">新增质检</el-button></el-form-item>
        </el-form>
        <el-table :data="inspectionRows" border stripe>
          <el-table-column prop="reportNo" label="报告号" width="170" />
          <el-table-column prop="productBatchId" label="产品ID" width="90" />
          <el-table-column prop="orderId" label="订单ID" width="90" />
          <el-table-column prop="planId" label="方案ID" width="90" />
          <el-table-column prop="sampleTime" label="采样时间" width="170" />
          <el-table-column prop="qualifiedFlag" label="合格" width="80" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="发运交付" name="shipment">
        <el-form :inline="true" :model="shipmentForm" class="chain-form">
          <el-form-item label="订单ID"><el-input-number v-model="shipmentForm.orderId" :min="1" /></el-form-item>
          <el-form-item label="产品ID"><el-input-number v-model="shipmentForm.productBatchId" :min="1" /></el-form-item>
          <el-form-item label="发运量"><el-input-number v-model="shipmentForm.shipmentQuantity" :min="0" :precision="2" /></el-form-item>
          <el-form-item label="客户"><el-input v-model="shipmentForm.customerName" /></el-form-item>
          <el-form-item><el-button type="primary" @click="submitShipment">新增发运</el-button></el-form-item>
        </el-form>
        <el-table :data="shipmentRows" border stripe>
          <el-table-column prop="shipmentNo" label="发运批次号" width="170" />
          <el-table-column prop="orderId" label="订单ID" width="90" />
          <el-table-column prop="productBatchId" label="产品ID" width="90" />
          <el-table-column prop="shipmentQuantity" label="发运量" width="100" />
          <el-table-column prop="deliveryStatus" label="状态" width="100" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="批次追溯" name="trace">
        <el-form :inline="true" class="chain-form">
          <el-form-item label="批次号"><el-input v-model="traceBatchNo" placeholder="FP/CP/W/R/MS/SH..." style="width: 260px" /></el-form-item>
          <el-form-item label="类型"><el-input v-model="traceBatchType" placeholder="final_product/product_batch/raw_coal" style="width: 220px" /></el-form-item>
          <el-form-item><el-button type="primary" @click="loadTrace">查询追溯</el-button></el-form-item>
        </el-form>
        <el-row :gutter="16">
          <el-col :xs="24" :lg="10">
            <div class="sub-title">上游树</div>
            <el-tree v-if="traceResult?.upstreamTree" :data="[traceResult.upstreamTree]" :props="{ label: 'name', children: 'children' }" default-expand-all />
          </el-col>
          <el-col :xs="24" :lg="14">
            <div class="sub-title">血缘明细</div>
            <el-table :data="traceResult?.upstream || []" border size="small" class="mb">
              <el-table-column prop="parentBatchNo" label="父批次" min-width="150" />
              <el-table-column prop="childBatchNo" label="子批次" min-width="150" />
              <el-table-column prop="processStage" label="阶段" width="120" />
              <el-table-column prop="quantity" label="数量" width="100" />
            </el-table>
            <el-table :data="traceResult?.downstream || []" border size="small">
              <el-table-column prop="parentBatchNo" label="父批次" min-width="150" />
              <el-table-column prop="childBatchNo" label="子批次" min-width="150" />
              <el-table-column prop="processStage" label="下游阶段" width="120" />
              <el-table-column prop="quantity" label="数量" width="100" />
            </el-table>
          </el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  addWashInput,
  createFinalInspection,
  createMineSource,
  createRawCoalWithQuality,
  createShipment,
  createWashProcess,
  fetchFinalInspectionPage,
  fetchMineSourcePage,
  fetchProductBatchPage,
  fetchRawCoalBatchPage,
  fetchShipmentPage,
  fetchTraceByBatch,
  fetchWashProcessPage,
  finishWashProcess,
} from '@/api/fullChain'

const activeTab = ref('source')
const mineRows = ref([])
const rawRows = ref([])
const washRows = ref([])
const productRows = ref([])
const inspectionRows = ref([])
const shipmentRows = ref([])
const traceResult = ref(null)
const traceBatchNo = ref('')
const traceBatchType = ref('batch')

const mineForm = reactive({ mineArea: '', mineName: '', coalSeam: '', workingFace: '' })
const rawForm = reactive({
  sourceId: undefined,
  coalId: undefined,
  productionDate: '',
  outputQuantity: undefined,
  warehouseCode: '',
  destination: '原煤仓',
  quality: { ashContent: undefined, sulfurContent: undefined, calorificValue: undefined },
})
const washForm = reactive({ processType: '重介洗选', equipmentCode: '', operatorName: '' })
const washInputForm = reactive({ washBatchId: undefined, rawBatchId: undefined, inputQuantity: undefined })
const washFinishForm = reactive({ washBatchId: undefined })
const washFinishProductsJson = ref(`[
  {
    "productType": "clean_coal",
    "coalId": 1,
    "productName": "低硫精煤A",
    "quantity": 1000,
    "warehouseCode": "CP001",
    "ashContent": 12.8,
    "sulfurContent": 0.48,
    "moistureContent": 7.2,
    "volatileContent": 26.1,
    "calorificValue": 5350
  }
]`)
const inspectionForm = reactive({
  productBatchId: undefined,
  orderId: undefined,
  planId: undefined,
  sampleTime: '',
  ashContent: undefined,
  sulfurContent: undefined,
  calorificValue: undefined,
  qualifiedFlag: 1,
})
const shipmentForm = reactive({ orderId: undefined, productBatchId: undefined, shipmentQuantity: undefined, customerName: '' })

async function loadAll() {
  const [mine, raw, wash, product, inspection, shipment] = await Promise.all([
    fetchMineSourcePage({ current: 1, size: 20 }),
    fetchRawCoalBatchPage({ current: 1, size: 20 }),
    fetchWashProcessPage({ current: 1, size: 20 }),
    fetchProductBatchPage({ current: 1, size: 20 }),
    fetchFinalInspectionPage({ current: 1, size: 20 }),
    fetchShipmentPage({ current: 1, size: 20 }),
  ])
  mineRows.value = mine?.records ?? []
  rawRows.value = raw?.records ?? []
  washRows.value = wash?.records ?? []
  productRows.value = product?.records ?? []
  inspectionRows.value = inspection?.records ?? []
  shipmentRows.value = shipment?.records ?? []
}

async function submitMine() {
  await createMineSource(mineForm)
  ElMessage.success('已新增矿区来源')
  await loadAll()
}

async function submitRaw() {
  await createRawCoalWithQuality(rawForm)
  ElMessage.success('已新增原煤批次、煤质并入库')
  await loadAll()
}

async function submitWash() {
  await createWashProcess(washForm)
  ElMessage.success('已创建洗选批次')
  await loadAll()
}

async function submitWashInput() {
  await addWashInput(washInputForm)
  ElMessage.success('已添加入洗原煤')
  await loadAll()
}

async function submitWashFinish() {
  let products
  try {
    products = JSON.parse(washFinishProductsJson.value)
  } catch {
    ElMessage.error('产品JSON格式错误')
    return
  }
  await finishWashProcess({ ...washFinishForm, products })
  ElMessage.success('已完成洗选并生成产品批次')
  await loadAll()
}

async function submitInspection() {
  await createFinalInspection(inspectionForm)
  ElMessage.success('已新增最终产品质检')
  await loadAll()
}

async function submitShipment() {
  await createShipment(shipmentForm)
  ElMessage.success('已新增发运记录')
  await loadAll()
}

async function loadTrace() {
  if (!traceBatchNo.value) return
  traceResult.value = await fetchTraceByBatch(traceBatchNo.value, traceBatchType.value || 'batch')
}

onMounted(loadAll)
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
.mb {
  margin-bottom: 12px;
}
.chain-form {
  margin-bottom: 12px;
}
.json-form {
  max-width: 900px;
  margin-bottom: 12px;
}
.sub-title {
  font-weight: 600;
  margin: 8px 0;
}
</style>
