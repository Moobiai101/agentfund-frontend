import { useEffect, useState } from 'react'
import { adminApi, type PortfolioStats } from '../../lib/api'
import {
    Clock, CheckCircle2, XCircle, Loader2,
    TrendingUp, TrendingDown, Wallet, Shield
} from 'lucide-react'
import { RiskConfigPanel } from './RiskConfigPanel'
import { PositionsTable } from './PositionsTable'
import { LiveAgentFeed } from '../../components/LiveAgentFeed'

interface EvolutionProposal {
    id: string
    strategy_id: string
    proposal_type: string
    description: string
    expected_improvement: number
    status: string
    created_at: string
}

interface SystemHealth {
    status: string
    database: string
    redis: string
    trading_halted: boolean
    environment: string
    trading_mode: string
}

export default function DashboardOverview() {
    const [proposals, setProposals] = useState<EvolutionProposal[]>([])
    const [portfolio, setPortfolio] = useState<PortfolioStats | null>(null)
    const [health, setHealth] = useState<SystemHealth | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 10000)
        return () => clearInterval(interval)
    }, [])

    async function fetchData() {
        try {
            const [healthData, proposalsData, portfolioData] = await Promise.all([
                adminApi.getSystemHealth(),
                adminApi.getEvolutionProposals(),
                adminApi.getPortfolio(),
            ])
            setHealth(healthData as SystemHealth)
            setProposals((proposalsData as { proposals: EvolutionProposal[] }).proposals || [])
            setPortfolio(portfolioData)
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error)
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

    // Format currency in Indian Rupees
    const formatINR = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount)
    }

    return (
        <div className="p-4 max-w-[1920px] mx-auto grid grid-cols-12 gap-4 h-[calc(100vh-3.5rem)]">
            {/* Left Column: Portfolio Stats + Risk Config (3 cols) */}
            <div className="col-span-12 xl:col-span-3 flex flex-col gap-4">

                {/* Portfolio Stats Card */}
                <div className="bg-gradient-to-br from-slate-900/80 to-slate-950 border border-slate-800 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-semibold text-slate-200">Portfolio Value</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-400 font-mono">{health?.trading_mode?.toUpperCase() || 'PAPER'}</span>
                    </div>

                    {portfolio ? (
                        <>
                            <div className="text-3xl font-bold text-white mb-1 tracking-tight">
                                {formatINR(portfolio.total_balance)}
                            </div>
                            <div className="flex items-center gap-2 mb-4">
                                {portfolio.total_return_pct >= 0 ? (
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                )}
                                <span className={`text-sm font-mono ${portfolio.total_return_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {portfolio.total_return_pct >= 0 ? '+' : ''}{portfolio.total_return_pct.toFixed(2)}% all-time
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-800">
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase mb-1">Today's P&L</div>
                                    <div className={`text-lg font-bold ${portfolio.today_pnl_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {portfolio.today_pnl_pct >= 0 ? '+' : ''}{portfolio.today_pnl_pct.toFixed(2)}%
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase mb-1">Open Positions</div>
                                    <div className="text-lg font-bold text-white">{portfolio.open_positions_count}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase mb-1">Today's Trades</div>
                                    <div className="text-lg font-bold text-white">{portfolio.today_trades}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-500 uppercase mb-1">Total Trades</div>
                                    <div className="text-lg font-bold text-white">{portfolio.total_trades}</div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-6 text-slate-600">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                            <span className="text-xs">Loading portfolio...</span>
                        </div>
                    )}
                </div>

                {/* Risk Config */}
                <div className="bg-slate-900/30 border border-slate-800 rounded-lg p-1">
                    <RiskConfigPanel />
                </div>

                {/* Evolution Proposals (Collapsible) */}
                <div className="bg-slate-900/30 border border-slate-800 rounded-lg flex flex-col">
                    <div className="p-3 border-b border-slate-800 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-semibold text-slate-200">Evolution Proposals</span>
                        <span className="ml-auto text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">{proposals.length}</span>
                    </div>
                    <div className="p-3 space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {proposals.length === 0 ? (
                            <div className="text-center py-4 text-slate-600 text-xs italic">No active proposals</div>
                        ) : (
                            proposals.slice(0, 3).map(p => (
                                <div key={p.id} className="bg-black border border-slate-800 p-3 rounded hover:border-slate-600 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-mono text-purple-400">{p.strategy_id}</span>
                                        <span className="text-[10px] text-emerald-500">+{p.expected_improvement}%</span>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-2">{p.description}</p>
                                    <div className="flex gap-1 mt-2">
                                        <button onClick={() => handleEvolutionAction(p.id, 'approve')} className="p-1 hover:bg-emerald-900/30 rounded text-emerald-500"><CheckCircle2 className="w-3 h-3" /></button>
                                        <button onClick={() => handleEvolutionAction(p.id, 'reject')} className="p-1 hover:bg-red-900/30 rounded text-red-500"><XCircle className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Center Column: Agent Feed (6 cols) */}
            <div className="col-span-12 xl:col-span-6 flex flex-col gap-4 h-full">
                {/* Agent Terminal */}
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
                    {portfolio && (
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400">{portfolio.open_positions_count} open</span>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto relative">
                    <div className="absolute inset-0">
                        <PositionsTable />
                    </div>
                </div>
            </div>
        </div>
    )
}
