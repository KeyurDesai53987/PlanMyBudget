import { useState, useEffect } from 'react'
import { Card, Group, Text, Stack, TextInput, NumberInput, Select, Button, SegmentedControl, ActionIcon, Loader, Center, Modal, Menu, Badge, Divider } from '@mantine/core'
import { IconPlus, IconTrash, IconArrowUpRight, IconArrowDownRight, IconEdit, IconDownload, IconRepeat, IconPlayerPlay, IconTag, IconSearch } from '@tabler/icons-react'
import { api } from '../api'
import { useMantineColorScheme } from '@mantine/core'
import { colors } from '../theme'
import { formatCurrency } from '../currencies'

const DATE_PRESETS = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
]

function exportToCSV(transactions, accounts, categories) {
  const accountMap = accounts.reduce((acc, a) => ({ ...acc, [a.id]: a.name }), {})
  const categoryMap = categories.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {})
  
  const headers = ['Date', 'Description', 'Account', 'Category', 'Type', 'Amount']
  const rows = transactions.map(t => [
    t.date,
    t.description || '',
    accountMap[t.accountId] || '',
    categoryMap[t.categoryId] || '',
    t.amount >= 0 ? 'Income' : 'Expense',
    t.amount.toFixed(2)
  ])
  
  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportToPDF(transactions, accounts, categories) {
  const accountMap = accounts.reduce((acc, a) => ({ ...acc, [a.id]: a.name }), {})
  const categoryMap = categories.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {})
  
  const sorted = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date + 'T00:00:00')
    const dateB = new Date(b.date + 'T00:00:00')
    if (dateB - dateA !== 0) return dateB - dateA
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
  
  const content = `
    <html>
    <head>
      <title>Transactions Export</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background: #f5f5f5; }
        .income { color: green; }
        .expense { color: red; }
        .total { font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <h1>Transactions Report</h1>
      <p>Generated: ${new Date().toLocaleDateString()}</p>
      <table>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Account</th>
          <th>Category</th>
          <th>Type</th>
          <th>Amount</th>
        </tr>
        ${sorted.map(t => `
          <tr>
            <td>${t.date}</td>
            <td>${t.description || '-'}</td>
            <td>${accountMap[t.accountId] || '-'}</td>
            <td>${categoryMap[t.categoryId] || '-'}</td>
            <td>${t.amount >= 0 ? 'Income' : 'Expense'}</td>
            <td class="${t.amount >= 0 ? 'income' : 'expense'}">${t.amount >= 0 ? '+' : ''}$${t.amount.toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>
      <p class="total">Total: $${transactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</p>
    </body>
    </html>
  `
  
  const blob = new Blob([content], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${new Date().toISOString().split('T')[0]}.html`
  a.click()
  URL.revokeObjectURL(url)
}

export default function Transactions() {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [recurring, setRecurring] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [quickAmount, setQuickAmount] = useState('')
  const [quickType, setQuickType] = useState('expense')
  const [quickCategory, setQuickCategory] = useState('')
  const [editModal, setEditModal] = useState({ open: false, txn: null })
  const [datePreset, setDatePreset] = useState('year')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [formData, setFormData] = useState({
    accountId: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'debit', description: '', categoryId: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [txns, accs, rec, cats] = await Promise.all([api('/transactions'), api('/accounts'), api('/recurring'), api('/categories')])
      setTransactions(txns.transactions || [])
      setAccounts(accs.accounts || [])
      setRecurring(rec.recurring || [])
      setCategories(cats.categories || [])
      if (accs.accounts?.length > 0) setFormData(prev => ({ ...prev, accountId: accs.accounts[0].id }))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleProcessRecurring = async (id) => {
    try {
      await api(`/recurring/${id}/process`, { method: 'POST' })
      loadData()
    } catch (err) { alert(err.message) }
  }

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    if (!quickAmount || !formData.accountId) return
    setSubmitting(true)
    try {
      const amount = parseFloat(quickAmount)
      const type = quickType === 'expense' ? 'debit' : 'credit'
      await api('/transactions', { method: 'POST', body: JSON.stringify({ accountId: formData.accountId, date: new Date().toISOString().split('T')[0], amount, type, description: quickType, categoryId: quickCategory || null }) })
      setQuickAmount('')
      setQuickCategory('')
      loadData()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api('/transactions', { method: 'POST', body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount), categoryId: formData.categoryId || null }) })
      setFormData({ accountId: accounts[0]?.id || '', date: new Date().toISOString().split('T')[0], amount: '', type: 'debit', description: '', categoryId: '' })
      setShowForm(false)
      loadData()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleEdit = (txn) => {
    setEditModal({ open: true, txn: { ...txn, amount: Math.abs(txn.amount), type: txn.amount >= 0 ? 'credit' : 'debit', categoryId: txn.categoryId || '' } })
  }

  const handleEditSubmit = async () => {
    if (!editModal.txn) return
    setSubmitting(true)
    try {
      const amount = editModal.txn.type === 'credit' ? Math.abs(editModal.txn.amount) : -Math.abs(editModal.txn.amount)
      await api(`/transactions/${editModal.txn.id}`, { 
        method: 'PUT', 
        body: JSON.stringify({ 
          accountId: editModal.txn.accountId,
          date: editModal.txn.date,
          amount,
          type: editModal.txn.type,
          description: editModal.txn.description,
          categoryId: editModal.txn.categoryId || null
        }) 
      })
      setEditModal({ open: false, txn: null })
      loadData()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return
    try {
      await api(`/transactions/${id}`, { method: 'DELETE' })
      loadData()
    } catch (err) { alert(err.message) }
  }

  const getFilteredTransactions = () => {
    const now = new Date()
    let startDate = null
    let endDate = null

    const toLocalDateStr = (d) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    if (datePreset !== 'all') {
      if (datePreset === 'today') {
        startDate = toLocalDateStr(now)
        endDate = toLocalDateStr(now)
      } else if (datePreset === 'week') {
        const dayOfWeek = now.getDay()
        const start = new Date(now)
        start.setDate(now.getDate() - dayOfWeek)
        startDate = toLocalDateStr(start)
        endDate = toLocalDateStr(now)
      } else if (datePreset === 'month') {
        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`
      } else if (datePreset === 'year') {
        startDate = `${now.getFullYear()}-01-01`
        endDate = `${now.getFullYear()}-12-31`
      }
    }

    if (customDateRange.start) {
      startDate = customDateRange.start
    }
    if (customDateRange.end) {
      endDate = customDateRange.end
    }

    return transactions.filter(t => {
      if (startDate && t.date < startDate) return false
      if (endDate && t.date > endDate) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const categoryName = categories.find(c => c.id === t.categoryId)?.name?.toLowerCase() || ''
        const searchText = `${t.description || ''} ${categoryName}`.toLowerCase()
        if (!searchText.includes(query)) return false
      }
      return true
    }).sort((a, b) => {
      const dateA = new Date(a.date + 'T00:00:00')
      const dateB = new Date(b.date + 'T00:00:00')
      if (dateB - dateA !== 0) return dateB - dateA
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }

  const sortedTransactions = getFilteredTransactions()

  const paginatedTransactions = pageSize === 'all' 
    ? sortedTransactions 
    : sortedTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(sortedTransactions.length / pageSize)

  useEffect(() => { setCurrentPage(1) }, [datePreset, customDateRange, pageSize])

  if (loading) return (
    <Center h={400}>
      <Loader color="gray" />
    </Center>
  )

  return (
    <div>
      <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
        <Text size="xl" fw={700} style={{ fontSize: '1.5rem' }}>Activity</Text>
        <Group gap="sm">
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button variant="light" color="gray" leftSection={<IconDownload size={16} />} size="sm">
                Export
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Export Data</Menu.Label>
              <Menu.Item onClick={() => exportToCSV(sortedTransactions, accounts, categories)}>
                Export as CSV
              </Menu.Item>
              <Menu.Item onClick={() => exportToPDF(sortedTransactions, accounts, categories)}>
                Export as PDF (HTML)
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Button variant="light" color="gray" leftSection={<IconPlus size={16} />} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Done' : 'Add'}
          </Button>
        </Group>
      </Group>

      <Card shadow="sm" padding="sm" radius="md" withBorder mb="md">
        <Stack gap="sm">
          <TextInput
            placeholder="Search..."
            leftSection={<IconSearch size={14} />}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            style={{ width: '100%' }}
            size="sm"
          />
          <SegmentedControl
            size="sm"
            value={datePreset}
            onChange={(val) => { setDatePreset(val); if (val !== 'all') setCustomDateRange({ start: '', end: '' }) }}
            data={DATE_PRESETS}
            fullWidth
          />
          {datePreset === 'all' && (
            <Group gap="xs">
              <TextInput
                type="date"
                size="sm"
                placeholder="Start"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                style={{ flex: 1 }}
              />
              <Text size="xs" c="dimmed">to</Text>
              <TextInput
                type="date"
                size="sm"
                placeholder="End"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                style={{ flex: 1 }}
              />
            </Group>
          )}
        </Stack>
      </Card>

      {accounts.length > 0 && (
        <Card shadow="sm" padding="sm" radius="md" withBorder mb="md">
          <form onSubmit={handleQuickAdd}>
            <Stack gap="sm">
              <SegmentedControl
                size="sm"
                value={quickType}
                onChange={setQuickType}
                data={[
                  { label: 'Expense', value: 'expense' },
                  { label: 'Income', value: 'income' },
                ]}
                fullWidth
              />
              <Group gap="xs" align="flex-end" wrap="wrap">
                <NumberInput
                  placeholder="Amount"
                  value={quickAmount}
                  onChange={setQuickAmount}
                  min={0}
                  decimalScale={2}
                  style={{ flex: 1, minWidth: 80 }}
                  hideControls
                  size="sm"
                />
                <Select
                  placeholder="Category"
                  data={categories.map(c => ({ value: c.id, label: c.name }))}
                  value={quickCategory}
                  onChange={setQuickCategory}
                  clearable
                  style={{ flex: 1, minWidth: 100 }}
                  size="sm"
                />
                <Button type="submit" size="sm" color="gray" loading={submitting} disabled={!quickAmount}>
                  Add
                </Button>
              </Group>
            </Stack>
          </form>
        </Card>
      )}

      {recurring.filter(r => r.active).length > 0 && (
        <Card shadow="sm" padding="sm" radius="md" withBorder mb="md" style={{ background: isDark ? '#252525' : '#f8fafc' }}>
          <Group gap="xs" mb="xs">
            <IconRepeat size={16} />
            <Text size="sm" fw={600}>Recurring</Text>
          </Group>
          <Stack gap="xs">
            {recurring.filter(r => r.active).map(r => (
              <Group key={r.id} justify="space-between">
                <div>
                  <Text size="sm">{r.name}</Text>
                  <Text size="xs" c="dimmed">{r.frequency}</Text>
                </div>
                <Group gap="xs">
                  <Text size="sm" fw={600} c={r.type === 'credit' ? 'green' : 'red'}>
                    {r.type === 'credit' ? '+' : '-'}${r.amount?.toFixed(2)}
                  </Text>
                  <ActionIcon size="xs" variant="light" color="green" onClick={() => handleProcessRecurring(r.id)}>
                    <IconPlayerPlay size={12} />
                  </ActionIcon>
                </Group>
              </Group>
            ))}
          </Stack>
        </Card>
      )}

      {showForm && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="md">
          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <Group grow>
                <Select
                  label="Account"
                  data={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
                  value={formData.accountId}
                  onChange={(val) => setFormData({ ...formData, accountId: val })}
                  required
                />
                <TextInput
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </Group>
              <NumberInput
                label="Amount"
                placeholder="0.00"
                value={formData.amount}
                onChange={(val) => setFormData({ ...formData, amount: val })}
                decimalScale={2}
                required
                hideControls
              />
              <SegmentedControl
                fullWidth
                value={formData.type}
                onChange={(val) => setFormData({ ...formData, type: val })}
                data={[
                  { label: 'Expense', value: 'debit' },
                  { label: 'Income', value: 'credit' },
                ]}
              />
              <Select
                label="Category"
                placeholder="Select category"
                data={categories.map(c => ({ value: c.id, label: c.name }))}
                value={formData.categoryId}
                onChange={(val) => setFormData({ ...formData, categoryId: val })}
                clearable
              />
              <TextInput
                label="Description"
                placeholder="What's this for?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <Button type="submit" fullWidth color="gray" loading={submitting}>
                Add Transaction
              </Button>
            </Stack>
          </form>
        </Card>
      )}

      {(datePreset !== 'year' || customDateRange.start || customDateRange.end || searchQuery) && (
        <Text size="sm" c="dimmed" mb="sm">
          Showing {sortedTransactions.length} of {transactions.length} transactions
        </Text>
      )}

      {sortedTransactions.length > 0 && (
        <Group justify="space-between" align="center" mb="sm">
          <Text size="xs" c="dimmed">
            {pageSize === 'all' 
              ? `${sortedTransactions.length} transactions` 
              : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, sortedTransactions.length)} of ${sortedTransactions.length}`}
          </Text>
          <Group gap="xs">
            <Select
              size="xs"
              value={String(pageSize)}
              onChange={(val) => setPageSize(val === 'all' ? 'all' : Number(val))}
              data={[
                { value: '10', label: '10' },
                { value: '25', label: '25' },
                { value: '50', label: '50' },
                { value: '100', label: '100' },
                { value: 'all', label: 'All' },
              ]}
              style={{ width: 80 }}
            />
            {pageSize !== 'all' && totalPages > 1 && (
              <Group gap={4}>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  ←
                </ActionIcon>
                <Text size="xs" w={50} ta="center">
                  {currentPage} / {totalPages}
                </Text>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  →
                </ActionIcon>
              </Group>
            )}
          </Group>
        </Group>
      )}

      <Stack gap="xs">
        {sortedTransactions.length > 0 ? paginatedTransactions.map(txn => (
          <Card key={txn.id} shadow="sm" padding="sm" radius="md" withBorder>
            <Group justify="space-between">
              <Group gap="sm">
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: txn.amount >= 0 ? `${colors.success}15` : `${colors.danger}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {txn.amount >= 0 ? 
                    <IconArrowUpRight size={18} style={{ color: colors.success }} /> : 
                    <IconArrowDownRight size={18} style={{ color: colors.danger }} />
                  }
                </div>
                <div>
                  <Text size="sm" fw={500}>{txn.description || 'Transaction'}</Text>
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">{new Date(txn.date + 'T00:00:00').toLocaleDateString()}</Text>
                    {txn.categoryId && categories.find(c => c.id === txn.categoryId) && (
                      <Badge size="xs" variant="light" color="gray">
                        {categories.find(c => c.id === txn.categoryId)?.name}
                      </Badge>
                    )}
                  </Group>
                </div>
              </Group>
              <Group gap="sm">
                <Text fw={600} c={txn.amount >= 0 ? 'green' : 'red'}>
                  {txn.amount >= 0 ? '+' : ''}${Math.abs(txn.amount).toFixed(2)}
                </Text>
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => handleEdit(txn)}>
                  <IconEdit size={14} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDelete(txn.id)}>
                  <IconTrash size={14} />
                </ActionIcon>
              </Group>
            </Group>
          </Card>
        )) : <Text c="dimmed" ta="center" py="xl">No transactions yet</Text>}
      </Stack>

      {sortedTransactions.length === 0 && transactions.length > 0 && (
        <Text c="dimmed" ta="center" py="xl">No transactions match the selected filter</Text>
      )}

      <Modal opened={editModal.open} onClose={() => setEditModal({ open: false, txn: null })} title="Edit Transaction" centered>
        {editModal.txn && (
          <Stack gap="sm">
            <Select
              label="Account"
              data={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
              value={editModal.txn.accountId}
              onChange={(val) => setEditModal({ ...editModal, txn: { ...editModal.txn, accountId: val } })}
              required
            />
            <TextInput
              label="Date"
              type="date"
              value={editModal.txn.date}
              onChange={(e) => setEditModal({ ...editModal, txn: { ...editModal.txn, date: e.target.value } })}
              required
            />
            <NumberInput
              label="Amount"
              placeholder="0.00"
              value={editModal.txn.amount}
              onChange={(val) => setEditModal({ ...editModal, txn: { ...editModal.txn, amount: val } })}
              decimalScale={2}
              required
              hideControls
            />
            <SegmentedControl
              fullWidth
              value={editModal.txn.type}
              onChange={(val) => setEditModal({ ...editModal, txn: { ...editModal.txn, type: val } })}
              data={[
                { label: 'Expense', value: 'debit' },
                { label: 'Income', value: 'credit' },
              ]}
            />
            <Select
              label="Category"
              placeholder="Select category"
              data={categories.map(c => ({ value: c.id, label: c.name }))}
              value={editModal.txn.categoryId || ''}
              onChange={(val) => setEditModal({ ...editModal, txn: { ...editModal.txn, categoryId: val } })}
              clearable
            />
            <TextInput
              label="Description"
              placeholder="What's this for?"
              value={editModal.txn.description || ''}
              onChange={(e) => setEditModal({ ...editModal, txn: { ...editModal.txn, description: e.target.value } })}
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
