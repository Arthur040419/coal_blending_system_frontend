import http from './http'

export function generateBlendPlan(body) {
  return http.post('/blendPlan/generate', body)
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
