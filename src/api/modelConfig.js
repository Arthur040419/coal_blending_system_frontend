import http from './http'

export function fetchModelConfigList() {
  return http.get('/modelConfig/list')
}

export function fetchModelConfigPage(params) {
  return http.get('/modelConfig/page', { params })
}

export function fetchModelConfigDetail(id) {
  return http.get(`/modelConfig/detail/${id}`)
}

export function createModelConfig(body) {
  return http.post('/modelConfig/add', body)
}

export function updateModelConfig(body) {
  return http.put('/modelConfig/update', body)
}

export function updateModelConfigStatus(id, status) {
  return http.put('/modelConfig/status', { id, status })
}

export function deleteModelConfig(id) {
  return http.delete(`/modelConfig/delete/${id}`)
}
