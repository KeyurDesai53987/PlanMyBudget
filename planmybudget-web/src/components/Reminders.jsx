import { useState, useEffect, useMemo } from 'react'
import { Card, Group, Text, Stack, TextInput, NumberInput, Button, SimpleGrid, Modal, Select, Badge, Checkbox, ActionIcon, useMantineColorScheme, Switch } from '@mantine/core'
import { IconBell, IconPlus, IconTrash, IconEdit, IconCreditCard, IconHome, IconCash, IconDeviceTv, IconCheckupList } from '@tabler/icons-react'
import { api } from '../api'
import { RemindersSkeleton } from './Skeletons'

const CATEGORIES = [
  { value: 'credit_card', label: 'Credit Card', icon: IconCreditCard },
  { value: 'loan', label: 'Loan/EMI', icon: IconCash },
  { value: 'rent', label: 'Rent', icon: IconHome },
  { value: 'utility', label: 'Utility Bills', icon: IconDeviceTv },
  { value: 'insurance', label: 'Insurance', icon: IconCheckupList },
  { value: 'subscription', label: 'Subscription', icon: IconDeviceTv },
  { value: 'tax', label: 'Tax', icon: IconCash },
  { value: 'other', label: 'Other', icon: IconBell }
]

const FREQUENCIES = [
  { value: 'once', label: 'One Time' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' }
]

export default function Reminders() {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingReminder, setEditingReminder] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    amount: '',
    category: 'credit_card',
    recurring: 'monthly',
    notify: true
  })

  useEffect(() => { loadReminders() }, [])

  const loadReminders = async () => {
    setError(null)
    try {
      const res = await api('/reminders')
      setReminders(res.reminders || [])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load data')
    }
    finally { setLoading(false) }
  }

  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!formData.title || !formData.dueDate || !formData.category) {
      alert('Please fill in required fields')
      return
    }
    
    setSaving(true)
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        amount: formData.amount ? parseFloat(formData.amount) : 0,
        category: formData.category,
        recurring: formData.recurring,
        notify: formData.notify
      }
      
      if (editingReminder) {
        await api(`/reminders/${editingReminder.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await api('/reminders', { body: JSON.stringify(payload) })
      }
      
      setFormData({ title: '', description: '', dueDate: '', amount: '', category: 'credit_card', recurring: 'monthly', notify: true })
      setShowForm(false)
      setEditingReminder(null)
      loadReminders()
    } catch (err) {
      console.error('Error saving reminder:', err)
      const msg = err?.response?.data?.error || err?.message || 'Unknown error'
      alert('Error saving reminder: ' + msg)
    }
    setSaving(false)
  }

  const handleEdit = (reminder) => {
    setEditingReminder(reminder)
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      dueDate: reminder.dueDate,
      amount: reminder.amount?.toString() || '',
      category: reminder.category,
      recurring: reminder.recurring || 'once',
      notify: reminder.notify
    })
    setShowForm(true)
  }

  const handleTogglePaid = async (reminder) => {
    await api(`/reminders/${reminder.id}`, { 
      method: 'PUT', 
      body: JSON.stringify({ paid: !reminder.paid }) 
    })
    loadReminders()
  }

  const handleDelete = async (id) => {
    await api(`/reminders/${id}`, { method: 'DELETE' })
    loadReminders()
  }

  const upcomingReminders = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return reminders
      .filter(r => !r.paid && r.dueDate >= today)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  }, [reminders])

  const overdueReminders = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return reminders.filter(r => !r.paid && r.dueDate < today)
  }, [reminders])

  const paidReminders = useMemo(() => 
    reminders.filter(r => r.paid).slice(0, 5),
  [reminders])

  const getCategoryInfo = (category) => CATEGORIES.find(c => c.value === category) || CATEGORIES[CATEGORIES.length - 1]

  const getDaysUntilDue = (dueDate) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getDueDateColor = (dueDate, paid) => {
    if (paid) return 'green'
    const days = getDaysUntilDue(dueDate)
    if (days < 0) return 'red'
    if (days <= 3) return 'orange'
    return 'blue'
  }

  if (loading) return <RemindersSkeleton />

  if (error) return (
    <div>
      <Group justify="space-between" mb="lg">
        <Text size="xl" fw={700} style={{ fontSize: '1.5rem' }}>Reminders</Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => { setShowForm(true); setEditingReminder(null); setFormData({ title: '', description: '', dueDate: '', amount: '', category: 'credit_card', recurring: 'monthly', notify: true }) }}>
          Add Reminder
        </Button>
      </Group>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack align="center" gap="sm" py="xl">
          <Text c="red" fw={600}>Failed to load data</Text>
          <Text size="sm" c="dimmed">{error}</Text>
          <Button variant="light" onClick={() => { setLoading(true); setError(null); loadReminders() }}>
            Retry
          </Button>
        </Stack>
      </Card>
    </div>
  )

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Text size="xl" fw={700} style={{ fontSize: '1.5rem' }}>Reminders</Text>
        <Button leftSection={<IconPlus size={16} />} onClick={() => { setShowForm(true); setEditingReminder(null); setFormData({ title: '', description: '', dueDate: '', amount: '', category: 'credit_card', recurring: 'monthly', notify: true }) }}>
          Add Reminder
        </Button>
      </Group>

      {overdueReminders.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg" style={{ borderColor: '#ef4444' }}>
          <Text fw={600} c="red" mb="md">⚠️ Overdue</Text>
          <Stack gap="sm">
            {overdueReminders.map(r => {
              const cat = getCategoryInfo(r.category)
              const Icon = cat.icon
              return (
                <Card key={r.id} shadow="sm" padding="sm" radius="md" withBorder>
                  <Group justify="space-between">
                    <Group gap="sm">
                      <Checkbox checked={r.paid} onChange={() => handleTogglePaid(r)} />
                      <Icon size={20} />
                      <div>
                        <Text fw={500}>{r.title}</Text>
                        <Text size="xs" c="dimmed">{cat.label} • Due: {new Date(r.dueDate).toLocaleDateString()}</Text>
                      </div>
                    </Group>
                    <Group gap="xs">
                      {r.amount > 0 && <Text fw={600}>${r.amount.toLocaleString()}</Text>}
                      <ActionIcon variant="subtle" onClick={() => handleEdit(r)}><IconEdit size={16} /></ActionIcon>
                      <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(r.id)}><IconTrash size={16} /></ActionIcon>
                    </Group>
                  </Group>
                </Card>
              )
            })}
          </Stack>
        </Card>
      )}

      {upcomingReminders.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg">
          <Text fw={600} mb="md">📅 Upcoming</Text>
          <Stack gap="sm">
            {upcomingReminders.map(r => {
              const cat = getCategoryInfo(r.category)
              const Icon = cat.icon
              const days = getDaysUntilDue(r.dueDate)
              return (
                <Card key={r.id} shadow="sm" padding="sm" radius="md" withBorder>
                  <Group justify="space-between">
                    <Group gap="sm">
                      <Checkbox checked={r.paid} onChange={() => handleTogglePaid(r)} />
                      <Icon size={20} />
                      <div>
                        <Text fw={500}>{r.title}</Text>
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">{cat.label}</Text>
                          <Badge size="xs" color={getDueDateColor(r.dueDate, r.paid)} variant="light">
                            {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
                          </Badge>
                          {r.recurring && r.recurring !== 'once' && <Badge size="xs" variant="outline">{r.recurring}</Badge>}
                        </Group>
                      </div>
                    </Group>
                    <Group gap="xs">
                      {r.amount > 0 && <Text fw={600}>${r.amount.toLocaleString()}</Text>}
                      <ActionIcon variant="subtle" onClick={() => handleEdit(r)}><IconEdit size={16} /></ActionIcon>
                      <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(r.id)}><IconTrash size={16} /></ActionIcon>
                    </Group>
                  </Group>
                </Card>
              )
            })}
          </Stack>
        </Card>
      )}

      {reminders.length === 0 && (
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Stack align="center" gap="md">
            <IconBell size={48} color={isDark ? '#666' : '#ccc'} />
            <Text c="dimmed">No reminders yet</Text>
            <Text size="sm" c="dimmed">Add reminders for credit cards, EMIs, rent, and more</Text>
          </Stack>
        </Card>
      )}

      <Modal opened={showForm} onClose={() => { setShowForm(false); setEditingReminder(null) }} title={editingReminder ? 'Edit Reminder' : 'Add Reminder'} centered>
        <Stack gap="md">
          <TextInput
            label="Title"
            placeholder="e.g., Credit Card Payment"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
          <TextInput
            label="Description"
            placeholder="Optional description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <SimpleGrid cols={2}>
            <TextInput
              label="Due Date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              required
            />
            <NumberInput
              label="Amount"
              placeholder="0.00"
              value={formData.amount}
              onChange={(val) => setFormData({ ...formData, amount: val })}
              min={0}
              decimalScale={2}
            />
          </SimpleGrid>
          <Select
            label="Category"
            data={CATEGORIES.map(c => ({ value: c.value, label: c.label }))}
            value={formData.category}
            onChange={(val) => setFormData({ ...formData, category: val })}
          />
          <Select
            label="Repeat"
            data={FREQUENCIES.map(f => ({ value: f.value, label: f.label }))}
            value={formData.recurring}
            onChange={(val) => setFormData({ ...formData, recurring: val })}
          />
          <Switch
            label="Send notification"
            checked={formData.notify}
            onChange={(e) => setFormData({ ...formData, notify: e.currentTarget.checked })}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={() => { setShowForm(false); setEditingReminder(null) }}>Cancel</Button>
            <Button onClick={handleSubmit} loading={saving} disabled={!formData.title || !formData.dueDate || !formData.category}>
              {editingReminder ? 'Save' : 'Add'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  )
}
