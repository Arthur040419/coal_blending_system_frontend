import { reactive } from 'vue'

const STORAGE_KEY = 'coal_blend_auth_v1'

/** 与后端 UserVO 对齐 */
export const auth = reactive({
  userId: null,
  user: null,
})

export function ensureAuthHydrated() {
  if (auth.userId) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const o = JSON.parse(raw)
    if (o?.userId) {
      auth.userId = o.userId
      auth.user = o.user ?? null
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function setAuthSession(userVo) {
  auth.userId = userVo?.id ?? null
  auth.user = userVo ?? null
  if (auth.userId) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ userId: auth.userId, user: auth.user }))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export function clearAuthSession() {
  auth.userId = null
  auth.user = null
  localStorage.removeItem(STORAGE_KEY)
}

export function displayName() {
  const u = auth.user
  if (!u) return '未登录'
  return u.realName || u.username || '用户'
}
