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
  return resp
}

export async function googleAuth(credential) {
  const resp = await api('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken: credential })
  })
  setToken(resp.token)
  return resp
}

export function logout() {
  clearToken()
}

export async function loginAsDemo() {
  return login('demo@saveit.app', 'password')
}
