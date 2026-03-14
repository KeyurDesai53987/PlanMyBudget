import { useState, useEffect } from 'react'
import { Card, Group, Text, Stack, TextInput, NumberInput, Button, Progress, ActionIcon, SimpleGrid, Badge, Loader, Center, Modal } from '@mantine/core'
import { IconPlus, IconTrash, IconTarget } from '@tabler/icons-react'
import { api } from '../api'

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [addFundsModal, setAddFundsModal] = useState({ open: false, goal: null })
  const [customAmount, setCustomAmount] = useState('')
  const [formData, setFormData] = useState({ name: '', targetAmount: '' })

  useEffect(() => { loadGoals() }, [])

  const loadGoals = async () => {
    try {
      const res = await api('/goals')
      setGoals(res.goals || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api('/goals', { method: 'POST', body: JSON.stringify({ name: formData.name, targetAmount: parseFloat(formData.targetAmount) }) })
      setFormData({ name: '', targetAmount: '' })
      setShowForm(false)
      loadGoals()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return
    try {
      await api(`/goals/${id}`, { method: 'DELETE' })
      loadGoals()
    } catch (err) { alert(err.message) }
  }

  const handleAddFunds = async (goalId, amount) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    try {
      await api(`/goals/${goalId}`, { method: 'PUT', body: JSON.stringify({ currentAmount: goal.currentAmount + amount }) })
      loadGoals()
    } catch (err) { alert(err.message) }
  }

  const handleCustomAmount = (goal) => {
    setAddFundsModal({ open: true, goal })
    setCustomAmount('')
  }

  const handleCustomAmountSubmit = () => {
    if (!addFundsModal.goal || !customAmount) return
    handleAddFunds(addFundsModal.goal.id, parseFloat(customAmount))
    setAddFundsModal({ open: false, goal: null })
    setCustomAmount('')
  }

  if (loading) return (
    <Center h={400}>
      <Loader color="gray" />
    </Center>
  )

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Text size="xl" fw={700} style={{ fontSize: '1.5rem' }}>Goals</Text>
        <Button variant="light" color="gray" leftSection={<IconPlus size={16} />} onClick={() => { setShowForm(!showForm); setFormData({ name: '', targetAmount: '' }) }}>
          {showForm ? 'Cancel' : 'New'}
        </Button>
      </Group>

      {showForm && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg">
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Goal Name"
                placeholder="e.g., Emergency Fund"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <NumberInput
                label="Target Amount"
                placeholder="5000"
                value={formData.targetAmount}
                onChange={(val) => setFormData({ ...formData, targetAmount: val })}
                decimalScale={2}
                required
                hideControls
              />
              <Button type="submit" color="gray" loading={submitting} fullWidth>
                Create Goal
              </Button>
            </Stack>
          </form>
        </Card>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
        {goals.length > 0 ? goals.map(goal => {
          const currentAmt = goal.currentAmount || goal.currentamount || 0
          const targetAmt = goal.targetAmount || goal.targetamount || 0
          const progress = (currentAmt / targetAmt) * 100
          const remaining = targetAmt - currentAmt
          return (
            <Card key={goal.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconTarget size={20} style={{ color: '#475569' }} />
                    <Text fw={600}>{goal.name}</Text>
                  </Group>
                  <Badge color={progress >= 100 ? 'green' : 'orange'} variant="light">
                    {progress >= 100 ? 'Done' : 'Active'}
                  </Badge>
                </Group>
                
                <Group align="baseline" gap="xs">
                  <Text fw={700} style={{ fontSize: '1.5rem' }}>${currentAmt?.toLocaleString()}</Text>
                  <Text c="dimmed">/ ${targetAmt?.toLocaleString()}</Text>
                </Group>
                
                <Progress value={Math.min(progress, 100)} color={progress >= 100 ? 'green' : 'orange'} size="md" radius="xl" />
                
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">Remaining</Text>
                  <Text size="xs" fw={500}>${remaining > 0 ? remaining.toLocaleString() : 0}</Text>
                </Group>
                
                {progress < 100 && (
                  <>
                    <Group grow mt="xs">
                      <Button size="xs" variant="light" color="gray" onClick={() => handleAddFunds(goal.id, 50)}>+$50</Button>
                      <Button size="xs" variant="light" color="gray" onClick={() => handleAddFunds(goal.id, 100)}>+$100</Button>
                      <Button size="xs" variant="light" color="gray" onClick={() => handleAddFunds(goal.id, remaining)}>Finish</Button>
                    </Group>
                    <Button size="xs" variant="subtle" color="gray" fullWidth onClick={() => handleCustomAmount(goal)}>
                      Custom Amount
                    </Button>
                  </>
                )}
                
                <Button variant="subtle" color="red" size="xs" fullWidth mt="xs" onClick={() => handleDelete(goal.id)}>
                  Delete
                </Button>
              </Stack>
            </Card>
          )
        }) : <Text c="dimmed" ta="center" py="xl">No goals yet</Text>}
      </SimpleGrid>

      <Modal opened={addFundsModal.open} onClose={() => setAddFundsModal({ open: false, goal: null })} title="Add Custom Amount" centered>
        <Stack gap="sm">
          <NumberInput
            label="Amount"
            placeholder="Enter amount"
            value={customAmount}
            onChange={setCustomAmount}
            decimalScale={2}
            required
            hideControls
          />
          <Button fullWidth color="gray" onClick={handleCustomAmountSubmit} disabled={!customAmount}>
            Add Funds
          </Button>
        </Stack>
      </Modal>
    </div>
  )
}
