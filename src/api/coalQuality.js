import http from './http'

export function fetchCoalQualityPage(params) {
  return http.get('/coalQuality/page', { params })
}

export function fetchCoalQualityByCoal(coalId) {
  return http.get(`/coalQuality/listByCoal/${coalId}`)
}

export function fetchCoalQualityLatest(coalId) {
  return http.get(`/coalQuality/latest/${coalId}`)
}

export function fetchCoalQualityDetail(id) {
  return http.get(`/coalQuality/detail/${id}`)
}

export function createCoalQuality(body) {
  return http.post('/coalQuality/add', body)
}

export function updateCoalQuality(body) {
  return http.put('/coalQuality/update', body)
}

export function deleteCoalQuality(id) {
  return http.delete(`/coalQuality/delete/${id}`)
}
