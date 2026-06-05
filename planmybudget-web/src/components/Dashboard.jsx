import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Card, Group, Text, Stack, Button, SimpleGrid, Select, SegmentedControl, useMantineColorScheme, ActionIcon, Modal, Switch, MultiSelect, Tooltip, TextInput, NumberInput } from '@mantine/core'
import { IconArrowUpRight, IconArrowDownRight, IconWallet, IconPigMoney, IconGripVertical, IconEyeOff, IconAdjustmentsHorizontal, IconPlus, IconEdit, IconTrash, IconSettings } from '@tabler/icons-react'
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '../api'
import { colors } from '../theme'
import { DashboardSkeleton } from './Skeletons'

const CHART_COLORS = [colors.primary, colors.success, colors.danger, colors.warning, colors.purple, colors.cyan, '#14b8a6', '#f59e0b']

const DEFAULT_WIDGET_SETTINGS = {
  incomeVsExpense: { chartType: 'pie', incomeColor: '#10b981', expenseColor: '#ef4444' },
  last7Days: { chartType: 'bar', incomeColor: '#10b981', expenseColor: '#ef4444' },
  balanceByAccount: { chartType: 'pie', maxItems: 6 },
  monthlyTrend: { chartType: 'line', incomeColor: '#10b981', expenseColor: '#ef4444' },
  monthlySavings: { chartType: 'bar', savingsColor: colors.primary },
  categories: { chartType: 'pie', showLegend: true },
  recentActivity: { maxItems: 5 },
}

const COLOR_OPTIONS = [
  colors.primary, colors.success, colors.danger, colors.warning,
  colors.purple, colors.cyan, '#14b8a6', '#f59e0b',
  '#6366f1', '#ec4899', '#8b5cf6', '#f97316',
  '#06b6d4', '#84cc16', '#fb923c', '#a78bfa',
]

const WIDGET_DEFS = {
  periodSummary: { id: 'periodSummary', label: 'Period Summary', defaultVisible: true },
  incomeVsExpense: { id: 'incomeVsExpense', label: 'Income vs Expenses', defaultVisible: true },
  last7Days: { id: 'last7Days', label: 'Last 7 Days', defaultVisible: true },
  balanceByAccount: { id: 'balanceByAccount', label: 'Balance by Account', defaultVisible: true },
  monthlyTrend: { id: 'monthlyTrend', label: 'Monthly Trend', defaultVisible: true },
  monthlySavings: { id: 'monthlySavings', label: 'Monthly Savings', defaultVisible: true },
  categories: { id: 'categories', label: 'Category Breakdown', defaultVisible: true },
  goalsProgress: { id: 'goalsProgress', label: 'Goals Progress', defaultVisible: true },
  recentActivity: { id: 'recentActivity', label: 'Recent Activity', defaultVisible: true },
}

const DATE_PRESETS = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '3 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
]

const PERIOD_LABELS = {
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 3 Months',
  '1y': 'Last Year',
  'all': 'All Time',
  'custom': 'Custom Period',
}

function loadPrefs() {
  try {
    const saved = localStorage.getItem('dashboardPrefs')
    if (saved) {
      const parsed = JSON.parse(saved)
      const allIds = Object.keys(WIDGET_DEFS)
      const customCharts = parsed.customCharts || []
      const customIds = customCharts.map(c => c.id)
      return {
        widgetOrder: (parsed.widgetOrder || []).filter(id => id in WIDGET_DEFS || customIds.includes(id)),
        visibleWidgets: {
          ...Object.fromEntries(allIds.map(k => [k, parsed.visibleWidgets?.[k] ?? true])),
          ...Object.fromEntries(customIds.map(k => [k, parsed.visibleWidgets?.[k] ?? true])),
        },
        widgetSizes: {
          ...Object.fromEntries(allIds.map(k => [k, parsed.widgetSizes?.[k] ?? 'full'])),
          ...Object.fromEntries(customIds.map(k => [k, parsed.widgetSizes?.[k] ?? 'full'])),
        },
        customCharts,
        widgetSettings: {
          ...Object.fromEntries(Object.keys(DEFAULT_WIDGET_SETTINGS).map(k => [k, { ...DEFAULT_WIDGET_SETTINGS[k] }])),
          ...(parsed.widgetSettings || {}),
        },
        datePreset: parsed.datePreset ?? 'all',
        customStartDate: parsed.customStartDate ?? '',
        customEndDate: parsed.customEndDate ?? '',
        selectedAccounts: parsed.selectedAccounts ?? [],
      }
    }
  } catch {}
  const allIds = Object.keys(WIDGET_DEFS)
  const initialSettings = {}
  for (const k of Object.keys(DEFAULT_WIDGET_SETTINGS)) {
    initialSettings[k] = { ...DEFAULT_WIDGET_SETTINGS[k] }
  }
  return {
    widgetOrder: [...allIds],
    visibleWidgets: Object.fromEntries(allIds.map(k => [k, true])),
    widgetSizes: Object.fromEntries(allIds.map(k => [k, 'full'])),
    customCharts: [],
    widgetSettings: initialSettings,
    datePreset: 'all',
    customStartDate: '',
    customEndDate: '',
    selectedAccounts: [],
  }
}

function savePrefs(prefs) {
  try { localStorage.setItem('dashboardPrefs', JSON.stringify(prefs)) } catch {}
}

function getDateRange(preset, customStart, customEnd) {
  const now = new Date()
  if (preset === 'custom') {
    return { start: customStart || null, end: customEnd || null }
  }
  let start = null
  switch (preset) {
    case '7d': start = new Date(now.getTime() - 7 * 86400000); break
    case '30d': start = new Date(now.getTime() - 30 * 86400000); break
    case '90d': start = new Date(now.getTime() - 90 * 86400000); break
    case '1y': start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break
    case 'all': break
  }
  return {
    start: start ? start.toISOString().split('T')[0] : null,
    end: now.toISOString().split('T')[0],
  }
}

function computeChartData(transactions, config, categoryMap, accountMap) {
  if (!config) return []
  const { metric, groupBy, limit = 8, sortOrder = 'value-desc', filterCategories = [], filterAccounts = [] } = config
  const getVal = (t) => {
    if (metric === 'income') return t.amount > 0 ? t.amount : 0
    if (metric === 'expenses') return t.amount < 0 ? Math.abs(t.amount) : 0
    if (metric === 'net') return t.amount
    return 0
  }
  let filtered = transactions
  if (filterCategories.length > 0) filtered = filtered.filter(t => filterCategories.includes(t.categoryId))
  if (filterAccounts.length > 0) filtered = filtered.filter(t => filterAccounts.includes(t.accountId))
  const grouped = {}
  for (const t of filtered) {
    const val = getVal(t)
    if (val === 0) continue
    let key
    if (groupBy === 'category') key = categoryMap[t.categoryId] || 'Other'
    else if (groupBy === 'account') key = accountMap[t.accountId] || 'Unknown'
    else if (groupBy === 'month') key = t.date ? t.date.substring(0, 7) : 'Unknown'
    else if (groupBy === 'day') key = t.date || 'Unknown'
    else key = 'All'
    grouped[key] = (grouped[key] || 0) + val
  }
  let data = Object.entries(grouped).map(([name, value]) => ({ name, value }))
  if (sortOrder === 'name-asc') data.sort((a, b) => a.name.localeCompare(b.name))
  else if (sortOrder === 'name-desc') data.sort((a, b) => b.name.localeCompare(a.name))
  else if (sortOrder === 'value-asc') data.sort((a, b) => a.value - b.value)
  else data.sort((a, b) => b.value - a.value)
  if ((groupBy === 'month' || groupBy === 'day') && (sortOrder === 'value-desc' || sortOrder === 'value-asc')) {
    data.sort((a, b) => a.name.localeCompare(b.name))
  }
  return data.slice(0, limit || 10)
}

