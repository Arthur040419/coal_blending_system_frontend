import http from './http'

export function fetchCoalTypePage(params) {
  return http.get('/coalType/page', { params })
}

export function fetchCoalTypeDetail(id) {
  return http.get(`/coalType/detail/${id}`)
}

export function createCoalType(body) {
  return http.post('/coalType/add', body)
}

export function updateCoalType(body) {
  return http.put('/coalType/update', body)
}

export function deleteCoalType(id) {
  return http.delete(`/coalType/delete/${id}`)
}
