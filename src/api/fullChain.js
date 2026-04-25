import http from './http'

export function fetchMineSourcePage(params) {
  return http.get('/mineSource/page', { params })
}

export function createMineSource(body) {
  return http.post('/mineSource/add', body)
}

export function fetchRawCoalBatchPage(params) {
  return http.get('/rawCoalBatch/page', { params })
}

export function createRawCoalWithQuality(body) {
  return http.post('/rawCoalBatch/addWithQuality', body)
}

export function fetchWashProcessPage(params) {
  return http.get('/washProcess/page', { params })
}

export function createWashProcess(body) {
  return http.post('/washProcess/create', body)
}

export function addWashInput(body) {
  return http.post('/washProcess/addInput', body)
}

export function finishWashProcess(body) {
  return http.post('/washProcess/finish', body)
}

export function fetchProductBatchPage(params) {
  return http.get('/productBatch/page', { params })
}

export function createProductBatch(body) {
  return http.post('/productBatch/add', body)
}

export function fetchFinalInspectionPage(params) {
  return http.get('/finalInspection/page', { params })
}

export function createFinalInspection(body) {
  return http.post('/finalInspection/add', body)
}

export function fetchShipmentPage(params) {
  return http.get('/shipmentDelivery/page', { params })
}

export function createShipment(body) {
  return http.post('/shipmentDelivery/add', body)
}

export function fetchTraceByBatch(batchNo, batchType = 'batch') {
  return http.get(`/trace/byBatch/${encodeURIComponent(batchNo)}`, { params: { batchType } })
}

export function fetchTraceByOrder(orderId) {
  return http.get(`/trace/byOrder/${orderId}`)
}
