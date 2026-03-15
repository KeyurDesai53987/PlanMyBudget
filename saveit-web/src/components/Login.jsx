import { useState } from 'react'
import { TextInput, PasswordInput, Button, Card, Text, Stack, Alert, useMantineColorScheme } from '@mantine/core'
import { IconWallet } from '@tabler/icons-react'
import { login, register } from '../api'

export default function Login({ onLogin }) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await register(email, password)
        await login(email, password)
      } else {
        await login(email, password)
      }
      onLogin()
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
          
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <PasswordInput
                label="Password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button 
                type="submit" 
                fullWidth 
                loading={loading}
                color="gray"
              >
                {isRegister ? 'Sign Up' : 'Sign In'}
              </Button>
            </Stack>
          </form>
          
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
