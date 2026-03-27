import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, Group, Text, Stack, SimpleGrid, useMantineColorScheme } from '@mantine/core'
import { IconArrowUpRight, IconArrowDownRight, IconWallet, IconTarget, IconPigMoney, IconTrendingUp } from '@tabler/icons-react'
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

  const totalSavings = useMemo(() => 
    income - expenses, 
  [income, expenses])

  const thisMonth = useMemo(() => {
    const now = new Date()
    const monthTxns = transactions.filter(t => {
      const txnDate = new Date(t.date)
      return txnDate.getMonth() === now.getMonth() && txnDate.getFullYear() === now.getFullYear()
    })
    const monthIncome = monthTxns.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const monthExpenses = monthTxns.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
    return {
      income: monthIncome,
      expenses: monthExpenses,
      savings: monthIncome - monthExpenses
    }
  }, [transactions])

  const goalSavings = useMemo(() => 
    goals.map(g => ({
      name: g.name,
      current: g.currentAmount || 0,
      target: g.targetAmount || 0,
      progress: g.targetAmount ? ((g.currentAmount || 0) / g.targetAmount) * 100 : 0
    })),
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
        <StatCard label="Savings" value={totalSavings} icon={IconPigMoney} color={totalSavings >= 0 ? '#10b981' : '#ef4444'} />
      </SimpleGrid>

      <Card shadow="sm" padding="lg" radius="md" withBorder mb="xl">
        <Text fw={600} mb="md">This Month ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})</Text>
        <SimpleGrid cols={{ base: 3, sm: 3 }}>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Text size="xs" tt="uppercase" fw={600} c="dimmed">Income</Text>
            <Text size="lg" fw={700} c="#10b981">${thisMonth.income.toLocaleString()}</Text>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Text size="xs" tt="uppercase" fw={600} c="dimmed">Spent</Text>
            <Text size="lg" fw={700} c="#ef4444">-${thisMonth.expenses.toLocaleString()}</Text>
          </Card>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Text size="xs" tt="uppercase" fw={600} c="dimmed">Saved</Text>
            <Text size="lg" fw={700} c={thisMonth.savings >= 0 ? '#10b981' : '#ef4444'}>
              ${thisMonth.savings.toLocaleString()}
            </Text>
          </Card>
        </SimpleGrid>
      </Card>

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

        <Card shadow="sm" padding="lg" radius="md" withBorder >
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

      {goalSavings.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
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
                  height: 8, 
                  background: isDark ? '#334155' : '#e2e8f0', 
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${Math.min(goal.progress, 100)}%`,
                    background: goal.progress >= 100 ? colors.success : colors.primary,
                    borderRadius: 4,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <Text size="xs" c="dimmed" mt={4}>
                  {goal.progress >= 100 ? '🎉 Goal reached!' : `$${(goal.target - goal.current).toLocaleString()} remaining`}
                </Text>
              </div>
            ))}
          </Stack>
        </Card>
      )}

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
