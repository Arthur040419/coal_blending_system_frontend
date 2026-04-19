import http from './http'

export function fetchRuleKnowledgePage(params) {
  return http.get('/ruleKnowledge/page', { params })
}

export function fetchRuleKnowledgeByType(ruleType) {
  return http.get('/ruleKnowledge/byType', { params: { ruleType } })
}

export function fetchRuleKnowledgeEnabled() {
  return http.get('/ruleKnowledge/enabled')
}

export function fetchRuleKnowledgeDetail(id) {
  return http.get(`/ruleKnowledge/detail/${id}`)
}

export function createRuleKnowledge(body) {
  return http.post('/ruleKnowledge/add', body)
}

export function updateRuleKnowledge(body) {
  return http.put('/ruleKnowledge/update', body)
}

export function deleteRuleKnowledge(id) {
  return http.delete(`/ruleKnowledge/delete/${id}`)
}
