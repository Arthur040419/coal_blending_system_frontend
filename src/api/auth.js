import http from './http'

export function login(body) {
  return http.post('/auth/login', body)
}

/** 演示用：后端从请求头 X-User-Id 读取当前用户 */
export function fetchMe(userId) {
  return http.get('/auth/me', {
    headers: userId ? { 'X-User-Id': String(userId) } : {},
  })
}
