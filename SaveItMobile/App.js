import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ScrollView, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'

const API_BASE = 'http://localhost:4000/api'

// API Functions
const getStoredToken = async () => AsyncStorage.getItem('saveit_token')
const setToken = async (t) => AsyncStorage.setItem('saveit_token', t)
const clearToken = async () => AsyncStorage.removeItem('saveit_token')

const api = async (path, options = {}) => {
  const token = await getStoredToken()
  const headers = options.headers || {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  headers['Content-Type'] = 'application/json'
  options.headers = headers
  const res = await axios.post(API_BASE + path, options.body, { headers }).catch(() => null)
  if (!res) return { data: { error: 'Network error' } }
  return res.data
}

const login = async (email, password) => {
  const res = await api('/users/login', { body: JSON.stringify({ email, password }) })
  if (res.token) await setToken(res.token)
  return res
}

// Colors
const colors = {
  iosBlue: '#007aff',
  iosGreen: '#34c759',
  iosRed: '#ff3b30',
  iosOrange: '#ff9500',
  iosBg: '#f2f2f7',
  iosCard: '#ffffff',
  iosText: '#000000',
  iosText2: '#3c3c43',
  iosText3: '#636366',
  iosText4: '#8e8e93',
  iosSeparator: '#c6c6c8',
}

// Login Screen
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('demo@saveit.app')
  const [password, setPassword] = useState('password')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      onLogin()
    } catch (e) {
      setError(e.message || 'Login failed')
    }
    setLoading(false)
  }

  return (
    <View style={styles.loginContainer}>
      <View style={styles.loginCard}>
        <Text style={styles.logo}>💰</Text>
        <Text style={styles.appName}>SaveIt</Text>
        <Text style={styles.appTagline}>Track your money with ease</Text>
        
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Demo: demo@saveit.app / password</Text>
      </View>
    </View>
  )
}

// Dashboard Screen
function DashboardScreen() {
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [accs, txns, gls] = await Promise.all([
        api('/accounts'),
        api('/transactions'),
        api('/goals')
      ])
      setAccounts(accs.accounts || [])
      setTransactions(txns.transactions || [])
      setGoals(gls.goals || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)
  const income = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const expenses = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const recentTxns = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.pageTitle}>Dashboard</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Balance</Text>
            <Text style={[styles.statValue, { color: colors.iosBlue }]}>${totalBalance.toLocaleString()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Income</Text>
            <Text style={[styles.statValue, { color: colors.iosGreen }]}>+${income.toLocaleString()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Expenses</Text>
            <Text style={[styles.statValue, { color: colors.iosRed }]}>-${expenses.toLocaleString()}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Goals</Text>
            <Text style={[styles.statValue, { color: colors.iosOrange }]}>{goals.filter(g => g.status === 'active').length}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.card}>
            {recentTxns.length > 0 ? recentTxns.map(t => (
              <View key={t.id} style={styles.txnRow}>
                <View>
                  <Text style={styles.txnDesc}>{t.description || 'Transaction'}</Text>
                  <Text style={styles.txnDate}>{new Date(t.date).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: t.amount >= 0 ? colors.iosGreen : colors.iosRed }]}>
                  {t.amount >= 0 ? '+' : ''}{t.amount.toFixed(2)}
                </Text>
              </View>
            )) : <Text style={styles.noData}>No transactions</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Goals</Text>
          <View style={styles.card}>
            {goals.slice(0, 3).map(g => (
              <View key={g.id} style={styles.goalItem}>
                <View style={styles.goalHeader}>
                  <Text style={styles.goalName}>{g.name}</Text>
                  <Text style={styles.goalProgress}>{Math.round(g.currentAmount / g.targetAmount * 100)}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBar, { width: `${Math.min(g.currentAmount / g.targetAmount * 100, 100)}%` }]} />
                </View>
              </View>
            ))}
            {goals.length === 0 && <Text style={styles.noData}>No goals</Text>}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// Accounts Screen
