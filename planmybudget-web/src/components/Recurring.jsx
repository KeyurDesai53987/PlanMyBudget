import { useState, useEffect } from 'react'
import { Card, Group, Text, Stack, TextInput, NumberInput, Select, Button, ActionIcon, SimpleGrid, Loader, Center, Modal, Badge, Switch, SegmentedControl } from '@mantine/core'
import { IconPlus, IconTrash, IconRepeat, IconPlayerPlay, IconEdit } from '@tabler/icons-react'
import { api } from '../api'

const frequencies = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export default function Recurring() {
  const [recurring, setRecurring] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editModal, setEditModal] = useState({ open: false, item: null })
  const [formData, setFormData] = useState({
    accountId: '', name: '', amount: '', type: 'debit', frequency: 'monthly', startDate: new Date().toISOString().split('T')[0], description: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [rec, accs] = await Promise.all([api('/recurring'), api('/accounts')])
      setRecurring(rec.recurring || [])
      setAccounts(accs.accounts || [])
      if (accs.accounts?.length > 0) setFormData(prev => ({ ...prev, accountId: accs.accounts[0].id }))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api('/recurring', { method: 'POST', body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount) }) })
      setFormData({ accountId: accounts[0]?.id || '', name: '', amount: '', type: 'debit', frequency: 'monthly', startDate: new Date().toISOString().split('T')[0], description: '' })
      setShowForm(false)
      loadData()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleEdit = (item) => {
    setEditModal({ 
      open: true, 
      item: { 
        ...item, 
        amount: Math.abs(item.amount),
        type: item.type === 'credit' ? 'credit' : 'debit'
      } 
    })
  }

  const handleEditSubmit = async () => {
    if (!editModal.item) return
    setSubmitting(true)
    try {
      const amount = editModal.item.type === 'credit' ? Math.abs(editModal.item.amount) : -Math.abs(editModal.item.amount)
      await api(`/recurring/${editModal.item.id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ 
          name: editModal.item.name,
          amount: Math.abs(editModal.item.amount),
          type: editModal.item.type,
          frequency: editModal.item.frequency,
          startDate: editModal.item.startDate,
          description: editModal.item.description
        }) 
      })
      setEditModal({ open: false, item: null })
      loadData()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleToggle = async (id, active) => {
    try {
      await api(`/recurring/${id}`, { method: 'PUT', body: JSON.stringify({ active: active ? 1 : 0 }) })
      loadData()
    } catch (err) { alert(err.message) }
  }

  const handleProcess = async (id) => {
    try {
      await api(`/recurring/${id}/process`, { method: 'POST' })
      alert('Transaction created!')
      loadData()
    } catch (err) { alert(err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return
    try {
      await api(`/recurring/${id}`, { method: 'DELETE' })
      loadData()
    } catch (err) { alert(err.message) }
  }

  const getNextDateLabel = (nextDate, frequency) => {
    const next = new Date(nextDate)
    const today = new Date()
    const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24))
    
    if (diff < 0) return 'Due now'
    if (diff === 0) return 'Due today'
    if (diff === 1) return 'Due tomorrow'
    return `Due in ${diff} days`
  }

  if (loading) return (
    <Center h={400}>
      <Loader color="gray" />
    </Center>
  )

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Group gap="xs">
          <IconRepeat size={28} stroke={1.5} />
          <Text size="xl" fw={700} style={{ fontSize: '1.5rem' }}>Recurring</Text>
        </Group>
        <Button variant="light" color="gray" leftSection={<IconPlus size={16} />} onClick={() => { setShowForm(!showForm); setFormData({ accountId: accounts[0]?.id || '', name: '', amount: '', type: 'debit', frequency: 'monthly', startDate: new Date().toISOString().split('T')[0], description: '' }) }}>
          {showForm ? 'Cancel' : 'New'}
        </Button>
      </Group>

      {showForm && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg">
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <Select
                label="Account"
                data={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
                value={formData.accountId}
                onChange={(val) => setFormData({ ...formData, accountId: val })}
                required
              />
              <TextInput
                label="Name"
                placeholder="e.g., Netflix Subscription"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <SegmentedControl
                fullWidth
                label="Type"
                value={formData.type}
                onChange={(val) => setFormData({ ...formData, type: val })}
                data={[
                  { label: 'Expense', value: 'debit' },
                  { label: 'Income', value: 'credit' },
                ]}
              />
              <SimpleGrid cols={2}>
                <NumberInput
                  label="Amount"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(val) => setFormData({ ...formData, amount: val })}
                  decimalScale={2}
                  required
                  hideControls
                />
                <Select
                  label="Frequency"
                  data={frequencies}
                  value={formData.frequency}
                  onChange={(val) => setFormData({ ...formData, frequency: val })}
                />
              </SimpleGrid>
              <TextInput
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
              <TextInput
                label="Description (optional)"
                placeholder="What's this for?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <Button type="submit" color="gray" loading={submitting} fullWidth>
                Create Recurring
              </Button>
            </Stack>
          </form>
        </Card>
      )}

      <Stack gap="sm">
        {recurring.length > 0 ? recurring.map(r => (
          <Card key={r.id} shadow="sm" padding="md" radius="md" withBorder>
            <Group justify="space-between">
              <Group gap="md">
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: r.type === 'credit' ? '#10b98115' : '#ef444415',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconRepeat size={20} style={{ color: r.active ? '#475569' : '#94a3b8' }} />
                </div>
                <div>
                  <Group gap="xs">
                    <Text fw={600}>{r.name}</Text>
                    <Badge color={r.active ? 'green' : 'gray'} variant="light" size="sm">
                      {r.active ? 'Active' : 'Paused'}
                    </Badge>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {frequencies.find(f => f.value === r.frequency)?.label} • Next: {getNextDateLabel(r.nextDate, r.frequency)}
                  </Text>
                </div>
              </Group>
              <Group gap="sm">
                <Text fw={700} c={r.type === 'credit' ? 'green' : 'red'}>
                  {r.type === 'credit' ? '+' : '-'}${Math.abs(r.amount).toFixed(2)}
                </Text>
                <Switch
                  checked={!!r.active}
                  onChange={(e) => handleToggle(r.id, e.target.checked)}
                  size="sm"
                />
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => handleEdit(r)}>
                  <IconEdit size={14} />
                </ActionIcon>
                <ActionIcon 
                  variant="light" 
                  color="green" 
                  size="sm" 
                  onClick={() => handleProcess(r.id)}
                  disabled={!r.active}
                >
                  <IconPlayerPlay size={14} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(r.id)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        )) : (
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Text c="dimmed" ta="center">No recurring transactions yet</Text>
            <Text c="dimmed" ta="center" size="sm">Create one to automatically add transactions</Text>
          </Card>
        )}
      </Stack>

      <Modal opened={editModal.open} onClose={() => setEditModal({ open: false, item: null })} title="Edit Recurring" centered>
        {editModal.item && (
          <Stack gap="sm">
            <TextInput
              label="Name"
              value={editModal.item.name}
              onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, name: e.target.value } })}
            />
            <SegmentedControl
              fullWidth
              label="Type"
              value={editModal.item.type}
              onChange={(val) => setEditModal({ ...editModal, item: { ...editModal.item, type: val } })}
              data={[
                { label: 'Expense', value: 'debit' },
                { label: 'Income', value: 'credit' },
              ]}
            />
            <SimpleGrid cols={2}>
              <NumberInput
                label="Amount"
                value={editModal.item.amount}
                onChange={(val) => setEditModal({ ...editModal, item: { ...editModal.item, amount: val } })}
                decimalScale={2}
                hideControls
              />
              <Select
                label="Frequency"
                data={frequencies}
                value={editModal.item.frequency}
                onChange={(val) => setEditModal({ ...editModal, item: { ...editModal.item, frequency: val } })}
              />
            </SimpleGrid>
            <TextInput
              label="Description"
              value={editModal.item.description || ''}
              onChange={(e) => setEditModal({ ...editModal, item: { ...editModal.item, description: e.target.value } })}
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
