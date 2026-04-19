import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000,
})

http.interceptors.response.use(
  (res) => {
    const payload = res.data
    if (payload == null) {
      return payload
    }
    if (typeof payload.code === 'number' && payload.code !== 200) {
      ElMessage.error(payload.message || '请求失败')
      return Promise.reject(new Error(payload.message || '请求失败'))
    }
    return payload.data
  },
  (err) => {
    const msg =
      err.response?.data?.message ||
      err.message ||
      '网络错误，请检查后端是否已启动（默认 8080）'
    ElMessage.error(msg)
    return Promise.reject(err)
  }
)

export default http
