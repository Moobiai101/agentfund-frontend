import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import PublicDashboard from './pages/PublicDashboard'
import AdminLayout from './pages/admin/AdminLayout'
import DashboardOverview from './pages/admin/DashboardOverview'
import BacktestDashboard from './pages/admin/backtest/BacktestDashboard'
import BacktestResults from './pages/admin/backtest/BacktestResults'
import AdminLogin from './pages/admin/Login'
import { AuthProvider } from './contexts/AuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicDashboard />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="backtest" element={<BacktestDashboard />} />
            <Route path="backtest/:id" element={<BacktestResults />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