function AccountsScreen() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', type: 'checking' })

  useEffect(() => { loadAccounts() }, [])

  const loadAccounts = async () => {
    const res = await api('/accounts')
    setAccounts(res.accounts || [])
    setLoading(false)
  }

  const handleSubmit = async () => {
    await api('/accounts', { body: JSON.stringify(formData) })
    setFormData({ name: '', type: 'checking' })
    setShowForm(false)
    loadAccounts()
  }

  const handleDelete = async (id) => {
    Alert.alert('Delete', 'Delete this account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api(`/accounts/${id}`, { body: JSON.stringify({}) })
        loadAccounts()
      }}
    ])
  }

  const total = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0)

  const types = [
    { id: 'checking', icon: '🏦', label: 'Checking' },
    { id: 'savings', icon: '💵', label: 'Savings' },
    { id: 'credit', icon: '💳', label: 'Credit' },
    { id: 'investment', icon: '📈', label: 'Invest' },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Accounts</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addButtonText}>{showForm ? 'Cancel' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.card}>
          <Text style={styles.formLabel}>Account Type</Text>
          <View style={styles.typeGrid}>
            {types.map(t => (
              <TouchableOpacity key={t.id} style={[styles.typeBtn, formData.type === t.id && styles.typeBtnSelected]} onPress={() => setFormData({ ...formData, type: t.id })}>
                <Text style={styles.typeIcon}>{t.icon}</Text>
                <Text style={styles.typeLabel}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="Account Name" value={formData.name} onChangeText={v => setFormData({ ...formData, name: v })} />
          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
            <Text style={styles.primaryButtonText}>Add Account</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Balance</Text>
        <Text style={styles.totalAmount}>${total.toLocaleString()}</Text>
      </View>

      <FlatList
        data={accounts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.accountCard}>
            <Text style={styles.accountIcon}>{types.find(t => t.id === item.type)?.icon || '🏦'}</Text>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>{item.name}</Text>
              <Text style={styles.accountType}>{item.type}</Text>
            </View>
            <Text style={[styles.accountBalance, { color: item.balance >= 0 ? colors.iosGreen : colors.iosRed }]}>
              ${item.balance.toLocaleString()}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.noData}>No accounts</Text>}
      />
    </SafeAreaView>
  )
}

// Transactions Screen
function TransactionsScreen() {
  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [quickAmount, setQuickAmount] = useState('')
  const [quickType, setQuickType] = useState('expense')
  const [formData, setFormData] = useState({ accountId: '', date: new Date().toISOString().split('T')[0], amount: '', type: 'debit', description: '', categoryName: '' })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [txns, accs] = await Promise.all([api('/transactions'), api('/accounts')])
    setTransactions(txns.transactions || [])
    setAccounts(accs.accounts || [])
    if (accs.accounts?.length > 0) setFormData(prev => ({ ...prev, accountId: accs.accounts[0].id }))
    setLoading(false)
  }

  const handleQuickAdd = async () => {
    if (!quickAmount || !formData.accountId) return
    const amount = parseFloat(quickAmount)
    const type = quickType === 'expense' ? 'debit' : 'credit'
    await api('/transactions', { body: JSON.stringify({ accountId: formData.accountId, date: new Date().toISOString().split('T')[0], amount, type, description: quickType === 'expense' ? 'Expense' : 'Income' }) })
    setQuickAmount('')
    loadData()
  }

  const handleSubmit = async () => {
    await api('/transactions', { body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount) }) })
    setFormData({ accountId: accounts[0]?.id || '', date: new Date().toISOString().split('T')[0], amount: '', type: 'debit', description: '', categoryName: '' })
    setShowForm(false)
    loadData()
  }

  const handleDelete = async (id) => {
    Alert.alert('Delete', 'Delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api(`/transactions/${id}`, { body: JSON.stringify({}) })
        loadData()
      }}
    ])
  }

  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Activity</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addButtonText}>{showForm ? 'Done' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>

      {accounts.length > 0 && (
        <View style={styles.quickAddBar}>
          <View style={styles.typeToggle}>
            <TouchableOpacity style={[styles.typeToggleBtn, quickType === 'expense' && styles.typeToggleBtnActive]} onPress={() => setQuickType('expense')}>
              <Text style={[styles.typeToggleText, quickType === 'expense' && styles.typeToggleTextActive]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.typeToggleBtn, quickType === 'income' && styles.typeToggleBtnActive]} onPress={() => setQuickType('income')}>
              <Text style={[styles.typeToggleText, quickType === 'income' && styles.typeToggleTextActive]}>Income</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={styles.quickInput} placeholder="0.00" value={quickAmount} onChangeText={setQuickAmount} keyboardType="numeric" />
          <TouchableOpacity style={styles.primaryButton} onPress={handleQuickAdd}><Text style={styles.primaryButtonText}>Add</Text></TouchableOpacity>
        </View>
      )}

      {showForm && (
        <View style={styles.card}>
          <View style={styles.formRow}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Amount" value={formData.amount} onChangeText={v => setFormData({ ...formData, amount: v })} keyboardType="numeric" />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Description" value={formData.description} onChangeText={v => setFormData({ ...formData, description: v })} />
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}><Text style={styles.primaryButtonText}>Add Transaction</Text></TouchableOpacity>
        </View>
      )}

      <FlatList
        data={sorted}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.txnCard}>
            <View>
              <Text style={styles.txnDesc}>{item.description || 'Transaction'}</Text>
              <Text style={styles.txnDate}>{new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.txnRight}>
              <Text style={[styles.txnAmount, { color: item.amount >= 0 ? colors.iosGreen : colors.iosRed }]}>
                {item.amount >= 0 ? '+' : ''}{item.amount.toFixed(2)}
              </Text>
              <TouchableOpacity onPress={() => handleDelete(item.id)}><Text style={styles.deleteBtn}>×</Text></TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.noData}>No transactions</Text>}
      />
    </SafeAreaView>
  )
}

