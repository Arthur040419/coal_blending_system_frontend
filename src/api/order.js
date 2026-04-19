import http from './http'

export function fetchOrderPage(params) {
  return http.get('/order/page', { params })
}

export function fetchOrderDetail(id) {
  return http.get(`/order/detail/${id}`)
}

export function createOrder(body) {
  return http.post('/order/add', body)
}

export function updateOrder(body) {
  return http.put('/order/update', body)
}

export function deleteOrder(id) {
  return http.delete(`/order/delete/${id}`)
}

export function updateOrderStatus(id, orderStatus) {
  return http.put('/order/status', { id, orderStatus })
}
