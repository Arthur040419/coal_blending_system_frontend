import http from './http'

export function fetchInventoryPage(params) {
  return http.get('/inventory/page', { params })
}

export function fetchInventoryByCoal(coalId) {
  return http.get(`/inventory/byCoal/${coalId}`)
}

export function fetchInventoryAvailable(coalId) {
  return http.get(`/inventory/available/${coalId}`)
}

export function fetchInventoryDetail(id) {
  return http.get(`/inventory/detail/${id}`)
}

export function createInventory(body) {
  return http.post('/inventory/add', body)
}

export function updateInventory(body) {
  return http.put('/inventory/update', body)
}

export function deleteInventory(id) {
  return http.delete(`/inventory/delete/${id}`)
}
