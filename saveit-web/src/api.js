const API_BASE = '/api'

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
  const token = getStoredToken()
  const headers = options.headers || {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  options.headers = headers
  
  const res = await fetch(API_BASE + path, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export async function login(email, password) {
  const resp = await api('/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  setToken(resp.token)
  return resp
}

export async function register(email, password) {
  const resp = await api('/users/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  })
  return resp
}

export function logout() {
  clearToken()
}
