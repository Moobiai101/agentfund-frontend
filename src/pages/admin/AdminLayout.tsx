import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { adminApi } from '../../lib/api'
import {
    Brain, LogOut, Activity,
    Loader2, Power,
    Play, LayoutDashboard, History
} from 'lucide-react'

interface SystemHealth {
    status: string
    database: string
    redis: string
    trading_halted: boolean
    environment: string
    trading_mode: string
}

export default function AdminLayout() {
    const { user, loading: authLoading, signOut } = useAuth()
    const navigate = useNavigate()
    const [health, setHealth] = useState<SystemHealth | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        if (!authLoading && !user) navigate('/admin/login')
    }, [user, authLoading, navigate])

    useEffect(() => {
        if (user) {
            fetchHealth()
            const interval = setInterval(fetchHealth, 10000)
            return () => clearInterval(interval)
        }
    }, [user])

    async function fetchHealth() {
        try {
            const healthData = await adminApi.getSystemHealth()
            setHealth(healthData as SystemHealth)
        } catch (error) {
            console.error('Failed to fetch health:', error)
        }
    }

    async function handleEmergencyHalt() {
        if (!confirm('⚠️ EMERGENCY HALT: Stop ALL trading immediately?')) return
        setActionLoading('halt')
        try {
            await adminApi.emergencyHalt()
            await fetchHealth()
        } finally {
            setActionLoading(null)
        }
    }

    async function handleResumeTrading() {
        if (!confirm('🟢 RESUME TRADING: Are you sure you want to resume?')) return
        setActionLoading('resume')
        try {
            await adminApi.resumeTrading()
            await fetchHealth()
        } finally {
            setActionLoading(null)
        }
    }

    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-slate-200 font-sans selection:bg-emerald-500/30">
            {/* Top Bar */}
            <header className="h-14 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-4 sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-emerald-900/30 border border-emerald-500/30 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-white hidden md:block">AGENT<span className="text-emerald-500">FUND</span> <span className="text-xs font-mono text-slate-500 ml-2">v1.2.0</span></h1>
                    </div>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1 ml-4 border-l border-slate-800 pl-4 h-8">
                        <NavLink
                            to="/admin"
                            end
                            className={({ isActive }) => `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </NavLink>
                        <NavLink
                            to="/admin/backtest"
                            className={({ isActive }) => `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-slate-800 text-purple-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}
                        >
                            <History className="w-4 h-4" />
                            Backtesting
                        </NavLink>
                    </nav>
                </div>

                <div className="flex items-center gap-4">
                    {health && (
                        <div className="hidden lg:flex items-center gap-4 text-xs font-mono border-r border-slate-800 pr-4">
                            <div className="flex items-center gap-1.5">
                                <Activity className={`w-3 h-3 ${health.status === 'healthy' ? 'text-emerald-500' : 'text-red-500'}`} />
                                <span className={health.status === 'healthy' ? 'text-emerald-400' : 'text-red-400'}>SYSTEM {health.status.toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">{health.trading_mode.toUpperCase()}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {health?.trading_halted ? (
                            <button
                                onClick={handleResumeTrading}
                                disabled={actionLoading === 'resume'}
                                className="h-8 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse"
                            >
                                {actionLoading === 'resume' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                                <span className="hidden sm:inline">RESUME</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleEmergencyHalt}
                                disabled={actionLoading === 'halt'}
                                className="h-8 px-3 rounded bg-red-900/20 border border-red-500/50 hover:bg-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all"
                            >
                                {actionLoading === 'halt' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Power className="w-3 h-3" />}
                                <span className="hidden sm:inline">HALT</span>
                            </button>
                        )}

                        <button onClick={signOut} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title="Sign Out">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="min-h-[calc(100vh-3.5rem)]">
                <Outlet />
            </main>
        </div>
    )
}
