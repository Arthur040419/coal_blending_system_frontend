import http from './http'

export function fetchUserPage(params) {
  return http.get('/user/page', { params })
}

export function fetchUserDetail(id) {
  return http.get(`/user/detail/${id}`)
}

export function createUser(body) {
  return http.post('/user/add', body)
}

export function updateUser(body) {
  return http.put('/user/update', body)
}

export function updateUserStatus(id, status) {
  return http.put('/user/status', { id, status })
}

export function deleteUser(id) {
  return http.delete(`/user/delete/${id}`)
}
