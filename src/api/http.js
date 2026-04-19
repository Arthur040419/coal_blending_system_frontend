import axios from 'axios'
import { ElMessage } from 'element-plus'
import { auth, clearAuthSession } from '@/stores/auth'
import router from '@/router'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000,
})

http.interceptors.request.use((config) => {
  const url = config.url || ''
  if (url.includes('/auth/login')) {
    return config
  }
  if (auth.userId) {
    config.headers = config.headers || {}
    if (!config.headers['X-User-Id']) {
      config.headers['X-User-Id'] = String(auth.userId)
    }
  }
  return config
})

function redirectToLogin() {
  clearAuthSession()
  const path = router.currentRoute.value?.fullPath || '/'
  if (router.currentRoute.value?.name === 'Login') return
  router.replace({ name: 'Login', query: { redirect: path === '/login' ? undefined : path } }).catch(() => {})
}

http.interceptors.response.use(
  (res) => {
    const payload = res.data
    if (payload == null) {
      return payload
    }
    if (typeof payload.code === 'number' && payload.code !== 200) {
      if (payload.code === 401) {
        ElMessage.warning(payload.message || '登录已失效，请重新登录')
        redirectToLogin()
      } else {
        ElMessage.error(payload.message || '请求失败')
      }
      return Promise.reject(new Error(payload.message || '请求失败'))
    }
    return payload.data
  },
  (err) => {
    const code = err.response?.data?.code
    if (code === 401) {
      ElMessage.warning(err.response?.data?.message || '登录已失效，请重新登录')
      redirectToLogin()
    } else {
      const msg =
        err.response?.data?.message ||
        err.message ||
        '网络错误，请检查后端是否已启动（默认 8080）'
      ElMessage.error(msg)
    }
    return Promise.reject(err)
  }
)

export default http
