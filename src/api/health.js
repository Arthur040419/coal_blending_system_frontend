import http from './http'

/** 用于首页探测后端是否可用：GET /health */
export function fetchHealth() {
  return http.get('/health')
}
