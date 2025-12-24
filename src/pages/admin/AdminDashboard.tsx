import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { adminApi } from '../../lib/api'
import {
    Brain, LogOut, Shield, Activity,
    CheckCircle2, XCircle, Clock, Loader2, Power,
    Play, Server, Database
} from 'lucide-react'
import { RiskConfigPanel } from './RiskConfigPanel'
import { PositionsTable } from './PositionsTable'
import { LiveAgentFeed } from '../../components/LiveAgentFeed'

interface SystemHealth {
    status: string
    database: string
    redis: string
    trading_halted: boolean
    environment: string
    trading_mode: string
}

interface EvolutionProposal {
    id: string
    strategy_id: string
    proposal_type: string
    description: string
    expected_improvement: number
    status: string
    created_at: string
}

export default function AdminDashboard() {
    const { user, loading: authLoading, signOut } = useAuth()
    const navigate = useNavigate()
    const [health, setHealth] = useState<SystemHealth | null>(null)
    const [proposals, setProposals] = useState<EvolutionProposal[]>([])
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        if (!authLoading && !user) navigate('/admin/login')
    }, [user, authLoading, navigate])

    useEffect(() => {
        if (user) {
            fetchData()
            const interval = setInterval(fetchData, 10000) // Poll health every 10s
            return () => clearInterval(interval)
        }
    }, [user])

    async function fetchData() {
        try {
            const [healthData, proposalsData] = await Promise.all([
                adminApi.getSystemHealth(),
                adminApi.getEvolutionProposals(),
            ])
            setHealth(healthData as SystemHealth)
            setProposals((proposalsData as { proposals: EvolutionProposal[] }).proposals || [])
        } catch (error) {
            console.error('Failed to fetch admin data:', error)
        }
    }

    async function handleEmergencyHalt() {
        if (!confirm('⚠️ EMERGENCY HALT: Stop ALL trading immediately?')) return
        setActionLoading('halt')
        try {
            await adminApi.emergencyHalt()
            await fetchData()
        } finally {
            setActionLoading(null)
        }
    }

    async function handleResumeTrading() {
        if (!confirm('🟢 RESUME TRADING: Are you sure you want to resume?')) return
        setActionLoading('resume')
        try {
            await adminApi.resumeTrading()
            await fetchData()
        } finally {
            setActionLoading(null)
        }
    }

    async function handleEvolutionAction(id: string, action: 'approve' | 'reject') {
        setActionLoading(id)
        try {
            if (action === 'approve') await adminApi.approveEvolution(id)
            else await adminApi.rejectEvolution(id)
            await fetchData()
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
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-emerald-900/30 border border-emerald-500/30 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h1 className="text-lg font-bold tracking-tight text-white">AGENT<span className="text-emerald-500">FUND</span> <span className="text-xs font-mono text-slate-500 ml-2">v1.2.0 • {health?.environment.toUpperCase()}</span></h1>
                </div>

                <div className="flex items-center gap-4">
                    {/* Status Indicators */}
                    {health && (
                        <div className="hidden md:flex items-center gap-4 text-xs font-mono border-r border-slate-800 pr-4">
                            <div className="flex items-center gap-1.5">
                                <Activity className={`w-3 h-3 ${health.status === 'healthy' ? 'text-emerald-500' : 'text-red-500'}`} />
                                <span className={health.status === 'healthy' ? 'text-emerald-400' : 'text-red-400'}>SYSTEM {health.status.toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Database className="w-3 h-3" />
                                <span>DB: {health.database.toUpperCase()}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Server className="w-3 h-3" />
                                <span>REDIS: {health.redis.toUpperCase()}</span>
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
                                RESUME TRADING
                            </button>
                        ) : (
                            <button
                                onClick={handleEmergencyHalt}
                                disabled={actionLoading === 'halt'}
                                className="h-8 px-3 rounded bg-red-900/20 border border-red-500/50 hover:bg-red-500/20 text-red-500 text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all"
                            >
                                {actionLoading === 'halt' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Power className="w-3 h-3" />}
                                HALT SYSTEM
                            </button>
                        )}

                        <button onClick={signOut} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Layout - Bento Grid */}
            <main className="p-4 max-w-[1920px] mx-auto grid grid-cols-12 gap-4 h-[calc(100vh-3.5rem)]">

                {/* Left Column: Risk Config (3 cols) */}
                <div className="col-span-12 xl:col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
                    <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-1">
                        <RiskConfigPanel />
                    </div>

                    {/* Evolution Proposals (Mini) */}
                    <div className="bg-slate-900/30 border border-slate-800 rounded-lg flex-1 flex flex-col min-h-[300px]">
                        <div className="p-3 border-b border-slate-800 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-semibold text-slate-200">Evolution Proposals</span>
                            <span className="ml-auto text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">{proposals.length}</span>
                        </div>
                        <div className="p-3 space-y-3 overflow-y-auto flex-1">
                            {proposals.length === 0 ? (
                                <div className="text-center py-8 text-slate-600 text-xs italic">No active proposals</div>
                            ) : (
                                proposals.map(p => (
                                    <div key={p.id} className="bg-black border border-slate-800 p-3 rounded hover:border-slate-600 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-mono text-purple-400">{p.strategy_id}</span>
                                            <span className="text-[10px] text-slate-500">{new Date(p.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs text-slate-300 mb-2 leading-relaxed">{p.description}</p>
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/50">
                                            <span className="text-[10px] text-emerald-500">+{p.expected_improvement}% yield</span>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleEvolutionAction(p.id, 'approve')} className="p-1 hover:bg-emerald-900/30 rounded text-emerald-500"><CheckCircle2 className="w-3 h-3" /></button>
                                                <button onClick={() => handleEvolutionAction(p.id, 'reject')} className="p-1 hover:bg-red-900/30 rounded text-red-500"><XCircle className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Center Column: Live Feed & Chart placeholder (6 cols) */}
                <div className="col-span-12 xl:col-span-6 flex flex-col gap-4 h-full">
                    {/* Placeholder for future Chart */}
                    {/* <div className="h-1/3 bg-slate-900/30 border border-slate-800 rounded-lg flex items-center justify-center text-slate-600 text-sm font-mono border-dashed">
                        MARKET PERFORMANCE CHART
                    </div> */}

                    {/* Live Agent Terminal */}
                    <div className="flex-1 min-h-0">
                        <LiveAgentFeed />
                    </div>
                </div>

                {/* Right Column: Positions (3 cols) */}
                <div className="col-span-12 xl:col-span-3 flex flex-col h-full bg-slate-900/30 border border-slate-800 rounded-lg overflow-hidden">
                    <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                        <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-semibold text-slate-200">Active Positions</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto relative">
                        {/* We rely on PositionsTable internal scrolling or wrap it effectively */}
                        <div className="absolute inset-0">
                            <PositionsTable />
                        </div>
                    </div>
                </div>

            </main>
        </div>
    )
}

