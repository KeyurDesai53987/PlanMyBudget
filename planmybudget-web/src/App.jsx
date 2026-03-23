import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { getToken, logout } from './api'
import Login from './components/Login'
import Landing from './components/Landing'
import Dashboard from './components/Dashboard'
import Accounts from './components/Accounts'
import Transactions from './components/Transactions'
import Budgets from './components/Budgets'
import Goals from './components/Goals'
import Recurring from './components/Recurring'
import Categories from './components/Categories'
import Settings from './components/Settings'
import Navbar from './components/Navbar'
import { WhatsNewModal, checkForNewVersion } from './components/WhatsNew'

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
          <main className="main-content" key={location.pathname}>
            <div className="page-enter-active">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/goals" element={<Goals />} />
                <Route path="/recurring" element={<Recurring />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </>
      )}
    </div>
  )
}

export default App
