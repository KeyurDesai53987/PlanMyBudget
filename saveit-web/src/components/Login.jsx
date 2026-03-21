import { useState, useEffect, useRef } from 'react'
import { TextInput, PasswordInput, Button, Card, Text, Stack, Alert, useMantineColorScheme, Group, Divider, Loader } from '@mantine/core'
import { IconWallet, IconMail, IconLock, IconUser, IconBrandGoogle } from '@tabler/icons-react'
import { login, sendOTP, verifyOTP, googleAuth } from '../api'

export default function Login({ onLogin }) {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [isRegister, setIsRegister] = useState(false)
  const [step, setStep] = useState('credentials') // credentials, otp
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const googleButtonRef = useRef(null)

  useEffect(() => {
    const loadGoogleScript = () => {
      if (window.google) return
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
    loadGoogleScript()
  }, [])

  useEffect(() => {
    if (window.google && window.google.accounts && googleButtonRef.current) {
      window.google.accounts.id.initialize({
        client_id: window.ENV?.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
        callback: handleGoogleResponse
      })
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: isDark ? 'filled_black' : 'outline',
        size: 'large',
        width: '100%'
      })
    }
  }, [isDark])

  const handleGoogleResponse = async (response) => {
    setGoogleLoading(true)
    setError('')
    try {
      await googleAuth(response.credential)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!email) throw new Error('Email required')
      if (!password || password.length < 6) throw new Error('Password must be at least 6 characters')
      
      await sendOTP(email)
      setStep('otp')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!otp || otp.length !== 6) throw new Error('Enter 6-digit OTP')
      
      await verifyOTP(email, otp, password, name)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
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

  const handleBack = () => {
    setStep('credentials')
    setOtp('')
    setError('')
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
          
          {isRegister ? (
            step === 'credentials' ? (
              <form onSubmit={handleSendOTP}>
                <Stack gap="sm">
                  <TextInput
                    label="Name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    leftSection={<IconUser size={16} />}
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
                    Continue
                  </Button>
                </Stack>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP}>
                <Stack gap="sm">
                  <div style={{ textAlign: 'center' }}>
                    <Text size="sm" c="dimmed" mb="xs">
                      We sent a verification code to
                    </Text>
                    <Text size="sm" fw={500}>{email}</Text>
                  </div>
                  <TextInput
                    label="Verification Code"
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '24px' }}
                    styles={{ input: { textAlign: 'center', letterSpacing: '8px', fontSize: '24px' } }}
                  />
                  <Button 
                    type="submit" 
                    fullWidth 
                    loading={loading}
                    color="gray"
                  >
                    Verify & Create Account
                  </Button>
                  <Button 
                    variant="subtle" 
                    fullWidth 
                    color="gray"
                    onClick={handleBack}
                    disabled={loading}
                  >
                    Back
                  </Button>
                </Stack>
              </form>
            )
          ) : (
            <>
              <form onSubmit={handleLogin}>
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
              
              <Divider label="or" labelPosition="center" />
              
              <div ref={googleButtonRef} style={{ minHeight: 44 }}>
                {googleLoading && (
                  <Group justify="center" py="xs">
                    <Loader size="sm" />
                    <Text size="sm" c="dimmed">Signing in...</Text>
                  </Group>
                )}
              </div>
            </>
          )}
          
          <Text 
            size="xs" 
            c="dimmed" 
            ta="center"
            style={{ cursor: 'pointer' }}
            onClick={() => { setIsRegister(!isRegister); setStep('credentials'); setError(''); setOtp(''); }}
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