const StatCard = ({ label, value, icon: Icon, color, prefix = '$', onClick }) => (
  <Card shadow="sm" padding="md" radius="md" withBorder style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
    <Group justify="space-between" align="flex-start">
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text size="xs" tt="uppercase" fw={600} c="dimmed">{label}</Text>
        <Text size="lg" fw={700} style={{ fontSize: '1.1rem', wordBreak: 'break-word' }}>
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
      </div>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: `${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Icon size={18} style={{ color }} />
      </div>
    </Group>
  </Card>
)

export default function Dashboard() {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'

  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [goals, setGoals] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [prefs, setPrefs] = useState(loadPrefs)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [configModal, setConfigModal] = useState({ open: false, widgetId: null })

  const [catChartView, setCatChartView] = useState('expense')
  const [catMonth, setCatMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [chartModalOpen, setChartModalOpen] = useState(false)
  const [editingChartId, setEditingChartId] = useState(null)
  const [chartForm, setChartForm] = useState({
    title: '', type: 'bar', metric: 'expenses', groupBy: 'category', limit: 8,
    sortOrder: 'value-desc', showLegend: true, color: colors.primary,
    filterCategories: [], filterAccounts: [],
  })
  const [drilldown, setDrilldown] = useState({ open: false, title: '', transactions: [] })

  const [dragIndex, setDragIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const dropZoneRef = useRef(null)
  const widgetRefs = useRef({})
  const resizingRef = useRef(null)

  const SNAP_BREAKPOINTS = [
    { value: 'third', width: 'calc(33.33% - 8px)', label: '⅓' },
    { value: 'half', width: 'calc(50% - 6px)', label: '½' },
    { value: 'two-thirds', width: 'calc(66.66% - 8px)', label: '⅔' },
    { value: 'full', width: '100%', label: '▬' },
  ]

  const getWidgetWidth = (widgetId) => {
    const size = prefs.widgetSizes?.[widgetId]
    const bp = SNAP_BREAKPOINTS.find(b => b.value === size)
    return bp ? bp.width : '100%'
  }

  const getWidgetLabel = (widgetId) => {
    const size = prefs.widgetSizes?.[widgetId]
    const bp = SNAP_BREAKPOINTS.find(b => b.value === size)
    return bp ? bp.label : '▬'
  }

  const getNextSize = (widgetId) => {
    const size = prefs.widgetSizes?.[widgetId] || 'full'
    const idx = SNAP_BREAKPOINTS.findIndex(b => b.value === size)
    return SNAP_BREAKPOINTS[(idx + 1) % SNAP_BREAKPOINTS.length].value
  }

  const cycleSize = (widgetId) => {
    updatePrefs({ widgetSizes: { ...prefs.widgetSizes, [widgetId]: getNextSize(widgetId) } })
  }

  const handleResizeStart = (e, widgetId) => {
    e.preventDefault()
    e.stopPropagation()
    const el = widgetRefs.current[widgetId]
    if (!el || !dropZoneRef.current) return
    const rect = el.getBoundingClientRect()
    const containerRect = dropZoneRef.current.getBoundingClientRect()
    const clientX = e.clientX || (e.touches && e.touches[0].clientX)
    if (!clientX) return
    resizingRef.current = {
      widgetId,
      startX: clientX,
      startWidth: rect.width,
      containerWidth: containerRect.width,
    }
  }

  useEffect(() => {
    const SNAP_VALUES = [33.33, 50, 66.66, 100]
    const LABELS = ['third', 'half', 'two-thirds', 'full']
    const snapPct = (pct) => {
      const clamped = Math.max(25, Math.min(100, pct))
      return SNAP_VALUES.reduce((prev, curr) =>
        Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev
      )
    }

    const handleMove = (e) => {
      const r = resizingRef.current
      if (!r) return
      const clientX = e.clientX || (e.touches && e.touches[0].clientX)
      if (!clientX) return
      const dx = clientX - r.startX
      const targetWidth = r.startWidth + dx
      const pct = (targetWidth / r.containerWidth) * 100
      const snapped = snapPct(pct)
      const size = LABELS[SNAP_VALUES.indexOf(snapped)]
      setPrefs(prev => {
        const current = prev.widgetSizes?.[r.widgetId] || 'full'
        if (current === size) return prev
        return { ...prev, widgetSizes: { ...prev.widgetSizes, [r.widgetId]: size } }
      })
    }

    const handleUp = () => {
      resizingRef.current = null
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [])

  const saveTimerRef = useRef(null)
  const serverLoadedRef = useRef(false)

  useEffect(() => { 
    loadData() 
    loadServerPrefs()
  }, [])

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem('dashboardPrefs', JSON.stringify(prefs))
      } catch {}
      api('/dashboard/prefs', {
        method: 'PUT',
        body: JSON.stringify({ prefs: JSON.stringify(prefs) }),
        skipCache: true,
      }).catch(() => {})
    }, 1500)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [prefs])

  const loadServerPrefs = async () => {
    try {
      const res = await api('/dashboard/prefs', { skipCache: true })
      if (res.prefs) {
        const serverPrefs = JSON.parse(res.prefs)
        setPrefs(prev => {
          const merged = {
            ...prev,
            ...(serverPrefs.widgetOrder ? { widgetOrder: serverPrefs.widgetOrder } : {}),
            ...(serverPrefs.visibleWidgets ? { visibleWidgets: { ...prev.visibleWidgets, ...serverPrefs.visibleWidgets } } : {}),
            ...(serverPrefs.widgetSizes ? { widgetSizes: { ...prev.widgetSizes, ...serverPrefs.widgetSizes } } : {}),
            ...(serverPrefs.widgetSettings ? { widgetSettings: { ...prev.widgetSettings, ...serverPrefs.widgetSettings } } : {}),
            ...(serverPrefs.customCharts ? { customCharts: serverPrefs.customCharts } : {}),
            ...(serverPrefs.datePreset ? { datePreset: serverPrefs.datePreset } : {}),
            ...(serverPrefs.selectedAccounts ? { selectedAccounts: serverPrefs.selectedAccounts } : {}),
          }
          try { localStorage.setItem('dashboardPrefs', JSON.stringify(merged)) } catch {}
          return merged
        })
      }
    } catch {}
    serverLoadedRef.current = true
  }

  const loadData = useCallback(async () => {
    setError(null)
    try {
      const [accs, txns, gls, cats] = await Promise.all([
        api('/accounts'), api('/transactions'), api('/goals'), api('/categories'),
      ])
      setAccounts(accs.accounts || [])
      setTransactions(txns.transactions || [])
      setGoals(gls.goals || [])
      setCategories(cats.categories || [])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to load data')
    } finally { setLoading(false) }
  }, [])

  const updatePrefs = useCallback((updates) => {
    setPrefs(prev => ({ ...prev, ...updates }))
  }, [])

  const visibleWidgetIds = useMemo(() => {
    const customIds = (prefs.customCharts || []).map(c => c.id)
    return prefs.widgetOrder.filter(id => prefs.visibleWidgets[id] && (id in WIDGET_DEFS || customIds.includes(id)))
  }, [prefs.widgetOrder, prefs.visibleWidgets, prefs.customCharts])

  const dateFilter = useMemo(() =>
    getDateRange(prefs.datePreset, prefs.customStartDate, prefs.customEndDate),
    [prefs.datePreset, prefs.customStartDate, prefs.customEndDate]
  )

  const periodLabel = PERIOD_LABELS[prefs.datePreset] || 'All Time'

  const filteredTransactions = useMemo(() => {
    let result = transactions
    if (dateFilter.start) result = result.filter(t => t.date >= dateFilter.start)
    if (dateFilter.end) result = result.filter(t => t.date <= dateFilter.end)
    if (prefs.selectedAccounts.length > 0) result = result.filter(t => prefs.selectedAccounts.includes(t.accountId))
    return result
  }, [transactions, dateFilter, prefs.selectedAccounts])

  const filteredAccounts = useMemo(() => {
    if (prefs.selectedAccounts.length === 0) return accounts
    return accounts.filter(a => prefs.selectedAccounts.includes(a.id))
  }, [accounts, prefs.selectedAccounts])

  const catFilteredTransactions = useMemo(() => {
    return filteredTransactions.filter(t => t.date && t.date.startsWith(catMonth))
  }, [filteredTransactions, catMonth])

  const monthOptions = useMemo(() => {
    const options = []
    for (let i = 0; i < 12; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }, [])

  const totalBalance = useMemo(() =>
    filteredAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0),
    [filteredAccounts]
  )

  const income = useMemo(() =>
    filteredTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    [filteredTransactions]
  )

  const expenses = useMemo(() =>
    filteredTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [filteredTransactions]
  )

  const totalSavings = useMemo(() => Math.max(0, income - expenses), [income, expenses])

  const incomeVsExpenseData = useMemo(() =>
    [{ name: 'Income', value: income }, { name: 'Expenses', value: expenses }].filter(d => d.value > 0),
    [income, expenses]
  )

  const incomeVsExpenseTotal = income + expenses

  const dailyData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })
    return last7Days.map(date => {
      const dayTxns = filteredTransactions.filter(t => t.date === date)
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        income: dayTxns.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
        expenses: dayTxns.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
      }
    })
  }, [filteredTransactions])

  const categoryMap = useMemo(() =>
    categories.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {}),
    [categories]
  )

  const accountMap = useMemo(() =>
    accounts.reduce((acc, a) => ({ ...acc, [a.id]: a.name }), {}),
    [accounts]
  )

  const expenseCategoryData = useMemo(() => {
    return catFilteredTransactions
      .filter(t => t.amount < 0 && t.categoryId)
      .reduce((acc, t) => {
        const name = categoryMap[t.categoryId] || 'Other'
        const existing = acc.find(d => d.name === name)
        if (existing) existing.amount += Math.abs(t.amount)
        else acc.push({ name, amount: Math.abs(t.amount) })
        return acc
      }, [])
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
  }, [catFilteredTransactions, categoryMap])

  const incomeCategoryData = useMemo(() => {
    return catFilteredTransactions
      .filter(t => t.amount > 0 && t.categoryId)
      .reduce((acc, t) => {
        const name = categoryMap[t.categoryId] || 'Other'
        const existing = acc.find(d => d.name === name)
        if (existing) existing.amount += t.amount
        else acc.push({ name, amount: t.amount })
        return acc
      }, [])
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
  }, [catFilteredTransactions, categoryMap])

  const accountData = useMemo(() =>
    filteredAccounts.filter(a => a.balance !== 0).map(a => ({ name: a.name, value: a.balance })).slice(0, 6),
    [filteredAccounts]
  )

  const monthlyData = useMemo(() => {
    return [...Array(6)].map((_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      const month = date.getMonth()
      const year = date.getFullYear()
      const monthTxns = filteredTransactions.filter(t => {
        const txnDate = new Date(t.date)
        return txnDate.getMonth() === month && txnDate.getFullYear() === year
      })
      return {
        name: date.toLocaleDateString('en-US', { month: 'short' }),
        income: monthTxns.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
        expenses: monthTxns.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
      }
    })
  }, [filteredTransactions])

  const savingsData = useMemo(() =>
    monthlyData.map(d => ({ name: d.name, savings: d.income - d.expenses })).filter(d => d.savings !== 0),
    [monthlyData]
  )

  const goalSavings = useMemo(() =>
    goals.map(g => ({
      name: g.name,
      current: g.currentAmount || 0,
      target: g.targetAmount || 0,
      progress: g.targetAmount ? ((g.currentAmount || 0) / g.targetAmount) * 100 : 0,
    })),
    [goals]
  )

  const recentTransactions = useMemo(() =>
    [...filteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20),
    [filteredTransactions]
  )

  const hasGoals = goalSavings.length > 0

  const accountOptions = useMemo(() =>
    accounts.map(a => ({ value: a.id, label: a.name })),
    [accounts]
  )

  const customChartData = useMemo(() => {
    const result = {}
    for (const chart of (prefs.customCharts || [])) {
      result[chart.id] = computeChartData(filteredTransactions, chart, categoryMap, accountMap)
    }
    return result
  }, [filteredTransactions, prefs.customCharts, categoryMap, accountMap])


  const effectiveWidgetIds = useMemo(() =>
    visibleWidgetIds.filter(id => id !== 'goalsProgress' || hasGoals),
    [visibleWidgetIds, hasGoals]
  )

  const getWidgetSetting = useCallback((widgetId, key) => {
    return prefs.widgetSettings?.[widgetId]?.[key] ?? DEFAULT_WIDGET_SETTINGS[widgetId]?.[key]
  }, [prefs.widgetSettings])

  const updateWidgetSetting = useCallback((widgetId, key, value) => {
    updatePrefs({
      widgetSettings: {
        ...prefs.widgetSettings,
        [widgetId]: { ...(prefs.widgetSettings?.[widgetId] || {}), [key]: value },
      },
    })
  }, [prefs.widgetSettings, updatePrefs])

  const toggleWidget = useCallback((id) => {
    updatePrefs({
      visibleWidgets: { ...prefs.visibleWidgets, [id]: !prefs.visibleWidgets[id] },
    })
  }, [prefs.visibleWidgets, updatePrefs])

  const openDrilldown = (title, txns) => {
    setDrilldown({
      open: true,
      title,
      transactions: [...txns].sort((a, b) => new Date(b.date) - new Date(a.date)),
    })
  }

  const getFilteredByGroup = useCallback(({ groupBy, metric, filterCategories = [], filterAccounts = [] }, groupName) => {
    let txns = filteredTransactions
    if (filterCategories.length > 0) txns = txns.filter(t => filterCategories.includes(t.categoryId))
    if (filterAccounts.length > 0) txns = txns.filter(t => filterAccounts.includes(t.accountId))
    if (groupBy === 'category') {
      const catId = Object.entries(categoryMap).find(([, v]) => v === groupName)?.[0]
      if (catId) txns = txns.filter(t => t.categoryId === catId)
    } else if (groupBy === 'account') {
      const accId = Object.entries(accountMap).find(([, v]) => v === groupName)?.[0]
      if (accId) txns = txns.filter(t => t.accountId === accId)
    } else if (groupBy === 'month') {
      txns = txns.filter(t => t.date?.startsWith(groupName))
    } else if (groupBy === 'day') {
      txns = txns.filter(t => t.date === groupName)
    }
    if (metric === 'income') txns = txns.filter(t => t.amount > 0)
    else if (metric === 'expenses') txns = txns.filter(t => t.amount < 0)
    return txns
  }, [filteredTransactions, categoryMap, accountMap])

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
    setDragIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (index !== dragOverIndex) setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    const srcIndex = parseInt(e.dataTransfer.getData('text/plain'))
    setDragIndex(null)
    setDragOverIndex(null)
    if (srcIndex === dropIndex) return
    const fullOrder = [...prefs.widgetOrder]
    const visibleIds = fullOrder.filter(id => prefs.visibleWidgets[id] && (id in WIDGET_DEFS || (prefs.customCharts || []).some(c => c.id === id)))
    const srcWidgetId = visibleIds[srcIndex]
    const destWidgetId = visibleIds[dropIndex]
    if (!srcWidgetId || !destWidgetId) return
    const srcFullIndex = fullOrder.indexOf(srcWidgetId)
    const destFullIndex = fullOrder.indexOf(destWidgetId)
    const reordered = [...fullOrder]
    const [removed] = reordered.splice(srcFullIndex, 1)
    reordered.splice(destFullIndex, 0, removed)
    updatePrefs({ widgetOrder: reordered })
  }

  const handleDragEnd = () => {
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const resetChartForm = () => {
    setChartForm({
      title: '', type: 'bar', metric: 'expenses', groupBy: 'category', limit: 8,
      sortOrder: 'value-desc', showLegend: true, color: colors.primary,
      filterCategories: [], filterAccounts: [],
      datePreset: 'all', selectedMonth: '',
      customStartDate: '', customEndDate: '',
    })
    setEditingChartId(null)
  }

  const openEditChart = (chart) => {
    setChartForm({
      title: chart.title, type: chart.type, metric: chart.metric, groupBy: chart.groupBy, limit: chart.limit,
      sortOrder: chart.sortOrder || 'value-desc', showLegend: chart.showLegend ?? true,
      color: chart.color || colors.primary, filterCategories: chart.filterCategories || [],
      filterAccounts: chart.filterAccounts || [],
      datePreset: chart.datePreset || 'all', selectedMonth: chart.selectedMonth || '',
      customStartDate: chart.customStartDate || '', customEndDate: chart.customEndDate || '',
    })
    setEditingChartId(chart.id)
    setChartModalOpen(true)
  }

  const saveCustomChart = () => {
    if (!chartForm.title.trim()) return
    const newChart = { ...chartForm, id: editingChartId || `cc_${Date.now()}` }
    let updated = prefs.customCharts || []
    if (editingChartId) {
      updated = updated.map(c => c.id === editingChartId ? newChart : c)
    } else {
      updated = [...updated, newChart]
    }
    const updates = { customCharts: updated }
    if (!editingChartId) {
      updates.widgetOrder = [...prefs.widgetOrder, newChart.id]
      updates.visibleWidgets = { ...prefs.visibleWidgets, [newChart.id]: true }
      updates.widgetSizes = { ...prefs.widgetSizes, [newChart.id]: 'full' }
    }
    updatePrefs(updates)
    setChartModalOpen(false)
    resetChartForm()
  }

  const deleteCustomChart = (id) => {
    const updated = (prefs.customCharts || []).filter(c => c.id !== id)
    const { [id]: _, ...restVisible } = prefs.visibleWidgets
    const { [id]: __, ...restSizes } = prefs.widgetSizes
    updatePrefs({
      customCharts: updated,
      widgetOrder: prefs.widgetOrder.filter(wid => wid !== id),
      visibleWidgets: restVisible,
      widgetSizes: restSizes,
    })
  }

  if (loading) return <DashboardSkeleton />

  if (error) return (
    <div>
      <Text size="xl" fw={700} mb="lg" style={{ fontSize: '1.5rem' }}>Dashboard</Text>
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

  const renderWidget = (widgetId) => {
    switch (widgetId) {
      case 'periodSummary':
        return (
          <>
            <Text fw={600} mb="md">{periodLabel}</Text>
            <SimpleGrid cols={{ base: 3, sm: 3 }}>
              <Card shadow="sm" padding="md" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={() => openDrilldown('Income', filteredTransactions.filter(t => t.amount > 0))}>
                <Text size="xs" tt="uppercase" fw={600} c="dimmed">Income</Text>
                <Text size="lg" fw={700} c="#10b981">${income.toLocaleString()}</Text>
              </Card>
              <Card shadow="sm" padding="md" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={() => openDrilldown('Spent', filteredTransactions.filter(t => t.amount < 0))}>
                <Text size="xs" tt="uppercase" fw={600} c="dimmed">Spent</Text>
                <Text size="lg" fw={700} c="#ef4444">-${expenses.toLocaleString()}</Text>
              </Card>
              <Card shadow="sm" padding="md" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={() => openDrilldown('All Transactions', filteredTransactions)}>
                <Text size="xs" tt="uppercase" fw={600} c="dimmed">Saved</Text>
                <Text size="lg" fw={700} c="#10b981">
                  ${Math.max(0, totalSavings).toLocaleString()}
                </Text>
              </Card>
            </SimpleGrid>
          </>
        )

      case 'incomeVsExpense':
        const iveChartType = getWidgetSetting(widgetId, 'chartType') || 'pie'
        const iveIncomeColor = getWidgetSetting(widgetId, 'incomeColor') || '#10b981'
        const iveExpenseColor = getWidgetSetting(widgetId, 'expenseColor') || '#ef4444'
        return (
          <>
            <Text fw={600} mb="md">Income vs Expenses</Text>
            {incomeVsExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                {iveChartType === 'bar' ? (
                  <BarChart data={incomeVsExpenseData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <RechartsTooltip
                      formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                      {incomeVsExpenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? iveIncomeColor : iveExpenseColor} onClick={() => {
                          const txns = filteredTransactions.filter(t => entry.name === 'Income' ? t.amount > 0 : t.amount < 0)
                          openDrilldown(entry.name, txns)
                        }} style={{ cursor: 'pointer' }} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    {(iveChartType === 'donut') ? (
                      <Pie data={incomeVsExpenseData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {incomeVsExpenseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? iveIncomeColor : iveExpenseColor} onClick={() => {
                            const txns = filteredTransactions.filter(t => entry.name === 'Income' ? t.amount > 0 : t.amount < 0)
                            openDrilldown(entry.name, txns)
                          }} style={{ cursor: 'pointer' }} />
                        ))}
                      </Pie>
                    ) : (
                      <Pie data={incomeVsExpenseData} cx="50%" cy="50%" innerRadius={iveChartType === 'pie' ? 0 : 45} outerRadius={80} paddingAngle={iveChartType === 'pie' ? 0 : 5} dataKey="value" stroke="none">
                        {incomeVsExpenseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? iveIncomeColor : iveExpenseColor} onClick={() => {
                            const txns = filteredTransactions.filter(t => entry.name === 'Income' ? t.amount > 0 : t.amount < 0)
                            openDrilldown(entry.name, txns)
                          }} style={{ cursor: 'pointer' }} />
                        ))}
                      </Pie>
                    )}
                    <RechartsTooltip
                      formatter={(value, name) => [`$${value.toLocaleString()} (${incomeVsExpenseTotal > 0 ? ((value / incomeVsExpenseTotal) * 100).toFixed(0) : 0}%)`, name]}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    <Legend verticalAlign="bottom" height={36}
                      formatter={(value) => <span style={{ color: isDark ? '#e5e5e5' : '#1e293b', fontSize: 12 }}>{value}</span>}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            ) : (
              <Text c="dimmed" ta="center" py="xl">No data yet</Text>
            )}
          </>
        )

      case 'last7Days':
        const l7ChartType = getWidgetSetting(widgetId, 'chartType') || 'bar'
        const l7IncomeColor = getWidgetSetting(widgetId, 'incomeColor') || '#10b981'
        const l7ExpenseColor = getWidgetSetting(widgetId, 'expenseColor') || '#ef4444'
        return (
          <>
            <Text fw={600} mb="md">Last 7 Days</Text>
            {dailyData.some(d => d.income > 0 || d.expenses > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                {l7ChartType === 'line' ? (
                  <LineChart data={dailyData}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <RechartsTooltip
                      formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    <Line type="monotone" dataKey="income" name="Income" stroke={l7IncomeColor} strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke={l7ExpenseColor} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                ) : (
                  <BarChart data={dailyData}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <RechartsTooltip
                      cursor={false}
                      formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    <Bar dataKey="income" name="Income" fill={l7IncomeColor} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill={l7ExpenseColor} radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <Text c="dimmed" ta="center" py="xl">No data yet</Text>
            )}
          </>
        )

      case 'balanceByAccount':
        const balChartType = getWidgetSetting(widgetId, 'chartType') || 'pie'
        const balMaxItems = getWidgetSetting(widgetId, 'maxItems') || 6
        const balData = accountData.slice(0, balMaxItems)
        return (
          <>
            <Text fw={600} mb="md">Balance by Account</Text>
            {balData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                {balChartType === 'bar' ? (
                  <BarChart data={balData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} width={90} />
                    <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    <Bar dataKey="value" name="Balance" radius={[0, 4, 4, 0]}>
                      {balData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} onClick={() => {
                          const accId = filteredAccounts.find(a => a.name === entry.name)?.id
                          const txns = accId ? filteredTransactions.filter(t => t.accountId === accId) : filteredTransactions
                          openDrilldown(entry.name, txns)
                        }} style={{ cursor: 'pointer' }} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                    <PieChart>
                    <Pie data={balData} cx="50%" cy="50%"
                      outerRadius={80}
                      paddingAngle={balChartType === 'pie' ? 0 : 2} dataKey="value" stroke="none"
                    >
                      {balData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} onClick={() => {
                          const accId = filteredAccounts.find(a => a.name === entry.name)?.id
                          const txns = accId ? filteredTransactions.filter(t => t.accountId === accId) : filteredTransactions
                          openDrilldown(entry.name, txns)
                        }} style={{ cursor: 'pointer' }} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    <Legend verticalAlign="bottom" height={36}
                      formatter={(value) => <span style={{ color: isDark ? '#e5e5e5' : '#1e293b', fontSize: 12 }}>{value}</span>}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            ) : (
              <Text c="dimmed" ta="center" py="xl">No accounts yet</Text>
            )}
          </>
        )

      case 'monthlyTrend':
        const mtChartType = getWidgetSetting(widgetId, 'chartType') || 'line'
        const mtIncomeColor = getWidgetSetting(widgetId, 'incomeColor') || '#10b981'
        const mtExpenseColor = getWidgetSetting(widgetId, 'expenseColor') || '#ef4444'
        return (
          <>
            <Text fw={600} mb="md">Monthly Trend</Text>
            {monthlyData.some(d => d.income > 0 || d.expenses > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                {mtChartType === 'bar' ? (
                  <BarChart data={monthlyData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <RechartsTooltip
                      formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    <Bar dataKey="income" name="Income" fill={mtIncomeColor} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill={mtExpenseColor} radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={monthlyData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <RechartsTooltip
                      formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    <Line type="monotone" dataKey="income" name="Income" stroke={mtIncomeColor} strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="expenses" name="Expenses" stroke={mtExpenseColor} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <Text c="dimmed" ta="center" py="xl">No data yet</Text>
            )}
          </>
        )

      case 'monthlySavings':
        const msChartType = getWidgetSetting(widgetId, 'chartType') || 'bar'
        const msColor = getWidgetSetting(widgetId, 'savingsColor') || colors.primary
        return (
          <>
            <Text fw={600} mb="md">Monthly Savings</Text>
            {savingsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                {msChartType === 'line' ? (
                  <LineChart data={savingsData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <RechartsTooltip
                      formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    <Line type="monotone" dataKey="savings" name="Savings" stroke={msColor} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                ) : (
                  <BarChart data={savingsData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <RechartsTooltip
                      formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    <Bar dataKey="savings" name="Savings" fill={msColor} radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <Text c="dimmed" ta="center" py="xl">No savings data yet</Text>
            )}
          </>
        )

      case 'categories':
        const catChartType = getWidgetSetting(widgetId, 'chartType') || 'pie'
        const catShowLegend = getWidgetSetting(widgetId, 'showLegend') !== false
        const renderCatChart = (data) => {
          if (data.length === 0) return null
          if (catChartType === 'bar') {
            return (
              <BarChart data={data}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={isDark ? '#a1a1aa' : '#64748b'} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`}
                  contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                />
                <Bar dataKey="amount" name="Amount" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} onClick={() => {
                      const catId = Object.entries(categoryMap).find(([, v]) => v === entry.name)?.[0]
                      let txns = filteredTransactions.filter(t => t.date?.startsWith(catMonth))
                      if (catId) txns = txns.filter(t => t.categoryId === catId)
                      if (catChartView === 'income') txns = txns.filter(t => t.amount > 0)
                      else txns = txns.filter(t => t.amount < 0)
                      openDrilldown(entry.name, txns)
                    }} style={{ cursor: 'pointer' }} />
                  ))}
                </Bar>
              </BarChart>
            )
          }
          return (
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={catChartType === 'donut' ? 55 : catChartType === 'pie' ? 0 : 45} outerRadius={80} paddingAngle={catChartType === 'pie' ? 0 : 2} dataKey="amount" stroke="none">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} onClick={() => {
                    const catId = Object.entries(categoryMap).find(([, v]) => v === entry.name)?.[0]
                    let txns = filteredTransactions.filter(t => t.date?.startsWith(catMonth))
                    if (catId) txns = txns.filter(t => t.categoryId === catId)
                    if (catChartView === 'income') txns = txns.filter(t => t.amount > 0)
                    else txns = txns.filter(t => t.amount < 0)
                    openDrilldown(entry.name, txns)
                  }} style={{ cursor: 'pointer' }} />
                ))}
              </Pie>
              <RechartsTooltip formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
              />
              {catShowLegend && <Legend verticalAlign="bottom" height={36}
                formatter={(value) => <span style={{ color: isDark ? '#e5e5e5' : '#1e293b', fontSize: 12 }}>{value}</span>}
              />}
            </PieChart>
          )
        }
        return (
          <>
            <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
              <Text fw={600}>Categories</Text>
              <Group gap="xs" wrap="nowrap">
                <SegmentedControl
                  size="xs"
                  value={catChartView}
                  onChange={setCatChartView}
                  data={[
                    { label: 'Spending', value: 'expense' },
                    { label: 'Earning', value: 'income' },
                  ]}
                />
                <Select
                  size="xs"
                  data={monthOptions}
                  value={catMonth}
                  onChange={setCatMonth}
                  w={160}
                />
              </Group>
            </Group>
            <ResponsiveContainer width="100%" height={220}>
              {catChartView === 'expense' ? renderCatChart(expenseCategoryData) : renderCatChart(incomeCategoryData)}
            </ResponsiveContainer>
            {catChartView === 'expense' ? expenseCategoryData.length === 0 && <Text c="dimmed" ta="center" py="xl">No data for this month</Text>
              : incomeCategoryData.length === 0 && <Text c="dimmed" ta="center" py="xl">No data for this month</Text>}
          </>
        )

      case 'goalsProgress':
        return hasGoals ? (
          <>
            <Text fw={600} mb="md">Goals Progress</Text>
            <Stack gap="md">
              {goalSavings.map((goal) => (
                <div key={goal.name}>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm" fw={500}>{goal.name}</Text>
                    <Text size="sm" fw={600} c={goal.progress >= 100 ? 'green' : 'blue'}>
                      ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                    </Text>
                  </Group>
                  <div style={{
                    height: 8, background: isDark ? '#334155' : '#e2e8f0',
                    borderRadius: 4, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${Math.min(goal.progress, 100)}%`,
                      background: goal.progress >= 100 ? colors.success : colors.primary,
                      borderRadius: 4, transition: 'width 0.3s ease',
                    }} />
                  </div>
                  <Text size="xs" c="dimmed" mt={4}>
                    {goal.progress >= 100 ? 'Goal reached!' : `$${(goal.target - goal.current).toLocaleString()} remaining`}
                  </Text>
                </div>
              ))}
            </Stack>
          </>
        ) : null

      case 'recentActivity':
        const raMaxItems = getWidgetSetting(widgetId, 'maxItems') || 5
        const raTxns = recentTransactions.slice(0, raMaxItems)
        return (
          <>
            <Text fw={600} mb="md">Recent Activity</Text>
            {raTxns.length > 0 ? (
              <Stack gap="sm">
                {raTxns.map((t) => (
                  <Group key={t.id} justify="space-between">
                    <div>
                      <Text size="sm" fw={500}>{t.description || 'Transaction'}</Text>
                      <Text size="xs" c="dimmed">{new Date(t.date).toLocaleDateString()}</Text>
                    </div>
                    <Text fw={600} c={t.amount >= 0 ? 'green' : 'red'}>
                      {t.amount >= 0 ? '+' : ''}{t.amount.toFixed(2)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            ) : <Text c="dimmed" ta="center" py="xl">No transactions yet</Text>}
          </>
        )

      default: {
        const customChart = (prefs.customCharts || []).find(c => c.id === widgetId)
        if (!customChart) return null
        const data = customChartData[widgetId] || []
        const chartColor = customChart.color || colors.primary
        const showLegend = customChart.showLegend ?? true
        const pieColors = [chartColor, ...CHART_COLORS.filter(c => c !== chartColor)]

        if (customChart.type === 'numbers') {
          const catIds = customChart.filterCategories || []
          const filtered = filteredTransactions
          let chartTxns = filtered
          if (customChart.filterAccounts?.length > 0) chartTxns = chartTxns.filter(t => customChart.filterAccounts.includes(t.accountId))
          const metric = customChart.metric || 'net'
          if (metric === 'income') chartTxns = chartTxns.filter(t => t.amount > 0)
          else if (metric === 'expenses') chartTxns = chartTxns.filter(t => t.amount < 0)
          const categoryTotals = catIds.map(catId => ({
            id: catId,
            name: categoryMap[catId] || 'Other',
            total: chartTxns.filter(t => t.categoryId === catId).reduce((s, t) => s + (metric === 'expenses' ? Math.abs(t.amount) : t.amount), 0),
          }))
          return (
            <>
              <Text fw={600} mb="sm">{customChart.title}</Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {categoryTotals.map(cat => (
                  <Card key={cat.id} shadow="sm" padding="md" radius="md" withBorder style={{ cursor: 'pointer', flex: '1 1 120px', minWidth: 100 }} onClick={() => openDrilldown(cat.name, chartTxns.filter(t => t.categoryId === cat.id))}>
                    <Text size="xs" tt="uppercase" fw={600} c="dimmed">{cat.name}</Text>
                    <Text size="lg" fw={700} c={chartColor}>${Math.round(cat.total).toLocaleString()}</Text>
                  </Card>
                ))}
              </div>
            </>
          )
        }

        if (customChart.type === 'list') {
          let txns = [...filteredTransactions]
          if (customChart.filterCategories?.length > 0) txns = txns.filter(t => customChart.filterCategories.includes(t.categoryId))
          if (customChart.filterAccounts?.length > 0) txns = txns.filter(t => customChart.filterAccounts.includes(t.accountId))
          const datePreset = customChart.datePreset || 'all'
          if (datePreset === 'month' && customChart.selectedMonth) {
            txns = txns.filter(t => t.date && t.date.startsWith(customChart.selectedMonth))
          } else if (datePreset !== 'all') {
            const dr = getDateRange(datePreset, customChart.customStartDate, customChart.customEndDate)
            if (dr.start) txns = txns.filter(t => t.date >= dr.start)
            if (dr.end) txns = txns.filter(t => t.date <= dr.end)
          }
          const metric = customChart.metric || 'expenses'
          if (metric === 'income') txns = txns.filter(t => t.amount > 0)
          else if (metric === 'expenses') txns = txns.filter(t => t.amount < 0)
          txns.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
          const limit = customChart.limit || 10
          const listTxns = txns.slice(0, limit)
          return (
            <>
              <Text fw={600} mb="sm">{customChart.title}</Text>
              {listTxns.length > 0 ? (
                <Stack gap="xs">
                  {listTxns.map((t, i) => (
                    <Group key={t.id} justify="space-between" style={{ cursor: 'pointer' }} onClick={() => openDrilldown(`${customChart.title} (#${i + 1})`, [t])}>
                      <Group gap="xs" style={{ minWidth: 0, flex: 1 }}>
                        <Text size="sm" fw={700} c="dimmed">{i + 1}.</Text>
                        <div style={{ minWidth: 0 }}>
                          <Text size="sm" truncate="end">{t.description || 'Transaction'}</Text>
                          <Text size="xs" c="dimmed">{new Date(t.date).toLocaleDateString()} · {categoryMap[t.categoryId] || 'Uncategorized'}</Text>
                        </div>
                      </Group>
                      <Text fw={600} c={metric === 'expenses' ? 'red' : 'green'} style={{ flexShrink: 0 }}>{metric === 'expenses' ? '-' : '+'}${Math.round(Math.abs(t.amount)).toLocaleString()}</Text>
                    </Group>
                  ))}
                </Stack>
              ) : <Text c="dimmed" ta="center" py="xl">No transactions</Text>}
            </>
          )
        }

        return (
          <>
            <Text fw={600} mb="sm">{customChart.title}</Text>
            {data.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                {customChart.type === 'pie' || customChart.type === 'donut' ? (
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%" cy="50%"
                      innerRadius={customChart.type === 'donut' ? 55 : 0}
                      outerRadius={80}
                      paddingAngle={customChart.type === 'pie' ? 0 : 2}
                      dataKey="value" stroke="none"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} onClick={() => openDrilldown(`${customChart.title} — ${entry.name}`, getFilteredByGroup(customChart, entry.name))} style={{ cursor: 'pointer' }} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    {showLegend && <Legend verticalAlign="bottom" height={36}
                      formatter={(value) => <span style={{ color: isDark ? '#e5e5e5' : '#1e293b', fontSize: 12 }}>{value}</span>}
                    />}
                  </PieChart>
                ) : customChart.type === 'line' ? (
                  <LineChart data={data}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <RechartsTooltip
                      formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    <Line type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                ) : (
                  <BarChart data={data}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                    <RechartsTooltip
                      formatter={(value) => `$${value.toLocaleString()}`}
                      contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                      itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartColor} onClick={() => openDrilldown(`${customChart.title} — ${entry.name}`, getFilteredByGroup(customChart, entry.name))} style={{ cursor: 'pointer' }} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <Text c="dimmed" ta="center" py="xl" size="sm">
                No data — try adjusting your date range or account filter
              </Text>
            )}
          </>
        )
      }
    }
  }

  return (
    <div>
      <Group justify="space-between" mb="lg" wrap="wrap" gap="sm">
        <Text size="xl" fw={700} style={{ fontSize: '1.5rem' }}>Dashboard</Text>
        <Group gap="xs">
          <Tooltip label="Customize dashboard">
            <ActionIcon variant="subtle" size="lg" onClick={() => setSettingsOpen(true)}>
              <IconAdjustmentsHorizontal size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 'var(--mantine-spacing-xl)' }}>
        <Group gap="xs" wrap="wrap" style={{ flex: 1 }}>
          <Select
            label="Time Period"
            size="xs"
            data={DATE_PRESETS}
            value={prefs.datePreset}
            onChange={(val) => updatePrefs({ datePreset: val })}
            w={140}
          />
          {prefs.datePreset === 'custom' && (
            <>
              <TextInput
                type="date"
                size="xs"
                label="From"
                value={prefs.customStartDate}
                onChange={(e) => updatePrefs({ customStartDate: e.target.value })}
                w={150}
              />
              <TextInput
                type="date"
                size="xs"
                label="To"
                value={prefs.customEndDate}
                onChange={(e) => updatePrefs({ customEndDate: e.target.value })}
                w={150}
              />
            </>
          )}
          <MultiSelect
            label="Accounts"
            size="xs"
            data={accountOptions}
            value={prefs.selectedAccounts}
            onChange={(val) => updatePrefs({ selectedAccounts: val })}
            placeholder="All accounts"
            clearable
            w={220}
            maxDisplayedTags={2}
          />
        </Group>
        <Tooltip label="Create custom chart">
          <ActionIcon variant="light" size="lg" onClick={() => { resetChartForm(); setChartModalOpen(true) }}>
            <IconPlus size={18} />
          </ActionIcon>
        </Tooltip>
      </div>

      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        <StatCard label="Balance" value={totalBalance} icon={IconWallet} color="#475569" />
        <StatCard label="Income" value={income} icon={IconArrowUpRight} color="#10b981" onClick={() => openDrilldown('Income', filteredTransactions.filter(t => t.amount > 0))} />
        <StatCard label="Expenses" value={expenses} icon={IconArrowDownRight} color="#ef4444" onClick={() => openDrilldown('Expenses', filteredTransactions.filter(t => t.amount < 0))} />
        <StatCard label="Savings" value={totalSavings} icon={IconPigMoney} color="#10b981" onClick={() => openDrilldown('All Transactions', filteredTransactions)} />
      </SimpleGrid>

      <div
        ref={dropZoneRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDragEnd}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}
      >
        {effectiveWidgetIds.map((widgetId, index) => {
          const isDragOver = dragOverIndex === index && dragIndex !== index
          const widgetWidth = getWidgetWidth(widgetId)
          const widgetLabel = getWidgetLabel(widgetId)

          return (
            <div
              key={widgetId}
              ref={el => widgetRefs.current[widgetId] = el}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                width: widgetWidth,
                transition: 'all 0.15s ease',
                opacity: dragIndex === index ? 0.35 : 1,
                outline: isDragOver ? `2px dashed ${colors.primary}` : 'none',
                outlineOffset: 2,
                borderRadius: 4,
                cursor: dragIndex === index ? 'grabbing' : 'default',
                position: 'relative',
                display: 'flex',
              }}
            >
              <Card shadow="sm" padding="md" radius="md" withBorder style={{ flex: 1, minWidth: 0, overflow: 'hidden', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                <Group justify="space-between" mb="sm" gap={4}>
                  <Group gap={6}>
                    <IconGripVertical
                      size={14}
                      style={{ color: isDark ? '#555' : '#adb5bd', cursor: 'grab', flexShrink: 0 }}
                    />
                  </Group>
                  <Group gap={2} wrap="nowrap">
                    {(() => {
                      if (widgetId.startsWith('cc_')) {
                        const cc = (prefs.customCharts || []).find(c => c.id === widgetId)
                        if (cc) {
                          return (
                            <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => openEditChart(cc)}>
                              <IconSettings size={13} />
                            </ActionIcon>
                          )
                        }
                      }
                      if (DEFAULT_WIDGET_SETTINGS[widgetId]) {
                        return (
                          <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => setConfigModal({ open: true, widgetId })}>
                            <IconSettings size={13} />
                          </ActionIcon>
                        )
                      }
                      return null
                    })()}
                    <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => cycleSize(widgetId)}>
                      <Text size="xs" fw={700} c="dimmed">{widgetLabel}</Text>
                    </ActionIcon>
                    <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => toggleWidget(widgetId)}>
                      <IconEyeOff size={13} />
                    </ActionIcon>
                  </Group>
                </Group>
                {renderWidget(widgetId)}
              </Card>
              <div
                onMouseDown={(e) => handleResizeStart(e, widgetId)}
                onTouchStart={(e) => handleResizeStart(e, widgetId)}
                style={{
                  position: 'absolute',
                  right: 0,
                  bottom: 0,
                  width: 14,
                  height: 14,
                  cursor: 'nwse-resize',
                  zIndex: 5,
                }}
                className="widget-resize-handle"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" style={{ position: 'absolute', right: 0, bottom: 0 }}>
                  <line x1="10" y1="14" x2="14" y2="10" stroke={isDark ? '#888' : '#999'} strokeWidth="1.5" />
                  <line x1="5" y1="14" x2="14" y2="5" stroke={isDark ? '#666' : '#bbb'} strokeWidth="1.5" />
                </svg>
              </div>
            </div>
          )
        })}
        <style>{`
          .widget-resize-handle {
            opacity: 0 !important;
          }
          div:hover > .widget-resize-handle {
            opacity: 1 !important;
          }
        `}</style>
      </div>

      <Modal
        opened={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Customize Dashboard"
        size="sm"
      >
        <Stack gap="xs">
          <Text size="sm" fw={600} mb="xs">Show / Hide &amp; Resize Widgets</Text>
          <Text size="xs" c="dimmed" mb="sm">Drag the ≡ handle to reorder. Drag the bottom-right corner handle to resize (⅓ ½ ⅔ ▬). Click the eye icon to hide.</Text>
          {Object.values(WIDGET_DEFS).map(w => (
            <Group key={w.id} justify="space-between" py={4} wrap="nowrap">
              <Text size="sm" style={{ flex: 1, minWidth: 0 }} lineClamp={1}>{w.label}</Text>
              <Group gap={4} wrap="nowrap">
                <SegmentedControl
                  size="xs"
                  value={prefs.widgetSizes?.[w.id] || 'full'}
                  onChange={(val) => updatePrefs({
                    widgetSizes: { ...prefs.widgetSizes, [w.id]: val },
                  })}
                  data={[
                    { label: '▬', value: 'full' },
                    { label: '⅔', value: 'two-thirds' },
                    { label: '½', value: 'half' },
                    { label: '⅓', value: 'third' },
                  ]}
                  disabled={!prefs.visibleWidgets[w.id]}
                  w={120}
                />
                <Switch
                  size="sm"
                  checked={!!prefs.visibleWidgets[w.id]}
                  onChange={() => toggleWidget(w.id)}
                />
              </Group>
            </Group>
          ))}
          {(prefs.customCharts || []).length > 0 && (
            <>
              <Text size="sm" fw={600} mt="md" mb="xs">Custom Charts</Text>
              {(prefs.customCharts || []).map(chart => (
                <Group key={chart.id} justify="space-between" py={4} wrap="nowrap">
                  <Group gap={6} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                      {chart.type === 'pie' ? '◔' : chart.type === 'bar' ? '▇' : '╱'}
                    </Text>
                    <Text size="sm" lineClamp={1}>{chart.title}</Text>
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <SegmentedControl
                      size="xs"
                      value={prefs.widgetSizes?.[chart.id] || 'full'}
                      onChange={(val) => updatePrefs({
                        widgetSizes: { ...prefs.widgetSizes, [chart.id]: val },
                      })}
                      data={[
                        { label: '▬', value: 'full' },
                        { label: '⅔', value: 'two-thirds' },
                        { label: '½', value: 'half' },
                        { label: '⅓', value: 'third' },
                      ]}
                      disabled={!prefs.visibleWidgets?.[chart.id]}
                      w={120}
                    />
                    <Switch
                      size="sm"
                      checked={!!prefs.visibleWidgets?.[chart.id]}
                      onChange={() => toggleWidget(chart.id)}
                    />
                    <ActionIcon variant="subtle" size="sm" color="blue" onClick={() => openEditChart(chart)}>
                      <IconEdit size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" size="sm" color="red" onClick={() => deleteCustomChart(chart.id)}>
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              ))}
            </>
          )}
        </Stack>
      </Modal>

      <Modal
        opened={chartModalOpen}
        onClose={() => { setChartModalOpen(false); resetChartForm() }}
        title={editingChartId ? 'Edit Custom Chart' : 'Create Custom Chart'}
        size="md"
      >
        <Stack gap="sm">
          <TextInput
            label="Chart Title"
            placeholder="e.g. Spending by Category"
            value={chartForm.title}
            onChange={(e) => setChartForm({ ...chartForm, title: e.target.value })}
            required
          />
          <Select
            label="Chart Type"
            data={[
              { value: 'bar', label: 'Bar Chart' },
              { value: 'line', label: 'Line Chart' },
              { value: 'pie', label: 'Pie Chart' },
              { value: 'donut', label: 'Donut' },
              { value: 'numbers', label: 'Numbers' },
              { value: 'list', label: 'List' },
            ]}
            value={chartForm.type}
            onChange={(val) => setChartForm({ ...chartForm, type: val })}
          />
          <Select
            label="Metric"
            data={[
              { value: 'expenses', label: 'Expenses' },
              { value: 'income', label: 'Income' },
              { value: 'net', label: 'Net' },
            ]}
            value={chartForm.metric}
            onChange={(val) => setChartForm({ ...chartForm, metric: val })}
          />
          {chartForm.type !== 'numbers' && chartForm.type !== 'list' && (
            <>
              <SimpleGrid cols={2}>
                <Select
                  label="Group By"
                  data={[
                    { value: 'category', label: 'Category' },
                    { value: 'account', label: 'Account' },
                    { value: 'month', label: 'Month' },
                    { value: 'day', label: 'Day' },
                  ]}
                  value={chartForm.groupBy}
                  onChange={(val) => setChartForm({ ...chartForm, groupBy: val })}
                />
                <NumberInput
                  label="Max Items"
                  description="Items to show"
                  value={chartForm.limit}
                  onChange={(val) => setChartForm({ ...chartForm, limit: Math.max(2, Math.min(20, parseInt(val) || 8)) })}
                  min={2}
                  max={20}
                />
              </SimpleGrid>

              <Text size="sm" fw={600} mt="xs">Appearance</Text>
              <SimpleGrid cols={2}>
                <Select
                  label="Sort Order"
                  data={[
                    { value: 'value-desc', label: 'Value (High-Low)' },
                    { value: 'value-asc', label: 'Value (Low-High)' },
                    { value: 'name-asc', label: 'Name (A-Z)' },
                    { value: 'name-desc', label: 'Name (Z-A)' },
                  ]}
                  value={chartForm.sortOrder}
                  onChange={(val) => setChartForm({ ...chartForm, sortOrder: val })}
                />
              </SimpleGrid>
            </>
          )}
          {chartForm.type === 'list' && (
            <>
              <NumberInput
                label="Max Items"
                description="Transactions to show"
                value={chartForm.limit}
                onChange={(val) => setChartForm({ ...chartForm, limit: Math.max(1, Math.min(50, parseInt(val) || 10)) })}
                min={1}
                max={50}
              />
              <Select
                label="Date Range"
                data={[
                  { value: 'all', label: 'All Time' },
                  { value: '30d', label: 'Last 30 Days' },
                  { value: '90d', label: 'Last 3 Months' },
                  { value: '1y', label: 'Last Year' },
                  { value: 'month', label: 'Specific Month' },
                  { value: 'custom', label: 'Custom Range' },
                ]}
                value={chartForm.datePreset}
                onChange={(val) => setChartForm({ ...chartForm, datePreset: val })}
              />
              {chartForm.datePreset === 'month' && (
                <Select
                  label="Month"
                  placeholder="Select month"
                  data={monthOptions}
                  value={chartForm.selectedMonth}
                  onChange={(val) => setChartForm({ ...chartForm, selectedMonth: val })}
                  searchable
                />
              )}
              {chartForm.datePreset === 'custom' && (
                <SimpleGrid cols={2}>
                  <TextInput
                    label="Start Date"
                    type="date"
                    value={chartForm.customStartDate}
                    onChange={(e) => setChartForm({ ...chartForm, customStartDate: e.target.value })}
                  />
                  <TextInput
                    label="End Date"
                    type="date"
                    value={chartForm.customEndDate}
                    onChange={(e) => setChartForm({ ...chartForm, customEndDate: e.target.value })}
                  />
                </SimpleGrid>
              )}
            </>
          )}
          {chartForm.type !== 'numbers' && chartForm.type !== 'list' && (
            <SegmentedControl
              fullWidth
              size="xs"
              value={chartForm.showLegend ? 'show' : 'hide'}
              onChange={(val) => setChartForm({ ...chartForm, showLegend: val === 'show' })}
              data={[
                { label: 'Legend', value: 'show' },
                { label: 'No Legend', value: 'hide' },
              ]}
            />
          )}
          <Group gap={6}>
            {COLOR_OPTIONS.map(c => (
              <div
                key={c}
                onClick={() => setChartForm({ ...chartForm, color: c })}
                style={{
                  width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
                  background: c, flexShrink: 0,
                  outline: chartForm.color === c ? `3px solid ${isDark ? '#fff' : '#1e293b'}` : '3px solid transparent',
                  outlineOffset: 1,
                }}
              />
            ))}
          </Group>

          <Text size="sm" fw={600} mt="xs">Filters</Text>
          <MultiSelect
            size="xs"
            label="Categories"
            placeholder="All categories"
            data={categories.map(c => ({ value: c.id, label: c.name }))}
            value={chartForm.filterCategories}
            onChange={(val) => setChartForm({ ...chartForm, filterCategories: val })}
            clearable
            searchable
          />
          <MultiSelect
            size="xs"
            label="Accounts"
            placeholder="All accounts"
            data={accountOptions}
            value={chartForm.filterAccounts}
            onChange={(val) => setChartForm({ ...chartForm, filterAccounts: val })}
            clearable
            searchable
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={() => { setChartModalOpen(false); resetChartForm() }}>Cancel</Button>
            <Button onClick={saveCustomChart}>{editingChartId ? 'Save' : 'Create'}</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={configModal.open}
        onClose={() => setConfigModal({ open: false, widgetId: null })}
        title={configModal.widgetId ? `Configure: ${WIDGET_DEFS[configModal.widgetId]?.label || configModal.widgetId}` : 'Configure Widget'}
        size="sm"
      >
        {configModal.widgetId && (() => {
          const wid = configModal.widgetId
          const s = (key) => getWidgetSetting(wid, key)
          const u = (key, val) => updateWidgetSetting(wid, key, val)

          if (wid === 'incomeVsExpense' || wid === 'last7Days' || wid === 'monthlyTrend') {
            const chartOpts = wid === 'incomeVsExpense'
              ? [{ value: 'pie', label: 'Pie Chart' }, { value: 'bar', label: 'Bar Chart' }, { value: 'donut', label: 'Donut' }]
              : [{ value: 'bar', label: 'Bar Chart' }, { value: 'line', label: 'Line Chart' }]
            return (
              <Stack gap="md">
                <Select label="Chart Type" data={chartOpts} value={s('chartType')} onChange={(v) => u('chartType', v)} />
                <Text size="sm" fw={600}>Income Color</Text>
                <Group gap={6}>
                  {COLOR_OPTIONS.map(c => (
                    <div key={c} onClick={() => u('incomeColor', c)} style={{ width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', background: c, flexShrink: 0, outline: s('incomeColor') === c ? `3px solid ${isDark ? '#fff' : '#1e293b'}` : '3px solid transparent', outlineOffset: 1 }} />
                  ))}
                </Group>
                <Text size="sm" fw={600}>Expense Color</Text>
                <Group gap={6}>
                  {COLOR_OPTIONS.map(c => (
                    <div key={c} onClick={() => u('expenseColor', c)} style={{ width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', background: c, flexShrink: 0, outline: s('expenseColor') === c ? `3px solid ${isDark ? '#fff' : '#1e293b'}` : '3px solid transparent', outlineOffset: 1 }} />
                  ))}
                </Group>
              </Stack>
            )
          }

          if (wid === 'balanceByAccount') {
            return (
              <Stack gap="md">
                <Select label="Chart Type" data={[{ value: 'pie', label: 'Pie Chart' }, { value: 'bar', label: 'Bar Chart' }, { value: 'donut', label: 'Donut' }]} value={s('chartType')} onChange={(v) => u('chartType', v)} />
                <NumberInput label="Max Accounts" value={s('maxItems')} onChange={(v) => u('maxItems', Math.max(3, Math.min(10, parseInt(v) || 6)))} min={3} max={10} />
              </Stack>
            )
          }

          if (wid === 'monthlySavings') {
            return (
              <Stack gap="md">
                <Select label="Chart Type" data={[{ value: 'bar', label: 'Bar Chart' }, { value: 'line', label: 'Line Chart' }]} value={s('chartType')} onChange={(v) => u('chartType', v)} />
                <Text size="sm" fw={600}>Color</Text>
                <Group gap={6}>
                  {COLOR_OPTIONS.map(c => (
                    <div key={c} onClick={() => u('savingsColor', c)} style={{ width: 22, height: 22, borderRadius: '50%', cursor: 'pointer', background: c, flexShrink: 0, outline: s('savingsColor') === c ? `3px solid ${isDark ? '#fff' : '#1e293b'}` : '3px solid transparent', outlineOffset: 1 }} />
                  ))}
                </Group>
              </Stack>
            )
          }

          if (wid === 'categories') {
            return (
              <Stack gap="md">
                <Select label="Chart Type" data={[{ value: 'pie', label: 'Pie Chart' }, { value: 'donut', label: 'Donut' }, { value: 'bar', label: 'Bar Chart' }]} value={s('chartType')} onChange={(v) => u('chartType', v)} />
                <Switch label="Show Legend" checked={!!s('showLegend')} onChange={(e) => u('showLegend', e.currentTarget.checked)} />
              </Stack>
            )
          }

          if (wid === 'recentActivity') {
            return (
              <Stack gap="md">
                <NumberInput label="Max Items" value={s('maxItems')} onChange={(v) => u('maxItems', Math.max(3, Math.min(20, parseInt(v) || 5)))} min={3} max={20} />
              </Stack>
            )
          }

          return <Text c="dimmed" size="sm">No customization available for this widget.</Text>
        })()}
      </Modal>

      <Modal
        opened={drilldown.open}
        onClose={() => setDrilldown({ ...drilldown, open: false })}
        title={drilldown.title}
        size="lg"
      >
        {drilldown.transactions.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">No transactions</Text>
        ) : (
          <Stack gap="sm">
            {drilldown.transactions.map(t => (
              <Group key={t.id} justify="space-between" wrap="nowrap">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text size="sm" fw={500} lineClamp={1}>{t.description || 'Transaction'}</Text>
                  <Text size="xs" c="dimmed">{new Date(t.date).toLocaleDateString()} · {categoryMap[t.categoryId] || 'Uncategorized'} · {accountMap[t.accountId] || 'Unknown'}</Text>
                </div>
                <Text fw={600} c={t.amount >= 0 ? 'green' : 'red'} style={{ flexShrink: 0 }}>
                  {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
                </Text>
              </Group>
            ))}
          </Stack>
        )}
      </Modal>
    </div>
  )
}
