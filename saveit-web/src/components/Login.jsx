import { useState } from 'react'
import { TextInput, PasswordInput, Button, Card, Text, Stack, Alert, useMantineColorScheme, Group, Divider } from '@mantine/core'
import { IconWallet, IconMail, IconLock, IconBrandGoogle } from '@tabler/icons-react'
import { login, register, signInWithGoogle } from '../api'

export default function Login({ onLogin }) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(email, password, name)
      alert('Check your email for a verification link!')
      setIsRegister(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: 20,
      background: isDark ? '#1a1a1a' : '#f8fafc'
    }}>
      <Card shadow="md" radius="lg" padding="xl" style={{ width: '100%', maxWidth: 380, background: isDark ? '#252525' : 'white' }}>
        <Stack gap="md">
          <div style={{ textAlign: 'center' }}>
            <IconWallet size={48} stroke={1.5} style={{ marginBottom: 8, color: '#475569' }} />
            <Text size="xl" fw={700} style={{ fontSize: '1.75rem' }}>PlanMyBudget</Text>
            <Text size="sm" c="dimmed">
              {isRegister ? 'Create your account' : 'Track your finances'}
            </Text>
          </div>
          
          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}
          
          <Button 
            fullWidth 
            variant="outline"
            color="gray"
            leftSection={<IconBrandGoogle size={18} />}
            onClick={handleGoogleLogin}
            loading={googleLoading}
          >
            Continue with Google
          </Button>
          
          <Divider label="or" labelPosition="center" />
          
          {isRegister ? (
            <form onSubmit={handleEmailRegister}>
              <Stack gap="sm">
                <TextInput
                  label="Name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  leftSection={<IconMail size={16} />}
                />
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftSection={<IconMail size={16} />}
                  required
                />
                <PasswordInput
                  label="Password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftSection={<IconLock size={16} />}
                  required
                />
                <Button 
                  type="submit" 
                  fullWidth 
                  loading={loading}
                  color="gray"
                >
                  Create Account
                </Button>
              </Stack>
            </form>
          ) : (
            <form onSubmit={handleEmailLogin}>
              <Stack gap="sm">
                <TextInput
                  label="Email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftSection={<IconMail size={16} />}
                  required
                />
                <PasswordInput
                  label="Password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftSection={<IconLock size={16} />}
                  required
                />
                <Button 
                  type="submit" 
                  fullWidth 
                  loading={loading}
                  color="gray"
                >
                  Sign In
                </Button>
              </Stack>
            </form>
          )}
          
          <Text 
            size="xs" 
            c="dimmed" 
            ta="center"
            style={{ cursor: 'pointer' }}
            onClick={() => { setIsRegister(!isRegister); setError('') }}
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Text>
          
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
