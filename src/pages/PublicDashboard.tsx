import { useEffect, useState } from 'react'
import { publicApi, type PerformanceData, type TradesData } from '../lib/api'
import { TrendingUp, Trophy, BarChart3, Brain } from 'lucide-react'

export default function PublicDashboard() {
    const [performance, setPerformance] = useState<PerformanceData | null>(null)
    const [trades, setTrades] = useState<TradesData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const [perfData, tradesData] = await Promise.all([
                    publicApi.getPerformance(),
                    publicApi.getTrades(10),
                ])
                setPerformance(perfData)
                setTrades(tradesData)
            } catch (error) {
                console.error('Failed to fetch data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
            {/* Header */}
            <header className="border-b border-slate-800/50 backdrop-blur-sm bg-slate-950/50 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">AgentFund</h1>
                            <p className="text-xs text-slate-400">AI-Powered Trading</p>
                        </div>
                    </div>
                    <a
                        href="/admin/login"
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Admin
                    </a>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Hero */}
                <section className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Autonomous Trading
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                            Powered by AI
                        </span>
                    </h2>
                    <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                        Multi-agent system learning from every trade. Institutional-grade strategies.
                    </p>
                </section>

                {/* Stats Cards */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <StatCard
                        label="Total Return"
                        value={performance?.total_return_pct}
                        suffix="%"
                        icon={<TrendingUp className="w-5 h-5" />}
                        loading={loading}
                        positive
                    />
                    <StatCard
                        label="Win Rate"
                        value={performance?.win_rate ? performance.win_rate * 100 : undefined}
                        suffix="%"
                        icon={<Trophy className="w-5 h-5" />}
                        loading={loading}
                    />
                    <StatCard
                        label="Total Trades"
                        value={performance?.total_trades}
                        icon={<BarChart3 className="w-5 h-5" />}
                        loading={loading}
                    />
                    <StatCard
                        label="Episodes Learned"
                        value={performance?.episodes_learned}
                        icon={<Brain className="w-5 h-5" />}
                        loading={loading}
                    />
                </section>

                {/* Recent Trades */}
                <section className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6">
                    <h3 className="text-xl font-semibold text-white mb-6">Recent Trades</h3>
                    {loading ? (
                        <div className="text-center py-8 text-slate-500">Loading...</div>
                    ) : trades?.trades.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-sm text-slate-400 border-b border-slate-800">
                                        <th className="pb-3 font-medium">Instrument</th>
                                        <th className="pb-3 font-medium">Direction</th>
                                        <th className="pb-3 font-medium">P&L</th>
                                        <th className="pb-3 font-medium">Outcome</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trades.trades.map((trade) => (
                                        <tr key={trade.trade_id} className="border-b border-slate-800/50">
                                            <td className="py-4 text-white font-medium">{trade.instrument}</td>
                                            <td className="py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${trade.direction === 'LONG'
                                                    ? 'bg-emerald-500/20 text-emerald-400'
                                                    : 'bg-red-500/20 text-red-400'
                                                    }`}>
                                                    {trade.direction}
                                                </span>
                                            </td>
                                            <td className={`py-4 font-mono ${trade.pnl_percent >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {trade.pnl_percent >= 0 ? '+' : ''}{trade.pnl_percent.toFixed(2)}%
                                            </td>
                                            <td className="py-4">
                                                <span className={`px-2 py-1 rounded text-xs ${trade.outcome === 'PROFITABLE'
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : 'bg-slate-500/10 text-slate-400'
                                                    }`}>
                                                    {trade.outcome}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">No trades yet</div>
                    )}
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800/50 py-8 mt-16">
                <div className="max-w-7xl mx-auto px-6 text-center text-sm text-slate-500">
                    AgentFund • Autonomous Trading System • Paper Trading Mode
                </div>
            </footer>
        </div>
    )
}

interface StatCardProps {
    label: string
    value: number | undefined
    suffix?: string
    icon: React.ReactNode
    loading?: boolean
    positive?: boolean
}

function StatCard({ label, value, suffix = '', icon, loading, positive }: StatCardProps) {
    return (
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800/50 p-6 hover:border-emerald-500/30 transition-colors">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    {icon}
                </div>
                <span className="text-sm text-slate-400">{label}</span>
            </div>
            {loading ? (
                <div className="h-8 bg-slate-800 rounded animate-pulse" />
            ) : (
                <div className={`text-3xl font-bold ${positive && value && value > 0 ? 'text-emerald-400' : 'text-white'}`}>
                    {value !== undefined ? `${value.toFixed(value % 1 === 0 ? 0 : 2)}${suffix}` : '--'}
                </div>
            )}
        </div>
    )
}
