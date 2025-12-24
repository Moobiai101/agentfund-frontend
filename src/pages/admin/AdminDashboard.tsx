import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { adminApi } from '../../lib/api'
import {
    Brain, LogOut, Shield, Activity, AlertTriangle,
    CheckCircle2, XCircle, Clock, Loader2, Power,
    Settings, List
} from 'lucide-react'
import { RiskConfigPanel } from './RiskConfigPanel'
import { PositionsTable } from './PositionsTable'

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
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/admin/login')
        }
    }, [user, authLoading, navigate])

    useEffect(() => {
        if (user) {
            fetchData()
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
        } finally {
            setLoading(false)
        }
    }

    async function handleEmergencyHalt() {
        if (!confirm('⚠️ EMERGENCY HALT: This will stop ALL trading immediately. Continue?')) {
            return
        }
        setActionLoading('halt')
        try {
            await adminApi.emergencyHalt()
            await fetchData()
        } finally {
            setActionLoading(null)
        }
    }

    async function handleApprove(id: string) {
        setActionLoading(id)
        try {
            await adminApi.approveEvolution(id)
            await fetchData()
        } finally {
            setActionLoading(null)
        }
    }

    async function handleReject(id: string) {
        setActionLoading(id)
        try {
            await adminApi.rejectEvolution(id)
            await fetchData()
        } finally {
            setActionLoading(null)
        }
    }

    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Header */}
            <header className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                            <p className="text-xs text-slate-400">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={signOut}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* System Health */}
                <section className="mb-8">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-400" />
                        System Health
                    </h2>

                    {loading ? (
                        <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6">
                            <div className="animate-pulse flex gap-4">
                                <div className="h-20 w-32 bg-slate-800 rounded-lg" />
                                <div className="h-20 w-32 bg-slate-800 rounded-lg" />
                                <div className="h-20 w-32 bg-slate-800 rounded-lg" />
                            </div>
                        </div>
                    ) : health ? (
                        <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6">
                            <div className="flex flex-wrap gap-6 mb-6">
                                <StatusBadge
                                    label="Overall"
                                    status={health.status}
                                    icon={<Activity className="w-4 h-4" />}
                                />
                                <StatusBadge
                                    label="Database"
                                    status={health.database}
                                    icon={<CheckCircle2 className="w-4 h-4" />}
                                />
                                <StatusBadge
                                    label="Redis"
                                    status={health.redis}
                                    icon={<CheckCircle2 className="w-4 h-4" />}
                                />
                                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50">
                                    <span className="text-sm text-slate-400">Mode:</span>
                                    <span className="text-sm font-medium text-white uppercase">
                                        {health.trading_mode}
                                    </span>
                                </div>
                            </div>

                            {health.trading_halted ? (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-400" />
                                    <span className="text-red-400 font-medium">Trading is HALTED</span>
                                </div>
                            ) : (
                                <button
                                    onClick={handleEmergencyHalt}
                                    disabled={actionLoading === 'halt'}
                                    className="px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {actionLoading === 'halt' ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Power className="w-5 h-5" />
                                    )}
                                    Emergency Halt
                                </button>
                            )}
                        </div>
                    ) : null}
                </section>

                {/* Risk & Positions Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <section>
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5 text-emerald-400" />
                            Risk Configuration
                        </h2>
                        <RiskConfigPanel />
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <List className="w-5 h-5 text-emerald-400" />
                            Active Positions
                        </h2>
                        <PositionsTable />
                    </section>
                </div>

                {/* Evolution Proposals */}
                <section>
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-emerald-400" />
                        Evolution Proposals ({proposals.length})
                    </h2>

                    <div className="space-y-4">
                        {proposals.map((proposal) => (
                            <div
                                key={proposal.id}
                                className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-6"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-sm font-medium text-emerald-400">
                                                {proposal.strategy_id}
                                            </span>
                                            <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400">
                                                {proposal.proposal_type}
                                            </span>
                                        </div>
                                        <p className="text-white mb-2">{proposal.description}</p>
                                        <p className="text-sm text-slate-400">
                                            Expected improvement: {(proposal.expected_improvement * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleApprove(proposal.id)}
                                            disabled={actionLoading === proposal.id}
                                            className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                            title="Approve"
                                        >
                                            {actionLoading === proposal.id ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-5 h-5" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleReject(proposal.id)}
                                            disabled={actionLoading === proposal.id}
                                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                            title="Reject"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {proposals.length === 0 && !loading && (
                            <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-8 text-center text-slate-500">
                                No pending evolution proposals
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}

function StatusBadge({ label, status, icon }: { label: string; status: string; icon: React.ReactNode }) {
    const isHealthy = status === 'healthy' || status === 'connected'
    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isHealthy ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
            {icon}
            <span className="text-sm font-medium">{label}: {status}</span>
        </div>
    )
}
