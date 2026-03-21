import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) throw new Error(error.message)
  setToken(data.session.access_token)
  return data
}

export async function register(email, password, name) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  })
  if (error) throw new Error(error.message)
  if (data.session) {
    setToken(data.session.access_token)
  }
  return data
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  })
  if (error) throw new Error(error.message)
  return data
}

export function logout() {
  supabase.auth.signOut()
  clearToken()
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}