// Budgets Screen
function BudgetsScreen() {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), lines: [{ categoryName: '', amount: '' }] })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const res = await api('/budgets')
    setBudgets(res.budgets || [])
    setLoading(false)
  }

  const handleSubmit = async () => {
    const lines = formData.lines.map(l => ({ categoryId: l.categoryName, amount: parseFloat(l.amount) || 0 }))
    await api('/budgets', { body: JSON.stringify({ ...formData, lines }) })
    setFormData({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), lines: [{ categoryName: '', amount: '' }] })
    setShowForm(false)
    loadData()
  }

  const handleDelete = async (id) => {
    Alert.alert('Delete', 'Delete this budget?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api(`/budgets/${id}`, { body: JSON.stringify({}) })
        loadData()
      }}
    ])
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Budget</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addButtonText}>{showForm ? 'Cancel' : '+ New'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.card}>
          <View style={styles.formRow}>
            <TouchableOpacity style={[styles.input, { flex: 1 }]} onPress={() => {}}>
              <Text>{months[formData.month - 1]}</Text>
            </TouchableOpacity>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Year" value={formData.year.toString()} onChangeText={v => setFormData({ ...formData, year: parseInt(v) })} keyboardType="numeric" />
          </View>
          {formData.lines.map((line, i) => (
            <View key={i} style={styles.formRow}>
              <TextInput style={[styles.input, { flex: 2 }]} placeholder="Category" value={line.categoryName} onChangeText={v => {
                const lines = [...formData.lines]
                lines[i].categoryName = v
                setFormData({ ...formData, lines })
              }} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Amount" value={line.amount} onChangeText={v => {
                const lines = [...formData.lines]
                lines[i].amount = v
                setFormData({ ...formData, lines })
              }} keyboardType="numeric" />
            </View>
          ))}
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setFormData({ ...formData, lines: [...formData.lines, { categoryName: '', amount: '' }] })}>
            <Text style={styles.secondaryButtonText}>+ Add Category</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}><Text style={styles.primaryButtonText}>Create Budget</Text></TouchableOpacity>
        </View>
      )}

      <FlatList
        data={budgets}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const total = item.lines.reduce((sum, l) => sum + (l.amount || 0), 0)
          return (
            <View style={styles.budgetCard}>
              <View style={styles.budgetHeader}>
                <Text style={styles.budgetPeriod}>{months[item.month - 1]} {item.year}</Text>
                <Text style={styles.budgetTotal}>${total.toLocaleString()}</Text>
              </View>
              {item.lines.map((line, i) => (
                <View key={i} style={styles.budgetLine}>
                  <Text>{line.categoryId}</Text>
                  <Text>${(line.amount || 0).toLocaleString()}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteButtonText}>Delete Budget</Text>
              </TouchableOpacity>
            </View>
          )
        }}
        ListEmptyComponent={<Text style={styles.noData}>No budgets</Text>}
      />
    </SafeAreaView>
  )
}

