const API_BASE = '/api'

const cache = new Map()
const CACHE_TTL = 30000

function cacheKey(path) {
  return path.split('?')[0].replace(/\/+$/, '')
}

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() })
}

function getStoredToken() {
  return localStorage.getItem('saveit_token')
}

export function getToken() {
  return getStoredToken()
}

export function setToken(t) {
  localStorage.setItem('saveit_token', t)
}

export function clearToken() {
  localStorage.removeItem('saveit_token')
}

export async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase()
  const key = cacheKey(path)

  if (method === 'GET' && !options.skipCache) {
    const cached = getCached(key)
    if (cached) return cached
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    cache.clear()
  }

  const token = getStoredToken()
  const headers = options.headers || {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  options.headers = headers

  const res = await fetch(API_BASE + path, options)
  if (!res.ok) {
    const text = await res.text()
    let err
    try { err = JSON.parse(text) } catch { err = { error: text || 'Unknown error' } }
    console.error(`API ${method} ${path} ${res.status}:`, err)
    throw new Error(err.error || err.detail || err.message || 'Request failed')
  }
  const data = await res.json()

  if (method === 'GET') setCached(key, data)

  return data
}

export function clearCache() {
  cache.clear()
}

export async function login(email, password) {
  const resp = await api('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  setToken(resp.token)
  if (email === 'demo@saveit.app') {
    setDemoEmail(email)
  } else {
    clearDemoEmail()
  }
  return resp
}

export async function register(email, password, name = '') {
  const resp = await api('/users/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name })
  })
  return resp
}

export async function sendOTP(email) {
  const resp = await api('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email })
  })
  return resp
}

export async function verifyOTP(email, otp, password, name) {
  const resp = await api('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp, password, name })
  })
  setToken(resp.token)
  if (email !== 'demo@saveit.app') {
    clearDemoEmail()
  }
  return resp
}

export async function googleAuth(credential) {
  const resp = await api('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken: credential })
  })
  setToken(resp.token)
  clearDemoEmail()
  return resp
}

export function logout() {
  clearToken()
  clearDemoEmail()
  clearCache()
}

export async function loginAsDemo() {
  localStorage.setItem('demo_email', 'demo@saveit.app')
  return login('demo@saveit.app', 'password')
}

export function isDemoUser() {
  const email = localStorage.getItem('demo_email')
  return email === 'demo@saveit.app'
}

export async function checkIsDemoUser() {
  try {
    const res = await api('/profile')
    return res.preferences?.email === 'demo@saveit.app'
  } catch {
    return false
  }
}

export function setDemoEmail(email) {
  if (email === 'demo@saveit.app') {
    localStorage.setItem('demo_email', email)
  }
}

export function clearDemoEmail() {
  localStorage.removeItem('demo_email')
}
