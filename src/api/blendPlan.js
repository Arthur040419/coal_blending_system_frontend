import http from './http'

export function generateBlendPlan(body) {
  return http.post('/blendPlan/generate', body)
}

export function fetchBlendPlanHistory(params) {
  return http.get('/blendPlan/history', { params })
}
