import http from './http'

/** 配煤生成含同步大模型调用，耗时可能超过普通接口；应不小于后端 coal.llm.read-timeout（默认 10m） */
const GENERATE_TIMEOUT_MS = 600000

export function generateBlendPlan(body) {
  return http.post('/blendPlan/generate', body, { timeout: GENERATE_TIMEOUT_MS })
}

export function fetchBlendPlanPage(params) {
  return http.get('/blendPlan/page', { params })
}

export function fetchBlendPlanHistory(params) {
  return http.get('/blendPlan/history', { params })
}

export function fetchBlendPlanDetail(id) {
  return http.get(`/blendPlan/detail/${id}`)
}

export function fetchBlendPlanDetails(planId) {
  return http.get(`/blendPlan/details/${planId}`)
}

export function fetchBlendPlanByOrder(orderId) {
  return http.get(`/blendPlan/byOrder/${orderId}`)
}

export function selectBlendPlan(planId) {
  return http.put('/blendPlan/select', { planId })
}

export function executeBlendPlan(body) {
  return http.post('/blendPlan/execute', body)
}
