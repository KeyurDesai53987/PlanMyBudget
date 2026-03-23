import { useState, useEffect, useRef } from 'react'
import { Card, Group, Text, Stack, TextInput, PasswordInput, Button, Avatar, Badge, Divider, Switch, useMantineColorScheme, SimpleGrid, Textarea, CopyButton, ActionIcon, Tooltip, Alert, Modal, FileInput, Progress } from '@mantine/core'
import { IconUser, IconLock, IconCheck, IconInfoCircle, IconPalette, IconCalendar, IconCurrencyDollar, IconLogout, IconTrendingUp, IconTarget, IconReceipt, IconKey, IconCopy, IconCheck as IconCheckFilled, IconDownload, IconUpload, IconDatabase, IconAlertCircle, IconRefresh, IconRocket, IconBell } from '@tabler/icons-react'
import { api, isDemoUser } from '../api'
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
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [restoreFile, setRestoreFile] = useState(null)
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [allData, setAllData] = useState({ accounts: [], transactions: [], budgets: [], goals: [], categories: [], recurring: [] })
  const [updateStatus, setUpdateStatus] = useState({ checking: false, available: false, downloading: false, ready: false, version: null, error: null, progress: 0 })
  const [isElectron, setIsElectron] = useState(false)
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => { 
    setIsDemo(isDemoUser())
    loadData()
    initUpdateChecker()
  }, [])

  const initUpdateChecker = async () => {
    if (window.electronAPI) {
      setIsElectron(true)
      const status = await window.electronAPI.getUpdateStatus()
      setUpdateStatus({ ...updateStatus, ...status })
      
      window.electronAPI.onUpdateStatusChanged((status) => {
        setUpdateStatus(prev => ({ ...prev, ...status, progress: 0 }))
      })
      
      window.electronAPI.onUpdateProgress((percent) => {
        setUpdateStatus(prev => ({ ...prev, progress: percent }))
      })
      
      await window.electronAPI.checkForUpdates()
    }
  }

  const handleCheckUpdate = async () => {
    if (!window.electronAPI) return
    setUpdateStatus(prev => ({ ...prev, checking: true, error: null }))
    await window.electronAPI.checkForUpdates()
  }

  const handleDownloadUpdate = async () => {
    if (!window.electronAPI) return
    setUpdateStatus(prev => ({ ...prev, downloading: true }))
    await window.electronAPI.downloadUpdate()
  }

  const handleInstallUpdate = () => {
    if (!window.electronAPI) return
    window.electronAPI.installUpdate()
  }

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)

  const togglePushNotifications = async () => {
    setPushLoading(true)
    try {
      if (pushEnabled) {
        await api('/push/unsubscribe', { method: 'POST' })
        setPushEnabled(false)
        setMessage({ type: 'success', text: 'Push notifications disabled' })
      } else {
        if ('Notification' in window) {
          const permission = await Notification.requestPermission()
          if (permission === 'granted') {
            await api('/push/subscribe', {
              method: 'POST',
              body: JSON.stringify({ subscription: { enabled: true } })
            })
            setPushEnabled(true)
            setMessage({ type: 'success', text: 'Push notifications enabled!' })
          } else {
            setMessage({ type: 'error', text: 'Notification permission denied' })
          }
        } else {
          setMessage({ type: 'error', text: 'Push notifications not supported' })
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to toggle notifications' })
    }
    setPushLoading(false)
  }

  const loadData = async () => {
    try {
      const [profileRes, accountsRes, transactionsRes, goalsRes, budgetsRes, categoriesRes, recurringRes, keysRes] = await Promise.all([
        api('/profile'),
        api('/accounts'),
        api('/transactions'),
        api('/goals'),
        api('/budgets'),
        api('/categories'),
        api('/recurring'),
        api('/api-keys')
      ])
      
      setAllData({
        accounts: accountsRes.accounts || [],
        transactions: transactionsRes.transactions || [],
        budgets: budgetsRes.budgets || [],
        goals: goalsRes.goals || [],
        categories: categoriesRes.categories || [],
        recurring: recurringRes.recurring || []
      })
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
    if (passwordData.new.length < 4) {
      setMessage({ type: 'error', text: 'Password must be at least 4 characters' })
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

  const handleBackup = async () => {
    setBackupLoading(true)
    try {
      const profileRes = await api('/profile')
      const backup = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        profile: profileRes.preferences,
        data: allData
      }
      
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `planmybudget-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      
      setMessage({ type: 'success', text: 'Backup downloaded successfully!' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to create backup' })
    }
    setBackupLoading(false)
  }

  const handleRestore = async () => {
    if (!restoreFile) return
    
    setRestoreLoading(true)
    try {
      const text = await restoreFile.text()
      const backup = JSON.parse(text)
      
      if (!backup.version || !backup.data) {
        throw new Error('Invalid backup file format')
      }
      
      const { data } = backup
      
      let imported = { accounts: 0, transactions: 0, goals: 0, categories: 0, recurring: 0 }
      
      for (const account of data.accounts || []) {
        try {
          await api('/accounts', {
            method: 'POST',
            body: JSON.stringify({
              name: account.name,
              type: account.type,
              balance: account.balance,
              currency: account.currency || 'USD'
            })
          })
          imported.accounts++
        } catch (e) { console.error('Account import error:', e) }
      }
      
      for (const category of data.categories || []) {
        try {
          await api('/categories', {
            method: 'POST',
            body: JSON.stringify({ name: category.name })
          })
          imported.categories++
        } catch (e) { console.error('Category import error:', e) }
      }
      
      for (const goal of data.goals || []) {
        try {
          await api('/goals', {
            method: 'POST',
            body: JSON.stringify({
              name: goal.name,
              targetAmount: goal.targetAmount,
              currentAmount: goal.currentAmount || 0,
              dueDate: goal.dueDate
            })
          })
          imported.goals++
        } catch (e) { console.error('Goal import error:', e) }
      }
      
      for (const transaction of data.transactions || []) {
        try {
          await api('/transactions', {
            method: 'POST',
            body: JSON.stringify({
              accountId: transaction.accountId,
              categoryId: transaction.categoryId,
              date: transaction.date,
              amount: transaction.amount,
              type: transaction.type,
              description: transaction.description
            })
          })
          imported.transactions++
        } catch (e) { console.error('Transaction import error:', e) }
      }
      
      for (const item of data.recurring || []) {
        try {
          await api('/recurring', {
            method: 'POST',
            body: JSON.stringify({
              accountId: item.accountId,
              name: item.name,
              amount: item.amount,
              type: item.type,
              frequency: item.frequency,
              startDate: item.startDate,
              nextDate: item.nextDate,
              description: item.description
            })
          })
          imported.recurring++
        } catch (e) { console.error('Recurring import error:', e) }
      }
      
      setRestoreModalOpen(false)
      setRestoreFile(null)
      loadData()
      
      setMessage({
        type: 'success',
        text: `Restored: ${imported.accounts} accounts, ${imported.transactions} transactions, ${imported.goals} goals, ${imported.categories} categories`
      })
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to restore backup' })
    }
    setRestoreLoading(false)
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
        <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card" style={{ animationDelay: '0ms' }}>
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

        <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card" style={{ animationDelay: '50ms' }}>
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

        {!isDemo && (
          <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card" style={{ animationDelay: '100ms' }}>
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
                  onChange={(e) => setPasswordData({ ...profile, confirm: e.target.value })}
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
        )}

        <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card" style={{ animationDelay: '150ms' }}>
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

        {!isDemo && (
          <>
            <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card" style={{ animationDelay: '200ms' }}>
              <Group gap="sm" mb="md">
                <IconDatabase size={20} />
                <Text fw={600}>Backup & Restore</Text>
              </Group>
              <Text size="xs" c="dimmed" mb="md">
                Download a full backup of your data or restore from a previous backup.
              </Text>
              <Stack gap="sm">
                <Group>
                  <Button
                    variant="light"
                    color="gray"
                    leftSection={<IconDownload size={16} />}
                    onClick={handleBackup}
                    loading={backupLoading}
                  >
                    Export Backup
                  </Button>
                  <Button
                    variant="light"
                    color="gray"
                    leftSection={<IconUpload size={16} />}
                    onClick={() => setRestoreModalOpen(true)}
                  >
                    Import Backup
                  </Button>
                </Group>
                <Text size="xs" c="dimmed">
                  Backup includes: {allData.accounts.length} accounts, {allData.transactions.length} transactions, 
                  {allData.goals.length} goals, {allData.categories.length} categories, {allData.recurring.length} recurring
                </Text>
              </Stack>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card" style={{ animationDelay: '250ms' }}>
              <Group gap="sm" mb="md">
                <IconBell size={20} />
                <Text fw={600}>Notifications</Text>
              </Group>
              <Group justify="space-between" mb="sm">
                <div>
                  <Text size="sm">Push Notifications</Text>
                  <Text size="xs" c="dimmed">Receive alerts for budget warnings and reminders</Text>
                </div>
                <Switch
                  checked={pushEnabled}
                  onChange={togglePushNotifications}
                  disabled={pushLoading}
                  color="gray"
                />
              </Group>
              {pushEnabled && (
                <Alert color="green" variant="light" mt="sm">
                  Push notifications are enabled
                </Alert>
              )}
            </Card>
          </>
        )}

        {isDemo && (
          <Alert color="blue" variant="light" className="animated-card" style={{ animationDelay: '200ms' }}>
            <Text size="sm" fw={500}>Demo Account</Text>
            <Text size="xs">This is a demo account. Create your own account to access all features including backup, notifications, and more.</Text>
          </Alert>
        )}

        <Card shadow="sm" padding="lg" radius="md" withBorder className="animated-card" style={{ animationDelay: '300ms' }}>
          <Group gap="sm" mb="md">
            <IconRocket size={20} />
            <Text fw={600}>App Updates</Text>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Download the latest version of PlanMyBudget from GitHub releases.
          </Text>
          <Alert color="blue" variant="light" mb="sm">
            Current version: 1.1.0. Check GitHub releases for updates.
          </Alert>
          <Button
            component="a"
            href="https://github.com/KeyurDesai53987/PlanMyBudget/releases"
            target="_blank"
            variant="light"
            color="gray"
            size="xs"
            leftSection={<IconDownload size={14} />}
          >
            Download Latest Version
          </Button>
        </Card>

        {/* API Keys section hidden temporarily */}
        {/* 
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <IconKey size={20} />
            <Text fw={600}>API Keys</Text>
          </Group>
          ...
        </Card>
        */}

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="sm" mb="md">
            <IconInfoCircle size={20} />
            <Text fw={600}>About</Text>
          </Group>
          <Stack gap="xs">
            <Text size="lg" fw={700}>PlanMyBudget</Text>
            <Text size="sm" c="dimmed">Personal Finance Tracker</Text>
            <Badge size="sm" variant="light" color="gray">Version 1.1.0</Badge>
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

      <Modal
        opened={restoreModalOpen}
        onClose={() => { setRestoreModalOpen(false); setRestoreFile(null); }}
        title="Import Backup"
        centered
      >
        <Stack gap="md">
          <Alert color="blue" variant="light" icon={<IconAlertCircle size={16} />}>
            Importing will add data from the backup file. Existing data will not be deleted.
          </Alert>
          
          <FileInput
            label="Select Backup File"
            placeholder="Choose a .json file"
            accept="application/json"
            value={restoreFile}
            onChange={setRestoreFile}
            required
          />
          
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => { setRestoreModalOpen(false); setRestoreFile(null); }}>
              Cancel
            </Button>
            <Button
              color="gray"
              onClick={handleRestore}
              loading={restoreLoading}
              disabled={!restoreFile}
            >
              Import
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  )
}