// Goals Screen
function GoalsScreen() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', targetAmount: '' })

  useEffect(() => { loadGoals() }, [])

  const loadGoals = async () => {
    const res = await api('/goals')
    setGoals(res.goals || [])
    setLoading(false)
  }

  const handleSubmit = async () => {
    await api('/goals', { body: JSON.stringify({ name: formData.name, targetAmount: parseFloat(formData.targetAmount) }) })
    setFormData({ name: '', targetAmount: '' })
    setShowForm(false)
    loadGoals()
  }

  const handleAddFunds = async (goalId, amount) => {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return
    await api(`/goals/${goalId}`, { body: JSON.stringify({ currentAmount: goal.currentAmount + amount }) })
    loadGoals()
  }

  const handleDelete = async (id) => {
    Alert.alert('Delete', 'Delete this goal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await api(`/goals/${id}`, { body: JSON.stringify({}) })
        loadGoals()
      }}
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Goals</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addButtonText}>{showForm ? 'Cancel' : '+ New'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="Goal Name" value={formData.name} onChangeText={v => setFormData({ ...formData, name: v })} />
          <TextInput style={styles.input} placeholder="Target Amount" value={formData.targetAmount} onChangeText={v => setFormData({ ...formData, targetAmount: v })} keyboardType="numeric" />
          <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}><Text style={styles.primaryButtonText}>Create Goal</Text></TouchableOpacity>
        </View>
      )}

      <FlatList
        data={goals}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const progress = (item.currentAmount / item.targetAmount) * 100
          const remaining = item.targetAmount - item.currentAmount
          return (
            <View style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>{item.name}</Text>
                <Text style={styles.goalStatus}>{progress >= 100 ? '✓ Done' : 'Active'}</Text>
              </View>
              <Text style={styles.goalAmount}>${item.currentAmount.toLocaleString()} / ${item.targetAmount.toLocaleString()}</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%`, background: progress >= 100 ? colors.iosGreen : colors.iosBlue }]} />
              </View>
              <View style={styles.goalActions}>
                <TouchableOpacity style={styles.fundBtn} onPress={() => handleAddFunds(item.id, 50)}><Text style={styles.fundBtnText}>+$50</Text></TouchableOpacity>
                <TouchableOpacity style={styles.fundBtn} onPress={() => handleAddFunds(item.id, 100)}><Text style={styles.fundBtnText}>+$100</Text></TouchableOpacity>
                {remaining > 0 && <TouchableOpacity style={styles.fundBtn} onPress={() => handleAddFunds(item.id, remaining)}><Text style={styles.fundBtnText}>Finish</Text></TouchableOpacity>}
              </View>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )
        }}
        ListEmptyComponent={<Text style={styles.noData}>No goals</Text>}
      />
    </SafeAreaView>
  )
}

// Main App
const Tab = createBottomTabNavigator()

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    getStoredToken().then(token => {
      if (token) setIsAuthenticated(true)
    })
  }, [])

  const handleLogout = async () => {
    await clearToken()
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLogin={() => setIsAuthenticated(true)} />
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.iosBlue,
            tabBarInactiveTintColor: colors.iosText4,
            tabBarStyle: { backgroundColor: colors.iosCard, borderTopColor: colors.iosSeparator },
          }}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Home' }} />
          <Tab.Screen name="Accounts" component={AccountsScreen} />
          <Tab.Screen name="Activity" component={TransactionsScreen} />
          <Tab.Screen name="Budget" component={BudgetsScreen} />
          <Tab.Screen name="Goals" component={GoalsScreen} />
        </Tab.Navigator>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.iosBg,
  },
  loginContainer: {
    flex: 1,
    backgroundColor: colors.iosCard,
    justifyContent: 'center',
    padding: 20,
  },
  loginCard: {
    alignItems: 'center',
  },
  logo: {
    fontSize: 60,
    marginBottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.iosBlue,
  },
  appTagline: {
    fontSize: 15,
    color: colors.iosText4,
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    color: colors.iosRed,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.iosBg,
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.iosSeparator,
  },
  primaryButton: {
    backgroundColor: colors.iosBlue,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: colors.iosBg,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: colors.iosBlue,
    fontSize: 15,
    fontWeight: '500',
  },
  hint: {
    color: colors.iosText4,
    fontSize: 13,
    marginTop: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    padding: 16,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  addButton: {
    padding: 8,
  },
  addButtonText: {
    color: colors.iosBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statCard: {
    backgroundColor: colors.iosCard,
    padding: 16,
    borderRadius: 12,
    width: '48%',
    margin: '1%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.iosText4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.iosCard,
    padding: 16,
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  totalCard: {
    backgroundColor: colors.iosBlue,
    padding: 20,
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: 'white',
    fontSize: 16,
    opacity: 0.9,
  },
  totalAmount: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  accountCard: {
    backgroundColor: colors.iosCard,
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  accountIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountType: {
    fontSize: 13,
    color: colors.iosText4,
    textTransform: 'capitalize',
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '600',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.iosText3,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  typeBtn: {
    width: '25%',
    alignItems: 'center',
    padding: 8,
  },
  typeBtnSelected: {},
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 11,
    color: colors.iosText3,
  },
  quickAddBar: {
    backgroundColor: colors.iosCard,
    padding: 12,
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.iosBg,
    borderRadius: 8,
    padding: 2,
  },
  typeToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  typeToggleBtnActive: {
    backgroundColor: colors.iosCard,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  typeToggleText: {
    fontSize: 13,
    color: colors.iosText4,
    fontWeight: '600',
  },
  typeToggleTextActive: {
    color: colors.iosText,
  },
  quickInput: {
    flex: 1,
    backgroundColor: colors.iosBg,
    padding: 10,
    borderRadius: 8,
    fontSize: 15,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.iosSeparator,
  },
  txnCard: {
    backgroundColor: colors.iosCard,
    padding: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  txnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.iosSeparator,
  },
  txnDesc: {
    fontSize: 15,
    fontWeight: '500',
  },
  txnDate: {
    fontSize: 12,
    color: colors.iosText4,
  },
  txnRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteBtn: {
    fontSize: 20,
    color: colors.iosText4,
    padding: 4,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  budgetCard: {
    backgroundColor: colors.iosCard,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  budgetPeriod: {
    fontSize: 16,
    fontWeight: '600',
  },
  budgetTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.iosBlue,
  },
  budgetLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.iosSeparator,
  },
  goalCard: {
    backgroundColor: colors.iosCard,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  goalStatus: {
    fontSize: 13,
    color: colors.iosGreen,
    fontWeight: '500',
  },
  goalAmount: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.iosSeparator,
    borderRadius: 4,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  fundBtn: {
    flex: 1,
    backgroundColor: colors.iosBg,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  fundBtnText: {
    color: colors.iosBlue,
    fontWeight: '600',
    fontSize: 14,
  },
  goalItem: {
    marginBottom: 12,
  },
  goalName: {
    fontWeight: '500',
  },
  goalProgress: {
    fontSize: 13,
    color: colors.iosText4,
  },
  deleteButton: {
    padding: 10,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.iosRed,
    fontSize: 14,
    fontWeight: '500',
  },
  noData: {
    textAlign: 'center',
    color: colors.iosText4,
    padding: 32,
  },
  logoutBtn: {
    position: 'absolute',
    top: 50,
    right: 16,
    padding: 8,
  },
  logoutBtnText: {
    color: colors.iosBlue,
    fontSize: 14,
  },
})
