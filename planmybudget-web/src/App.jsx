import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { getToken, logout } from './api'
import { Skeleton } from '@mantine/core'
import { DashboardSkeleton } from './components/Skeletons'
import Login from './components/Login'
import Landing from './components/Landing'
import Navbar from './components/Navbar'
import { WhatsNewModal, checkForNewVersion } from './components/WhatsNew'

const Dashboard = lazy(() => import('./components/Dashboard'))
const Accounts = lazy(() => import('./components/Accounts'))
const Transactions = lazy(() => import('./components/Transactions'))
const Budgets = lazy(() => import('./components/Budgets'))
const Goals = lazy(() => import('./components/Goals'))
const Recurring = lazy(() => import('./components/Recurring'))
const Categories = lazy(() => import('./components/Categories'))
const Reminders = lazy(() => import('./components/Reminders'))
const Settings = lazy(() => import('./components/Settings'))

function PageLoader() {
  return (
    <div>
      <Skeleton height={32} width={150} mb="lg" />
      <DashboardSkeleton />
    </div>
  )
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const token = getToken()
    setIsAuthenticated(!!token)
    setLoading(false)
    
    if (token && checkForNewVersion()) {
      setShowWhatsNew(true)
    }
  }, [])

  const handleLogout = () => {
    logout()
    setIsAuthenticated(false)
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="app">
      {!isAuthenticated ? (
        <Routes>
          <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
          <Route path="/" element={<Landing onLogin={() => setIsAuthenticated(true)} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : (
        <>
          <Navbar onLogout={handleLogout} />
          <WhatsNewModal 
            opened={showWhatsNew} 
            onClose={() => setShowWhatsNew(false)} 
          />
          <main className="main-content">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/recurring" element={<Recurring />} />
                <Route path="/reminders" element={<Reminders />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </>
      )}
    </div>
  )
}

export default App
