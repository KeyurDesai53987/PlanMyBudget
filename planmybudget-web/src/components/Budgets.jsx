import { useState, useEffect, useCallback } from 'react'
import { Card, Group, Text, Stack, TextInput, NumberInput, Select, Button, ActionIcon, SimpleGrid, Modal, Progress, Collapse, Badge, useMantineColorScheme } from '@mantine/core'
import { IconPlus, IconTrash, IconCalendar, IconEdit, IconAlertTriangle, IconChevronDown, IconChevronUp, IconArrowDownRight, IconRefresh } from '@tabler/icons-react'
import { api } from '../api'
import { colors } from '../theme'
import { BudgetsSkeleton } from './Skeletons'

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function Budgets() {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [budgets, setBudgets] = useState([])
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editModal, setEditModal] = useState({ open: false, budget: null })
  const [expandedBudgets, setExpandedBudgets] = useState({})
  const [expandedLines, setExpandedLines] = useState({})
  const [formData, setFormData] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), lines: [{ categoryId: '', amount: '' }] })

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const [budgetRes, txnRes, catRes] = await Promise.all([api('/budgets'), api('/transactions'), api('/categories')])
      setBudgets(budgetRes.budgets || [])
      setTransactions(txnRes.transactions || [])
      setCategories(catRes.categories || [])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load data')
    }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { 
    loadData() 
  }, [loadData])

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
  }

  const categoryMap = categories.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {})

  const getSpentAmount = (categoryId, month, year) => {
    const categoryName = categoryMap[categoryId]
    return transactions
      .filter(t => {
        const txnDate = new Date(t.date)
        const txnCategoryId = t.categoryId
        const matchesById = txnCategoryId === categoryId
        const matchesByName = categoryName && txnCategoryId && categoryMap[txnCategoryId] === categoryName
        return t.amount < 0 && 
               (matchesById || matchesByName) &&
               txnDate.getMonth() + 1 === month &&
               txnDate.getFullYear() === year
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  }

  const getBudgetStatus = (spent, budget) => {
    const percent = budget > 0 ? (spent / budget) * 100 : 0
    if (percent >= 100) return { status: 'danger', label: 'Over budget', color: colors.danger }
    if (percent >= 80) return { status: 'warning', label: 'Warning', color: colors.warning }
    return { status: 'ok', label: 'On track', color: colors.success }
  }

  const getCategoryTransactions = (categoryId, month, year) => {
    const categoryName = categoryMap[categoryId]
    return transactions
      .filter(t => {
        const txnDate = new Date(t.date)
        const txnCategoryId = t.categoryId
        const matchesById = txnCategoryId === categoryId
        const matchesByName = categoryName && txnCategoryId && categoryMap[txnCategoryId] === categoryName
        return t.amount < 0 && 
               (matchesById || matchesByName) &&
               txnDate.getMonth() + 1 === month &&
               txnDate.getFullYear() === year
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  const toggleLine = (key) => {
    setExpandedLines(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleBudget = (id) => {
    setExpandedBudgets(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const sortedBudgets = [...budgets].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year
    return b.month - a.month
  })

  const handleAddLine = () => setFormData({ ...formData, lines: [...formData.lines, { categoryId: '', amount: '' }] })

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines]
    newLines[index][field] = value === null ? '' : value
    setFormData({ ...formData, lines: newLines })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const lines = formData.lines.map(l => ({ categoryId: l.categoryId, amount: parseFloat(l.amount) || 0 }))
      await api('/budgets', { method: 'POST', body: JSON.stringify({ month: parseInt(formData.month), year: parseInt(formData.year), lines }) })
      setFormData({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), lines: [{ categoryId: '', amount: '' }] })
      setShowForm(false)
      loadData()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleEdit = (budget) => {
    setEditModal({ 
      open: true, 
      budget: { 
        ...budget, 
        lines: budget.lines.map(l => ({ 
          categoryId: l.categoryId && categoryMap[l.categoryId] ? l.categoryId : (Object.keys(categoryMap).find(key => categoryMap[key] === l.categoryId) || l.categoryId || ''), 
          amount: l.amount || '' 
        }))
      } 
    })
  }

  const handleEditLineChange = (index, field, value) => {
    const newLines = [...editModal.budget.lines]
    newLines[index][field] = value
    setEditModal({ ...editModal, budget: { ...editModal.budget, lines: newLines } })
  }

  const handleEditAddLine = () => {
    setEditModal({ 
      ...editModal, 
      budget: { ...editModal.budget, lines: [...editModal.budget.lines, { categoryId: '', amount: '' }] }
    })
  }

  const handleEditRemoveLine = (index) => {
    const newLines = editModal.budget.lines.filter((_, idx) => idx !== index)
    setEditModal({ ...editModal, budget: { ...editModal.budget, lines: newLines } })
  }

  const handleEditSubmit = async () => {
    if (!editModal.budget) return
    setSubmitting(true)
    try {
      const lines = editModal.budget.lines.map(l => ({ categoryId: l.categoryId, amount: parseFloat(l.amount) || 0 }))
      await api(`/budgets/${editModal.budget.id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ 
          month: editModal.budget.month,
          year: editModal.budget.year,
          lines 
        }) 
      })
      setEditModal({ open: false, budget: null })
      loadData()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return
    try {
      await api(`/budgets/${id}`, { method: 'DELETE' })
      loadData()
    } catch (err) { alert(err.message) }
  }

  if (loading) return <BudgetsSkeleton />

  if (error) return (
    <div>
      <Group justify="space-between" mb="lg">
        <Group gap="xs">
          <Text size="xl" fw={700} style={{ fontSize: '1.5rem' }}>Budget</Text>
          <ActionIcon variant="subtle" color="gray" onClick={handleRefresh} loading={refreshing}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Group>
        <Button variant="light" color="gray" leftSection={<IconPlus size={16} />} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New'}
        </Button>
      </Group>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack align="center" gap="sm" py="xl">
          <Text c="red" fw={600}>Failed to load data</Text>
          <Text size="sm" c="dimmed">{error}</Text>
          <Button variant="light" onClick={() => { setLoading(true); setError(null); loadData() }}>
            Retry
          </Button>
        </Stack>
      </Card>
    </div>
  )

  return (
    <div>
      <Group justify="space-between" mb="lg">
        <Group gap="xs">
          <Text size="xl" fw={700} style={{ fontSize: '1.5rem' }}>Budget</Text>
          <ActionIcon variant="subtle" color="gray" onClick={handleRefresh} loading={refreshing}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Group>
        <Button variant="light" color="gray" leftSection={<IconPlus size={16} />} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New'}
        </Button>
      </Group>

      {showForm && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg">
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <Select
                  label="Month"
                  data={months.map((m, i) => ({ value: String(i + 1), label: m }))}
                  value={String(formData.month)}
                  onChange={(val) => setFormData({ ...formData, month: parseInt(val) })}
                />
                <NumberInput
                  label="Year"
                  value={formData.year}
                  onChange={(val) => setFormData({ ...formData, year: val })}
                />
              </SimpleGrid>
              
              <Text size="sm" fw={500}>Categories</Text>
              {formData.lines.map((line, i) => (
                <Group key={i} gap="sm">
                  <Select
                    placeholder="Select category"
                    data={categories.map(c => ({ value: c.id, label: c.name }))}
                    value={line.categoryId}
                    onChange={(val) => handleLineChange(i, 'categoryId', val)}
                    style={{ flex: 1 }}
                    searchable
                    clearable
                  />
                  <NumberInput
                    placeholder="Amount"
                    value={line.amount}
                    onChange={(val) => handleLineChange(i, 'amount', val)}
                    decimalScale={2}
                    hideControls
                    style={{ width: 100 }}
                  />
                  {formData.lines.length > 1 && (
                    <ActionIcon variant="subtle" color="red" onClick={() => { const n = formData.lines.filter((_, idx) => idx !== i); setFormData({ ...formData, lines: n }) }}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Group>
              ))}
              
              <Button variant="subtle" onClick={handleAddLine}>+ Add Category</Button>
              <Button type="submit" color="gray" loading={submitting}>Create Budget</Button>
            </Stack>
          </form>
        </Card>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {sortedBudgets.length > 0 ? sortedBudgets.map((budget, index) => {
          const total = budget.lines.reduce((sum, l) => sum + (l.amount || 0), 0)
          const totalSpent = budget.lines.reduce((sum, l) => sum + getSpentAmount(l.categoryId, budget.month, budget.year), 0)
          const overallStatus = getBudgetStatus(totalSpent, total)
          const currentMonth = new Date().getFullYear() === budget.year && new Date().getMonth() + 1 === budget.month
          const isExpanded = expandedBudgets[budget.id] !== undefined ? expandedBudgets[budget.id] : currentMonth
          const isPast = (new Date().getFullYear() > budget.year) || 
                         (new Date().getFullYear() === budget.year && new Date().getMonth() + 1 > budget.month)
          
          return (
            <Card key={budget.id} shadow="sm" padding="md" radius="md" withBorder >
              <Group justify="space-between" mb={isExpanded ? "sm" : 0}>
                <Group gap="xs">
                  <ActionIcon 
                    variant="subtle" 
                    size="sm" 
                    onClick={() => toggleBudget(budget.id)}
                  >
                    {isExpanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                  </ActionIcon>
                  <IconCalendar size={18} style={{ color: isPast ? (isDark ? '#a1a1aa' : '#94a3b8') : colors.primary }} />
                  <Text fw={600} c={isPast ? 'dimmed' : undefined}>{months[budget.month - 1]} {budget.year}</Text>
                  {isPast && <Badge size="xs" color="gray">Past</Badge>}
                </Group>
                <Group gap="xs">
                  <Text fw={700} c="gray.7">${total.toLocaleString()}</Text>
                  <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => handleEdit(budget)}>
                    <IconEdit size={14} />
                  </ActionIcon>
                </Group>
              </Group>
              
              <Collapse in={isExpanded}>
                <Group justify="space-between" mb="xs">
                  <Text size="xs" c="dimmed">Spent: ${totalSpent.toLocaleString()}</Text>
                  {overallStatus.status !== 'ok' && (
                    <Group gap={4}>
                      <IconAlertTriangle size={12} style={{ color: overallStatus.color }} />
                      <Text size="xs" c={overallStatus.status === 'danger' ? 'red' : 'orange'}>{overallStatus.label}</Text>
                    </Group>
                  )}
                </Group>
                
                <Progress 
                value={Math.min((totalSpent / total) * 100, 100)} 
                color={overallStatus.color} 
                size="sm" 
                mb="md"
              />
              
              <Stack gap="xs">
                {budget.lines.map((line, i) => {
                  const categoryId = line.categoryId
                  const categoryName = categoryMap[categoryId] || categoryId || 'Unknown'
                  const spent = getSpentAmount(categoryId, budget.month, budget.year)
                  const lineStatus = getBudgetStatus(spent, line.amount || 0)
                  const lineKey = `${budget.id}-${i}`
                  const lineTxns = getCategoryTransactions(categoryId, budget.month, budget.year)
                  const isExpanded = expandedLines[lineKey]
                  
                  return (
                    <div key={i}>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <ActionIcon 
                            variant="subtle" 
                            size="xs" 
                            onClick={() => toggleLine(lineKey)}
                            disabled={spent === 0}
                          >
                            {isExpanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                          </ActionIcon>
                          <Text size="sm" c="dimmed">{categoryName}</Text>
                          {lineStatus.status !== 'ok' && (
                            <IconAlertTriangle size={12} style={{ color: lineStatus.color }} />
                          )}
                        </Group>
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">${spent.toLocaleString()} / </Text>
                          <Text size="sm" fw={500}>${(line.amount || 0).toLocaleString()}</Text>
                        </Group>
                      </Group>
                      <Collapse in={isExpanded}>
                        <Stack gap={4} mt="xs" pl={24}>
                          {lineTxns.length > 0 ? lineTxns.map(txn => (
                            <Group key={txn.id} justify="space-between" gap="xs">
                              <Group gap="xs">
                                <IconArrowDownRight size={12} style={{ color: colors.danger }} />
                                <Text size="xs" c="dimmed">{txn.description || 'Transaction'}</Text>
                                <Text size="xs" c="dimmed">{new Date(txn.date + 'T00:00:00').toLocaleDateString()}</Text>
                              </Group>
                              <Text size="xs" c="red">${Math.abs(txn.amount).toLocaleString()}</Text>
                            </Group>
                          )) : (
                            <Text size="xs" c="dimmed">No transactions</Text>
                          )}
                        </Stack>
                      </Collapse>
                    </div>
                  )
                })}
              </Stack>
              </Collapse>
              
              <Button variant="subtle" color="red" size="xs" fullWidth mt="md" onClick={() => handleDelete(budget.id)}>
                Delete
              </Button>
            </Card>
          )
        }) : <Text c="dimmed" ta="center" py="xl">No budgets yet</Text>}
      </SimpleGrid>

      <Modal opened={editModal.open} onClose={() => setEditModal({ open: false, budget: null })} title="Edit Budget" centered size="lg">
        {editModal.budget && (
          <Stack gap="md">
            <SimpleGrid cols={2}>
              <Select
                label="Month"
                data={months.map((m, i) => ({ value: String(i + 1), label: m }))}
                value={String(editModal.budget.month)}
                onChange={(val) => setEditModal({ ...editModal, budget: { ...editModal.budget, month: parseInt(val) } })}
              />
              <NumberInput
                label="Year"
                value={editModal.budget.year}
                onChange={(val) => setEditModal({ ...editModal, budget: { ...editModal.budget, year: val } })}
              />
            </SimpleGrid>
            
            <Text size="sm" fw={500}>Categories</Text>
            {editModal.budget.lines.map((line, i) => (
              <Group key={i} gap="sm">
                <Select
                  placeholder="Select category"
                  data={categories.map(c => ({ value: c.id, label: c.name }))}
                  value={line.categoryId}
                  onChange={(val) => handleEditLineChange(i, 'categoryId', val)}
                  style={{ flex: 1 }}
                  searchable
                  clearable
                />
                <NumberInput
                  placeholder="Amount"
                  value={line.amount}
                  onChange={(val) => handleEditLineChange(i, 'amount', val)}
                  decimalScale={2}
                  hideControls
                  style={{ width: 100 }}
                />
                {editModal.budget.lines.length > 1 && (
                  <ActionIcon variant="subtle" color="red" onClick={() => handleEditRemoveLine(i)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                )}
              </Group>
            ))}
            
            <Button variant="subtle" onClick={handleEditAddLine}>+ Add Category</Button>
            <Button fullWidth color="gray" onClick={handleEditSubmit} loading={submitting}>
              Save Changes
            </Button>
          </Stack>
        )}
      </Modal>
    </div>
  )
}
