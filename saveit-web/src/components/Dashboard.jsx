import { useState, useEffect } from 'react'
import { Card, Group, Text, Stack, SimpleGrid, Progress, Loader, Center, useMantineColorScheme } from '@mantine/core'
import { IconArrowUpRight, IconArrowDownRight, IconWallet, IconTarget } from '@tabler/icons-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { api } from '../api'
import { colors } from '../theme'

const COLORS = [colors.primary, colors.success, colors.danger, colors.warning, colors.purple, colors.cyan]

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card shadow="sm" padding="md" radius="md" withBorder>
      <Group justify="space-between" align="flex-start">
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text size="xs" tt="uppercase" fw={600} c="dimmed">{label}</Text>
          <Text size="lg" fw={700} style={{ fontSize: '1.1rem', wordBreak: 'break-word' }}>{value}</Text>
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
}

export default function Dashboard() {
  const { colorScheme } = useMantineColorScheme()
  const isDark = colorScheme === 'dark'
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [accs, txns, gls] = await Promise.all([api('/accounts'), api('/transactions'), api('/goals')])
      setAccounts(accs.accounts || [])
      setTransactions(txns.transactions || [])
      setGoals(gls.goals || [])
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
  const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const recentTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.date)
    const dateB = new Date(b.date)
    if (isNaN(dateA.getTime())) return 1
    if (isNaN(dateB.getTime())) return -1
    return dateB - dateA
  }).slice(0, 5)

  const incomeVsExpenseData = [
    { name: 'Income', value: income },
    { name: 'Expenses', value: expenses }
  ].filter(d => d.value > 0)

  const last7Days = [...Array(7)].map((_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split('T')[0]
  })

  const dailyData = last7Days.map(date => {
    const dayTxns = transactions.filter(t => t.date === date)
    const dayIncome = dayTxns.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
    const dayExp = dayTxns.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)
    return {
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      income: dayIncome,
      expenses: dayExp
    }
  })

  const categoryData = transactions
    .filter(t => t.amount < 0 && t.description)
    .reduce((acc, t) => {
      const desc = t.description || 'Other'
      const existing = acc.find(d => d.name === desc)
      if (existing) {
        existing.amount += Math.abs(t.amount)
      } else {
        acc.push({ name: desc, amount: Math.abs(t.amount) })
      }
      return acc
    }, [])
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  const incomeCategoryData = transactions
    .filter(t => t.amount > 0 && t.description)
    .reduce((acc, t) => {
      const desc = t.description || 'Other'
      const existing = acc.find(d => d.name === desc)
      if (existing) {
        existing.amount += t.amount
      } else {
        acc.push({ name: desc, amount: t.amount })
      }
      return acc
    }, [])
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  if (loading) return (
    <Center h={400}>
      <Loader color="gray" />
    </Center>
  )

  return (
    <div>
      <Text size="xl" fw={700} mb="lg" style={{ fontSize: '1.5rem' }}>Dashboard</Text>
      
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        <StatCard label="Balance" value={`$${totalBalance.toLocaleString()}`} icon={IconWallet} color="#475569" />
        <StatCard label="Income" value={`+$${income.toLocaleString()}`} icon={IconArrowUpRight} color="#10b981" />
        <StatCard label="Expenses" value={`-$${expenses.toLocaleString()}`} icon={IconArrowDownRight} color="#ef4444" />
        <StatCard label="Goals" value={goals.filter(g => g.status === 'active').length} icon={IconTarget} color="#d97706" />
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
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                  label={false}
                >
                  {incomeVsExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? colors.success : colors.danger} />
                  ))}
                </Pie>
                <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 24, fontWeight: 700, fill: isDark ? '#e5e5e5' : '#1e293b' }}>
                  {incomeVsExpenseData.length > 0 ? `${(incomeVsExpenseData[0].value / incomeVsExpenseData.reduce((a, b) => a + b.value, 0) * 100).toFixed(0)}%` : '0%'}
                </text>
                  {incomeVsExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? colors.success : colors.danger} />
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
            <Text c="dimmed" ta="center" py="xl">No data yet</Text>
          )}
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={600} mb="md">Last 7 Days</Text>
          {dailyData.some(d => d.income > 0 || d.expenses > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
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

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={600} mb="md">Spending by Category</Text>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                <Tooltip 
                  cursor={false}
                  formatter={(value) => `$${value.toLocaleString()}`}
                  contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                />
                <Bar dataKey="amount" fill={colors.danger} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Text c="dimmed" ta="center" py="xl">No expenses yet</Text>
          )}
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text fw={600} mb="md">Earnings by Category</Text>
          {incomeCategoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={incomeCategoryData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 12 }} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} stroke={isDark ? '#a1a1aa' : '#64748b'} />
                <Tooltip 
                  cursor={false}
                  formatter={(value) => `$${value.toLocaleString()}`}
                  contentStyle={{ background: isDark ? '#252525' : '#fff', border: 'none', borderRadius: '8px' }}
                  itemStyle={{ color: isDark ? '#e5e5e5' : '#1e293b' }}
                />
                <Bar dataKey="amount" fill={colors.success} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Text c="dimmed" ta="center" py="xl">No earnings yet</Text>
          )}
        </Card>
      </SimpleGrid>

      <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
        <Text fw={600} mb="md">Recent Activity</Text>
        {recentTransactions.length > 0 ? (
          <Stack gap="sm">
            {recentTransactions.map(t => (
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
