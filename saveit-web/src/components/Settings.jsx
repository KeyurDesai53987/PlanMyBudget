import { useState, useEffect } from 'react'
import { Card, Group, Text, Stack, TextInput, PasswordInput, Button, Loader, Center, Collapse, Divider } from '@mantine/core'
import { IconUser, IconLock, IconCheck, IconChevronDown, IconChevronUp, IconInfoCircle } from '@tabler/icons-react'
import { api } from '../api'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({ email: '', name: '', createdAt: '' })
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [expanded, setExpanded] = useState({ profile: true, password: false, account: false, about: false })

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    try {
      const res = await api('/profile')
      setProfile({
        email: res.preferences?.email || '',
        name: res.preferences?.name || '',
        createdAt: res.preferences?.createdAt || ''
      })
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const toggleSection = (section) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api('/profile', { method: 'PUT', body: JSON.stringify({ name: profile.name }) })
      setMessage({ type: 'success', text: 'Profile saved!' })
    } catch (err) { 
      setMessage({ type: 'error', text: err.message || 'Failed to save' })
    }
    finally { setSaving(false) }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwordData.new !== passwordData.confirm) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }
    if (passwordData.new.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      await api('/change-password', { method: 'PUT', body: JSON.stringify({ currentPassword: passwordData.current, newPassword: passwordData.new }) })
      setMessage({ type: 'success', text: 'Password updated!' })
      setPasswordData({ current: '', new: '', confirm: '' })
    } catch (err) { 
      setMessage({ type: 'error', text: err.message || 'Failed to update password' })
    }
    finally { setSaving(false) }
  }

  if (loading) return <Center h={300}><Loader color="gray" /></Center>

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Text size="xl" fw={700} mb="lg">Settings</Text>

      {message.text && (
        <Card padding="sm" radius="md" mb="lg" withBorder style={{ background: message.type === 'success' ? '#ecfdf5' : '#fef2f2' }}>
          <Text size="sm" c={message.type === 'success' ? 'green' : 'red'}>{message.text}</Text>
        </Card>
      )}

      <Stack gap="sm">
        <Card shadow="sm" padding={0} radius="md" withBorder>
          <Group 
            gap="sm" 
            p="md" 
            style={{ cursor: 'pointer', borderBottom: expanded.profile ? '1px solid var(--mantine-color-default-border)' : 'none' }}
            onClick={() => toggleSection('profile')}
          >
            <IconUser size={18} />
            <Text fw={600} style={{ flex: 1 }}>Profile</Text>
            {expanded.profile ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
          </Group>
          <Collapse in={expanded.profile}>
            <form onSubmit={handleProfileUpdate}>
              <Stack gap="sm" p="md">
                <TextInput
                  label="Name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
                <TextInput
                  label="Email"
                  value={profile.email}
                  disabled
                />
                <Button type="submit" color="gray" size="sm" loading={saving} style={{ alignSelf: 'flex-start' }}>
                  Save
                </Button>
              </Stack>
            </form>
          </Collapse>
        </Card>

        <Card shadow="sm" padding={0} radius="md" withBorder>
          <Group 
            gap="sm" 
            p="md" 
            style={{ cursor: 'pointer', borderBottom: expanded.password ? '1px solid var(--mantine-color-default-border)' : 'none' }}
            onClick={() => toggleSection('password')}
          >
            <IconLock size={18} />
            <Text fw={600} style={{ flex: 1 }}>Password</Text>
            {expanded.password ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
          </Group>
          <Collapse in={expanded.password}>
            <form onSubmit={handlePasswordChange}>
              <Stack gap="sm" p="md">
                <PasswordInput
                  label="Current"
                  placeholder="Current password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                />
                <PasswordInput
                  label="New"
                  placeholder="New password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                />
                <PasswordInput
                  label="Confirm"
                  placeholder="Confirm password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                />
                <Button 
                  type="submit" 
                  color="gray" 
                  size="sm" 
                  loading={saving}
                  disabled={!passwordData.current || !passwordData.new || !passwordData.confirm}
                  style={{ alignSelf: 'flex-start' }}
                >
                  Update Password
                </Button>
              </Stack>
            </form>
          </Collapse>
        </Card>

        <Card shadow="sm" padding={0} radius="md" withBorder>
          <Group 
            gap="sm" 
            p="md" 
            style={{ cursor: 'pointer', borderBottom: expanded.account ? '1px solid var(--mantine-color-default-border)' : 'none' }}
            onClick={() => toggleSection('account')}
          >
            <IconCheck size={18} />
            <Text fw={600} style={{ flex: 1 }}>Account</Text>
            {expanded.account ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
          </Group>
          <Collapse in={expanded.account}>
            <Stack gap="xs" p="md">
              <Text size="sm"><strong>Email:</strong> {profile.email}</Text>
              <Text size="sm"><strong>Member since:</strong> {new Date(profile.createdAt).toLocaleDateString()}</Text>
            </Stack>
          </Collapse>
        </Card>

        <Card shadow="sm" padding={0} radius="md" withBorder>
          <Group 
            gap="sm" 
            p="md" 
            style={{ cursor: 'pointer', borderBottom: expanded.about ? '1px solid var(--mantine-color-default-border)' : 'none' }}
            onClick={() => toggleSection('about')}
          >
            <IconInfoCircle size={18} />
            <Text fw={600} style={{ flex: 1 }}>About</Text>
            {expanded.about ? <IconChevronUp size={18} /> : <IconChevronDown size={18} />}
          </Group>
          <Collapse in={expanded.about}>
            <Stack gap="sm" p="md">
              <Text size="lg" fw={700}>PlanMyBudget</Text>
              <Text size="sm" c="dimmed">Personal Finance Tracker</Text>
              <Text size="xs" c="dimmed">Version 1.0.0</Text>
              <Divider my="sm" />
              <Text size="sm">
                PlanMyBudget is a simple and intuitive personal finance management app that helps you track your income, expenses, budgets, and financial goals.
              </Text>
              <Text size="sm">
                Built with React, Mantine UI, and SQLite.
              </Text>
              <Divider my="sm" />
              <Text size="sm"><strong>Developer:</strong> Keyur Desai</Text>
              <Text size="sm"><strong>Email:</strong> keyurdesai@icloud.com</Text>
            </Stack>
          </Collapse>
        </Card>
      </Stack>
    </div>
  )
}
