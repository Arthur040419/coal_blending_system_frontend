import http from './http'

export function fetchOrderPage(params) {
  return http.get('/order/page', { params })
}
