import { useState, useEffect } from 'react'
import { Card, Group, Text, Stack, TextInput, PasswordInput, Button, Avatar, Badge, Divider, Switch, useMantineColorScheme, SimpleGrid, Textarea, CopyButton, ActionIcon, Tooltip } from '@mantine/core'
import { IconUser, IconLock, IconCheck, IconInfoCircle, IconPalette, IconCalendar, IconCurrencyDollar, IconLogout, IconTrendingUp, IconTarget, IconReceipt, IconKey, IconCopy, IconCheck as IconCheckFilled } from '@tabler/icons-react'
import { api } from '../api'
import { colors } from '../theme'
import { SettingsSkeleton } from './Skeletons'

function StatItem({ icon: Icon, label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px' }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 8px'
      }}>
        <Icon size={20} style={{ color }} />
      </div>
      <Text size="lg" fw={700}>{value}</Text>
      <Text size="xs" c="dimmed">{label}</Text>
    </div>
  )
}

export default function Settings() {
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({ email: '', name: '', createdAt: '' })
  const [stats, setStats] = useState({ transactions: 0, accounts: 0, goals: 0, budgets: 0 })
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [apiKeys, setApiKeys] = useState([])
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [profileRes, accountsRes, transactionsRes, goalsRes, budgetsRes, keysRes] = await Promise.all([
        api('/profile'),
        api('/accounts'),
        api('/transactions'),
        api('/goals'),
        api('/budgets'),
        api('/api-keys')
      ])
      setProfile({
        email: profileRes.preferences?.email || '',
        name: profileRes.preferences?.name || '',
        createdAt: profileRes.preferences?.createdAt || ''
      })
      setStats({
        transactions: transactionsRes.transactions?.length || 0,
        accounts: accountsRes.accounts?.length || 0,
        goals: goalsRes.goals?.length || 0,
        budgets: budgetsRes.budgets?.length || 0
      })
      setApiKeys(keysRes.apiKeys || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
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

  const handleCreateApiKey = async (e) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setSaving(true)
    try {
      const res = await api('/api-keys', { method: 'POST', body: JSON.stringify({ name: newKeyName }) })
      setGeneratedKey(res.apiKey)
      setNewKeyName('')
      const keysRes = await api('/api-keys')
      setApiKeys(keysRes.apiKeys || [])
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create API key' })
    }
    setSaving(false)
  }

  const handleRevokeApiKey = async (id) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return
    try {
      await api(`/api-keys/${id}`, { method: 'DELETE' })
      setApiKeys(apiKeys.filter(k => k.id !== id))
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to revoke API key' })
    }
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) return <SettingsSkeleton />

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <Text size="xl" fw={700} mb="lg">Settings</Text>

      {message.text && (
        <Card padding="sm" radius="md" mb="lg" withBorder style={{ background: message.type === 'success' ? '#ecfdf5' : '#fef2f2' }}>
          <Text size="sm" c={message.type === 'success' ? 'green' : 'red'}>{message.text}</Text>
        </Card>
      )}

      <Stack gap="md">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="lg">
            <Avatar size={80} radius="xl" color="gray" style={{ background: colors.primary + '20' }}>
              <Text size="xl" fw={700} style={{ color: colors.primary }}>{getInitials(profile.name)}</Text>
            </Avatar>
            <div style={{ flex: 1 }}>
              <Text size="xl" fw={700}>{profile.name || 'User'}</Text>
              <Text size="sm" c="dimmed">{profile.email}</Text>
              <Group gap="xs" mt="xs">
                <Badge size="sm" variant="light" color="gray" leftSection={<IconCalendar size={12} />}>
                  Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </Badge>
              </Group>
            </div>
          </Group>
          
          <Divider my="md" />
          
          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            <StatItem icon={IconReceipt} label="Transactions" value={stats.transactions} color={colors.primary} />
            <StatItem icon={IconCurrencyDollar} label="Accounts" value={stats.accounts} color={colors.success} />
            <StatItem icon={IconTarget} label="Goals" value={stats.goals} color={colors.warning} />
            <StatItem icon={IconTrendingUp} label="Budgets" value={stats.budgets} color={colors.danger} />
          </SimpleGrid>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <IconUser size={20} />
            <Text fw={600}>Profile</Text>
          </Group>
          <form onSubmit={handleProfileUpdate}>
            <Stack gap="sm">
              <TextInput
                label="Display Name"
                placeholder="Your name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
              <TextInput
                label="Email"
                value={profile.email}
                disabled
              />
              <Button type="submit" color="gray" loading={saving} style={{ alignSelf: 'flex-start' }}>
                Save Changes
              </Button>
            </Stack>
          </form>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <IconLock size={20} />
            <Text fw={600}>Change Password</Text>
          </Group>
          <form onSubmit={handlePasswordChange}>
            <Stack gap="sm">
              <PasswordInput
                label="Current Password"
                placeholder="Enter current password"
                value={passwordData.current}
                onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
              />
              <PasswordInput
                label="New Password"
                placeholder="Enter new password"
                value={passwordData.new}
                onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
              />
              <PasswordInput
                label="Confirm New Password"
                placeholder="Confirm new password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
              />
              <Button 
                type="submit" 
                color="gray" 
                loading={saving}
                disabled={!passwordData.current || !passwordData.new || !passwordData.confirm}
                style={{ alignSelf: 'flex-start' }}
              >
                Update Password
              </Button>
            </Stack>
          </form>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <IconPalette size={20} />
            <Text fw={600}>Appearance</Text>
          </Group>
          <Stack gap="sm">
            <Group justify="space-between">
              <div>
                <Text size="sm">Dark Mode</Text>
                <Text size="xs" c="dimmed">Switch between light and dark themes</Text>
              </div>
              <Switch
                checked={isDark}
                onChange={(event) => setColorScheme(event.currentTarget.checked ? 'dark' : 'light')}
              />
            </Group>
          </Stack>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <IconKey size={20} />
            <Text fw={600}>API Keys</Text>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Use API keys to access your data from other apps (iOS, Android, scripts).
          </Text>
          
          {generatedKey && (
            <Card padding="sm" radius="md" withBorder mb="md" style={{ background: isDark ? '#1e293b' : '#f8fafc' }}>
              <Text size="xs" fw={500} mb="xs" c="green">API Key Created - Copy it now!</Text>
              <Group justify="space-between">
                <Text size="xs" style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{generatedKey}</Text>
                <CopyButton value={generatedKey}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? 'Copied!' : 'Copy'}>
                      <ActionIcon color={copied ? 'green' : 'gray'} onClick={copy}>
                        {copied ? <IconCheckFilled size={16} /> : <IconCopy size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">This key will not be shown again.</Text>
            </Card>
          )}
          
          <form onSubmit={handleCreateApiKey}>
            <Group gap="sm" mb="md">
              <TextInput
                placeholder="Key name (e.g., iOS App)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button type="submit" color="gray" size="sm" loading={saving} disabled={!newKeyName.trim()}>
                Generate
              </Button>
            </Group>
          </form>
          
          {apiKeys.length > 0 ? (
            <Stack gap="xs">
              {apiKeys.map(key => (
                <Group key={key.id} justify="space-between" p="sm" style={{ background: isDark ? '#252525' : '#f1f5f9', borderRadius: 8 }}>
                  <div>
                    <Text size="sm" fw={500}>{key.name}</Text>
                    <Text size="xs" c="dimmed">{key.keyprefix}... • Created {new Date(key.createdat).toLocaleDateString()}</Text>
                  </div>
                  <Button variant="subtle" color="red" size="xs" onClick={() => handleRevokeApiKey(key.id)}>
                    Revoke
                  </Button>
                </Group>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed" ta="center">No API keys yet</Text>
          )}
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <IconInfoCircle size={20} />
            <Text fw={600}>About</Text>
          </Group>
          <Stack gap="xs">
            <Text size="lg" fw={700}>PlanMyBudget</Text>
            <Text size="sm" c="dimmed">Personal Finance Tracker</Text>
            <Badge size="sm" variant="light" color="gray">Version 1.0.0</Badge>
            <Divider my="sm" />
            <Text size="sm">
              PlanMyBudget helps you track income, expenses, budgets, and financial goals with an intuitive interface.
            </Text>
            <Divider my="sm" />
            <Group gap="xs">
              <Text size="sm"><strong>Developer:</strong></Text>
              <Text size="sm" c="dimmed">Keyur Desai</Text>
            </Group>
            <Group gap="xs">
              <Text size="sm"><strong>Contact:</strong></Text>
              <Text size="sm" c="dimmed">keyurdesai@icloud.com</Text>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </div>
  )
}
