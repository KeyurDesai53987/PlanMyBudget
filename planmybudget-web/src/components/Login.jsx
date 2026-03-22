import { useState, useMemo, useEffect } from 'react'
import { TextInput, PasswordInput, Button, Card, Text, Stack, Alert, useMantineColorScheme, Group, Checkbox, Progress, Center, Image } from '@mantine/core'
import { IconMail, IconLock, IconUser, IconArrowLeft } from '@tabler/icons-react'
import { login, register } from '../api'

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: 'gray' }
  
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  
  if (score <= 2) return { score: 33, label: 'Weak', color: 'red' }
  if (score <= 4) return { score: 66, label: 'Fair', color: 'yellow' }
  if (score <= 5) return { score: 83, label: 'Good', color: 'blue' }
  return { score: 100, label: 'Strong', color: 'green' }
}

export default function Login({ onLogin }) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      if (rememberMe) {
        localStorage.setItem('rememberEmail', email)
      } else {
        localStorage.removeItem('rememberEmail')
      }
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    
    setLoading(true)
    try {
      await register(email, password, name)
      setIsRegister(false)
      setPassword('')
      setName('')
      setError('')
      setError({ type: 'success', text: 'Account created! Please login.' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadSavedEmail = () => {
    const savedEmail = localStorage.getItem('rememberEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      background: isDark ? '#1a1a1a' : '#f8fafc'
    }}>
      <Card shadow="md" radius="lg" padding="xl" style={{ 
        width: '100%', 
        maxWidth: 420, 
        background: isDark ? '#252525' : 'white',
        margin: '0 auto'
      }}>
        <Stack gap="md">
          <div style={{ textAlign: 'center' }}>
            <Image 
              src="/logo.svg" 
              w={80} 
              h={80} 
              style={{ margin: '0 auto 12px' }}
              radius="xl"
            />
            <Text size="xl" fw={700} style={{ fontSize: '1.75rem' }}>PlanMyBudget</Text>
            <Text size="sm" c="dimmed">
              {isRegister ? 'Create your account' : 'Track your finances'}
            </Text>
          </div>
          
          {error && typeof error === 'string' && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}
          
          {error && error.type === 'success' && (
            <Alert color="green" variant="light">
              {error.text}
            </Alert>
          )}
          
          {!isRegister ? (
            <form onSubmit={handleLogin}>
              <Stack gap="sm">
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftSection={<IconMail size={16} />}
                  required
                  size="md"
                />
                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftSection={<IconLock size={16} />}
                  required
                  size="md"
                />
                <Checkbox
                  label="Remember me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.currentTarget.checked)}
                  size="sm"
                />
                <Button 
                  type="submit" 
                  fullWidth 
                  loading={loading}
                  color="gray"
                  size="md"
                >
                  Sign In
                </Button>
              </Stack>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <Stack gap="sm">
                <TextInput
                  label="Name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftSection={<IconUser size={16} />}
                  size="md"
                />
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftSection={<IconMail size={16} />}
                  required
                  size="md"
                />
                <div>
                  <PasswordInput
                    label="Password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftSection={<IconLock size={16} />}
                    required
                    size="md"
                  />
                  {password && (
                    <Stack gap={4} mt={8}>
                      <Progress 
                        value={passwordStrength.score} 
                        color={passwordStrength.color} 
                        size="xs" 
                        radius="xl"
                      />
                      <Text size="xs" c={passwordStrength.color}>
                        Password strength: {passwordStrength.label}
                      </Text>
                    </Stack>
                  )}
                </div>
                <Button 
                  type="submit" 
                  fullWidth 
                  loading={loading}
                  color="gray"
                  size="md"
                  disabled={passwordStrength.score < 33}
                >
                  Create Account
                </Button>
              </Stack>
            </form>
          )}
          
          <Group justify="center" gap={4}>
            <Text size="xs" c="dimmed">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <Button 
              variant="subtle" 
              size="xs" 
              color="gray"
              onClick={() => {
                setIsRegister(!isRegister)
                setError('')
                if (!isRegister) loadSavedEmail()
              }}
            >
              {isRegister ? 'Sign In' : 'Register'}
            </Button>
          </Group>
          
          {!isRegister && (
            <Text size="xs" c="dimmed" ta="center">
              Demo: demo@saveit.app / password
            </Text>
          )}
        </Stack>
      </Card>
    </div>
  )
}
