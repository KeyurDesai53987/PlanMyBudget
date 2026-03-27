import { useState, useEffect } from 'react'
import { Card, Group, Text, Stack, TextInput, NumberInput, Button, SimpleGrid, ActionIcon, Modal, useMantineColorScheme } from '@mantine/core'
import { IconPlus, IconTrash, IconBuildingBank, IconCash, IconCreditCard, IconChartLine, IconEdit } from '@tabler/icons-react'
import { api } from '../api'
import { colors } from '../theme'
import { AccountsSkeleton } from './Skeletons'

const ACCOUNT_TYPES = [
  { id: 'checking', icon: IconBuildingBank, label: 'Checking', color: colors.primary },
  { id: 'savings', icon: IconCash, label: 'Savings', color: colors.success },
  { id: 'credit', icon: IconCreditCard, label: 'Credit', color: colors.danger },
  { id: 'investment', icon: IconChartLine, label: 'Invest', color: colors.purple },
]

export default function Accounts() {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editModal, setEditModal] = useState({ open: false, account: null })
  const [formData, setFormData] = useState({ name: '', type: 'checking' })

  useEffect(() => { loadAccounts() }, [])

  const loadAccounts = async () => {
    try {
      const res = await api('/accounts')
      setAccounts(res.accounts || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api('/accounts', { method: 'POST', body: JSON.stringify(formData) })
      setFormData({ name: '', type: 'checking' })
      setShowForm(false)
      loadAccounts()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleEdit = (acc) => {
    setEditModal({ open: true, account: { ...acc } })
  }

  const handleEditSubmit = async () => {
    if (!editModal.account) return
    setSubmitting(true)
    try {
      await api(`/accounts/${editModal.account.id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ 
          name: editModal.account.name,
          type: editModal.account.type,
          balance: parseFloat(editModal.account.balance)
        }) 
      })
      setEditModal({ open: false, account: null })
      loadAccounts()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this account?')) return
    try {
      await api(`/accounts/${id}`, { method: 'DELETE' })
      loadAccounts()
    } catch (err) { alert(err.message) }
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)

  if (loading) return <AccountsSkeleton />

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Text size="xl" fw={700} style={{ fontSize: '1.5rem' }}>Accounts</Text>
        <Button 
          variant="light" 
          color="gray" 
          leftSection={<IconPlus size={16} />}
          onClick={() => { setShowForm(!showForm); setFormData({ name: '', type: 'checking' }) }}
        >
          {showForm ? 'Cancel' : 'Add Account'}
        </Button>
      </Group>

      {showForm && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg">
          <Stack gap="md">
            <SimpleGrid cols={{ base: 2, sm: 4 }}>
              {ACCOUNT_TYPES.map(type => {
                const Icon = type.icon
                return (
                  <Card 
                    key={type.id}
                    padding="sm"
                    radius="md"
                    withBorder
                    style={{ 
                      cursor: 'pointer',
                      borderColor: formData.type === type.id ? type.color : '#e2e8f0',
                      background: formData.type === type.id ? `${type.color}10` : 'white'
                    }}
                    onClick={() => setFormData({ ...formData, type: type.id })}
                  >
                    <Stack gap={4} align="center">
                      <Icon size={24} style={{ color: type.color }} />
                      <Text size="xs" c="dimmed">{type.label}</Text>
                    </Stack>
                  </Card>
                )
              })}
            </SimpleGrid>
            <TextInput
              label="Account Name"
              placeholder="e.g., Main Bank"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Button 
              fullWidth 
              color="gray" 
              loading={submitting}
              onClick={handleSubmit}
            >
              Add Account
            </Button>
          </Stack>
        </Card>
      )}

      <Card shadow="sm" padding="lg" radius="md" mb="lg" style={{ background: isDark ? '#252525' : '#475569' }} >
        <Group justify="space-between">
          <Text c="white" size="sm" opacity={0.9}>Total Balance</Text>
          <Text c="white" fw={700} style={{ fontSize: '1.5rem' }}>${totalBalance.toLocaleString()}</Text>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {accounts.map((acc, index) => {
          const typeInfo = ACCOUNT_TYPES.find(t => t.id === acc.type) || ACCOUNT_TYPES[0]
          const Icon = typeInfo.icon
          return (
            <Card key={acc.id} shadow="sm" padding="md" radius="md" withBorder >
              <Group justify="space-between">
                <Group gap="sm">
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: `${typeInfo.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={22} style={{ color: typeInfo.color }} />
                  </div>
                  <div>
                    <Text fw={600}>{acc.name}</Text>
                    <Text size="xs" c="dimmed" tt="capitalize">{typeInfo.label}</Text>
                  </div>
                </Group>
                <Group gap="xs">
                  <Text fw={700} c={acc.balance >= 0 ? 'green' : 'red'}>
                    ${(acc.balance || 0).toLocaleString()}
                  </Text>
                  <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => handleEdit(acc)}>
                    <IconEdit size={14} />
                  </ActionIcon>
                  <ActionIcon 
                    variant="subtle" 
                    color="red" 
                    size="sm"
                    onClick={() => handleDelete(acc.id)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Group>
            </Card>
          )
        })}
      </SimpleGrid>
      
      {accounts.length === 0 && (
        <Text c="dimmed" ta="center" py="xl">No accounts yet</Text>
      )}

      <Modal opened={editModal.open} onClose={() => setEditModal({ open: false, account: null })} title="Edit Account" centered>
        {editModal.account && (
          <Stack gap="sm">
            <SimpleGrid cols={4}>
              {ACCOUNT_TYPES.map(type => {
                const Icon = type.icon
                return (
                  <Card 
                    key={type.id}
                    padding="sm"
                    radius="md"
                    withBorder
                    style={{ 
                      cursor: 'pointer',
                      borderColor: editModal.account.type === type.id ? type.color : '#e2e8f0',
                      background: editModal.account.type === type.id ? `${type.color}10` : 'white'
                    }}
                    onClick={() => setEditModal({ ...editModal, account: { ...editModal.account, type: type.id } })}
                  >
                    <Stack gap={4} align="center">
                      <Icon size={20} style={{ color: type.color }} />
                      <Text size="xs" c="dimmed">{type.label}</Text>
                    </Stack>
                  </Card>
                )
              })}
            </SimpleGrid>
            <TextInput
              label="Account Name"
              value={editModal.account.name}
              onChange={(e) => setEditModal({ ...editModal, account: { ...editModal.account, name: e.target.value } })}
            />
            <NumberInput
              label="Balance"
              value={editModal.account.balance}
              onChange={(val) => setEditModal({ ...editModal, account: { ...editModal.account, balance: val } })}
              decimalScale={2}
              hideControls
            />
            <Button fullWidth color="gray" onClick={handleEditSubmit} loading={submitting}>
              Save Changes
            </Button>
          </Stack>
        )}
      </Modal>
    </div>
  )
}
