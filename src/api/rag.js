import http from './http'

export function fetchRagHealth() {
  return http.get('/rag/health')
}

export function ingestAllRag() {
  return http.post('/rag/ingest/all')
}

export function ingestRagKnowledge(id) {
  return http.post(`/rag/ingest/knowledge/${id}`)
}

export function ingestRagRule(id) {
  return http.post(`/rag/ingest/rule/${id}`)
}

export function ingestRagCase(id) {
  return http.post(`/rag/ingest/case/${id}`)
}

export function fetchRagDocuments(params) {
  return http.get('/rag/documents', { params })
}

export function fetchRagChunks(params) {
  return http.get('/rag/chunks', { params })
}

export function retrieveRagByOrder(orderId, params) {
  return http.get(`/rag/retrieve/order/${orderId}`, { params })
}
