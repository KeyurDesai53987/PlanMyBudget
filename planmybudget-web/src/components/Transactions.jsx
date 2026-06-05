import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Card, Group, Text, Stack, TextInput, NumberInput, Select, Button, SegmentedControl, ActionIcon, Modal, Menu, Badge, Divider, Box, Transition, Alert, SimpleGrid } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconPlus, IconTrash, IconArrowUpRight, IconArrowDownRight, IconEdit, IconDownload, IconRepeat, IconPlayerPlay, IconTag, IconSearch, IconX, IconScan, IconUpload } from '@tabler/icons-react'
import { api } from '../api'
import { useMantineColorScheme } from '@mantine/core'
import { colors } from '../theme'
import { formatCurrency } from '../currencies'
import { TransactionsSkeleton } from './Skeletons'

const DATE_PRESETS = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
]

const TYPE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
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
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editModal, setEditModal] = useState({ open: false, txn: null })
  const [datePreset, setDatePreset] = useState('year')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [typeFilter, setTypeFilter] = useState('all')
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  const searchInputRef = useRef(null)
  const [formData, setFormData] = useState({
    accountId: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'debit', description: '', categoryId: ''
  })
  const [importModal, setImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [importMapping, setImportMapping] = useState({
    date: '', description: '', amount: '', type: '', category: '', debit: '', credit: ''
  })
  const [importAccount, setImportAccount] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  const [debouncedSearch] = useDebouncedValue(searchQuery, 300)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const [txns, accs, rec, cats] = await Promise.all([api('/transactions'), api('/accounts'), api('/recurring'), api('/categories')])
      setTransactions(txns.transactions || [])
      setAccounts(accs.accounts || [])
      setRecurring(rec.recurring || [])
      setCategories(cats.categories || [])
      if (accs.accounts?.length > 0) setFormData(prev => ({ ...prev, accountId: accs.accounts[0].id }))
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load data')
    }
    finally { setLoading(false) }
  }, [])

  const handleProcessRecurring = async (id) => {
    try {
      await api(`/recurring/${id}/process`, { method: 'POST' })
      loadData()
    } catch (err) { alert(err.message) }
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

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setImportPreview(null)
    setImportResult(null)

    try {
      const fd = new window.FormData()
      fd.append('file', file)
      const data = await api('/transactions/import/preview', { method: 'POST', body: fd })
      setImportPreview(data)
      setImportMapping(data.detected_mapping || { date: '', description: '', amount: '', type: '', category: '', debit: '', credit: '' })
      if (data.accounts?.length > 0) setImportAccount(data.accounts[0].id)
    } catch (err) { alert(err.message) }
  }

  const updateMapping = (field, value) => {
    setImportMapping(prev => ({ ...prev, [field]: value }))
  }

  const handleImportSubmit = async () => {
    if (!importFile || !importAccount) return
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new window.FormData()
      fd.append('file', importFile)
      fd.append('accountId', importAccount)
      fd.append('dateColumn', importMapping.date)
      fd.append('descriptionColumn', importMapping.description)
      fd.append('amountColumn', importMapping.amount)
      fd.append('typeColumn', importMapping.type)
      fd.append('categoryColumn', importMapping.category)
      fd.append('debitColumn', importMapping.debit)
      fd.append('creditColumn', importMapping.credit)
      fd.append('skipHeader', 'true')
      const result = await api('/transactions/import', { method: 'POST', body: fd })
      setImportResult(result)
      if (result.imported > 0) loadData()
    } catch (err) { alert(err.message) }
    finally { setImporting(false) }
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
      if (typeFilter !== 'all') {
        if (typeFilter === 'income' && t.amount < 0) return false
        if (typeFilter === 'expense' && t.amount >= 0) return false
      }
      if (debouncedSearch) {
        const query = debouncedSearch.toLowerCase()
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

  useEffect(() => { setCurrentPage(1) }, [datePreset, customDateRange, pageSize, typeFilter, searchQuery])

  if (loading) return <TransactionsSkeleton />

  if (error) return (
    <div>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={700}>Activity</Text>
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
          <Button variant="light" color="gray" leftSection={<IconUpload size={16} />} size="sm" onClick={() => setImportModal(true)}>
            Import
          </Button>
          <Button variant="light" color="gray" leftSection={<IconPlus size={16} />} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Done' : 'Add'}
          </Button>
        </Group>
      </Group>

      <Card shadow="sm" padding="sm" radius="md" withBorder mb="md">
        <Stack gap="sm">
          <Group justify="space-between" wrap="nowrap">
            <SegmentedControl
              size="sm"
              value={datePreset}
              onChange={(val) => { setDatePreset(val); if (val !== 'all') setCustomDateRange({ start: '', end: '' }) }}
              data={DATE_PRESETS}
              style={{ flex: 1 }}
            />
            <ActionIcon
              variant={showSearch ? 'filled' : 'subtle'}
              color="gray"
              size="lg"
              onClick={() => setShowSearch(!showSearch)}
              ml="xs"
            >
              {showSearch ? <IconX size={18} /> : <IconSearch size={18} />}
            </ActionIcon>
          </Group>
          
          <Transition mounted={showSearch} transition="pop-bottom-left" duration={200}>
            {(styles) => (
              <Box style={styles}>
                <TextInput
                  placeholder="Search transactions..."
                  leftSection={<IconSearch size={14} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  size="sm"
                  ref={searchInputRef}
                  rightSection={
                    searchQuery ? (
                      <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setSearchQuery('')}>
                        <IconX size={12} />
                      </ActionIcon>
                    ) : null
                  }
                />
              </Box>
            )}
          </Transition>
          
          <SegmentedControl
            size="xs"
            value={typeFilter}
            onChange={setTypeFilter}
            data={TYPE_FILTERS}
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
        {sortedTransactions.length > 0 ? paginatedTransactions.map((txn, index) => (
          <Card key={txn.id} shadow="sm" padding="sm" radius="md" withBorder className="animated-card list-item" style={{ animationDelay: `${index * 30}ms` }}>
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

      <Modal opened={importModal} onClose={() => { setImportModal(false); setImportPreview(null); setImportResult(null); setImportFile(null) }} title="Import Transactions" size="xl" centered>
        <Stack gap="sm">
          <input type="file" accept=".csv,.xlsx,.xls" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />
          {!importFile ? (
            <Card withBorder padding="xl" style={{ borderStyle: 'dashed', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
              <Stack align="center" gap="sm">
                <IconUpload size={40} style={{ opacity: 0.4 }} />
                <Text size="sm" c="dimmed">Click to upload CSV or Excel file</Text>
              </Stack>
            </Card>
          ) : (
            <Group gap="sm">
              <Text size="sm" fw={500}>{importFile.name}</Text>
              <Button size="xs" variant="light" color="gray" onClick={() => fileInputRef.current?.click()}>Change</Button>
            </Group>
          )}

          {importResult && (
            <Alert color={importResult.imported > 0 ? 'green' : 'yellow'}>
              <Text size="sm" fw={500}>Imported {importResult.imported} of {importResult.total} transactions</Text>
              {importResult.errors?.length > 0 && (
                <Text size="xs" mt="xs">{importResult.errors.length} rows had errors (skipped)</Text>
              )}
            </Alert>
          )}

          {importPreview && !importResult && (
            <>
              <Select
                label="Import into account"
                data={importPreview.accounts?.map(a => ({ value: a.id, label: `${a.name} (${a.currency})` })) || []}
                value={importAccount}
                onChange={setImportAccount}
                required
              />

              <Text size="sm" fw={500} mt="sm">Column Mapping</Text>
              <Text size="xs" c="dimmed" mb="xs">Map your file columns to transaction fields</Text>

              <SimpleGrid cols={2} spacing="xs">
                <Select label="Date column" placeholder="Auto-detected" clearable data={importPreview.headers?.map(h => ({ value: h, label: h })) || []} value={importMapping.date} onChange={(v) => updateMapping('date', v)} />
                <Select label="Description column" placeholder="Auto-detected" clearable data={importPreview.headers?.map(h => ({ value: h, label: h })) || []} value={importMapping.description} onChange={(v) => updateMapping('description', v)} />
                <Select label="Amount column" placeholder="Auto-detected" clearable data={importPreview.headers?.map(h => ({ value: h, label: h })) || []} value={importMapping.amount} onChange={(v) => updateMapping('amount', v)} />
                <Select label="Type column" placeholder="Auto-detected" clearable data={importPreview.headers?.map(h => ({ value: h, label: h })) || []} value={importMapping.type} onChange={(v) => updateMapping('type', v)} />
                <Select label="Debit column" placeholder="Auto-detected" clearable data={importPreview.headers?.map(h => ({ value: h, label: h })) || []} value={importMapping.debit} onChange={(v) => updateMapping('debit', v)} />
                <Select label="Credit column" placeholder="Auto-detected" clearable data={importPreview.headers?.map(h => ({ value: h, label: h })) || []} value={importMapping.credit} onChange={(v) => updateMapping('credit', v)} />
                <Select label="Category column" placeholder="Auto-detected" clearable data={importPreview.headers?.map(h => ({ value: h, label: h })) || []} value={importMapping.category} onChange={(v) => updateMapping('category', v)} />
              </SimpleGrid>

              <Text size="sm" fw={500} mt="md">Preview ({importPreview.preview?.length || 0} of {importPreview.total_rows} rows)</Text>

              <Box style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>#</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Description</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Type</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Category</th>
                      <th style={{ padding: '6px 8px', textAlign: 'left' }}>Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.preview?.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '4px 8px' }}>{row.row}</td>
                        <td style={{ padding: '4px 8px' }}>{row.date}</td>
                        <td style={{ padding: '4px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'right' }}>{row.amount?.toFixed(2)}</td>
                        <td style={{ padding: '4px 8px' }}><Badge size="xs" color={row.type === 'credit' ? 'green' : 'red'}>{row.type}</Badge></td>
                        <td style={{ padding: '4px 8px' }}>{row.category || '-'}</td>
                        <td style={{ padding: '4px 8px' }}>{row.errors?.length > 0 ? <Text size="xs" c="red">{row.errors.join(', ')}</Text> : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>

              <Button fullWidth color="gray" onClick={handleImportSubmit} loading={importing} disabled={!importAccount}>
                Import {importPreview.total_rows} Transactions
              </Button>
            </>
          )}
        </Stack>
      </Modal>
    </div>
  )
}
