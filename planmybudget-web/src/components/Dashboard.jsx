import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, Group, Text, Stack, SimpleGrid, useMantineColorScheme } from '@mantine/core'
import { IconArrowUpRight, IconArrowDownRight, IconWallet, IconTarget } from '@tabler/icons-react'
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '../api'
import { colors } from '../theme'
import { DashboardSkeleton } from './Skeletons'

const CHART_COLORS = [colors.primary, colors.success, colors.danger, colors.warning, colors.purple, colors.cyan, '#14b8a6', '#f59e0b']

const StatCard = ({ label, value, icon: Icon, color, prefix = '$' }) => (
  <Card shadow="sm" padding="md" radius="md" withBorder>
    <Group justify="space-between" align="flex-start">
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text size="xs" tt="uppercase" fw={600} c="dimmed">{label}</Text>
        <Text size="lg" fw={700} style={{ fontSize: '1.1rem', wordBreak: 'break-word' }}>
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
      </div>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
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

  useEffect(() => { loadData() }, [])

  const loadData = useCallback(async () => {
    try {
      const [accs, txns, gls, cats] = await Promise.all([
        api('/accounts'), 
        api('/transactions'), 
        api('/goals'), 
        api('/categories')
      ])
      setAccounts(accs.accounts || [])
      setTransactions(txns.transactions || [])
      setGoals(gls.goals || [])
      setCategories(cats.categories || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  const totalBalance = useMemo(() => 
    accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0), 
  [accounts])

  const income = useMemo(() => 
    transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0), 
  [transactions])

  const expenses = useMemo(() => 
    transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0), 
  [transactions])

  const activeGoals = useMemo(() => 
    goals.filter(g => g.status === 'active').length, 
  [goals])

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
  }, [transactions])

  const incomeVsExpenseData = useMemo(() => [
    { name: 'Income', value: income },
    { name: 'Expenses', value: expenses }
  ].filter(d => d.value > 0), [income, expenses])

  const incomeVsExpenseTotal = income + expenses

  const dailyData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toISOString().split('T')[0]
    })
    return last7Days.map(date => {
      const dayTxns = transactions.filter(t => t.date === date)
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        income: dayTxns.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
        expenses: dayTxns.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
      }
    })
  }, [transactions])

  const categoryMap = useMemo(() => 
    categories.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {}), 
  [categories])

  const categoryData = useMemo(() => {
    return transactions
      .filter(t => t.amount < 0 && t.categoryId)
      .reduce((acc, t) => {
        const name = categoryMap[t.categoryId] || 'Other'
        const existing = acc.find(d => d.name === name)
        if (existing) {
          existing.amount += Math.abs(t.amount)
        } else {
          acc.push({ name, amount: Math.abs(t.amount) })
        }
        return acc
      }, [])
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
  }, [transactions, categoryMap])

  const accountData = useMemo(() => 
    accounts
      .filter(a => a.balance !== 0)
      .map(a => ({ name: a.name, value: a.balance }))
      .slice(0, 6), 
  [accounts])

  const monthlyData = useMemo(() => {
    return [...Array(6)].map((_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      const month = date.getMonth()
      const year = date.getFullYear()
      const monthTxns = transactions.filter(t => {
        const txnDate = new Date(t.date)
        return txnDate.getMonth() === month && txnDate.getFullYear() === year
      })
      return {
        name: date.toLocaleDateString('en-US', { month: 'short' }),
        income: monthTxns.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
        expenses: monthTxns.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
      }
    })
  }, [transactions])

  const savingsData = useMemo(() => 
    monthlyData.map(d => ({
      name: d.name,
      savings: d.income - d.expenses
    })).filter(d => d.savings !== 0), 
  [monthlyData])

  if (loading) return <DashboardSkeleton />

  return (
    <div>
      <Text size="xl" fw={700} mb="lg" style={{ fontSize: '1.5rem' }}>Dashboard</Text>
      
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        <StatCard label="Balance" value={totalBalance} icon={IconWallet} color="#475569" />
        <StatCard label="Income" value={income} icon={IconArrowUpRight} color="#10b981" />
        <StatCard label="Expenses" value={expenses} icon={IconArrowDownRight} color="#ef4444" />
        <StatCard label="Goals" value={activeGoals} icon={IconTarget} color="#d97706" prefix="" />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} mb="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={600} mb="md">Income vs Expenses</Text>
          {incomeVsExpenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={incomeVsExpenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {incomeVsExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? colors.success : colors.danger} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`$${value.toLocaleString()} (${incomeVsExpenseTotal > 0 ? ((value / incomeVsExpenseTotal) * 100).toFixed(0) : 0}%)`, name]}
                  contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span style={{ color: isDark ? '#e5e5e5' : '#1e293b', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Text c="dimmed" ta="center" py="xl">No data yet</Text>
          )}
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={600} mb="md">Last 7 Days</Text>
          {dailyData.some(d => d.income > 0 || d.expenses > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                <Tooltip 
                  cursor={false}
                  formatter={(value) => `$${value.toLocaleString()}`}
                  contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                />
                <Bar dataKey="income" name="Income" fill={colors.success} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill={colors.danger} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Text c="dimmed" ta="center" py="xl">No data yet</Text>
          )}
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} mb="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={600} mb="md">Balance by Account</Text>
          {accountData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={accountData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {accountData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `$${value.toLocaleString()}`}
                  contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span style={{ color: isDark ? '#e5e5e5' : '#1e293b', fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Text c="dimmed" ta="center" py="xl">No accounts yet</Text>
          )}
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder >>
          <Text fw={600} mb="md">Monthly Trend</Text>
          {monthlyData.some(d => d.income > 0 || d.expenses > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                <Tooltip 
                  formatter={(value) => `$${value.toLocaleString()}`}
                  contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                />
                <Line type="monotone" dataKey="income" name="Income" stroke={colors.success} strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="expenses" name="Expenses" stroke={colors.danger} strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Text c="dimmed" ta="center" py="xl">No data yet</Text>
          )}
        </Card>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2 }} mb="xl">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={600} mb="md">Monthly Savings</Text>
          {savingsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={savingsData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                <YAxis tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                <Tooltip 
                  formatter={(value) => `$${value.toLocaleString()}`}
                  contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                />
                <Bar dataKey="savings" name="Savings" fill={colors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Text c="dimmed" ta="center" py="xl">No savings data yet</Text>
          )}
        </Card>
      </SimpleGrid>

      <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
        <Text fw={600} mb="md">Recent Activity</Text>
        {recentTransactions.length > 0 ? (
          <Stack gap="sm">
            {recentTransactions.map((t) => (
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
      </Card>
    </div>
  )
}
