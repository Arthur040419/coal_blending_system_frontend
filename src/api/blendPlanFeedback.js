import http from './http'

export function fetchFeedbackPage(params) {
  return http.get('/blendPlanFeedback/page', { params })
}

export function fetchFeedbackByPlan(planId) {
  return http.get(`/blendPlanFeedback/byPlan/${planId}`)
}

export function fetchFeedbackDetail(id) {
  return http.get(`/blendPlanFeedback/detail/${id}`)
}

export function createFeedback(body) {
  return http.post('/blendPlanFeedback/add', body)
}

export function updateFeedback(body) {
  return http.put('/blendPlanFeedback/update', body)
}

export function convertFeedbackToCase(feedbackId) {
  return http.post(`/blendPlanFeedback/convertToCase/${feedbackId}`)
}
