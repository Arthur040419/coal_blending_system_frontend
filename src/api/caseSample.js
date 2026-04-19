import http from './http'

export function fetchCaseSamplePage(params) {
  return http.get('/caseSample/page', { params })
}

export function searchCaseSample(keyword) {
  return http.get('/caseSample/search', { params: { keyword } })
}

export function fetchCaseSampleDetail(id) {
  return http.get(`/caseSample/detail/${id}`)
}

export function createCaseSample(body) {
  return http.post('/caseSample/add', body)
}

export function updateCaseSample(body) {
  return http.put('/caseSample/update', body)
}

export function deleteCaseSample(id) {
  return http.delete(`/caseSample/delete/${id}`)
}
